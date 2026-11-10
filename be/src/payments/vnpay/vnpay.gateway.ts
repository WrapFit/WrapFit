import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '../../common';
import { buildPayUrl, verifyQuery, vnpayIp, type VerifiedQuery } from './vnpay';

/**
 * VNPay settings and the two operations that need them (docs/21 §3.4). Depends on nothing but the config, so
 * `PaymentsService` (which hands out the pay URL) and `VnpayService` (which confirms from the IPN) can both use it.
 */
@Injectable()
export class VnpayGateway implements OnModuleInit {
  private readonly logger = new Logger(VnpayGateway.name);
  private readonly settings: { tmnCode: string; hashSecret: string; payUrl: string; returnUrl: string } | null;

  constructor(config: ConfigService) {
    const { tmnCode, hashSecret, payUrl, returnUrl } = config.get('payments.vnpay');
    this.settings = tmnCode && hashSecret ? { tmnCode, hashSecret, payUrl, returnUrl } : null;
  }

  onModuleInit(): void {
    if (!this.settings) {
      this.logger.warn(
        'VNPAY_TMN_CODE / VNPAY_HASH_SECRET are not set: demo accounts cannot open the VNPay sandbox and every VNPay IPN is answered 97.',
      );
    }
  }

  get configured(): boolean {
    return this.settings !== null;
  }

  /** Signed pay URL of a payment; throws when VNPay is not configured (callers check `configured` first). */
  payUrlFor(payment: { reference: string; amountVnd: number; createdAt: Date; expiresAt: Date }, ip: string | undefined): string {
    if (!this.settings) throw new Error('VNPay is not configured');
    return buildPayUrl({
      ...this.settings,
      reference: payment.reference,
      amountVnd: payment.amountVnd,
      ipAddr: vnpayIp(ip),
      createdAt: payment.createdAt,
      expiresAt: payment.expiresAt,
      orderInfo: `Thanh toan ${payment.reference}`,
    });
  }

  /** Signature check of a return-URL or IPN query; never valid while VNPay is not configured. */
  verify(query: Record<string, unknown>): VerifiedQuery {
    return this.settings ? verifyQuery(query, this.settings.hashSecret) : { valid: false, params: {} };
  }
}
