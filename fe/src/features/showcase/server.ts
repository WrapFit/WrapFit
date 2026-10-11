import "server-only";

import { cache } from "react";
import { SERVER_API_BASE_URL } from "@/config";
import type { PublicProject } from "@/types/api";
import { isShareSlug } from "./slug";

export type PublicProjectLoad =
  | { status: "ok"; project: PublicProject }
  | { status: "not-found" }
  | { status: "error" };

const TIMEOUT_MS = 5_000;

/**
 * `GET /public/projects/:slug` from the Next.js server, for the metadata and the first render of `/p/[slug]`. It is
 * the one direct `fetch` of the app: server code cannot go through the browser client and its `/api` proxy.
 *
 * It reads with `count=false`: this request has no session cookie (they are scoped to `/api`), so the API could not
 * tell the owner or a signed-in visitor apart from a guest. The browser's own request counts the view, and link
 * preview bots that only read the metadata count none. React `cache` makes `generateMetadata` and the page share it.
 */
export const loadPublicProject = cache(async (slug: string): Promise<PublicProjectLoad> => {
  if (!isShareSlug(slug)) return { status: "not-found" };

  try {
    const res = await fetch(`${SERVER_API_BASE_URL}/public/projects/${encodeURIComponent(slug)}?count=false`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 404) return { status: "not-found" };
    if (!res.ok) return { status: "error" };
    return { status: "ok", project: (await res.json()) as PublicProject };
  } catch {
    // API down or slow: the page still renders and the client view loads (and reports) on its own.
    return { status: "error" };
  }
});
