import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
  customXuError,
  customXuPriceVnd,
  exportLotExpiresAt,
  isExportPackId,
  isXuPackId,
  PRO_MONTH,
  proPeriodEnd,
  XU_PACKS,
} from '@wrapfit/shared';
import { randomInt } from 'crypto';
import { CreditsService, PlanService, xuForExportCredits } from '../billing';
import { ADVISORY_LOCK, ConfigService, encodePageCursor, lockForTransaction, olderThan } from '../common';
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
  /** Export credits of an old export pack payment (no longer sold), null otherwise. */
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

export const PAYMENT_EXPIRED = 'PAYMENT_EXPIRED';

/** 400 for a new payment of an export pack (EXPORT_1/5/15): no longer sold, no export spends a credit (docs/25 item 7). */
export const EXPORT_PACK_DISCONTINUED = 'EXPORT_PACK_DISCONTINUED';
const exportPackDiscontinued = () =>
  new BadRequestException({
    code: EXPORT_PACK_DISCONTINUED,
    message: 'Gói lượt xuất đã ngừng bán: file in mở khi thanh toán đơn in mẫu, tác vụ AI dùng xu Wrap',
  });
const paymentExpired = () =>
  new HttpException(
    { code: PAYMENT_EXPIRED, message: 'Mã thanh toán đã hết hạn, hãy tạo mã mới' },
    HttpStatus.CONFLICT,
  );

/**
 * docs/25 item 6: a VietQR payment to the real bank account of WrapFit is a real transfer (or stands for one: it grants
 * xu, Pro, a printed sample order), so only a demo account (`users.is_demo`) may simulate it, by the button or by a mock
 * bank transfer. Without a real account (no VIETQR_*: the QR names the sample account "WRAPFIT MO PHONG"), no money
 * can arrive at all, so every account may simulate: registered, demo or seeded. VNPay sandbox stays open to all.
 */
export function assertMaySimulate(provider: PaymentProvider, isDemo: boolean, sampleAccount = false): void {
  if (provider === PaymentProvider.VIETQR && !isDemo && !sampleAccount) {
    throw new ForbiddenException({
      code: 'SIMULATION_DEMO_ONLY',
      message: 'Chỉ tài khoản demo được giả lập thanh toán chuyển khoản VietQR',
    });
  }
}

/** The `code` in the body of an HttpException (PAYMENT_EXPIRED, ORDER_NOT_PAYABLE...), undefined for anything else. */
export function httpErrorCode(error: unknown): string | undefined {
  if (!(error instanceof HttpException)) return undefined;
  const body = error.getResponse();
  return typeof body === 'object' && body !== null && 'code' in body ? String(body.code) : undefined;
}

/**
 * VietQR payments (docs/17 S5). A payment is created PENDING with a reference and a 15-minute expiry; once paid it
 * grants what it bought in the same transaction: a xu lot (docs/19; also for an old export pack), 30 days of Pro, or
 * a sample order moved to PAID.
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

  /** No VIETQR_* account: QR codes name the sample account, so a VietQR payment can never carry real money. */
  get usesSampleAccount(): boolean {
    return this.sampleAccount;
  }

  /** `ip` is the customer's address (`req.ip`, which honours TRUST_PROXY): VNPay wants it in the pay URL. */
  async create(userId: string, dto: CreatePaymentDto, ip?: string): Promise<PaymentView> {
    const { amountVnd, metadata } = await this.priceOf(userId, dto);
    // Demo accounts never take the real-money VietQR path, real accounts never the sandbox (docs/21 §6).
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { isDemo: true, billingDetails: true } });
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
            // The payment terms the user accepted for this payment, kept as evidence next to what was bought, and the
            // VAT invoice details of that moment: payments are kept for the legal retention of accounting records,
            // whatever happens to the account (docs/28 Q4), while the details on the user row change, and go when the
            // account is anonymized. InvoiceRetentionTask removes them after the retention.
            metadata: {
              ...metadata,
              termsVersion: dto.termsVersion ?? null,
              termsAcceptedAt: new Date().toISOString(),
              ...(user.billingDetails ? { billingDetails: user.billingDetails } : {}),
            },
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
  async listMine(userId: string, limit: number, before?: string): Promise<PaymentHistoryPage> {
    const rows = await this.prisma.payment.findMany({
      where: { userId, ...olderThan(before) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
      nextBefore: rows.length > limit ? encodePageCursor(page[page.length - 1]) : null,
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
   * Only the owner may do it, and a VietQR payment only a demo account (`assertMaySimulate`); `confirmPaid` does the
   * rest.
   */
  async simulateConfirm(id: string, userId: string): Promise<PaymentView> {
    if (!this.simulation) throw new NotFoundException();

    const payment = await this.prisma.$transaction(async (tx) => {
      const [owned] = await tx.$queryRaw<{ provider: PaymentProvider; is_demo: boolean }[]>`
        SELECT p.provider, u.is_demo FROM payments p JOIN users u ON u.id = p.user_id
        WHERE p.id = ${id}::uuid AND p.user_id = ${userId}::uuid FOR UPDATE OF p`;
      if (!owned) throw new NotFoundException('Thanh toán không tồn tại');
      assertMaySimulate(owned.provider, owned.is_demo, this.sampleAccount);
      return this.confirmPaid(tx, id, { via: PaymentConfirmation.SIMULATION });
    });
    return this.toView(payment);
  }

  /**
   * The one place a payment becomes PAID (docs/21 §3.2), for the simulate button, the SePay webhook, VNPay and the
   * admin. Locks the payment row, so a webhook and a simulate click arriving together grant once: the second waits,
   * sees PAID and returns it untouched. Runs inside the caller's transaction (the caller may have locked the row
   * already; locking again is a no-op). Throws 404 for an unknown id, 409 PAYMENT_EXPIRED for a payment that is no
   * longer PENDING or is past its expiry, unless `allowExpired`, and 409 ORDER_NOT_PAYABLE for a sample order payment
   * whose order is no longer PENDING_PAYMENT (cancelled, or paid by another payment). Both 409s are thrown before
   * anything is written, so a caller that catches them can still use its transaction.
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
    // Lock and check the order before the payment is written: a cancelled order must not leave a PAID payment that
    // granted nothing. The lock (payment row, then order row) also makes a concurrent cancel wait for this transaction.
    if (current.purpose === PaymentPurpose.SAMPLE_ORDER) {
      await this.orders.lockPayable((current.metadata as { orderId: string }).orderId, tx);
    }

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
    if (isExportPackId(dto.purpose)) throw exportPackDiscontinued();
    if (dto.purpose !== PaymentPurpose.XU_CUSTOM && dto.xu !== undefined) {
      throw new BadRequestException('xu chỉ dùng cho nạp số xu tùy chọn');
    }
    if (isXuPackId(dto.purpose)) {
      const pack = XU_PACKS[dto.purpose];
      return { amountVnd: pack.priceVnd, metadata: { xu: pack.xu } };
    }
    if (dto.purpose === PaymentPurpose.XU_CUSTOM) {
      const problem = dto.xu === undefined ? 'Nhập số xu muốn nạp.' : customXuError(dto.xu);
      if (problem) throw new BadRequestException(problem);
      return { amountVnd: customXuPriceVnd(dto.xu!), metadata: { xu: dto.xu! } };
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
      // An export pack payment created before the packs stopped (docs/25 item 7) and confirmed only now (a late
      // transfer the admin assigns, a webhook in its last minutes): no export credit lot any more, the money becomes
      // xu at the price paid, the rule of the one-time conversion (prisma/scripts/convert-export-credits.ts).
      const { xu, valueVnd } = xuForExportCredits(metadata.credits, metadata.credits, payment.amountVnd);
      await this.credits.grant(
        payment.userId,
        {
          kind: 'XU',
          quantity: xu,
          source: 'PURCHASE',
          expiresAt: exportLotExpiresAt(now),
          paymentId: payment.id,
          valueVnd,
          note: `${payment.reference} (${metadata.credits} lượt xuất đổi sang xu)`,
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
      // One Pro payment of a user at a time (docs/30 item 3). Each transaction only locks its own payment, so two
      // payments confirmed at once read the same period end and both wrote end + 30 days, or both created a
      // subscription and the second failed on subscriptions_user_id_active_key. The second now waits here and reads
      // what the first committed. Not a lock on the users row: UsersService.remove holds it while it waits for the
      // payment locks, which would deadlock with this transaction.
      await lockForTransaction(tx, ADVISORY_LOCK.SUBSCRIPTION, payment.userId);
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
