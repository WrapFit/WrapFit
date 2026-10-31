import {
  AI_IMAGE_MODELS,
  MIN_XU_MARGIN,
  nearestAspectRatio,
  XU_ALLOWANCE,
  XU_PACKS,
  XU_PATTERN_COST,
  XU_VALUE_VND,
  xuAllowancePeriod,
  xuMargin,
} from '@wrapfit/shared';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('xuAllowancePeriod', () => {
  it('uses the calendar month in Vietnam time for a free plan, and lives until the end of the next month', () => {
    // 2026-10-31 18:00 UTC is already 1 November in Vietnam (UTC+7).
    const period = xuAllowancePeriod('FREE', null, new Date('2026-10-31T18:00:00Z'));
    expect(period).toEqual({
      periodKey: 'FREE:2026-11',
      quantity: XU_ALLOWANCE.FREE,
      startsAt: new Date('2026-10-31T17:00:00Z'),
      endsAt: new Date('2026-11-30T17:00:00Z'),
      expiresAt: new Date('2026-12-31T17:00:00Z'),
    });
  });

  it('crosses the year', () => {
    const period = xuAllowancePeriod('PAY_PER_EXPORT', null, new Date('2026-12-15T00:00:00Z'));
    expect(period.periodKey).toBe('PAY_PER_EXPORT:2026-12');
    expect(period.expiresAt).toEqual(new Date('2027-01-31T17:00:00Z'));
  });

  it('counts 30-day periods from the start of a paid subscription', () => {
    const subscription = {
      id: 'sub-1',
      currentPeriodStart: new Date('2026-10-01T09:00:00Z'),
      currentPeriodEnd: new Date('2026-12-30T09:00:00Z'), // renewed twice
    };
    const period = xuAllowancePeriod('STARTER', subscription, new Date('2026-11-05T00:00:00Z'));
    expect(period).toEqual({
      periodKey: 'sub:sub-1:1',
      quantity: XU_ALLOWANCE.STARTER,
      startsAt: new Date(subscription.currentPeriodStart.getTime() + 30 * DAY_MS),
      endsAt: new Date(subscription.currentPeriodStart.getTime() + 60 * DAY_MS),
      expiresAt: new Date(subscription.currentPeriodStart.getTime() + 90 * DAY_MS),
    });
  });

  it('falls back to the calendar month for a paid tier without a live subscription (granted by hand)', () => {
    const ended = { id: 'sub-1', currentPeriodStart: new Date('2026-08-01Z'), currentPeriodEnd: new Date('2026-08-31Z') };
    expect(xuAllowancePeriod('STARTER', null, new Date('2026-11-05Z')).periodKey).toBe('STARTER:2026-11');
    expect(xuAllowancePeriod('STARTER', ended, new Date('2026-11-05Z')).periodKey).toBe('STARTER:2026-11');
  });
});

describe('xu prices', () => {
  it.each(AI_IMAGE_MODELS.map((model) => [model.key, model] as const))(
    '%s earns at least the minimum margin over its provider cost',
    (_key, model) => {
      expect(xuMargin(model)).toBeGreaterThanOrEqual(MIN_XU_MARGIN);
    },
  );

  it('sells packs at the list price of a xu or below (bonus xu), never above', () => {
    for (const pack of Object.values(XU_PACKS)) {
      expect(pack.priceVnd / pack.xu).toBeLessThanOrEqual(XU_VALUE_VND);
    }
  });

  it('prices a premium AI pattern above its ~2.500đ model cost', () => {
    expect(XU_PATTERN_COST.premium * XU_VALUE_VND).toBeGreaterThanOrEqual(2_500 * MIN_XU_MARGIN);
  });
});

describe('nearestAspectRatio', () => {
  it('picks the supported ratio closest to the box face', () => {
    expect(nearestAspectRatio(100, 100)).toBe('1:1');
    expect(nearestAspectRatio(150, 100)).toBe('3:2');
    expect(nearestAspectRatio(60, 200)).toBe('9:16');
    expect(nearestAspectRatio(150, 100, ['1:1', '16:9'])).toBe('16:9');
    expect(nearestAspectRatio(120, 100, ['1:1', '16:9'])).toBe('1:1');
  });
});
