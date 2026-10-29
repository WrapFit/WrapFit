import { Injectable, Logger } from '@nestjs/common';
import { Prisma, SubscriptionTier } from '@prisma/client';
import { resolvePlan, type SubscriptionPlan } from '@wrapfit/shared';
import { PrismaService } from '../shared/prisma';

type Db = PrismaService | Prisma.TransactionClient;

/** Tiers granted by hand before billing existed (seed admin, manual upgrades): kept while the user has no subscription. */
const MANUAL_TIERS: readonly SubscriptionTier[] = ['STARTER', 'PRO_BUSINESS'];

/**
 * Keeps `users.subscription_tier` (a cache read by storage, AI and export limits) equal to the plan computed from the
 * billing tables. Called after every payment or grant and before reading entitlements, so an ended Pro period takes
 * effect on the next request without a cron.
 */
@Injectable()
export class PlanService {
  private readonly logger = new Logger(PlanService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sync(userId: string, db: Db = this.prisma, now = new Date()): Promise<SubscriptionTier> {
    await db.subscription.updateMany({
      where: { userId, status: 'ACTIVE', currentPeriodEnd: { lte: now } },
      data: { status: 'EXPIRED' },
    });
    const [user, subscription, purchasedLot] = await Promise.all([
      db.user.findUniqueOrThrow({ where: { id: userId }, select: { subscriptionTier: true } }),
      db.subscription.findFirst({
        where: { userId },
        orderBy: { currentPeriodEnd: 'desc' },
        select: { plan: true, status: true, currentPeriodEnd: true },
      }),
      db.creditLot.findFirst({
        where: { userId, kind: 'EXPORT', source: 'PURCHASE', expiresAt: { gt: now } },
        select: { id: true },
      }),
    ]);

    if (!subscription && MANUAL_TIERS.includes(user.subscriptionTier)) return user.subscriptionTier;

    const tier = resolvePlan({
      // chk_subscriptions_plan: a subscription is always STARTER or PRO_BUSINESS.
      subscription: subscription && { ...subscription, plan: subscription.plan as SubscriptionPlan },
      hasUnexpiredPurchasedExportLot: purchasedLot !== null,
      now,
    });
    if (tier !== user.subscriptionTier) {
      await db.user.update({ where: { id: userId }, data: { subscriptionTier: tier } });
      this.logger.log(`plan.changed user=${userId} ${user.subscriptionTier} -> ${tier}`);
    }
    return tier;
  }
}
