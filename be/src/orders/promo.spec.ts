import { findSamplePromo, samplePromoDiscount } from '@wrapfit/shared';
import { sampleFeeVnd } from './orders.service';

describe('sample promo codes', () => {
  it('finds a code in any case and ignores spaces', () => {
    expect(findSamplePromo(' wrapfit10 ')?.code).toBe('WRAPFIT10');
    expect(findSamplePromo('NOPE')).toBeNull();
    expect(findSamplePromo('')).toBeNull();
  });

  it('WORKSHOPTET makes the first box free', () => {
    expect(samplePromoDiscount('WORKSHOPTET', sampleFeeVnd(1))).toBe(49_000);
    expect(samplePromoDiscount('WORKSHOPTET', sampleFeeVnd(3))).toBe(49_000);
  });

  it('WRAPFIT10 takes 10% off', () => {
    expect(samplePromoDiscount('WRAPFIT10', sampleFeeVnd(2))).toBe(7_400);
  });

  it('never discounts more than the fee and 0 without a valid code', () => {
    expect(samplePromoDiscount('WORKSHOPTET', 10_000)).toBe(10_000);
    expect(samplePromoDiscount(undefined, 49_000)).toBe(0);
    expect(samplePromoDiscount('BAD', 49_000)).toBe(0);
  });
});
