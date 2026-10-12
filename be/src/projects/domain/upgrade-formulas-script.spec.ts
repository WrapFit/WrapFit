import {
  fitCheckWith,
  needsUpgrade,
  upgradeSnapshotName,
} from '../../../prisma/scripts/upgrade-formulas';
import { formulaUpgradeSnapshotName } from './project.types';

describe('db:upgrade-formulas (prisma/scripts/upgrade-formulas.ts)', () => {
  it('moves only projects on older formulas that were never exported', () => {
    const project = { formulaVersion: 1, latestFormulaVersion: 3 };
    expect(needsUpgrade({ ...project, hasCompletedExport: false })).toBe(true);
    expect(needsUpgrade({ ...project, hasCompletedExport: true })).toBe(false);
    expect(
      needsUpgrade({
        formulaVersion: 3,
        latestFormulaVersion: 3,
        hasCompletedExport: false,
      }),
    ).toBe(false);
  });

  it('names the backup snapshot like the studio button does', () => {
    expect(upgradeSnapshotName(1, 3)).toBe(formulaUpgradeSnapshotName(1, 3));
  });

  it('checks the design with the new formulas', () => {
    const dimensions = {
      length: 120,
      width: 80,
      height: 60,
      paperThickness: 0.42,
    };
    expect(fitCheckWith('tuck-top', dimensions, [], 3)?.score).toBe(100);
    expect(fitCheckWith('no-such-box', dimensions, [], 3)).toBeNull();
  });
});
