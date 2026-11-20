/** Design review: the secret link, comments and the print approval (`be/src/reviews`, docs-old/23 S23). */

import { request } from "@/services/api";
import type { NewReviewComment, PublicReview, ReviewApproval, ReviewComment, ReviewState } from "@/types/api";

const base = (projectId: string) => `/projects/${encodeURIComponent(projectId)}/review`;

/** Link, approval and comments of my design. */
export function getReview(projectId: string): Promise<ReviewState> {
  return request(base(projectId));
}

/** Creates the review link, or replaces it (the old link stops working). */
export function openReviewLink(projectId: string): Promise<ReviewState> {
  return request(`${base(projectId)}/link`, { method: "POST" });
}

/** Turns the review link off; the approval stays. */
export function closeReviewLink(projectId: string): Promise<ReviewState> {
  return request(`${base(projectId)}/link`, { method: "DELETE" });
}

export function addReviewComment(projectId: string, comment: NewReviewComment): Promise<ReviewComment> {
  return request(`${base(projectId)}/comments`, { method: "POST", json: comment });
}

export function resolveReviewComment(projectId: string, commentId: string, resolved: boolean): Promise<ReviewComment> {
  return request(`${base(projectId)}/comments/${encodeURIComponent(commentId)}`, { method: "PATCH", json: { resolved } });
}

export function deleteReviewComment(projectId: string, commentId: string): Promise<void> {
  return request(`${base(projectId)}/comments/${encodeURIComponent(commentId)}`, { method: "DELETE" });
}

/** The design behind a review link (no account needed). */
export function getPublicReview(token: string): Promise<PublicReview> {
  return request(`/review/${encodeURIComponent(token)}`);
}

export function addGuestReviewComment(token: string, comment: NewReviewComment & { authorName: string }): Promise<ReviewComment> {
  return request(`/review/${encodeURIComponent(token)}/comments`, { method: "POST", json: comment });
}

/** "Duyệt in" of the version shown; 409 DESIGN_CHANGED when it was saved again meanwhile. */
export function approveReview(token: string, body: { name: string; version: number }): Promise<ReviewApproval> {
  return request(`/review/${encodeURIComponent(token)}/approve`, { method: "POST", json: body });
}
