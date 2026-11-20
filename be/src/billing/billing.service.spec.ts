import type { ConfigService } from '../common';
import type { PrismaService } from '../shared/prisma';
import { BillingService } from './billing.service';
import type { CreditsService } from './credits.service';
import type { PlanService } from './plan.service';
import type { XuWalletService } from './xu-wallet.service';

describe('BillingService.me', () => {
  const build = (isDemo: boolean) => {
    const prisma = {
      user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ subscriptionTier: 'FREE', isDemo }) },
      subscription: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    // No export credit is read any more (docs-old/25 item 7): any call to the ledger fails the test.
    const credits = {};
    const xuWallet = { wallet: jest.fn().mockResolvedValue({ balance: 100 }) };
    const config = { get: jest.fn().mockReturnValue(true) };
    const service = new BillingService(
      prisma as unknown as PrismaService,
      credits as unknown as CreditsService,
      {} as PlanService,
      xuWallet as unknown as XuWalletService,
      config as unknown as ConfigService,
    );
    return { service, prisma };
  };

  it.each([true, false])('reports isDemo=%s of the account next to the plan summary', async (isDemo) => {
    const { service, prisma } = build(isDemo);
    const summary = await service.me('user-1');
    // Simulation is on (config): only a demo account is offered the button (docs-old/25 item 6).
    expect(summary).toMatchObject({ tier: 'FREE', isDemo, paymentSimulation: isDemo, xu: { balance: 100 } });
    expect(summary).not.toHaveProperty('exportCredits');
    expect(prisma.user.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { subscriptionTier: true, isDemo: true },
    });
  });
});
