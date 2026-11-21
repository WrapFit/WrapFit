import {
  type MatchableShop,
  PROVINCES,
  addWorkingDays,
  matchPrintShops,
  platformFeeSplit,
  shippingDaysFor,
} from '@wrapfit/shared';

/** @wrapfit/shared partners/: choosing a shop (docs/19 G.3) and the platform fee (docs/19 BR-A3). */
const shop = (over: Partial<MatchableShop> & Pick<MatchableShop, 'id' | 'provinceCode' | 'lat' | 'lng'>): MatchableShop => ({
  status: 'ACTIVE',
  maxSheetMm: { width: 1020, height: 720 },
  minQuantity: 1,
  maxQuantity: 10000,
  leadTimeDays: 3,
  sampleLeadTimeDays: 2,
  dailyCapacity: 10,
  serviceProvinces: [],
  rating: 4.8,
  completedOrders: 500,
  ...over,
});

const HCM = shop({ id: 'a-hcm', provinceCode: 'ho-chi-minh', lat: 10.8, lng: 106.6 });
const HN = shop({ id: 'b-hn', provinceCode: 'ha-noi', lat: 21.0, lng: 105.87 });
const item = { flatWidthMm: 400, flatHeightMm: 300, quantity: 1 };
// Thursday 2026-11-19, 10:00 in Vietnam.
const NOW = new Date('2026-11-19T03:00:00Z');

describe('provinces', () => {
  it('lists the 34 provinces of 2025 with unique codes', () => {
    expect(PROVINCES).toHaveLength(34);
    expect(new Set(PROVINCES.map((p) => p.code)).size).toBe(34);
  });
});

describe('addWorkingDays', () => {
  it('skips Sundays and counts in Vietnam time', () => {
    expect(addWorkingDays(NOW, 0)).toBe('2026-11-19');
    expect(addWorkingDays(NOW, 2)).toBe('2026-11-21'); // Fri, Sat
    expect(addWorkingDays(NOW, 3)).toBe('2026-11-23'); // Sunday skipped
    // 2026-11-19 20:00 UTC is already Friday in Vietnam.
    expect(addWorkingDays(new Date('2026-11-19T20:00:00Z'), 1)).toBe('2026-11-21');
  });
});

describe('shippingDaysFor', () => {
  it('grows with the distance', () => {
    expect(shippingDaysFor(true, 5)).toBe(1);
    expect(shippingDaysFor(false, 150)).toBe(2);
    expect(shippingDaysFor(false, 600)).toBe(3);
    expect(shippingDaysFor(false, 1500)).toBe(4);
    expect(shippingDaysFor(false, null)).toBe(3);
  });
});

describe('matchPrintShops', () => {
  it('recommends the shop near the recipient and dates the delivery', () => {
    const result = matchPrintShops([HCM, HN], {}, { kind: 'sample', provinceCode: 'ha-noi', items: [item], now: NOW });
    expect(result.recommendedId).toBe('b-hn');
    expect(result.matches[0]).toMatchObject({ shopId: 'b-hn', productionDays: 2, shippingDays: 1, estimatedDelivery: '2026-11-23' });
    expect(result.matches[0].reasons).toEqual(expect.arrayContaining(['recommended', 'fastest', 'nearest']));
    expect(result.matches[1]).toMatchObject({ shopId: 'a-hcm', shippingDays: 4 });
  });

  it('leaves out shops that cannot take the order, with every reason', () => {
    const paused = shop({ id: 'c', provinceCode: 'ha-noi', lat: 21, lng: 105.8, pausedUntil: '2026-12-01T00:00:00Z' });
    const local = shop({ id: 'd', provinceCode: 'can-tho', lat: 10, lng: 105.7, serviceProvinces: ['can-tho'], maxSheetMm: { width: 300, height: 200 } });
    const small = shop({ id: 'e', provinceCode: 'ha-noi', lat: 21, lng: 105.8, maxQuantity: 5 });
    const probation = shop({ id: 'f', provinceCode: 'ha-noi', lat: 21, lng: 105.8, probationUntil: '2027-01-01T00:00:00Z' });
    const review = shop({ id: 'g', provinceCode: 'ha-noi', lat: 21, lng: 105.8, status: 'REVIEW' });
    const result = matchPrintShops([paused, local, small, probation, review, HN], { f: 3 }, {
      kind: 'production',
      provinceCode: 'ha-noi',
      items: [{ ...item, quantity: 50 }],
      now: NOW,
    });
    expect(result.matches.map((m) => m.shopId)).toEqual(['b-hn']);
    expect(Object.fromEntries(result.excluded.map((e) => [e.shopId, e.reasons]))).toEqual({
      c: ['paused'],
      d: ['no_delivery', 'sheet_size'],
      e: ['quantity'],
      f: ['probation_full'],
      g: ['not_active'],
    });
  });

  it('lets a paused shop back once its date has passed', () => {
    const back = shop({ id: 'c', provinceCode: 'ha-noi', lat: 21, lng: 105.8, pausedUntil: '2026-11-01T00:00:00Z' });
    expect(matchPrintShops([back], {}, { kind: 'sample', provinceCode: null, items: [item], now: NOW }).recommendedId).toBe('c');
  });

  it('turns a dieline that fits only rotated into a fit', () => {
    const narrow = shop({ id: 'n', provinceCode: 'ha-noi', lat: 21, lng: 105.8, maxSheetMm: { width: 500, height: 700 } });
    const result = matchPrintShops([narrow], {}, { kind: 'sample', provinceCode: null, items: [{ ...item, flatWidthMm: 690, flatHeightMm: 480 }], now: NOW });
    expect(result.recommendedId).toBe('n');
  });

  it('weighs price when shops price differently', () => {
    const cheap = shop({ id: 'cheap', provinceCode: 'ho-chi-minh', lat: 10.8, lng: 106.6, rating: 4.0 });
    const prices: Record<string, number> = { cheap: 1_000_000, 'a-hcm': 1_600_000 };
    const result = matchPrintShops([HCM, cheap], {}, {
      kind: 'production',
      provinceCode: 'ho-chi-minh',
      items: [{ ...item, quantity: 100 }],
      now: NOW,
      priceOf: (s) => prices[s.id],
    });
    expect(result.recommendedId).toBe('cheap');
    expect(result.matches[0].reasons).toContain('cheapest');
  });

  it('gives a small bonus to a shop the customer ordered from', () => {
    const twin = shop({ id: 'z-hcm', provinceCode: 'ho-chi-minh', lat: 10.8, lng: 106.6, rating: 4.7 });
    const plain = matchPrintShops([HCM, twin], {}, { kind: 'sample', provinceCode: 'ho-chi-minh', items: [item], now: NOW });
    const back = matchPrintShops([HCM, twin], {}, { kind: 'sample', provinceCode: 'ho-chi-minh', items: [item], now: NOW, returningShopIds: ['z-hcm'] });
    expect(back.matches.find((m) => m.shopId === 'z-hcm')!.score).toBeGreaterThan(plain.matches.find((m) => m.shopId === 'z-hcm')!.score);
    expect(back.matches.find((m) => m.shopId === 'z-hcm')!.reasons).toContain('returning');
  });

  it('rotates shops with equal scores from one day to the next', () => {
    const twinA = shop({ id: 'twin-a', provinceCode: 'ho-chi-minh', lat: 10.8, lng: 106.6 });
    const twinB = shop({ id: 'twin-b', provinceCode: 'ho-chi-minh', lat: 10.8, lng: 106.6 });
    const first = (now: Date) => matchPrintShops([twinA, twinB], {}, { kind: 'sample', provinceCode: 'ho-chi-minh', items: [item], now }).recommendedId;
    const today = first(NOW);
    const tomorrow = first(new Date(NOW.getTime() + 86_400_000));
    expect(new Set([today, tomorrow])).toEqual(new Set(['twin-a', 'twin-b']));
  });

  it('returns no recommendation when nothing fits', () => {
    expect(matchPrintShops([], {}, { kind: 'sample', provinceCode: null, items: [item], now: NOW })).toEqual({ matches: [], excluded: [], recommendedId: null });
  });
});

describe('platformFeeSplit', () => {
  it('takes the rate of the boxes only and rounds to 100đ', () => {
    expect(platformFeeSplit({ subtotalVnd: 49_000, totalVnd: 49_000 })).toEqual({ platformFeeBps: 1500, platformFeeVnd: 7_400, shopPayableVnd: 41_600 });
    // Shipping goes to the shop, untouched by the fee.
    expect(platformFeeSplit({ subtotalVnd: 100_000, totalVnd: 130_000 }, 1000)).toEqual({ platformFeeBps: 1000, platformFeeVnd: 10_000, shopPayableVnd: 120_000 });
    expect(platformFeeSplit({ subtotalVnd: 100_000, discountVnd: 20_000, totalVnd: 80_000 })).toMatchObject({ platformFeeVnd: 12_000, shopPayableVnd: 68_000 });
  });

  it('clamps the rate', () => {
    expect(platformFeeSplit({ subtotalVnd: 100_000, totalVnd: 100_000 }, 9000).platformFeeBps).toBe(5000);
    expect(platformFeeSplit({ subtotalVnd: 100_000, totalVnd: 100_000 }, -5).platformFeeVnd).toBe(0);
  });
});
