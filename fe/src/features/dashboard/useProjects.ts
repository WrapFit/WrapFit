"use client";

import {
  keepPreviousData,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";
import {
  changeProjectStatus,
  deleteProjectPermanently,
  duplicateProject,
  listProjects,
  updateProject,
} from "@/api/projects";
import { useToast } from "@/components/common/Toast";
import { queryKeys } from "@/hooks/data";
import type { Collection, Paginated, ProjectListQuery, ProjectStatus, ProjectSummary } from "@/types/api";
import { showActionError } from "./errors";
import { TRASH_RETENTION_DAYS } from "./format";

export const PROJECTS_PAGE_SIZE = 12;

/** The 4 projects edited last, for the dashboard home. */
export const RECENT_PROJECTS_QUERY: ProjectListQuery = {
  status: "ACTIVE",
  sortBy: "updatedAt",
  order: "desc",
  limit: 4,
};

const STATUS_KEY = ["projects", "change-status"] as const;
const DUPLICATE_KEY = ["projects", "duplicate"] as const;
const PURGE_KEY = ["projects", "delete-permanently"] as const;
const MOVE_KEY = ["projects", "move"] as const;

/** Another tab (or the editor) changed the project since the list loaded. */
const STALE_PROJECT = "Dự án vừa được đổi ở nơi khác. Danh sách đã được tải lại, hãy thử lại.";

/**
 * One page of `GET /projects`. Projects are created and saved in the editor, so a list checks the API again every
 * time it mounts; the previous page stays on screen while the next one loads.
 */
export function useProjectList(query: ProjectListQuery, options: { keepPrevious?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.projects.list(query),
    queryFn: () => listProjects(query),
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
    staleTime: 0,
  });
}

/** Number of my projects with this status, whatever the search and folder filters. */
export function useProjectCount(status: ProjectStatus) {
  const query: ProjectListQuery = { status, limit: 1 };
  return useQuery({
    queryKey: queryKeys.projects.list(query),
    queryFn: () => listProjects(query),
    select: (page) => page.meta.total,
    staleTime: 0,
  });
}

/** Lists, details and folder counts all change with a project; a permanent deletion also frees storage. */
function refreshAfterChange(queryClient: QueryClient, { storage = false } = {}) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.collections.all }),
    storage ? queryClient.invalidateQueries({ queryKey: queryKeys.storageUsage }) : undefined,
  ]);
}

export interface StatusChange {
  project: ProjectSummary;
  status: ProjectStatus;
}

type ListSnapshot = [readonly unknown[], Paginated<ProjectSummary> | undefined][];

/**
 * Optimistic update of every cached project list: the project leaves the lists of its old status (and its folder
 * when it moves) at once, and the counts follow. Returns what to put back if the API refuses.
 */
async function applyToLists(
  queryClient: QueryClient,
  project: ProjectSummary,
  change: { status?: ProjectStatus; collectionId?: string | null },
): Promise<ListSnapshot> {
  // A list request still running would land after this and bring the project back.
  await queryClient.cancelQueries({ queryKey: queryKeys.projects.lists() });
  const snapshot = queryClient.getQueriesData<Paginated<ProjectSummary>>({ queryKey: queryKeys.projects.lists() });
  const fromStatus = project.status;
  for (const [key, page] of snapshot) {
    if (!page?.items) continue;
    const query = (key[2] ?? {}) as ProjectListQuery;
    const listStatus = query.status ?? "ACTIVE";
    const inList = page.items.some((item) => item.id === project.id);
    let total = page.meta.total;
    let items = page.items;
    if (change.status && change.status !== fromStatus) {
      if (listStatus === fromStatus && (inList || page.meta.limit === 1)) total -= 1;
      if (listStatus === change.status && !query.collectionId && !query.q) total += 1;
      if (inList) items = items.filter((item) => item.id !== project.id);
    } else if (change.collectionId !== undefined && query.collectionId) {
      const target = change.collectionId ?? "none";
      if (inList && query.collectionId !== target) {
        items = items.filter((item) => item.id !== project.id);
        total -= 1;
      }
    }
    if (items === page.items && total === page.meta.total) continue;
    total = Math.max(0, total);
    queryClient.setQueryData<Paginated<ProjectSummary>>(key, {
      items,
      meta: { ...page.meta, total, totalPages: Math.max(1, Math.ceil(total / Math.max(1, page.meta.limit))) },
    });
  }
  return snapshot;
}

function restoreLists(queryClient: QueryClient, snapshot: ListSnapshot | undefined) {
  snapshot?.forEach(([key, page]) => queryClient.setQueryData(key, page));
}

function statusToast({ project, status }: StatusChange) {
  const name = `“${project.title}”`;
  if (status === "ARCHIVED") return { title: "Đã lưu trữ dự án", description: `${name} nằm trong tab Lưu trữ.` };
  if (status === "DELETED") {
    return {
      title: "Đã chuyển vào thùng rác",
      description: `${name} tự xoá vĩnh viễn sau ${TRASH_RETENTION_DAYS} ngày nếu không được khôi phục.`,
    };
  }
  return project.status === "DELETED"
    ? { title: "Đã khôi phục dự án", description: `${name} đã trở lại danh sách Đang thiết kế.` }
    : { title: "Đã bỏ lưu trữ", description: `${name} đã trở lại danh sách Đang thiết kế.` };
}

function statusErrorTitle({ project, status }: StatusChange) {
  if (status === "ARCHIVED") return "Không lưu trữ được dự án";
  if (status === "DELETED") return "Không chuyển được vào thùng rác";
  return project.status === "DELETED" ? "Không khôi phục được dự án" : "Không bỏ lưu trữ được";
}

/** `PATCH /projects/:id/status`: archive, move to the trash, or back to ACTIVE. */
export function useChangeProjectStatus() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationKey: STATUS_KEY,
    mutationFn: ({ project, status }: StatusChange) => changeProjectStatus(project.id, status),
    // Optimistic UI: the card leaves its tab at once; it comes back if the API refuses.
    onMutate: async ({ project, status }) => ({ snapshot: await applyToLists(queryClient, project, { status }) }),
    onSuccess: (_, change) => toast.show({ tone: "success", ...statusToast(change) }),
    onError: (error, change, context) => {
      restoreLists(queryClient, context?.snapshot);
      showActionError(toast, error, statusErrorTitle(change), STALE_PROJECT);
    },
    onSettled: () => refreshAfterChange(queryClient),
  });
}

/** `POST /projects/:id/duplicate`: "[Bản sao] <title>", without the thumbnail. */
export function useDuplicateProject() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationKey: DUPLICATE_KEY,
    mutationFn: (project: ProjectSummary) => duplicateProject(project.id),
    onSuccess: (copy) =>
      toast.show({
        tone: "success",
        title: "Đã nhân bản dự án",
        description: `Đã tạo “${copy.title}” (bản sao không kèm ảnh xem trước).`,
      }),
    onError: (error) => showActionError(toast, error, "Không nhân bản được dự án", STALE_PROJECT),
    onSettled: () => refreshAfterChange(queryClient),
  });
}

/** `DELETE /projects/:id`: only from the trash; the project and its files are gone for good. */
export function useDeleteProjectPermanently() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationKey: PURGE_KEY,
    mutationFn: (project: ProjectSummary) => deleteProjectPermanently(project.id),
    onSuccess: (_, project) => {
      queryClient.removeQueries({ queryKey: queryKeys.projects.detail(project.id) });
      toast.show({
        tone: "success",
        title: "Đã xoá vĩnh viễn",
        description: `“${project.title}” cùng các tệp gắn với dự án đã bị xoá.`,
      });
    },
    onError: (error) => showActionError(toast, error, "Không xoá vĩnh viễn được dự án", STALE_PROJECT),
    onSettled: () => refreshAfterChange(queryClient, { storage: true }),
  });
}

export interface ProjectMove {
  project: ProjectSummary;
  /** null = outside any folder. */
  collection: Pick<Collection, "id" | "title"> | null;
}

/** `PATCH /projects/:id { collectionId }`. Sent without `version`: moving never conflicts with an editor save. */
export function useMoveProject() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationKey: MOVE_KEY,
    mutationFn: ({ project, collection }: ProjectMove) =>
      updateProject(project.id, { collectionId: collection?.id ?? null }),
    onMutate: async ({ project, collection }) => ({
      snapshot: await applyToLists(queryClient, project, { collectionId: collection?.id ?? null }),
    }),
    onSuccess: (_, { project, collection }) =>
      toast.show({
        tone: "success",
        title: "Đã chuyển thư mục",
        description: collection
          ? `“${project.title}” giờ nằm trong thư mục “${collection.title}”.`
          : `“${project.title}” không còn thuộc thư mục nào.`,
      }),
    onError: (error, _, context) => {
      restoreLists(queryClient, context?.snapshot);
      showActionError(toast, error, "Không chuyển được thư mục", STALE_PROJECT);
    },
    onSettled: () => refreshAfterChange(queryClient),
  });
}

/** Ids of the projects with an action still running, from every component of the page. */
export function useBusyProjectIds(): ReadonlySet<string> {
  const changing = useMutationState({
    filters: { mutationKey: STATUS_KEY, status: "pending" },
    select: (mutation) => (mutation.state.variables as StatusChange | undefined)?.project.id,
  });
  const moving = useMutationState({
    filters: { mutationKey: MOVE_KEY, status: "pending" },
    select: (mutation) => (mutation.state.variables as ProjectMove | undefined)?.project.id,
  });
  const duplicating = useMutationState({
    filters: { mutationKey: DUPLICATE_KEY, status: "pending" },
    select: (mutation) => (mutation.state.variables as ProjectSummary | undefined)?.id,
  });
  const purging = useMutationState({
    filters: { mutationKey: PURGE_KEY, status: "pending" },
    select: (mutation) => (mutation.state.variables as ProjectSummary | undefined)?.id,
  });
  return useMemo(
    () => new Set([...changing, ...moving, ...duplicating, ...purging].filter((id): id is string => Boolean(id))),
    [changing, moving, duplicating, purging],
  );
}
