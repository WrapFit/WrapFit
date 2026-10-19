/** Session of the signed-in user: provider, hook, page guard and redirect helpers. */
export { AuthProvider, useAuth, AuthContext } from "./AuthProvider";
export type { AuthContextValue, AuthStatus } from "./AuthProvider";
export { RequireAuth } from "./RequireAuth";
export { DEMO_USER } from "@/features/dashboard/demoData";
export { afterSignInTarget, loginUrl, ONBOARDING_TOUR_ID, safeRedirect } from "./redirect";
export { ADMIN_HOME, homeForRole, isAccountPage, isDemoUser, isRealAdmin } from "./roles";
