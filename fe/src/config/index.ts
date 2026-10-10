/** Runtime configuration read from the environment. */

/**
 * Base URL of the NestJS API for the browser. Keep it `/api` (same origin): next.config.mjs forwards it to the
 * backend locally, Caddy in production, so the HttpOnly session cookies stay first-party.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

/** Base URL of the API for code running on the Next.js server (SSR, generateMetadata), which needs an absolute URL. */
export const SERVER_API_BASE_URL = `${(process.env.BACKEND_INTERNAL_URL || "http://localhost:8080").replace(/\/+$/, "")}/api`;
