import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  BankTransaction,
  BankTxStatus,
  PaymentConfirmation,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../shared/prisma';
import { PaymentsService } from '../payments.service';
import { BANK_TX_MAX_LIMIT, type BankTransactionsQueryDto, type ResolveBankTransactionDto } from './bank-transactions.dto';

const paymentSelect = {
  id: true,
  reference: true,
  amountVnd: true,
  status: true,
  purpose: true,
  provider: true,
  expiresAt: true,
  user: { select: { id: true, email: true } },
} satisfies Prisma.PaymentSelect;

type PaymentRow = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>;

/** The payment a bank transaction is linked to, or the one an admin is about to assign. */
export interface BankTransactionPayment {
  id: string;
  reference: string;
  amountVnd: number;
  status: PaymentStatus;
  purpose: PaymentPurpose;
  provider: PaymentProvider;
  expiresAt: string;
  userEmail: string;
}

export interface BankTransactionView {
  id: string;
  externalId: string;
  gateway: string;
  accountNo: string;
  amountVnd: number;
  content: string;
  bankReference: string;
  extractedReference: string | null;
  transactionAt: string;
  status: BankTxStatus;
  unmatchedReason: BankTransaction['unmatchedReason'];
  resolvedBy: string | null;
  resolvedNote: string | null;
  createdAt: string;
  payment: BankTransactionPayment | null;
}

const toPayment = (row: PaymentRow): BankTransactionPayment => ({
  id: row.id,
  reference: row.reference,
  amountVnd: row.amountVnd,
  status: row.status,
  purpose: row.purpose,
  provider: row.provider,
  expiresAt: row.expiresAt.toISOString(),
  userEmail: row.user.email,
});

const toView = (row: BankTransaction & { payment: PaymentRow | null }): BankTransactionView => ({
  id: row.id,
  externalId: row.externalId,
  gateway: row.gateway,
  accountNo: row.accountNo,
  amountVnd: row.amountVnd,
  content: row.content,
  bankReference: row.bankReference,
  extractedReference: row.extractedReference,
  transactionAt: row.transactionAt.toISOString(),
  status: row.status,
  unmatchedReason: row.unmatchedReason,
  resolvedBy: row.resolvedBy,
  resolvedNote: row.resolvedNote,
  createdAt: row.createdAt.toISOString(),
  payment: row.payment ? toPayment(row.payment) : null,
});

const notFound = () => new NotFoundException('Giao dịch ngân hàng không tồn tại');
const notUnmatched = (status: BankTxStatus) =>
  new ConflictException({
    code: 'BANK_TX_NOT_UNMATCHED',
    message: `Giao dịch đã được xử lý (${status}), không thể xử lý lại`,
  });

/**
 * Admin reconciliation of SePay transfers the webhook could not match (docs/21 §3.5): list `bank_transactions`, assign
 * one to a payment (the payment is confirmed through `confirmPaid`, so it grants what it bought), or ignore it.
 */
@Injectable()
export class BankTransactionsService {
  private readonly logger = new Logger(BankTransactionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  /** Newest first by arrival; `nextBefore` continues the list, null at the end. */
  async list({ status, before = new Date(), limit = 30 }: BankTransactionsQueryDto = {}): Promise<{
    entries: BankTransactionView[];
    nextBefore: string | null;
  }> {
    const take = Math.min(Math.max(limit, 1), BANK_TX_MAX_LIMIT);
    const rows = await this.prisma.bankTransaction.findMany({
      where: { createdAt: { lt: before }, ...(status ? { status } : {}) },
      include: { payment: { select: paymentSelect } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
    });
    const page = rows.slice(0, take);
    return {
      entries: page.map(toView),
      nextBefore: rows.length > take ? page[page.length - 1].createdAt.toISOString() : null,
    };
  }

  /** Preview for the assign dialog: the VietQR payment with this reference, 404 when there is none. */
  async paymentByReference(reference: string): Promise<BankTransactionPayment> {
    const payment = await this.prisma.payment.findFirst({
      where: { reference: reference.trim().toUpperCase(), provider: PaymentProvider.VIETQR },
      select: paymentSelect,
    });
    if (!payment) throw new NotFoundException('Không tìm thấy thanh toán với mã này');
    return toPayment(payment);
  }

  async resolve(id: string, dto: ResolveBankTransactionDto, actorId: string): Promise<BankTransactionView> {
    if (dto.action === 'assign') return this.assign(id, dto.paymentReference!, dto.note, actorId);
    return this.ignore(id, dto.note!, actorId);
  }

  private async ignore(id: string, note: string, actorId: string): Promise<BankTransactionView> {
    const updated = await this.prisma.bankTransaction.updateMany({
      where: { id, status: BankTxStatus.UNMATCHED },
      data: { status: BankTxStatus.IGNORED, resolvedBy: actorId, resolvedNote: note },
    });
    if (updated.count === 0) {
      const current = await this.prisma.bankTransaction.findUnique({ where: { id }, select: { status: true } });
      throw current ? notUnmatched(current.status) : notFound();
    }
    this.logger.log(`bank_tx.ignored id=${id} by=${actorId}`);
    return this.view(id);
  }

  private async assign(
    id: string,
    reference: string,
    note: string | undefined,
    actorId: string,
  ): Promise<BankTransactionView> {
    await this.prisma.$transaction(async (tx) => {
      // Lock the transfer first, so two admins assigning it at once cannot both confirm a payment.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM bank_transactions WHERE id = ${id}::uuid FOR UPDATE`;
      if (locked.length === 0) throw notFound();
      const bankTx = await tx.bankTransaction.findUniqueOrThrow({ where: { id } });
      if (bankTx.status !== BankTxStatus.UNMATCHED) throw notUnmatched(bankTx.status);

      // A VNPay payment is never paid by a bank transfer (docs/21 §6).
      const payment = await tx.payment.findFirst({
        where: { reference, provider: PaymentProvider.VIETQR },
        select: { id: true, amountVnd: true, status: true },
      });
      if (!payment) throw new NotFoundException('Không tìm thấy thanh toán với mã này');
      if (payment.status === PaymentStatus.PAID) {
        throw new ConflictException({ code: 'PAYMENT_ALREADY_PAID', message: 'Thanh toán này đã được trả' });
      }
      if (bankTx.amountVnd < payment.amountVnd) {
        throw new BadRequestException({
          code: 'AMOUNT_TOO_LOW',
          message: `Số tiền chuyển (${bankTx.amountVnd}) nhỏ hơn số tiền thanh toán (${payment.amountVnd})`,
        });
      }

      // confirmPaid locks the payment and answers 409 for one that cannot be paid any more (CANCELLED).
      await this.payments.confirmPaid(tx, payment.id, {
        via: PaymentConfirmation.ADMIN,
        providerTxnId: bankTx.externalId,
        allowExpired: true,
      });
      await tx.bankTransaction.update({
        where: { id },
        data: {
          status: BankTxStatus.RESOLVED,
          paymentId: payment.id,
          extractedReference: bankTx.extractedReference ?? reference,
          resolvedBy: actorId,
          resolvedNote: note ?? null,
        },
      });
    });
    this.logger.log(`bank_tx.assigned id=${id} reference=${reference} by=${actorId}`);
    return this.view(id);
  }

  private async view(id: string): Promise<BankTransactionView> {
    const row = await this.prisma.bankTransaction.findUniqueOrThrow({
      where: { id },
      include: { payment: { select: paymentSelect } },
    });
    return toView(row);
  }
}
