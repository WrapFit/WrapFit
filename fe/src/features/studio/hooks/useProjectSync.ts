"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FitCheckReport } from "@wrapfit/shared";
import { ApiError, changeProjectStatus, updateProject, uploadFileToStorage } from "@/api";
import { queryKeys } from "@/hooks/data";
import type { ProjectDetail, UpdateProjectRequest } from "@/types/api";

/** What the editor saves: only fields UpdateProjectDto accepts (the API refuses unknown fields with 400). */
export type DesignPayload = Required<Pick<UpdateProjectRequest, "title" | "dimensions" | "materialSpec" | "canvasState">>;

export type SyncState =
  | "demo" // offline demo: nothing is saved
  | "saved"
  | "pending" // changed, waiting for the debounce
  | "saving"
  | "invalid" // not sent: the design breaks a rule the API checks (e.g. dimensions out of range)
  | "error"
  | "conflict" // another tab saved a newer version
  | "trash"; // in the trash: read-only until restored

const SAVE_DELAY_MS = 900;
/** After a network or server error, the save is tried again after this delay. */
const RETRY_DELAY_MS = 5000;
/** At most one thumbnail upload per minute, plus one when leaving the editor. */
const THUMBNAIL_INTERVAL_MS = 60_000;

interface ProjectSyncOptions {
  /** The project as loaded; null for the offline demo. Only read on mount: remount the editor to load another state. */
  project: ProjectDetail | null;
  payload: DesignPayload;
  /** Why the design cannot be saved right now; null when it can. */
  invalidReason: string | null;
  /** PNG preview of the current design (upload purpose THUMBNAIL). */
  renderThumbnail: () => Promise<Blob>;
}

export interface ProjectSync {
  state: SyncState;
  /** FitCheck stored by the server with the last save (null before the first check). */
  serverReport: FitCheckReport | null;
  /** The design has changes the server does not have yet. */
  dirty: boolean;
  /** Last failed save (state "error"). */
  error: unknown;
  /** 409 PROJECT_VERSION_CONFLICT: another tab saved a newer version. */
  conflict: boolean;
  /** Saves this design over the newer version of the other tab. */
  overwrite: () => void;
  /** Takes the project out of the trash; the editor becomes editable again. */
  restore: () => Promise<void>;
  restoring: boolean;
}

const isVersionConflict = (err: unknown): err is ApiError =>
  err instanceof ApiError && err.status === 409 && err.code === "PROJECT_VERSION_CONFLICT";

/**
 * Autosave of a project (docs/12 Phase 3a): debounced PATCH with the version last loaded or saved (optimistic
 * concurrency), one save at a time, a final save when leaving the editor, and a thumbnail at most once a minute.
 */
export function useProjectSync({ project, payload, invalidReason, renderThumbnail }: ProjectSyncOptions): ProjectSync {
  const queryClient = useQueryClient();
  const projectId = project?.id ?? null;
  const key = JSON.stringify(payload);

  // The design as loaded counts as saved (its first render may add defaults the server never stored).
  const [savedKey, setSavedKey] = useState(key);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [retryTick, setRetryTick] = useState(0);
  // 409 PROJECT_VERSION_CONFLICT, with the version the other tab saved (undefined if the API did not say).
  const [conflict, setConflict] = useState<{ version: number | undefined } | null>(null);
  const [trashed, setTrashed] = useState(project?.status === "DELETED");
  const [restoring, setRestoring] = useState(false);
  const [serverReport, setServerReport] = useState<FitCheckReport | null>(project?.fitcheckState ?? null);

  const versionRef = useRef(project?.version);
  // Saves (and thumbnail updates) run one after another, so each one sends the version returned by the previous one.
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const latestRef = useRef({ key, payload, savedKey, blocked: false });
  latestRef.current = { key, payload, savedKey, blocked: trashed || conflict !== null || invalidReason !== null };
  const renderRef = useRef(renderThumbnail);
  renderRef.current = renderThumbnail;
  const thumbRef = useRef({ key, at: 0, timer: undefined as ReturnType<typeof setTimeout> | undefined });

  const enqueue = useCallback((task: () => Promise<void>) => {
    queueRef.current = queueRef.current.then(task, task);
    return queueRef.current;
  }, []);

  const savedProject = useCallback(
    (saved: ProjectDetail) => {
      versionRef.current = saved.version;
      queryClient.setQueryData(queryKeys.projects.detail(saved.id), saved);
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
    },
    [queryClient]
  );

  const uploadThumbnail = useCallback(
    async (forKey: string) => {
      if (!projectId) return;
      clearTimeout(thumbRef.current.timer);
      thumbRef.current = { key: forKey, at: Date.now(), timer: undefined };
      try {
        const { fileUrl } = await uploadFileToStorage(await renderRef.current(), "THUMBNAIL", projectId);
        await enqueue(async () => {
          savedProject(await updateProject(projectId, { thumbnailUrl: fileUrl, version: versionRef.current }));
        });
      } catch {
        // A preview only: a conflict or a failure shows up with the next save of the design.
      }
    },
    [projectId, enqueue, savedProject]
  );

  /** After a save: a thumbnail now, or when the minute since the last one is over. */
  const scheduleThumbnail = useCallback(
    (forKey: string) => {
      if (forKey === thumbRef.current.key || thumbRef.current.timer) return;
      const wait = thumbRef.current.at + THUMBNAIL_INTERVAL_MS - Date.now();
      if (wait <= 0) {
        void uploadThumbnail(forKey);
        return;
      }
      thumbRef.current.timer = setTimeout(() => {
        thumbRef.current.timer = undefined;
        void uploadThumbnail(latestRef.current.savedKey);
      }, wait);
    },
    [uploadThumbnail]
  );

  const save = useCallback(
    async (sendKey: string, body: DesignPayload) => {
      if (!projectId) return;
      setSaving(true);
      try {
        const saved = await updateProject(projectId, { ...body, version: versionRef.current });
        savedProject(saved);
        setServerReport(saved.fitcheckState);
        setSavedKey(sendKey);
        latestRef.current.savedKey = sendKey;
        setError(null);
        scheduleThumbnail(sendKey);
      } catch (err) {
        if (isVersionConflict(err)) {
          setConflict({ version: err.currentVersion });
        } else if (err instanceof ApiError && err.status === 409) {
          // Moved to the trash from another tab or the dashboard.
          setTrashed(true);
        } else {
          setError(err);
          const retryable = !(err instanceof ApiError) || err.status === 0 || err.status === 429 || err.status >= 500;
          if (retryable) setTimeout(() => setRetryTick((tick) => tick + 1), RETRY_DELAY_MS);
        }
      } finally {
        setSaving(false);
      }
    },
    [projectId, savedProject, scheduleThumbnail]
  );

  const blocked = trashed || conflict !== null || invalidReason !== null;

  useEffect(() => {
    if (!projectId || blocked || key === savedKey) return;
    const timer = setTimeout(() => void enqueue(() => save(key, payload)), SAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // `payload` is the same data as `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, blocked, key, savedKey, retryTick, enqueue, save]);

  // Leaving the editor (another page, or a remount): send the last change still waiting for its debounce, then a
  // thumbnail of the final design. The promises outlive the component.
  useEffect(() => {
    if (!projectId) return;
    return () => {
      // The current timer: uploadThumbnail replaces the object in the ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      clearTimeout(thumbRef.current.timer);
      const latest = latestRef.current;
      // Conflict or trash: nothing of this design goes to the server any more.
      if (latest.blocked) return;
      if (latest.key !== latest.savedKey) {
        void enqueue(() => save(latest.key, latest.payload)).then(() => uploadThumbnail(latest.key));
      } else if (latest.savedKey !== thumbRef.current.key) {
        void uploadThumbnail(latest.savedKey);
      }
    };
  }, [projectId, enqueue, save, uploadThumbnail]);

  const dirty = !!projectId && (key !== savedKey || saving);

  // Closing the tab with unsaved changes: the browser asks first.
  useEffect(() => {
    if (!dirty || trashed) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, trashed]);

  const overwrite = useCallback(() => {
    // Without the version of the other tab, the save goes over any version.
    versionRef.current = conflict?.version;
    setConflict(null);
    // Saves even when nothing changed since the conflicting save.
    setSavedKey("");
  }, [conflict]);

  const restore = useCallback(async () => {
    if (!projectId) return;
    setRestoring(true);
    try {
      const restored = await changeProjectStatus(projectId, "ACTIVE");
      versionRef.current = restored.version;
      queryClient.setQueryData(queryKeys.projects.detail(projectId), restored);
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      setTrashed(false);
    } finally {
      setRestoring(false);
    }
  }, [projectId, queryClient]);

  let state: SyncState;
  if (!projectId) state = "demo";
  else if (trashed) state = "trash";
  else if (conflict) state = "conflict";
  else if (saving) state = "saving";
  else if (invalidReason) state = "invalid";
  else if (key === savedKey) state = "saved";
  else if (error) state = "error";
  else state = "pending";

  return { state, serverReport, dirty, error, conflict: conflict !== null, overwrite, restore, restoring };
}
