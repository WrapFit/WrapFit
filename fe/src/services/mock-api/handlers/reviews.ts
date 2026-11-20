/** Design review of the offline demo (docs-old/23 S23): the link, comments and "Duyệt in", like `be/src/reviews`. */

import type { PublicReview, ReviewApproval, ReviewComment, ReviewState } from "@/types/api";
import { badRequest, conflict, currentUser, notFound, type Handler } from "../http";
import { db, newId, nowIso, save, type MockProject } from "../store";
import { ownProject } from "./projects";

interface MockReview {
  token: string | null;
  approvedAt?: string;
  approvedBy?: string;
  approvedVersion?: number;
}
type MockComment = ReviewComment & { projectId: string };

/** Older demo databases have no review data yet. */
const store = () => {
  const data = db() as ReturnType<typeof db> & { reviews?: Record<string, MockReview>; comments?: MockComment[] };
  data.reviews ??= {};
  data.comments ??= [];
  return { reviews: data.reviews, comments: data.comments };
};

const newToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const approvalOf = (review: MockReview | undefined, version: number): ReviewApproval | null =>
  review?.approvedAt && review.approvedBy && review.approvedVersion !== undefined
    ? { approvedAt: review.approvedAt, approvedBy: review.approvedBy, approvedVersion: review.approvedVersion, current: review.approvedVersion === version }
    : null;

const view = (c: MockComment): ReviewComment => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { projectId, ...rest } = c;
  return rest;
};

function stateOf(project: MockProject): ReviewState {
  const { reviews, comments } = store();
  return {
    token: reviews[project.id]?.token ?? null,
    approval: approvalOf(reviews[project.id], project.version),
    comments: comments.filter((c) => c.projectId === project.id).map(view),
  };
}

function byToken(token: string): MockProject {
  const { reviews } = store();
  const projectId = Object.keys(reviews).find((id) => reviews[id].token === token);
  const project = projectId && db().projects.find((p) => p.id === projectId && p.status !== "DELETED");
  if (!project) throw notFound("Link duyệt mẫu không còn hiệu lực.");
  return project;
}

function addComment(projectId: string, body: Record<string, unknown>, author: { name: string; byOwner: boolean }): ReviewComment {
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text || text.length > 1000) throw badRequest("Góp ý cần 1–1000 ký tự.");
  const pinned = typeof body.panelId === "string" && typeof body.x === "number" && typeof body.y === "number";
  const comment: MockComment = {
    id: newId(),
    projectId,
    authorName: author.name,
    byOwner: author.byOwner,
    body: text,
    panelId: typeof body.panelId === "string" ? body.panelId : null,
    x: pinned ? (body.x as number) : null,
    y: pinned ? (body.y as number) : null,
    resolved: false,
    createdAt: nowIso(),
  };
  store().comments.push(comment);
  save();
  return view(comment);
}

const getState: Handler = ({ params }) => stateOf(ownProject(params.id));

const openLink: Handler = ({ params }) => {
  const project = ownProject(params.id);
  const { reviews } = store();
  reviews[project.id] = { ...reviews[project.id], token: newToken() };
  save();
  return stateOf(project);
};

const closeLink: Handler = ({ params }) => {
  const project = ownProject(params.id);
  const { reviews } = store();
  if (reviews[project.id]) reviews[project.id].token = null;
  save();
  return stateOf(project);
};

const ownerComment: Handler = ({ params, body }) => {
  const project = ownProject(params.id);
  const user = currentUser();
  return addComment(project.id, (body ?? {}) as Record<string, unknown>, { name: user.shopName || user.fullName || "Chủ thiết kế", byOwner: true });
};

const resolve: Handler = ({ params, body }) => {
  const project = ownProject(params.id);
  const comment = store().comments.find((c) => c.id === params.commentId && c.projectId === project.id);
  if (!comment) throw notFound("Không tìm thấy góp ý.");
  comment.resolved = !!(body as { resolved?: boolean } | undefined)?.resolved;
  save();
  return view(comment);
};

const remove: Handler = ({ params }) => {
  const project = ownProject(params.id);
  const data = store();
  const index = data.comments.findIndex((c) => c.id === params.commentId && c.projectId === project.id);
  if (index < 0) throw notFound("Không tìm thấy góp ý.");
  data.comments.splice(index, 1);
  save();
  return null;
};

const publicView: Handler = ({ params }): PublicReview => {
  const project = byToken(params.token);
  const state = stateOf(project);
  return {
    title: project.title,
    structure: project.template.id,
    formulaVersion: project.formulaVersion,
    version: project.version,
    dimensions: project.dimensions,
    materialSpec: project.materialSpec,
    canvasState: project.canvasState,
    approval: state.approval,
    comments: state.comments,
  };
};

const guestComment: Handler = ({ params, body }) => {
  const project = byToken(params.token);
  const data = (body ?? {}) as Record<string, unknown>;
  const name = typeof data.authorName === "string" ? data.authorName.trim() : "";
  if (!name || name.length > 60) throw badRequest("Hãy cho biết tên của bạn (tối đa 60 ký tự).");
  return addComment(project.id, data, { name, byOwner: false });
};

const approve: Handler = ({ params, body }) => {
  const project = byToken(params.token);
  const { name, version } = (body ?? {}) as { name?: string; version?: number };
  const who = typeof name === "string" ? name.trim() : "";
  if (!who || who.length > 60) throw badRequest("Hãy cho biết tên người duyệt.");
  if (version !== project.version) throw conflict("Thiết kế vừa được sửa, hãy tải lại trang và xem bản mới trước khi duyệt");
  const { reviews } = store();
  reviews[project.id] = { ...reviews[project.id], approvedAt: nowIso(), approvedBy: who, approvedVersion: project.version };
  save();
  return approvalOf(reviews[project.id], project.version);
};

export const reviewRoutes: [string, string, Handler][] = [
  ["GET", "/projects/:id/review", getState],
  ["POST", "/projects/:id/review/link", openLink],
  ["DELETE", "/projects/:id/review/link", closeLink],
  ["POST", "/projects/:id/review/comments", ownerComment],
  ["PATCH", "/projects/:id/review/comments/:commentId", resolve],
  ["DELETE", "/projects/:id/review/comments/:commentId", remove],
  ["GET", "/review/:token", publicView],
  ["POST", "/review/:token/comments", guestComment],
  ["POST", "/review/:token/approve", approve],
];
