import { xuForExportCredits } from './export-credit-conversion';

describe('xuForExportCredits (docs-old/25 item 7)', () => {
  it('gives the price paid back in xu at the list price (100đ a xu)', () => {
    expect(xuForExportCredits(1, 1, 19_000)).toEqual({ xu: 190, valueVnd: 19_000 });
    expect(xuForExportCredits(5, 5, 79_000)).toEqual({ xu: 790, valueVnd: 79_000 });
    expect(xuForExportCredits(15, 15, 199_000)).toEqual({ xu: 1_990, valueVnd: 199_000 });
  });

  it('prorates the credits left of a lot, exactly', () => {
    // 3 of 5 at 79.000đ = 47.400đ, a whole number of xu: no rounding at all.
    expect(xuForExportCredits(3, 5, 79_000)).toEqual({ xu: 474, valueVnd: 47_400 });
  });

  it('rounds up in the customer favour', () => {
    // 7 of 15 at 199.000đ = 92.866,67đ = 928,67 xu -> 929 xu; the lot is worth 92.867đ in reports.
    expect(xuForExportCredits(7, 15, 199_000)).toEqual({ xu: 929, valueVnd: 92_867 });
    // 1 of 15 = 13.266,67đ -> 133 xu.
    expect(xuForExportCredits(1, 15, 199_000)).toEqual({ xu: 133, valueVnd: 13_267 });
  });

  it('gives nothing for nothing', () => {
    expect(xuForExportCredits(0, 5, 79_000)).toEqual({ xu: 0, valueVnd: 0 });
    expect(xuForExportCredits(2, 2, 0)).toEqual({ xu: 0, valueVnd: 0 });
  });

  it('refuses impossible input', () => {
    expect(() => xuForExportCredits(6, 5, 79_000)).toThrow(RangeError);
    expect(() => xuForExportCredits(1, 0, 79_000)).toThrow(RangeError);
    expect(() => xuForExportCredits(1.5, 5, 79_000)).toThrow(RangeError);
  });
});
