/**
 * Public pages (`be/src/public-showcase`, `be/src/unboxing`): readable without an account; the cookie, when present,
 * tells the API who is viewing. Forking and liking need a session.
 */

import { request } from "@/services/api";
import type { LikeState, ProjectDetail, PublicProject, PublicUnboxing } from "@/types/api";

/** UNLISTED or PUBLIC project; 404 for PRIVATE, trashed or unknown slugs (also for the owner). Counts one view. */
export function getPublicProject(slug: string): Promise<PublicProject> {
  return request(`/public/projects/${encodeURIComponent(slug)}`);
}

/** Copies the design to my account; 403 when the author does not allow remixes. */
export function forkPublicProject(slug: string): Promise<ProjectDetail> {
  return request(`/public/projects/${encodeURIComponent(slug)}/fork`, { method: "POST" });
}

export function likePublicProject(slug: string): Promise<LikeState> {
  return request(`/public/projects/${encodeURIComponent(slug)}/like`, { method: "POST" });
}

export function unlikePublicProject(slug: string): Promise<LikeState> {
  return request(`/public/projects/${encodeURIComponent(slug)}/like`, { method: "DELETE" });
}

/** Page opened from the QR code; works even when the design is PRIVATE. Counts one view. */
export function getPublicUnboxing(slug: string): Promise<PublicUnboxing> {
  return request(`/public/unboxing/${encodeURIComponent(slug)}`);
}
