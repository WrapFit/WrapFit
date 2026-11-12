/** Projects, snapshots, collections, studio events and the public showcase of the offline demo. */

import { CURRENT_FORMULA_VERSION, type BoxStructureType, type CanvasState } from "@wrapfit/shared";
import { DEMO_BOX_STRUCTURES, getDemoPublicProject, getDemoTemplateDetail } from "@/features/templates/demoData";
import type { Collection, ProjectDetail, ProjectSummary, PublicProject } from "@/types/api";
import { badRequest, conflict, currentUser, MockHttpError, notFound, paginate, type Handler } from "../http";
import { db, getSessionUserId, newId, nowIso, save, type MockProject, type MockSnapshot } from "../store";

const structureName = (id: string) => DEMO_BOX_STRUCTURES.find((s) => s.id === id)?.name ?? id;

/** ASCII slug of a title with a short random tail, like the API's unique slugs. */
function slugFor(title: string): string {
  const base = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return `${base || "hop"}-${Math.random().toString(36).slice(2, 7)}`;
}

/** One of my projects; 404 for another user's, like the API. */
export function ownProject(id: string): MockProject {
  const user = currentUser();
  const project = db().projects.find((p) => p.id === id && p.ownerId === user.id);
  if (!project) throw notFound("Không tìm thấy dự án.");
  return project;
}

function detail(project: MockProject): ProjectDetail {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ownerId, ...rest } = project;
  const collection = rest.collection && db().collections.find((c) => c.id === rest.collection?.id);
  return { ...rest, collection: collection ? { id: collection.id, title: collection.title, colorTag: collection.colorTag } : null };
}

function summary(project: MockProject): ProjectSummary {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { version, formulaVersion, latestFormulaVersion, allowFork, forkedFromId, canvasState, fitcheckState, ...rest } = detail(project);
  return rest;
}

const EMPTY_CANVAS: CanvasState = { elements: [] } as unknown as CanvasState;

function insertProject(ownerId: string, fields: Partial<ProjectDetail> & Pick<ProjectDetail, "title" | "dimensions">, templateId: BoxStructureType): MockProject {
  const now = nowIso();
  const project: MockProject = {
    id: newId(),
    ownerId,
    title: fields.title,
    slug: slugFor(fields.title),
    status: "ACTIVE",
    visibility: "PRIVATE",
    template: { id: templateId, name: structureName(templateId) },
    collection: fields.collection ?? null,
    dimensions: fields.dimensions,
    materialSpec: fields.materialSpec ?? { type: "ivory", gsm: 350, caliper: 0.38, finish: "matte" },
    color: fields.color,
    fitcheckScore: null,
    thumbnailUrl: fields.thumbnailUrl ?? null,
    tags: fields.tags ?? [],
    occasion: fields.occasion ?? null,
    industry: fields.industry ?? null,
    viewsCount: 0,
    likesCount: 0,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    version: 1,
    formulaVersion: CURRENT_FORMULA_VERSION,
    latestFormulaVersion: CURRENT_FORMULA_VERSION,
    allowFork: false,
    forkedFromId: fields.forkedFromId ?? null,
    canvasState: fields.canvasState ?? EMPTY_CANVAS,
    fitcheckState: null,
  };
  db().projects.push(project);
  db().events.push({ type: "PROJECT_CREATED", userId: ownerId, projectId: project.id, payload: { structure: templateId }, createdAt: now });
  return project;
}

const list: Handler = ({ query }) => {
  const user = currentUser();
  const status = query.get("status") ?? "ACTIVE";
  const q = query.get("q")?.trim().toLowerCase();
  const collectionId = query.get("collectionId");
  const templateId = query.get("templateId");
  const sortBy = (query.get("sortBy") ?? "updatedAt") as "updatedAt" | "createdAt" | "title";
  const order = query.get("order") === "asc" ? 1 : -1;
  const rows = db()
    .projects.filter((p) => p.ownerId === user.id && p.status === status)
    .filter((p) => !templateId || p.template.id === templateId)
    .filter((p) => !collectionId || (collectionId === "none" ? !p.collection : p.collection?.id === collectionId))
    .filter((p) => !q || p.title.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase() === q))
    .sort((a, b) => String(a[sortBy]).localeCompare(String(b[sortBy]), "vi") * order)
    .map(summary);
  return paginate(rows, query);
};

const create: Handler = ({ body }) => {
  const user = currentUser();
  const title = String(body.title ?? "").trim();
  if (!title) throw badRequest("Cần đặt tên cho dự án.");
  const template = typeof body.designTemplateId === "string" ? getDemoTemplateDetail(body.designTemplateId) : null;
  const collectionId = body.collectionId as string | undefined;
  const collection = collectionId ? db().collections.find((c) => c.id === collectionId && c.ownerId === user.id) : undefined;
  const project = insertProject(
    user.id,
    {
      title,
      dimensions: body.dimensions as ProjectDetail["dimensions"],
      materialSpec: (body.materialSpec as ProjectDetail["materialSpec"]) ?? template?.materialSpec,
      canvasState: (body.canvasState as CanvasState) ?? template?.canvasState,
      collection: collection ? { id: collection.id, title: collection.title, colorTag: collection.colorTag } : null,
      tags: (body.tags as string[]) ?? template?.tags,
      occasion: (body.occasion as ProjectDetail["occasion"]) ?? template?.occasion,
      industry: (body.industry as ProjectDetail["industry"]) ?? template?.industry,
      color: template?.color,
    },
    body.templateId as BoxStructureType,
  );
  save();
  return detail(project);
};

const get: Handler = ({ params }) => detail(ownProject(params.id));

const update: Handler = ({ params, body }) => {
  const project = ownProject(params.id);
  if (project.status === "DELETED") throw conflict("Dự án đang ở thùng rác.");
  if (typeof body.version === "number" && body.version !== project.version) {
    throw conflict("Dự án vừa được lưu ở tab khác.", { code: "PROJECT_VERSION_CONFLICT", currentVersion: project.version });
  }
  const fields = ["title", "dimensions", "materialSpec", "canvasState", "thumbnailUrl", "tags", "occasion", "industry"] as const;
  for (const field of fields) {
    if (body[field] !== undefined) (project as unknown as Record<string, unknown>)[field] = body[field];
  }
  if (body.collectionId !== undefined) {
    const collection = body.collectionId ? db().collections.find((c) => c.id === body.collectionId) : null;
    project.collection = collection ? { id: collection.id, title: collection.title, colorTag: collection.colorTag } : null;
  }
  const report = (body.canvasState as { fitcheck?: { score?: number } } | undefined)?.fitcheck;
  if (typeof report?.score === "number") project.fitcheckScore = report.score;
  project.version += 1;
  project.updatedAt = nowIso();
  save();
  return detail(project);
};

const changeStatus: Handler = ({ params, body }) => {
  const project = ownProject(params.id);
  project.status = body.status as ProjectDetail["status"];
  project.deletedAt = project.status === "DELETED" ? nowIso() : null;
  project.updatedAt = nowIso();
  save();
  return detail(project);
};

const changeVisibility: Handler = ({ params, body }) => {
  const project = ownProject(params.id);
  if (body.visibility) project.visibility = body.visibility as ProjectDetail["visibility"];
  if (typeof body.allowFork === "boolean") project.allowFork = body.allowFork;
  project.updatedAt = nowIso();
  save();
  return detail(project);
};

const duplicate: Handler = ({ params }) => {
  const source = ownProject(params.id);
  const copy = insertProject(source.ownerId, { ...structuredClone(source), title: `[Bản sao] ${source.title}`, thumbnailUrl: null }, source.template.id);
  save();
  return detail(copy);
};

const remove: Handler = ({ params }) => {
  const project = ownProject(params.id);
  const state = db();
  state.projects = state.projects.filter((p) => p.id !== project.id);
  state.snapshots = state.snapshots.filter((s) => s.projectId !== project.id);
  delete state.unboxing[project.id];
  for (const order of state.orders) if (order.projectId === project.id) order.projectId = null;
  save();
};

// ---------------------------------------------------------------- snapshots

const snapshotSummary = ({ projectId, state, ...rest }: MockSnapshot) => {
  void projectId;
  void state;
  return rest;
};

function takeSnapshot(project: MockProject, name: string, previewUrl: string | null): MockSnapshot {
  const snapshot: MockSnapshot = {
    id: newId(),
    projectId: project.id,
    name,
    previewUrl,
    dimensions: structuredClone(project.dimensions),
    formulaVersion: project.formulaVersion,
    createdAt: nowIso(),
    state: structuredClone({
      canvasState: project.canvasState,
      dimensions: project.dimensions,
      materialSpec: project.materialSpec,
      formulaVersion: project.formulaVersion,
    }),
  };
  db().snapshots.push(snapshot);
  return snapshot;
}

const listSnapshots: Handler = ({ params }) => {
  const project = ownProject(params.id);
  return db()
    .snapshots.filter((s) => s.projectId === project.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(snapshotSummary);
};

const createSnapshot: Handler = ({ params, body }) => {
  const project = ownProject(params.id);
  const name = String(body.name ?? "").trim() || `Phiên bản ${new Date().toLocaleString("vi-VN")}`;
  const snapshot = takeSnapshot(project, name, (body.previewUrl as string | undefined) ?? project.thumbnailUrl);
  save();
  return snapshotSummary(snapshot);
};

const restoreSnapshot: Handler = ({ params }) => {
  const project = ownProject(params.id);
  const snapshot = db().snapshots.find((s) => s.id === params.snapshotId && s.projectId === project.id);
  if (!snapshot) throw notFound("Không tìm thấy phiên bản.");
  const backup = takeSnapshot(project, `Trước khi khôi phục “${snapshot.name}”`, project.thumbnailUrl);
  Object.assign(project, structuredClone(snapshot.state));
  project.version += 1;
  project.updatedAt = nowIso();
  save();
  return { project: detail(project), backup: snapshotSummary(backup) };
};

const deleteSnapshot: Handler = ({ params }) => {
  const project = ownProject(params.id);
  db().snapshots = db().snapshots.filter((s) => !(s.id === params.snapshotId && s.projectId === project.id));
  save();
};

const formulaUpgrade: Handler = ({ params, body }) => {
  const project = ownProject(params.id);
  const target = Number(body.version) || CURRENT_FORMULA_VERSION;
  if (project.formulaVersion >= target) return { project: detail(project), backup: null };
  const backup = takeSnapshot(project, `Công thức v${project.formulaVersion} (trước khi nâng cấp)`, project.thumbnailUrl);
  project.formulaVersion = target;
  project.version += 1;
  project.updatedAt = nowIso();
  save();
  return { project: detail(project), backup: snapshotSummary(backup) };
};

const recordEvent: Handler = ({ params, body }) => {
  const project = ownProject(params.id);
  db().events.push({ type: String(body.type), userId: project.ownerId, projectId: project.id, payload: body, createdAt: nowIso() });
  save();
};

// ---------------------------------------------------------------- collections

function collectionView(collection: Collection & { ownerId: string }): Collection {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ownerId, ...rest } = collection;
  const projectCount = db().projects.filter((p) => p.collection?.id === collection.id && p.status !== "DELETED").length;
  return { ...rest, projectCount };
}

function ownCollection(id: string) {
  const user = currentUser();
  const collection = db().collections.find((c) => c.id === id && c.ownerId === user.id);
  if (!collection) throw notFound("Không tìm thấy bộ sưu tập.");
  return collection;
}

const listCollections: Handler = () => {
  const user = currentUser();
  return db().collections.filter((c) => c.ownerId === user.id).map(collectionView);
};

const createCollection: Handler = ({ body }) => {
  const user = currentUser();
  const title = String(body.title ?? "").trim();
  if (!title) throw badRequest("Cần đặt tên bộ sưu tập.");
  const now = nowIso();
  const collection = {
    id: newId(),
    ownerId: user.id,
    title,
    description: (body.description as string | undefined) ?? null,
    colorTag: (body.colorTag as string | undefined) ?? "#D4A373",
    projectCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  db().collections.push(collection);
  save();
  return collectionView(collection);
};

const updateCollection: Handler = ({ params, body }) => {
  const collection = ownCollection(params.id);
  if (typeof body.title === "string") collection.title = body.title;
  if (body.description !== undefined) collection.description = body.description as string | null;
  if (typeof body.colorTag === "string") collection.colorTag = body.colorTag;
  collection.updatedAt = nowIso();
  save();
  return collectionView(collection);
};

const deleteCollection: Handler = ({ params }) => {
  const collection = ownCollection(params.id);
  db().collections = db().collections.filter((c) => c.id !== collection.id);
  for (const project of db().projects) if (project.collection?.id === collection.id) project.collection = null;
  save();
};

// ---------------------------------------------------------------- public showcase

/** My published projects are found by their slug; the community examples come from the demo data. */
function publishedProject(slug: string): PublicProject {
  const project = db().projects.find((p) => p.slug === slug && p.visibility !== "PRIVATE" && p.status === "ACTIVE");
  if (!project) {
    const example = getDemoPublicProject(slug);
    if (!example) throw notFound("Thiết kế không tồn tại hoặc chưa được chia sẻ.");
    const liked = db().likes[slug] ?? false;
    return { ...example, likesCount: example.likesCount + (liked ? 1 : 0), viewer: { isOwner: false, liked } };
  }
  const owner = db().users.find((u) => u.id === project.ownerId);
  const viewerId = getSessionUserId();
  const liked = db().likes[slug] ?? false;
  return {
    slug: project.slug,
    title: project.title,
    visibility: project.visibility as PublicProject["visibility"],
    allowFork: project.allowFork,
    template: project.template,
    dimensions: project.dimensions,
    materialSpec: project.materialSpec,
    canvasState: project.canvasState,
    thumbnailUrl: project.thumbnailUrl,
    tags: project.tags,
    occasion: project.occasion,
    industry: project.industry,
    viewsCount: project.viewsCount,
    likesCount: project.likesCount,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    author: { fullName: owner?.fullName ?? null, shopName: owner?.shopName ?? null, avatarUrl: owner?.avatarUrl ?? null },
    forkedFrom: null,
    viewer: { isOwner: viewerId === project.ownerId, liked },
  };
}

const getPublic: Handler = ({ params, query }) => {
  const result = publishedProject(params.slug);
  const own = db().projects.find((p) => p.slug === params.slug);
  if (own && query.get("count") !== "false") {
    own.viewsCount += 1;
    save();
  }
  return result;
};

const fork: Handler = ({ params }) => {
  const user = currentUser();
  const source = publishedProject(params.slug);
  if (!source.allowFork && !source.viewer.isOwner) throw new MockHttpError(403, "Tác giả chưa cho phép remix thiết kế này.");
  const project = insertProject(
    user.id,
    {
      title: `[Remix] ${source.title}`,
      dimensions: structuredClone(source.dimensions),
      materialSpec: structuredClone(source.materialSpec),
      canvasState: structuredClone(source.canvasState),
      tags: [...source.tags],
      occasion: source.occasion,
      industry: source.industry,
      forkedFromId: db().projects.find((p) => p.slug === source.slug)?.id ?? null,
    },
    source.template.id,
  );
  save();
  return detail(project);
};

const like = (liked: boolean): Handler => ({ params }) => {
  currentUser();
  const before = publishedProject(params.slug);
  const was = db().likes[params.slug] ?? false;
  db().likes[params.slug] = liked;
  const own = db().projects.find((p) => p.slug === params.slug);
  if (own && was !== liked) own.likesCount += liked ? 1 : -1;
  save();
  return { liked, likesCount: Math.max(0, before.likesCount + (was === liked ? 0 : liked ? 1 : -1)) };
};

export const projectRoutes: [string, string, Handler][] = [
  ["GET", "/projects", list],
  ["POST", "/projects", create],
  ["GET", "/projects/:id", get],
  ["PATCH", "/projects/:id", update],
  ["DELETE", "/projects/:id", remove],
  ["PATCH", "/projects/:id/status", changeStatus],
  ["PATCH", "/projects/:id/visibility", changeVisibility],
  ["POST", "/projects/:id/duplicate", duplicate],
  ["GET", "/projects/:id/snapshots", listSnapshots],
  ["POST", "/projects/:id/snapshots", createSnapshot],
  ["POST", "/projects/:id/snapshots/:snapshotId/restore", restoreSnapshot],
  ["DELETE", "/projects/:id/snapshots/:snapshotId", deleteSnapshot],
  ["POST", "/projects/:id/formula-upgrade", formulaUpgrade],
  ["POST", "/projects/:id/events", recordEvent],
  ["GET", "/collections", listCollections],
  ["POST", "/collections", createCollection],
  ["GET", "/collections/:id", ({ params }) => collectionView(ownCollection(params.id))],
  ["PATCH", "/collections/:id", updateCollection],
  ["DELETE", "/collections/:id", deleteCollection],
  ["GET", "/public/projects/:slug", getPublic],
  ["POST", "/public/projects/:slug/fork", fork],
  ["POST", "/public/projects/:slug/like", like(true)],
  ["DELETE", "/public/projects/:slug/like", like(false)],
];
