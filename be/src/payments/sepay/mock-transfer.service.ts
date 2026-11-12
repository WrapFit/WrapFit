import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { PrismaService } from '../../shared/prisma';
import { PaymentsService, type PaymentView } from '../payments.service';
import { SepayWebhookService } from './sepay-webhook.service';

/** `gateway` of every mock row: the admin page badges it and the sweeper deletes only these. */
export const MOCK_GATEWAY = 'MOCK';

/** A mock row lives this long after it was created, then the sweeper removes it. */
export const MOCK_TTL_MS = 30 * 60 * 1000;
const SWEEP_EVERY_MS = 60 * 1000;

export const MOCK_SCENARIOS = ['exact', 'underpaid', 'no_reference'] as const;
export type MockScenario = (typeof MOCK_SCENARIOS)[number];

/**
 * PAYMENT_SIMULATION only: pretends the bank told SePay about a transfer for one of the caller's VietQR payments and
 * runs it through the real webhook handler, so the row lands in `bank_transactions` and the admin reconciliation page
 * sees it like a real one (exact = MATCHED, the others = UNMATCHED for the admin to resolve). Mock rows are swept
 * after MOCK_TTL_MS so a demo leaves no trace in the queue; what the payment granted stays.
 */
@Injectable()
export class MockTransferService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MockTransferService.name);
  private timer: NodeJS.Timeout | null = null;
  private seq = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly sepay: SepayWebhookService,
  ) {}

  onModuleInit(): void {
    if (!this.payments.simulationEnabled) return;
    this.timer = setInterval(() => void this.sweep(), SWEEP_EVERY_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async simulate(paymentId: string, userId: string, scenario: MockScenario): Promise<PaymentView> {
    if (!this.payments.simulationEnabled) throw new NotFoundException();
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId, userId } });
    if (!payment) throw new NotFoundException('Thanh toán không tồn tại');
    if (payment.provider !== PaymentProvider.VIETQR) {
      throw new BadRequestException({ code: 'NOT_VIETQR', message: 'Chỉ giả lập chuyển khoản cho thanh toán VietQR' });
    }

    const amount = scenario === 'underpaid' ? Math.max(1000, payment.amountVnd - 10_000) : payment.amountVnd;
    const content = scenario === 'no_reference' ? 'CHUYEN TIEN WRAPFIT' : `${payment.reference} CHUYEN TIEN WRAPFIT`;
    // Positive, unique across restarts and concurrent users: SePay ids are positive integers.
    const id = Date.now() * 1000 + (this.seq++ % 1000);

    await this.sepay.handle({
      id,
      gateway: MOCK_GATEWAY,
      transactionDate: '',
      accountNumber: '0000000000',
      code: null,
      content,
      transferType: 'in',
      transferAmount: amount,
      accumulated: 0,
      referenceCode: `MOCK${id}`,
      description: `mock ${scenario} by user ${userId}`,
    });
    return this.payments.get(paymentId, userId);
  }

  /** Deletes mock rows older than MOCK_TTL_MS. */
  async sweep(): Promise<number> {
    try {
      const { count } = await this.prisma.bankTransaction.deleteMany({
        where: { gateway: MOCK_GATEWAY, createdAt: { lt: new Date(Date.now() - MOCK_TTL_MS) } },
      });
      if (count > 0) this.logger.log(`mock.sweep deleted=${count}`);
      return count;
    } catch (error) {
      this.logger.warn(`mock.sweep failed: ${(error as Error).message}`);
      return 0;
    }
  }
}
