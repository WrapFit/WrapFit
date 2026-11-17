import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, SubscriptionStatus, SubscriptionTier } from '@prisma/client';
import type { BillingDetails, BillingDetailsDto } from './dto/billing-details.dto';
import { ENTITLEMENTS, type Entitlements } from '@wrapfit/shared';
import { ConfigService } from '../common';
import { PrismaService } from '../shared/prisma';
import { userAnonymized } from '../users/user-removal';
import { CreditsService } from './credits.service';
import type { GrantCreditsDto } from './dto/grant-credits.dto';
import { PlanService } from './plan.service';
import { XuWalletService, type XuWalletView } from './xu-wallet.service';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface BillingSummary {
  tier: SubscriptionTier;
  entitlements: Entitlements;
  /** Xu Wrap for every AI task (docs/19). */
  xu: XuWalletView;
  subscription: {
    plan: SubscriptionTier;
    status: SubscriptionStatus;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  } | null;
  /** PAYMENT_SIMULATION and a demo account: the checkout shows "Giả lập đã thanh toán" (CP4 demo, docs/17 M6). */
  paymentSimulation: boolean;
  /** Demo account (users.is_demo): the wallet shows VNPay sandbox instead of VietQR (docs/21 S5). */
  isDemo: boolean;
}

/** HTTP side of billing: the summary of `GET /billing/me` and the admin grant. */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly plans: PlanService,
    private readonly xuWallet: XuWalletService,
    private readonly config: ConfigService,
  ) {}

  /** VAT invoice details of the user, empty strings when never filled. */
  async details(userId: string): Promise<BillingDetails> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { billingDetails: true } });
    const stored = (user.billingDetails ?? {}) as Partial<BillingDetails>;
    return { company: stored.company ?? '', taxCode: stored.taxCode ?? '', email: stored.email ?? '' };
  }

  async saveDetails(userId: string, dto: BillingDetailsDto): Promise<BillingDetails> {
    const details: BillingDetails = { company: dto.company, taxCode: dto.taxCode, email: dto.email.toLowerCase() };
    const empty = !details.company && !details.taxCode && !details.email;
    await this.prisma.user.update({
      where: { id: userId },
      data: { billingDetails: empty ? Prisma.DbNull : { ...details } },
    });
    return details;
  }

  async me(userId: string): Promise<BillingSummary> {
    // The wallet syncs the plan before it grants the allowance of the period, so it goes first.
    const xu = await this.xuWallet.wallet(userId);
    const [user, subscription] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { subscriptionTier: true, isDemo: true } }),
      this.prisma.subscription.findFirst({
        where: { userId, status: 'ACTIVE' },
        select: { plan: true, status: true, currentPeriodStart: true, currentPeriodEnd: true },
      }),
    ]);
    const tier = user.subscriptionTier;
    return {
      tier,
      entitlements: ENTITLEMENTS[tier],
      xu,
      subscription,
      // Only a demo account may simulate a payment (docs/25 item 6): the checkout hides the button from the others.
      paymentSimulation: this.config.get('payments.simulation') && user.isDemo,
      isDemo: user.isDemo,
    };
  }

  /** Xu granted by hand (demo accounts, compensation): source ADMIN, so the plan does not change. */
  async grantByAdmin(userId: string, dto: GrantCreditsDto, actorId: string) {
    const kind = 'XU';
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { anonymizedAt: true } });
    if (!user) throw new NotFoundException('User not found');
    if (user.anonymizedAt) throw userAnonymized();

    const expiresAt = dto.expiresInDays ? new Date(Date.now() + dto.expiresInDays * DAY_MS) : null;
    const lot = await this.credits.grant(userId, {
      kind,
      quantity: dto.quantity,
      source: 'ADMIN',
      expiresAt,
      note: dto.note,
    });
    this.logger.log(`credits.granted user=${userId} kind=${kind} quantity=${dto.quantity} lot=${lot.id} by=${actorId}`);
    return { lot, balance: await this.credits.balance(userId, this.prisma, { kind }) };
  }
}
