import { HttpException, Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import {
  BankTxStatus,
  BankTxUnmatchedReason,
  PaymentConfirmation,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { ConfigService } from '../../common';
import { PrismaService } from '../../shared/prisma';
import { PaymentsService } from '../payments.service';
import {
  authorizationMatches,
  extractReferences,
  parseSepayDate,
  parseSepayPayload,
  type SepayWebhookPayload,
} from './sepay-webhook';

/** What a webhook did, for the log and the tests; the HTTP answer is always `{ success: true }`. */
export type SepayOutcome =
  | { result: 'DUPLICATE' }
  | { result: 'IGNORED' }
  | { result: 'MATCHED'; paymentId: string }
  | { result: 'UNMATCHED'; reason: BankTxUnmatchedReason; paymentId: string | null };

/**
 * SePay bank webhook (docs/21 §3.3). SePay posts every transaction of the linked account; this stores each incoming
 * one in `bank_transactions` (the `external_id` unique key makes a replay a no-op) and, when the transfer content has
 * a WF reference whose VietQR payment is still PENDING and the amount is exactly right, confirms that payment in the
 * same transaction. Anything else is stored UNMATCHED with a reason, for an admin to reconcile.
 */
@Injectable()
export class SepayWebhookService implements OnModuleInit {
  private readonly logger = new Logger(SepayWebhookService.name);
  private readonly apiKey: string | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    config: ConfigService,
  ) {
    this.apiKey = config.get('payments.sepay.webhookApiKey');
  }

  onModuleInit(): void {
    if (!this.apiKey) {
      this.logger.error(
        'SEPAY_WEBHOOK_API_KEY is not set: every POST /api/webhooks/sepay is rejected with 401, so real bank transfers will not confirm payments. Set it before taking money.',
      );
    }
  }

  /** Throws 401 unless the `Authorization` header carries the configured key. The header is never logged. */
  authorize(authorization: string | undefined): void {
    if (!authorizationMatches(authorization, this.apiKey)) {
      this.logger.warn('sepay.webhook rejected: bad or missing api key');
      throw new UnauthorizedException({ code: 'INVALID_WEBHOOK_KEY', message: 'Invalid webhook key' });
    }
  }

  /**
   * Handles one authorized webhook body. Money that is not "in" is skipped without a row (the table is the log of
   * incoming money; IGNORED is reserved for an admin's decision, docs/21 §3.5). Throws SepayPayloadError for a body
   * that cannot be stored; a database error propagates, so SePay retries.
   */
  async handle(body: unknown): Promise<SepayOutcome> {
    const payload = parseSepayPayload(body);
    if (payload.transferType !== 'in') {
      this.logger.log(`sepay.webhook skipped id=${payload.id} transferType=${payload.transferType}`);
      return { result: 'IGNORED' };
    }
    const amountVnd = Math.round(payload.transferAmount);
    if (amountVnd <= 0 || amountVnd > 2_147_483_647) {
      // bank_transactions.amount_vnd is a positive int; keep the evidence in the log, not in the table.
      this.logger.warn(`sepay.webhook unusable amount id=${payload.id} amount=${payload.transferAmount}`);
      return { result: 'IGNORED' };
    }

    const raw = body as Prisma.InputJsonObject;
    const outcome = await this.prisma.$transaction((tx) => this.store(tx, payload, amountVnd, raw));
    this.logger.log(
      `sepay.webhook id=${payload.id} amount=${amountVnd} result=${outcome.result}` +
        ('reason' in outcome ? ` reason=${outcome.reason}` : '') +
        ('paymentId' in outcome && outcome.paymentId ? ` payment=${outcome.paymentId}` : ''),
    );
    return outcome;
  }

  private async store(
    tx: Prisma.TransactionClient,
    payload: SepayWebhookPayload,
    amountVnd: number,
    raw: Prisma.InputJsonObject,
  ): Promise<SepayOutcome> {
    const externalId = String(payload.id);
    const references = extractReferences(payload.content, payload.code);
    const inserted = await tx.bankTransaction.createMany({
      data: {
        externalId,
        gateway: payload.gateway,
        accountNo: payload.accountNumber,
        amountVnd,
        content: payload.content,
        bankReference: payload.referenceCode,
        extractedReference: references[0] ?? null,
        transactionAt: parseSepayDate(payload.transactionDate, new Date()),
        status: BankTxStatus.UNMATCHED,
        raw,
      },
      skipDuplicates: true,
    });
    if (inserted.count === 0) return { result: 'DUPLICATE' };

    const unmatched = async (
      reason: BankTxUnmatchedReason,
      paymentId: string | null,
      extracted?: string,
    ): Promise<SepayOutcome> => {
      await tx.bankTransaction.update({
        where: { externalId },
        data: { unmatchedReason: reason, paymentId, ...(extracted ? { extractedReference: extracted } : {}) },
      });
      return { result: 'UNMATCHED', reason, paymentId };
    };

    if (references.length === 0) return unmatched(BankTxUnmatchedReason.NO_REFERENCE, null);

    // A VNPay payment's reference is never matched here: demo accounts never take the real-money path (docs/21 §6).
    const candidates = await tx.payment.findMany({
      where: { reference: { in: references }, provider: PaymentProvider.VIETQR },
      select: { id: true, reference: true },
    });
    const found = references.map((reference) => candidates.find((c) => c.reference === reference)).find(Boolean);
    if (!found) return unmatched(BankTxUnmatchedReason.NOT_FOUND, null);

    // Lock the payment before judging it, so a simulate click that races this webhook cannot change it between the
    // check and the confirmation. confirmPaid locks again (no-op).
    await tx.$queryRaw`SELECT id FROM payments WHERE id = ${found.id}::uuid FOR UPDATE`;
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: found.id } });

    if (payment.status === PaymentStatus.PAID) {
      return unmatched(BankTxUnmatchedReason.ALREADY_PAID, payment.id, payment.reference);
    }
    if (payment.status !== PaymentStatus.PENDING || payment.expiresAt <= new Date()) {
      return unmatched(BankTxUnmatchedReason.EXPIRED, payment.id, payment.reference);
    }
    if (payment.amountVnd !== amountVnd) {
      return unmatched(BankTxUnmatchedReason.AMOUNT_MISMATCH, payment.id, payment.reference);
    }

    try {
      await this.payments.confirmPaid(tx, payment.id, {
        via: PaymentConfirmation.SEPAY_WEBHOOK,
        providerTxnId: externalId,
      });
    } catch (error) {
      // Expired in the milliseconds between our check and confirmPaid's own: confirmPaid throws before writing.
      if (error instanceof HttpException && error.getStatus() === 409) {
        return unmatched(BankTxUnmatchedReason.EXPIRED, payment.id, payment.reference);
      }
      throw error;
    }
    await tx.bankTransaction.update({
      where: { externalId },
      data: { status: BankTxStatus.MATCHED, paymentId: payment.id, extractedReference: payment.reference },
    });
    return { result: 'MATCHED', paymentId: payment.id };
  }
}
