import { ENTITLEMENTS, EXPORT_PACK_IDS, exportLotExpiresAt, isExportPackId, requiredPlanFor, resolvePlan } from '@wrapfit/shared';

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
  it('keeps the ids of the export packs no longer sold, for old payments', () => {
    expect(EXPORT_PACK_IDS).toEqual(['EXPORT_1', 'EXPORT_5', 'EXPORT_15']);
    expect(isExportPackId('EXPORT_5')).toBe(true);
    expect(isExportPackId('XU_500')).toBe(false);
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
