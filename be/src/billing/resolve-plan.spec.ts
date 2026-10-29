import { ENTITLEMENTS, EXPORT_PACKS, exportLotExpiresAt, requiredPlanFor, resolvePlan } from '@wrapfit/shared';

describe('resolvePlan (shared/src/billing/plans.ts)', () => {
  const now = new Date('2026-10-30T00:00:00Z');
  const later = new Date('2026-11-29T00:00:00Z');
  const earlier = new Date('2026-10-01T00:00:00Z');

  it('is FREE without a subscription or a purchased pack', () => {
    expect(resolvePlan({ subscription: null, hasUnexpiredPurchasedExportLot: false, now })).toBe('FREE');
  });

  it('is PAY_PER_EXPORT while a purchased pack is valid', () => {
    expect(resolvePlan({ subscription: null, hasUnexpiredPurchasedExportLot: true, now })).toBe('PAY_PER_EXPORT');
  });

  it('prefers a live subscription over a purchased pack', () => {
    const subscription = { plan: 'STARTER' as const, status: 'ACTIVE' as const, currentPeriodEnd: later };
    expect(resolvePlan({ subscription, hasUnexpiredPurchasedExportLot: true, now })).toBe('STARTER');
  });

  it('ignores an expired subscription, even one not yet marked EXPIRED', () => {
    const marked = { plan: 'STARTER' as const, status: 'EXPIRED' as const, currentPeriodEnd: later };
    const ended = { plan: 'STARTER' as const, status: 'ACTIVE' as const, currentPeriodEnd: earlier };
    expect(resolvePlan({ subscription: marked, hasUnexpiredPurchasedExportLot: false, now })).toBe('FREE');
    expect(resolvePlan({ subscription: ended, hasUnexpiredPurchasedExportLot: true, now })).toBe('PAY_PER_EXPORT');
  });
});

describe('prices and entitlements (shared/src/billing)', () => {
  it('sells the Path 2 export packs', () => {
    expect(Object.values(EXPORT_PACKS).map((p) => [p.credits, p.priceVnd])).toEqual([
      [1, 19_000],
      [5, 79_000],
      [15, 199_000],
    ]);
  });

  it('keeps a purchased lot 12 calendar months', () => {
    expect(exportLotExpiresAt(new Date('2026-10-30T08:00:00Z')).toISOString()).toBe('2027-10-30T08:00:00.000Z');
  });

  it('finds the cheapest plan for a limit', () => {
    expect(requiredPlanFor((e) => e.export.mode === 'UNLIMITED')).toBe('STARTER');
    expect(requiredPlanFor((e) => e.projects.max === null || e.projects.max >= 30)).toBe('PAY_PER_EXPORT');
    expect(ENTITLEMENTS.FREE.export.mode).toBe('FREE_A4');
  });
});
