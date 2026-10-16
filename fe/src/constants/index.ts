/** App-wide constants: route paths, storage keys, limits, labels. */

import type { Role, SubscriptionTier } from "@/types/api";

/**
 * Pages of the app. The three email-link pages must keep these exact paths: the backend builds the links of its
 * emails as FRONTEND_URL + path (docs/06, section 3.1).
 */
export const ROUTES = {
  home: "/",
  login: "/auth/login",
  register: "/auth/register",
  checkEmail: "/check-email",
  verifyEmail: "/verify-email",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  completeSignup: "/complete-signup",
  dashboard: "/dashboard",
  projects: "/dashboard/projects",
  brandKit: "/dashboard/brand-kit",
  profile: "/dashboard/profile",
  settings: "/dashboard/settings",
  templates: "/templates",
  editorNew: "/editor/new",
  /** The studio without an account: nothing is saved. */
  editorDemo: "/editor/demo",
  editor: (projectId: string) => `/editor/${projectId}`,
  publicProject: (slug: string) => `/p/${slug}`,
  unbox: (slug: string) => `/unbox/${slug}`,
  /** Code-entry page: the recipient types or pastes the code printed with the gift. */
  unboxCode: "/unbox",
  /** Contact Us page */
  contact: "/contact",
  /** About Us / Story page */
  about: "/about",
  /** Box Structure Inspection page */
  structure: (id: string) => `/structures/${id}`,
} as const;

/** Page opened after signing in when no `?redirect=` was given. */
export const DEFAULT_AFTER_LOGIN = ROUTES.dashboard;

/** Vietnamese names of the account roles, the same on every screen (header, admin console). */
export const ROLE_LABELS: Record<Role, string> = {
  MAKER: "Nhà sáng tạo",
  PRO_ARTISAN: "Nghệ nhân Pro",
  PRINT_SHOP: "Xưởng in",
  ADMIN: "Quản trị viên",
};

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  FREE: "Gói Free",
  PAY_PER_EXPORT: "Từng lần xuất (19k)",
  STARTER: "Gói Tháng (99k)",
  PRO_BUSINESS: "Doanh Nghiệp",
};
