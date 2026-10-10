/** App-wide constants: route paths, storage keys, limits. */

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
  templates: "/templates",
  editorNew: "/editor/new",
  editor: (projectId: string) => `/editor/${projectId}`,
  publicProject: (slug: string) => `/p/${slug}`,
  unbox: (slug: string) => `/unbox/${slug}`,
} as const;

/** Page opened after signing in when no `?redirect=` was given. */
export const DEFAULT_AFTER_LOGIN = ROUTES.dashboard;
