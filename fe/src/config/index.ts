/** Runtime configuration read from the environment. */

/**
 * Base URL of the NestJS API for the browser. Keep it `/api` (same origin): next.config.mjs forwards it to the
 * backend locally, Caddy in production, so the HttpOnly session cookies stay first-party.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

/**
 * A build without a backend: every page runs on example data and print files are built in the browser. Vercel sets
 * NEXT_PUBLIC_VERCEL_ENV on every build, so a Vercel build is offline unless BACKEND_INTERNAL_URL pointed its `/api`
 * rewrite at a real backend when it was built (NEXT_PUBLIC_BACKEND_PROXY, set by next.config.mjs; docs/18 §5).
 * NEXT_PUBLIC_OFFLINE_DEMO=1 turns it on anywhere.
 */
export const OFFLINE_DEMO =
  process.env.NEXT_PUBLIC_OFFLINE_DEMO === "1" ||
  (!!process.env.NEXT_PUBLIC_VERCEL_ENV && process.env.NEXT_PUBLIC_BACKEND_PROXY !== "1");

/** Base URL of the API for code running on the Next.js server (SSR, generateMetadata), which needs an absolute URL. */
export const SERVER_API_BASE_URL = `${(process.env.BACKEND_INTERNAL_URL || "http://localhost:8080").replace(/\/+$/, "")}/api`;
