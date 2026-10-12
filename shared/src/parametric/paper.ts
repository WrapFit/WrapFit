/**
 * Paper thickness from paper weight, the rule of the skill `fitcheck-validator`: t = GSM × 0.0014 mm. Every paper table
 * of the editor and the backend default use it, so a 300 GSM box has the same dieline everywhere.
 * Owned by IT 2 (Packaging Math)
 */

export const CALIPER_MM_PER_GSM = 0.0014;

/** Paper thickness `t` in mm for a paper weight, rounded to 0.01 mm (e.g. 300 GSM → 0.42). */
export function caliperOf(gsm: number): number {
  return Math.round(gsm * CALIPER_MM_PER_GSM * 100) / 100;
}
