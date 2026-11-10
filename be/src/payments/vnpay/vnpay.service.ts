import { HttpException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Payment, PaymentConfirmation, PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma';
import { PaymentsService, type PaymentView } from '../payments.service';
import { isVnpaySuccess, vnpayAmount, vnpayAmountOf } from './vnpay';
import { VnpayGateway } from './vnpay.gateway';

/** The JSON VNPay reads from the IPN answer (docs: "RspCode" + "Message"). */
export interface VnpayIpnResponse {
  RspCode: '00' | '01' | '02' | '04' | '97' | '99';
  Message: string;
}

/** What the customer sees after coming back from VNPay. */
export interface VnpayReturnResult {
  /** `success` = paid (by this return or an earlier IPN); `failed` = the customer cancelled or the bank refused; `invalid` = bad signature or wrong amount. */
  result: 'success' | 'failed' | 'invalid';
  /** The payment, null when the signature is bad (nothing in the query is trusted). */
  payment: PaymentView | null;
}

/**
 * VNPay sandbox confirmation (docs/21 §3.4): the IPN (server to server) and the return page both confirm the payment
 * through `PaymentsService.confirmPaid`, which locks the row, so whichever comes second finds it PAID and grants
 * nothing more.
 */
@Injectable()
export class VnpayService {
  private readonly logger = new Logger(VnpayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly gateway: VnpayGateway,
  ) {}

  /** Answers the IPN. Never throws: VNPay retries on anything but `00` / `02`, so every outcome is a response code. */
  async ipn(query: Record<string, unknown>): Promise<VnpayIpnResponse> {
    const { valid, params } = this.gateway.verify(query);
    // The signature is checked before anything else is read from the query; the hash itself is never logged.
    if (!valid) {
      this.logger.warn('vnpay.ipn rejected: bad signature');
      return { RspCode: '97', Message: 'Invalid signature' };
    }

    try {
      const response = await this.prisma.$transaction((tx) => this.confirmFromIpn(tx, params));
      this.logger.log(`vnpay.ipn ref=${params.vnp_TxnRef} code=${response.RspCode}`);
      return response;
    } catch (error) {
      this.logger.error(`vnpay.ipn failed ref=${params.vnp_TxnRef}: ${error instanceof Error ? error.message : String(error)}`);
      return { RspCode: '99', Message: 'Unknown error' };
    }
  }

  private async confirmFromIpn(tx: Prisma.TransactionClient, params: Record<string, string>): Promise<VnpayIpnResponse> {
    const payment = await this.lockByReference(tx, params.vnp_TxnRef);
    // A VietQR payment is never confirmed from VNPay: real accounts do not get benefits from the sandbox (docs/21 §6).
    if (!payment || payment.provider !== PaymentProvider.VNPAY) return { RspCode: '01', Message: 'Order not found' };
    if (vnpayAmountOf(params) !== vnpayAmount(payment.amountVnd)) return { RspCode: '04', Message: 'Invalid amount' };
    if (payment.status === PaymentStatus.PAID) return { RspCode: '02', Message: 'Order already confirmed' };

    if (isVnpaySuccess(params)) {
      await this.payments.confirmPaid(tx, payment.id, {
        via: PaymentConfirmation.VNPAY_IPN,
        providerTxnId: params.vnp_TransactionNo,
      });
    }
    // A failed payment is acknowledged without granting anything: the IPN was processed, and an error code would only
    // make VNPay retry it for nothing (the docs' PHP and C# samples do the same). The payment stays PENDING until it
    // expires, so the customer may try again.
    return { RspCode: '00', Message: 'Confirm Success' };
  }

  /**
   * The customer is back from VNPay (their cookie is on the request, so the payment must be theirs). A valid signature
   * and a success code also confirm the payment: the IPN cannot reach a developer's machine. Safe to call again.
   */
  async returned(userId: string, query: Record<string, unknown>): Promise<VnpayReturnResult> {
    const { valid, params } = this.gateway.verify(query);
    if (!valid) {
      this.logger.warn('vnpay.return rejected: bad signature');
      return { result: 'invalid', payment: null };
    }

    const payment = await this.prisma.payment.findFirst({
      where: { reference: params.vnp_TxnRef, userId, provider: PaymentProvider.VNPAY },
      select: { id: true, amountVnd: true },
    });
    if (!payment) throw new NotFoundException('Thanh toán không tồn tại');
    if (vnpayAmountOf(params) !== vnpayAmount(payment.amountVnd)) {
      return { result: 'invalid', payment: await this.payments.get(payment.id, userId) };
    }

    let result: VnpayReturnResult['result'] = isVnpaySuccess(params) ? 'success' : 'failed';
    if (result === 'success') {
      try {
        await this.prisma.$transaction((tx) =>
          this.payments.confirmPaid(tx, payment.id, {
            via: PaymentConfirmation.VNPAY_RETURN,
            providerTxnId: params.vnp_TransactionNo,
          }),
        );
      } catch (error) {
        // Paid at the gateway but the payment had already expired here: nothing is granted, the customer is told it failed.
        if (!(error instanceof HttpException) || error.getStatus() !== 409) throw error;
        this.logger.warn(`vnpay.return success after expiry ref=${params.vnp_TxnRef} payment=${payment.id}`);
        result = 'failed';
      }
    }
    return { result, payment: await this.payments.get(payment.id, userId) };
  }

  private async lockByReference(tx: Prisma.TransactionClient, reference: string | undefined): Promise<Payment | null> {
    if (!reference) return null;
    const found = await tx.payment.findUnique({ where: { reference }, select: { id: true } });
    if (!found) return null;
    await tx.$queryRaw`SELECT id FROM payments WHERE id = ${found.id}::uuid FOR UPDATE`;
    return tx.payment.findUnique({ where: { id: found.id } });
  }
}
