import type { PrismaService } from '../shared/prisma';
import { PlanService } from './plan.service';

describe('PlanService.sync', () => {
  const now = new Date('2026-10-30T00:00:00Z');
  let prisma: {
    user: { findUniqueOrThrow: jest.Mock; update: jest.Mock };
    subscription: { updateMany: jest.Mock; findFirst: jest.Mock };
    creditLot: { findFirst: jest.Mock };
  };
  let service: PlanService;

  beforeEach(() => {
    prisma = {
      user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ subscriptionTier: 'FREE' }), update: jest.fn() },
      subscription: { updateMany: jest.fn().mockResolvedValue({ count: 0 }), findFirst: jest.fn().mockResolvedValue(null) },
      creditLot: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    service = new PlanService(prisma as unknown as PrismaService);
  });

  it('marks ended periods EXPIRED before resolving', async () => {
    await service.sync('user-1', undefined, now);
    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', status: 'ACTIVE', currentPeriodEnd: { lte: now } },
      data: { status: 'EXPIRED' },
    });
  });

  it('writes the tier only when it changed', async () => {
    prisma.creditLot.findFirst.mockResolvedValueOnce({ id: 'lot-1' });
    await expect(service.sync('user-1', undefined, now)).resolves.toBe('PAY_PER_EXPORT');
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { subscriptionTier: 'PAY_PER_EXPORT' } });

    prisma.user.update.mockClear();
    await expect(service.sync('user-1', undefined, now)).resolves.toBe('FREE');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('downgrades Pro to FREE once its period ended', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValueOnce({ subscriptionTier: 'STARTER' });
    prisma.subscription.findFirst.mockResolvedValueOnce({
      plan: 'STARTER',
      status: 'EXPIRED',
      currentPeriodEnd: new Date('2026-10-29T00:00:00Z'),
    });
    await expect(service.sync('user-1', undefined, now)).resolves.toBe('FREE');
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { subscriptionTier: 'FREE' } });
  });

  it('keeps a tier granted by hand while the user has no subscription', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValueOnce({ subscriptionTier: 'PRO_BUSINESS' });
    await expect(service.sync('admin-1', undefined, now)).resolves.toBe('PRO_BUSINESS');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
