import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SubscriptionStatus, SubscriptionTier } from '@prisma/client';
import { ENTITLEMENTS, type Entitlements } from '@wrapfit/shared';
import { ConfigService } from '../common';
import { PrismaService } from '../shared/prisma';
import { CreditsService, type CreditLotView } from './credits.service';
import type { GrantCreditsDto } from './dto/grant-credits.dto';
import { PlanService } from './plan.service';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface BillingSummary {
  tier: SubscriptionTier;
  entitlements: Entitlements;
  exportCredits: { balance: number; lots: CreditLotView[] };
  subscription: {
    plan: SubscriptionTier;
    status: SubscriptionStatus;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  } | null;
  /** PAYMENT_SIMULATION: the checkout shows "Giả lập đã thanh toán" (CP4 demo, docs/17 M6). */
  paymentSimulation: boolean;
}

/** HTTP side of billing: the summary of `GET /billing/me` and the admin grant. */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly plans: PlanService,
    private readonly config: ConfigService,
  ) {}

  async me(userId: string): Promise<BillingSummary> {
    const tier = await this.plans.sync(userId);
    const [lots, subscription] = await Promise.all([
      this.credits.lots(userId),
      this.prisma.subscription.findFirst({
        where: { userId, status: 'ACTIVE' },
        select: { plan: true, status: true, currentPeriodStart: true, currentPeriodEnd: true },
      }),
    ]);
    const balance = lots.reduce((sum, lot) => sum + lot.remaining, 0);
    return {
      tier,
      entitlements: ENTITLEMENTS[tier],
      exportCredits: { balance, lots },
      subscription,
      paymentSimulation: this.config.get('payments.simulation'),
    };
  }

  /** Credits granted by hand (demo accounts, compensation): source ADMIN, so the plan does not change. */
  async grantByAdmin(userId: string, dto: GrantCreditsDto, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');

    const expiresAt = dto.expiresInDays ? new Date(Date.now() + dto.expiresInDays * DAY_MS) : null;
    const lot = await this.credits.grant(userId, { quantity: dto.quantity, source: 'ADMIN', expiresAt, note: dto.note });
    this.logger.log(`credits.granted user=${userId} quantity=${dto.quantity} lot=${lot.id} by=${actorId}`);
    return { lot, balance: await this.credits.balance(userId) };
  }
}
