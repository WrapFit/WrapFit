/**
 * Limits per plan (docs/16 §3.1), only the keys Path 2 enforces (docs/17 S1). `null` = unlimited.
 * The backend checks them (EntitlementsService.of), the frontend only shows them.
 */
import { PLAN_ORDER, type SubscriptionTier } from "./plans";

const MB = 1024 * 1024;
const GB = 1024 * MB;

/**
 * FREE_A4: only the A4 PDF, with a watermark on the glue flap; a clean export needs a credit.
 * CREDIT: one export credit unlocks every format of one design version for `unlockDays`.
 * UNLIMITED: clean exports without credits.
 */
export type ExportMode = "FREE_A4" | "CREDIT" | "UNLIMITED";

export interface Entitlements {
  export: { mode: ExportMode; unlockDays: number };
  storage: { bytes: number };
  /** Projects not in the trash (ACTIVE + ARCHIVED). */
  projects: { max: number | null };
  snapshots: { maxManualPerProject: number };
  collections: { max: number | null };
}

export const ENTITLEMENTS: Record<SubscriptionTier, Entitlements> = {
  FREE: {
    // A free account that bought or received credits may still spend them (docs/16 §5.2), hence `unlockDays`.
    export: { mode: "FREE_A4", unlockDays: 7 },
    storage: { bytes: 100 * MB },
    projects: { max: 10 },
    snapshots: { maxManualPerProject: 5 },
    collections: { max: 3 },
  },
  PAY_PER_EXPORT: {
    export: { mode: "CREDIT", unlockDays: 7 },
    storage: { bytes: 500 * MB },
    projects: { max: 30 },
    snapshots: { maxManualPerProject: 10 },
    collections: { max: 10 },
  },
  STARTER: {
    export: { mode: "UNLIMITED", unlockDays: 7 },
    storage: { bytes: 2 * GB },
    projects: { max: null },
    snapshots: { maxManualPerProject: 50 },
    collections: { max: 100 },
  },
  PRO_BUSINESS: {
    export: { mode: "UNLIMITED", unlockDays: 7 },
    storage: { bytes: 20 * GB },
    projects: { max: null },
    snapshots: { maxManualPerProject: 100 },
    collections: { max: null },
  },
};

/** Cheapest plan that passes `check`: the `requiredPlan` of a 403 and the "Nâng lên …" button. */
export function requiredPlanFor(check: (entitlements: Entitlements) => boolean): SubscriptionTier | null {
  return PLAN_ORDER.find((tier) => check(ENTITLEMENTS[tier])) ?? null;
}
