/** Projects, their lifecycle and version snapshots (`be/src/projects`). Rules: docs/06, sections 5 and 6. */

import { request } from "@/services/api";
import type {
  ChangeVisibilityRequest,
  CreateProjectRequest,
  CreateSnapshotRequest,
  FormulaUpgradeResponse,
  Paginated,
  ProjectDetail,
  ProjectListQuery,
  ProjectStatus,
  ProjectSummary,
  RestoreSnapshotResponse,
  SnapshotSummary,
  UpdateProjectRequest,
} from "@/types/api";

import { DEMO_PROJECTS, getDemoProjectDetail } from "@/features/dashboard/demoData";

/** My projects, without their canvas. Default: ACTIVE, most recently updated first. */
export function listProjects(query: ProjectListQuery = {}): Promise<Paginated<ProjectSummary>> {
  return request<Paginated<ProjectSummary>>("/projects", { query }).catch(() => {
    let filtered = DEMO_PROJECTS;
    if (query.status) {
      filtered = filtered.filter((p) => p.status === query.status);
    }
    if (query.templateId) {
      filtered = filtered.filter((p) => p.template.id === query.templateId);
    }
    if (query.q) {
      const q = query.q.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    return {
      items: filtered.slice(start, start + limit),
      meta: { page, limit, total, totalPages },
    };
  });
}

/** 404 also for a project of another user. */
export function getProject(id: string): Promise<ProjectDetail> {
  return request<ProjectDetail>(`/projects/${id}`).catch(() => {
    return getDemoProjectDetail(id);
  });
}

export function createProject(data: CreateProjectRequest): Promise<ProjectDetail> {
  return request("/projects", { method: "POST", json: data });
}

/**
 * Saves the fields sent. Send the `version` last loaded or saved: 409 PROJECT_VERSION_CONFLICT (`currentVersion`)
 * when another tab saved since. 409 without code: the project is in the trash.
 */
export function updateProject(id: string, data: UpdateProjectRequest): Promise<ProjectDetail> {
  return request(`/projects/${id}`, { method: "PATCH", json: data });
}

/** ARCHIVED, DELETED (trash, purged after 30 days) or back to ACTIVE. */
export function changeProjectStatus(id: string, status: ProjectStatus): Promise<ProjectDetail> {
  return request(`/projects/${id}/status`, { method: "PATCH", json: { status } });
}

export function changeProjectVisibility(id: string, data: ChangeVisibilityRequest): Promise<ProjectDetail> {
  return request(`/projects/${id}/visibility`, { method: "PATCH", json: data });
}

/** Copy "[Bản sao] <title>", without the thumbnail. */
export function duplicateProject(id: string): Promise<ProjectDetail> {
  return request(`/projects/${id}/duplicate`, { method: "POST" });
}

/** Permanent deletion, only from the trash (409 otherwise): move it to the trash with changeProjectStatus first. */
export function deleteProjectPermanently(id: string): Promise<void> {
  return request(`/projects/${id}`, { method: "DELETE" });
}

/** Newest first, without their canvas. */
export function listSnapshots(projectId: string): Promise<SnapshotSummary[]> {
  return request(`/projects/${projectId}/snapshots`);
}

/** At most 50 manual snapshots per project (409). */
export function createSnapshot(projectId: string, data: CreateSnapshotRequest): Promise<SnapshotSummary> {
  return request(`/projects/${projectId}/snapshots`, { method: "POST", json: data });
}

/** Replace the editor state with `project`; restoring `backup.id` undoes it. */
export function restoreSnapshot(projectId: string, snapshotId: string): Promise<RestoreSnapshotResponse> {
  return request(`/projects/${projectId}/snapshots/${snapshotId}/restore`, { method: "POST" });
}

/**
 * Moves the project to the current dieline formulas of its structure (docs/06 §5.1). `version` as for a save: a newer
 * save answers 409 PROJECT_VERSION_CONFLICT. Restoring `backup` undoes it.
 */
export function upgradeProjectFormula(projectId: string, version: number): Promise<FormulaUpgradeResponse> {
  return request(`/projects/${projectId}/formula-upgrade`, { method: "POST", json: { version } });
}

export function deleteSnapshot(projectId: string, snapshotId: string): Promise<void> {
  return request(`/projects/${projectId}/snapshots/${snapshotId}`, { method: "DELETE" });
}
