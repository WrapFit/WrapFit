import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  Payment,
  PaymentConfirmation,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import {
  EXPORT_PACKS,
  exportLotExpiresAt,
  isExportPackId,
  isXuPackId,
  PRO_MONTH,
  proPeriodEnd,
  XU_PACKS,
} from '@wrapfit/shared';
import { randomInt } from 'crypto';
import { CreditsService, PlanService } from '../billing';
import { ConfigService } from '../common';
import { OrdersService } from '../orders';
import { PrismaService } from '../shared/prisma';
import type { CreatePaymentDto } from './dto/create-payment.dto';
import { VnpayGateway } from './vnpay/vnpay.gateway';
import { bankName, SAMPLE_ACCOUNT, vietQrPayload, vietQrSvg, type VietQrAccount } from './vietqr';

/** A transfer must arrive within 15 minutes; the checkout shows the countdown. */
export const PAYMENT_TTL_MS = 15 * 60 * 1000;

/** No O / 0 / I / 1: the reference is typed by hand into a banking app when the QR cannot be scanned. */
const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** A reference inside free text (the transfer content); the alphabet above, so look-alike characters never match. */
export const PAYMENT_REFERENCE_PATTERN = /WF[A-HJ-NP-Z2-9]{6}/;
const REFERENCE_ATTEMPTS = 8;

/** `WF` + 6 characters, the transfer content (chk_payments_reference). */
export function newPaymentReference(): string {
  let code = 'WF';
  for (let i = 0; i < 6; i++) code += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  return code;
}

/** What the payment buys, snapshotted when it is created (prices may change while it waits). */
type PaymentMetadata = { credits: number } | { xu: number } | { periodDays: number } | { orderId: string };

/** How a payment was confirmed (docs/21 §3.2). `allowExpired` is for an admin assigning a late transfer. */
export interface ConfirmPaidOptions {
  via: PaymentConfirmation;
  providerTxnId?: string;
  allowExpired?: boolean;
}

export interface PaymentView {
  id: string;
  purpose: PaymentPurpose;
  status: PaymentStatus;
  /** Who takes the money: VietQR transfer (SePay) or VNPay sandbox (demo accounts). */
  provider: PaymentProvider;
  /** How it was confirmed, null while not PAID. */
  confirmedVia: PaymentConfirmation | null;
  amountVnd: number;
  reference: string;
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
  /** Export credits of a pack, null otherwise. */
  credits: number | null;
  /** Xu of a xu pack, null otherwise. */
  xu: number | null;
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
  /**
   * VNPay sandbox checkout of a demo account's payment: send the browser to `payUrl`. Only in the answer of
   * `POST /payments` (the URL carries the customer's IP); null on `GET /payments/:id`, when not PENDING, for VietQR
   * payments, and when VNPay is not configured on the server (only the simulate button works then).
   */
  vnpay: { payUrl: string } | null;
}

/** One row of "Lịch sử thanh toán": a PaymentView without the QR / pay URL. */
export type PaymentHistoryEntry = Omit<PaymentView, 'vietqr' | 'vnpay'>;

export interface PaymentHistoryPage {
  entries: PaymentHistoryEntry[];
  /** Pass as `before` for the next page; null at the end. */
  nextBefore: string | null;
}

const paymentExpired = () =>
  new HttpException(
    { code: 'PAYMENT_EXPIRED', message: 'Mã thanh toán đã hết hạn, hãy tạo mã mới' },
    HttpStatus.CONFLICT,
  );

/**
 * VietQR payments (docs/17 S5). A payment is created PENDING with a reference and a 15-minute expiry; once paid it
 * grants what it bought in the same transaction: an export credit lot, a xu lot (docs/19), 30 days of Pro, or a sample
 * order moved to PAID.
 * Every path that marks a payment paid (simulate button, SePay webhook, VNPay, admin) goes through `confirmPaid`.
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
    private readonly vnpay: VnpayGateway,
  ) {
    this.simulation = config.get('payments.simulation');
    const account = config.get('payments.vietqr');
    this.account = account ?? SAMPLE_ACCOUNT;
    this.sampleAccount = account === null;
  }

  get simulationEnabled(): boolean {
    return this.simulation;
  }

  /** `ip` is the customer's address (`req.ip`, which honours TRUST_PROXY): VNPay wants it in the pay URL. */
  async create(userId: string, dto: CreatePaymentDto, ip?: string): Promise<PaymentView> {
    const { amountVnd, metadata } = await this.priceOf(userId, dto);
    // Demo accounts never take the real-money VietQR path, real accounts never the sandbox (docs/21 §6).
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { isDemo: true } });
    const provider = user.isDemo ? PaymentProvider.VNPAY : PaymentProvider.VIETQR;
    if (provider === PaymentProvider.VNPAY && !this.vnpay.configured) {
      // The simulate button is the demo fallback (docs/21 D5): while it is on, a demo payment is still created and the
      // checkout shows only that button. With it off (production) there is no way to pay, so say so.
      if (!this.simulation) {
        throw new HttpException(
          {
            code: 'VNPAY_NOT_CONFIGURED',
            message:
              'Cổng VNPay sandbox chưa được cấu hình trên máy chủ (thiếu VNPAY_TMN_CODE / VNPAY_HASH_SECRET). Vui lòng liên hệ quản trị viên.',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      this.logger.warn(`payment.create user=${userId}: VNPay not configured, only the simulate button can pay`);
    }

    if (dto.purpose === PaymentPurpose.SAMPLE_ORDER) {
      // Opening the checkout twice shows the same QR instead of two payments for one order.
      const waiting = await this.prisma.payment.findFirst({
        where: {
          userId,
          purpose: PaymentPurpose.SAMPLE_ORDER,
          provider,
          status: PaymentStatus.PENDING,
          expiresAt: { gt: new Date() },
          metadata: { path: ['orderId'], equals: dto.orderId },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (waiting) return this.toView(waiting, ip);
    }

    for (let attempt = 1; ; attempt++) {
      try {
        const payment = await this.prisma.payment.create({
          data: {
            userId,
            purpose: dto.purpose,
            amountVnd,
            provider,
            reference: newPaymentReference(),
            expiresAt: new Date(Date.now() + PAYMENT_TTL_MS),
            // The payment terms the user accepted for this payment, kept as evidence next to what was bought.
            metadata: { ...metadata, termsVersion: dto.termsVersion ?? null, termsAcceptedAt: new Date().toISOString() },
          },
        });
        this.logger.log(`payment.created id=${payment.id} user=${userId} purpose=${dto.purpose} amount=${amountVnd}`);
        return this.toView(payment, ip);
      } catch (error) {
        if (attempt < REFERENCE_ATTEMPTS && isReferenceTaken(error)) continue;
        throw error;
      }
    }
  }

  /**
   * The caller's payments, newest first, for "Lịch sử thanh toán". No QR or pay URL: reopen one with `GET /payments/:id`.
   * A PENDING payment past its expiry is reported EXPIRED (the row is updated the next time it is read on its own).
   */
  async listMine(userId: string, limit: number, before?: Date): Promise<PaymentHistoryPage> {
    const rows = await this.prisma.payment.findMany({
      where: { userId, ...(before ? { createdAt: { lt: before } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });
    const now = new Date();
    const page = rows.slice(0, limit);
    return {
      entries: page.map((payment) => {
        const metadata = (payment.metadata ?? {}) as Partial<{ credits: number; xu: number; orderId: string }>;
        const lapsed = payment.status === PaymentStatus.PENDING && payment.expiresAt <= now;
        return {
          id: payment.id,
          purpose: payment.purpose,
          status: lapsed ? PaymentStatus.EXPIRED : payment.status,
          provider: payment.provider,
          confirmedVia: payment.confirmedVia,
          amountVnd: payment.amountVnd,
          reference: payment.reference,
          createdAt: payment.createdAt.toISOString(),
          paidAt: payment.paidAt?.toISOString() ?? null,
          expiresAt: payment.expiresAt.toISOString(),
          credits: metadata.credits ?? null,
          xu: metadata.xu ?? null,
          orderId: metadata.orderId ?? null,
        };
      }),
      nextBefore: rows.length > limit ? page[page.length - 1].createdAt.toISOString() : null,
    };
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
   * Marks a payment paid without a transfer (PAYMENT_SIMULATION only, 404 otherwise, as if the route did not exist).
   * Only the owner may do it; `confirmPaid` does the rest.
   */
  async simulateConfirm(id: string, userId: string): Promise<PaymentView> {
    if (!this.simulation) throw new NotFoundException();

    const payment = await this.prisma.$transaction(async (tx) => {
      const owned = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM payments WHERE id = ${id}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
      if (owned.length === 0) throw new NotFoundException('Thanh toán không tồn tại');
      return this.confirmPaid(tx, id, { via: PaymentConfirmation.SIMULATION });
    });
    return this.toView(payment);
  }

  /**
   * The one place a payment becomes PAID (docs/21 §3.2), for the simulate button, the SePay webhook, VNPay and the
   * admin. Locks the payment row, so a webhook and a simulate click arriving together grant once: the second waits,
   * sees PAID and returns it untouched. Runs inside the caller's transaction (the caller may have locked the row
   * already; locking again is a no-op). Throws 404 for an unknown id, 409 PAYMENT_EXPIRED for a payment that is no
   * longer PENDING or is past its expiry, unless `allowExpired`.
   */
  async confirmPaid(tx: Prisma.TransactionClient, paymentId: string, options: ConfirmPaidOptions): Promise<Payment> {
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM payments WHERE id = ${paymentId}::uuid FOR UPDATE`;
    if (locked.length === 0) throw new NotFoundException('Thanh toán không tồn tại');

    const current = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (current.status === PaymentStatus.PAID) return current;
    const now = new Date();
    const open = current.status === PaymentStatus.PENDING || (options.allowExpired && current.status === PaymentStatus.EXPIRED);
    if (!open || (!options.allowExpired && current.expiresAt <= now)) throw paymentExpired();

    const paid = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.PAID,
        paidAt: now,
        confirmedVia: options.via,
        ...(options.providerTxnId ? { providerTxnId: options.providerTxnId } : {}),
      },
    });
    await this.fulfil(tx, paid, now);
    await this.plans.sync(paid.userId, tx, now);
    this.logger.log(
      `payment.paid id=${paymentId} user=${paid.userId} purpose=${paid.purpose} amount=${paid.amountVnd} via=${options.via}`,
    );
    return paid;
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
    if (isXuPackId(dto.purpose)) {
      const pack = XU_PACKS[dto.purpose];
      return { amountVnd: pack.priceVnd, metadata: { xu: pack.xu } };
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
    } else if ('xu' in metadata) {
      // A purchased lot is worth what was paid for it: reports recognize that money as xu are spent (docs/19 D6).
      await this.credits.grant(
        payment.userId,
        {
          kind: 'XU',
          quantity: metadata.xu,
          source: 'PURCHASE',
          expiresAt: exportLotExpiresAt(now),
          paymentId: payment.id,
          valueVnd: payment.amountVnd,
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

  /** `ip` set = the pay URL of a VNPay payment is included (only `create` knows the customer's address). */
  private async toView(payment: Payment, ip?: string): Promise<PaymentView> {
    const metadata = (payment.metadata ?? {}) as Partial<{ credits: number; xu: number; orderId: string }>;
    let vietqr: PaymentView['vietqr'] = null;
    let vnpay: PaymentView['vnpay'] = null;
    if (payment.status === PaymentStatus.PENDING && payment.provider === PaymentProvider.VNPAY) {
      if (ip !== undefined && this.vnpay.configured) vnpay = { payUrl: this.vnpay.payUrlFor(payment, ip) };
    } else if (payment.status === PaymentStatus.PENDING) {
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
      provider: payment.provider,
      confirmedVia: payment.confirmedVia,
      amountVnd: payment.amountVnd,
      reference: payment.reference,
      expiresAt: payment.expiresAt.toISOString(),
      paidAt: payment.paidAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
      credits: metadata.credits ?? null,
      xu: metadata.xu ?? null,
      orderId: metadata.orderId ?? null,
      vietqr,
      vnpay,
    };
  }
}

function isReferenceTaken(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false;
  const target = error.meta?.target;
  return Array.isArray(target) ? target.includes('reference') : String(target ?? '').includes('reference');
}
