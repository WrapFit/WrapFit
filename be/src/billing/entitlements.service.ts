import { Injectable } from '@nestjs/common';
import { SubscriptionTier } from '@prisma/client';
import { ENTITLEMENTS, type Entitlements } from '@wrapfit/shared';
import { PlanService } from './plan.service';

/** Limits of a user's effective plan (docs/16 §3). Syncs the plan first, so an expired period never grants anything. */
@Injectable()
export class EntitlementsService {
  constructor(private readonly plans: PlanService) {}

  async of(userId: string): Promise<{ tier: SubscriptionTier; entitlements: Entitlements }> {
    const tier = await this.plans.sync(userId);
    return { tier, entitlements: ENTITLEMENTS[tier] };
  }
}
