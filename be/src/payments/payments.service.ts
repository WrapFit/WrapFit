import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Payment, PaymentPurpose, PaymentStatus, Prisma } from '@prisma/client';
import { EXPORT_PACKS, exportLotExpiresAt, isExportPackId, PRO_MONTH, proPeriodEnd } from '@wrapfit/shared';
import { randomInt } from 'crypto';
import { CreditsService, PlanService } from '../billing';
import { ConfigService } from '../common';
import { OrdersService } from '../orders';
import { PrismaService } from '../shared/prisma';
import type { CreatePaymentDto } from './dto/create-payment.dto';
import { bankName, SAMPLE_ACCOUNT, vietQrPayload, vietQrSvg, type VietQrAccount } from './vietqr';

/** A transfer must arrive within 15 minutes; the checkout shows the countdown. */
export const PAYMENT_TTL_MS = 15 * 60 * 1000;

/** No O / 0 / I / 1: the reference is typed by hand into a banking app when the QR cannot be scanned. */
const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const REFERENCE_ATTEMPTS = 8;

/** `WF` + 6 characters, the transfer content (chk_payments_reference). */
export function newPaymentReference(): string {
  let code = 'WF';
  for (let i = 0; i < 6; i++) code += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  return code;
}

/** What the payment buys, snapshotted when it is created (prices may change while it waits). */
type PaymentMetadata = { credits: number } | { periodDays: number } | { orderId: string };

export interface PaymentView {
  id: string;
  purpose: PaymentPurpose;
  status: PaymentStatus;
  amountVnd: number;
  reference: string;
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
  /** Export credits of a pack, null otherwise. */
  credits: number | null;
  /** Sample order paid by this payment, null otherwise. */
  orderId: string | null;
  /** The transfer to make, while the payment waits for it. */
  vietqr: {
    payload: string;
    qrSvg: string;
    bankBin: string;
    bankName: string;
    accountNo: string;
    accountName: string;
    /** Placeholder account (VIETQR_* not set): the checkout labels it "Mô phỏng". */
    sample: boolean;
  } | null;
}

const paymentExpired = () =>
  new HttpException(
    { code: 'PAYMENT_EXPIRED', message: 'Mã thanh toán đã hết hạn, hãy tạo mã mới' },
    HttpStatus.CONFLICT,
  );

/**
 * VietQR payments (docs/17 S5). A payment is created PENDING with a reference and a 15-minute expiry; once paid it
 * grants what it bought in the same transaction: an export credit lot, 30 days of Pro, or a sample order moved to PAID.
 * Without a bank webhook (docs/17 M1), "paid" comes only from the simulate button, enabled by PAYMENT_SIMULATION.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly simulation: boolean;
  private readonly account: VietQrAccount;
  private readonly sampleAccount: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly plans: PlanService,
    private readonly orders: OrdersService,
    config: ConfigService,
  ) {
    this.simulation = config.get('payments.simulation');
    const account = config.get('payments.vietqr');
    this.account = account ?? SAMPLE_ACCOUNT;
    this.sampleAccount = account === null;
  }

  get simulationEnabled(): boolean {
    return this.simulation;
  }

  async create(userId: string, dto: CreatePaymentDto): Promise<PaymentView> {
    const { amountVnd, metadata } = await this.priceOf(userId, dto);

    if (dto.purpose === PaymentPurpose.SAMPLE_ORDER) {
      // Opening the checkout twice shows the same QR instead of two payments for one order.
      const waiting = await this.prisma.payment.findFirst({
        where: {
          userId,
          purpose: PaymentPurpose.SAMPLE_ORDER,
          status: PaymentStatus.PENDING,
          expiresAt: { gt: new Date() },
          metadata: { path: ['orderId'], equals: dto.orderId },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (waiting) return this.toView(waiting);
    }

    for (let attempt = 1; ; attempt++) {
      try {
        const payment = await this.prisma.payment.create({
          data: {
            userId,
            purpose: dto.purpose,
            amountVnd,
            reference: newPaymentReference(),
            expiresAt: new Date(Date.now() + PAYMENT_TTL_MS),
            metadata,
          },
        });
        this.logger.log(`payment.created id=${payment.id} user=${userId} purpose=${dto.purpose} amount=${amountVnd}`);
        return this.toView(payment);
      } catch (error) {
        if (attempt < REFERENCE_ATTEMPTS && isReferenceTaken(error)) continue;
        throw error;
      }
    }
  }

  /** One payment of its owner (someone else's answers 404). A PENDING payment past its expiry becomes EXPIRED here. */
  async get(id: string, userId: string): Promise<PaymentView> {
    let payment = await this.prisma.payment.findFirst({ where: { id, userId } });
    if (!payment) throw new NotFoundException('Thanh toán không tồn tại');
    if (payment.status === PaymentStatus.PENDING && payment.expiresAt <= new Date()) {
      await this.prisma.payment.updateMany({
        where: { id, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.EXPIRED },
      });
      payment = await this.prisma.payment.findUniqueOrThrow({ where: { id } });
    }
    return this.toView(payment);
  }

  /**
   * Marks a payment paid without a transfer (PAYMENT_SIMULATION only, 404 otherwise, as if the route did not exist) and
   * grants what it bought. The payment row is locked first, so a second or concurrent call waits, sees PAID and grants
   * nothing more.
   */
  async simulateConfirm(id: string, userId: string): Promise<PaymentView> {
    if (!this.simulation) throw new NotFoundException();

    const payment = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM payments WHERE id = ${id}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
      if (locked.length === 0) throw new NotFoundException('Thanh toán không tồn tại');

      const current = await tx.payment.findUniqueOrThrow({ where: { id } });
      if (current.status === PaymentStatus.PAID) return current;
      const now = new Date();
      if (current.status !== PaymentStatus.PENDING || current.expiresAt <= now) throw paymentExpired();

      const paid = await tx.payment.update({ where: { id }, data: { status: PaymentStatus.PAID, paidAt: now } });
      await this.fulfil(tx, paid, now);
      await this.plans.sync(userId, tx, now);
      this.logger.log(`payment.paid id=${id} user=${userId} purpose=${paid.purpose} amount=${paid.amountVnd} simulated`);
      return paid;
    });
    return this.toView(payment);
  }

  private async priceOf(
    userId: string,
    dto: CreatePaymentDto,
  ): Promise<{ amountVnd: number; metadata: PaymentMetadata }> {
    if (dto.purpose !== PaymentPurpose.SAMPLE_ORDER && dto.orderId) {
      throw new BadRequestException('orderId chỉ dùng cho thanh toán đơn in mẫu');
    }
    if (isExportPackId(dto.purpose)) {
      const pack = EXPORT_PACKS[dto.purpose];
      return { amountVnd: pack.priceVnd, metadata: { credits: pack.credits } };
    }
    if (dto.purpose === PaymentPurpose.PRO_MONTH) {
      return { amountVnd: PRO_MONTH.priceVnd, metadata: { periodDays: PRO_MONTH.periodDays } };
    }

    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
      select: { id: true, status: true, totalVnd: true },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (order.status !== OrderStatus.PENDING_PAYMENT) throw new ConflictException('Đơn hàng không còn chờ thanh toán');
    return { amountVnd: order.totalVnd, metadata: { orderId: order.id } };
  }

  /** Grants what a payment bought, inside its transaction. */
  private async fulfil(tx: Prisma.TransactionClient, payment: Payment, now: Date): Promise<void> {
    const metadata = payment.metadata as PaymentMetadata;

    if ('credits' in metadata) {
      await this.credits.grant(
        payment.userId,
        {
          quantity: metadata.credits,
          source: 'PURCHASE',
          expiresAt: exportLotExpiresAt(now),
          paymentId: payment.id,
          note: payment.reference,
        },
        tx,
      );
    } else if ('periodDays' in metadata) {
      // Ends a Pro period that is over first, so a renewal after it starts from now, not from the old end.
      await this.plans.sync(payment.userId, tx, now);
      const active = await tx.subscription.findFirst({
        where: { userId: payment.userId, status: 'ACTIVE' },
        select: { id: true, currentPeriodEnd: true },
      });
      if (active) {
        await tx.subscription.update({
          where: { id: active.id },
          data: { currentPeriodEnd: proPeriodEnd(active.currentPeriodEnd), paymentId: payment.id },
        });
      } else {
        await tx.subscription.create({
          data: {
            userId: payment.userId,
            plan: PRO_MONTH.plan,
            currentPeriodStart: now,
            currentPeriodEnd: proPeriodEnd(now),
            paymentId: payment.id,
          },
        });
      }
    } else {
      await this.orders.markPaid(metadata.orderId, payment.id, tx);
    }
  }

  private async toView(payment: Payment): Promise<PaymentView> {
    const metadata = (payment.metadata ?? {}) as Partial<{ credits: number; orderId: string }>;
    let vietqr: PaymentView['vietqr'] = null;
    if (payment.status === PaymentStatus.PENDING) {
      const payload = vietQrPayload({ ...this.account, amountVnd: payment.amountVnd, description: payment.reference });
      vietqr = {
        payload,
        qrSvg: await vietQrSvg(payload),
        bankBin: this.account.bankBin,
        bankName: bankName(this.account.bankBin),
        accountNo: this.account.accountNo,
        accountName: this.account.accountName,
        sample: this.sampleAccount,
      };
    }
    return {
      id: payment.id,
      purpose: payment.purpose,
      status: payment.status,
      amountVnd: payment.amountVnd,
      reference: payment.reference,
      expiresAt: payment.expiresAt.toISOString(),
      paidAt: payment.paidAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
      credits: metadata.credits ?? null,
      orderId: metadata.orderId ?? null,
      vietqr,
    };
  }
}

function isReferenceTaken(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false;
  const target = error.meta?.target;
  return Array.isArray(target) ? target.includes('reference') : String(target ?? '').includes('reference');
}
