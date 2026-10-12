"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, History, RotateCcw, Trash2 } from "lucide-react";
import { ApiError, createSnapshot, deleteSnapshot, listSnapshots, restoreSnapshot, uploadFileToStorage } from "@/api";
import { useToast } from "@/components/common/Toast";
import { queryKeys } from "@/hooks/data";
import type { ProjectDetail, SnapshotSummary } from "@/types/api";
import { UnsavedChangesError } from "../../hooks/useProjectSync";
import { StudioDialog } from "../dialog/StudioDialog";

/** Same limit as `MAX_SNAPSHOTS_PER_PROJECT` of the backend (manual snapshots only). */
const MAX_SNAPSHOTS = 50;
const MAX_NAME_LENGTH = 120;

const dateTime = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" });

interface SnapshotsDialogProps {
  projectId: string;
  /** Saves the pending changes; false when they could not be saved (a snapshot copies the saved project). */
  flush: () => Promise<boolean>;
  /** Runs the restore in the save queue; the editor is mounted again with the project returned. */
  replace: (task: (version: number | undefined) => Promise<ProjectDetail>) => Promise<ProjectDetail>;
  /** PNG of the design on screen, for the preview of a new snapshot. */
  renderPreview: () => Promise<Blob>;
  /** The restore succeeded: open `project`; restoring `backup` undoes it. */
  onRestored: (project: ProjectDetail, backup: SnapshotSummary, restoredName: string) => void;
  onClose: () => void;
}

type Pending = { kind: "restore" | "delete"; id: string } | null;

/** Named versions of the design (docs/06 §6): save, restore (undoable), delete. */
export function SnapshotsDialog({ projectId, flush, replace, renderPreview, onRestored, onClose }: SnapshotsDialogProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const snapshots = useQuery({
    queryKey: queryKeys.projects.snapshots(projectId),
    queryFn: () => listSnapshots(projectId),
  });
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<Pending>(null);
  const [running, setRunning] = useState<Pending>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.snapshots(projectId) });

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = name.trim() || `Mốc ${dateTime.format(new Date())}`;
    setCreating(true);
    try {
      if (!(await flush())) {
        toast.show({
          tone: "error",
          title: "Chưa lưu được mốc",
          description: "Thay đổi mới nhất chưa lưu được. Đợi trạng thái “Đã lưu” rồi thử lại.",
        });
        return;
      }
      // A preview only: the snapshot is saved without one when the upload fails.
      let previewUrl: string | undefined;
      try {
        previewUrl = (await uploadFileToStorage(await renderPreview(), "THUMBNAIL", projectId)).fileUrl;
      } catch {
        previewUrl = undefined;
      }
      await createSnapshot(projectId, { name: title.slice(0, MAX_NAME_LENGTH), previewUrl });
      setName("");
      toast.show({ tone: "success", title: "Đã lưu mốc phiên bản", description: title });
      await refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.show({
          tone: "error",
          title: `Đã đủ ${MAX_SNAPSHOTS} mốc`,
          description: "Xoá bớt mốc cũ để lưu mốc mới.",
        });
      } else {
        toast.error(err, "Chưa lưu được mốc");
      }
    } finally {
      setCreating(false);
    }
  };

  const restore = async (snapshot: SnapshotSummary) => {
    setRunning({ kind: "restore", id: snapshot.id });
    try {
      let backup: SnapshotSummary | null = null;
      const project = await replace(async () => {
        const result = await restoreSnapshot(projectId, snapshot.id);
        backup = result.backup;
        return result.project;
      });
      void refresh();
      onRestored(project, backup!, snapshot.name);
    } catch (err) {
      if (err instanceof UnsavedChangesError) toast.show({ tone: "error", title: "Chưa khôi phục được mốc", description: err.message });
      else toast.error(err, "Chưa khôi phục được mốc");
      setRunning(null);
      setConfirm(null);
    }
  };

  const remove = async (snapshot: SnapshotSummary) => {
    setRunning({ kind: "delete", id: snapshot.id });
    try {
      await deleteSnapshot(projectId, snapshot.id);
      await refresh();
    } catch (err) {
      toast.error(err, "Chưa xoá được mốc");
    } finally {
      setRunning(null);
      setConfirm(null);
    }
  };

  const busy = running !== null;

  return (
    <StudioDialog
      title="Mốc phiên bản"
      subtitle={`Tối đa ${MAX_SNAPSHOTS} mốc · khôi phục có thể hoàn tác`}
      icon={<History className="w-5 h-5" aria-hidden />}
      onClose={onClose}
      busy={running?.kind === "restore"}
      widthClass="max-w-lg"
    >
      <form onSubmit={(event) => void create(event)} className="flex flex-col sm:flex-row gap-2">
        <label htmlFor="snapshot-name" className="sr-only">
          Tên mốc
        </label>
        <input
          id="snapshot-name"
          type="text"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          onChange={(event) => setName(event.target.value)}
          placeholder="Tên mốc, vd. Bản gửi khách duyệt"
          className="flex-1 min-h-[44px] px-4 rounded-full border border-stone-200 bg-stone-50/60 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-vibrant-cobalt focus:bg-white"
        />
        <button
          type="submit"
          disabled={creating || busy}
          className="min-h-[44px] px-5 rounded-full bg-brand-forest hover:bg-brand-forest-dark text-white text-sm font-semibold shadow-tactile transition flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-wait"
        >
          <Bookmark className="w-4 h-4" aria-hidden />
          {creating ? "Đang lưu…" : "Lưu mốc"}
        </button>
      </form>

      {snapshots.isPending ? (
        <p className="text-sm text-stone-500">Đang tải các mốc…</p>
      ) : snapshots.error ? (
        <p className="text-sm text-stone-500">
          Chưa tải được danh sách mốc.{" "}
          <button type="button" onClick={() => void snapshots.refetch()} className="font-semibold text-vibrant-cobalt underline">
            Thử lại
          </button>
        </p>
      ) : snapshots.data.length === 0 ? (
        <p className="text-sm text-stone-500 leading-relaxed">
          Chưa có mốc nào. Lưu một mốc trước khi thử hướng thiết kế mới để quay lại được bất cứ lúc nào.
        </p>
      ) : (
        <ul className="space-y-2">
          {snapshots.data.map((snapshot) => {
            const confirming = confirm?.id === snapshot.id ? confirm.kind : null;
            const working = running?.id === snapshot.id;
            return (
              <li key={snapshot.id} className="p-2.5 rounded-2xl border border-stone-200/80 bg-white">
                <div className="flex items-center gap-3">
                  <span className="w-16 h-12 flex-shrink-0 rounded-xl bg-paper-linen border border-stone-200/80 overflow-hidden flex items-center justify-center">
                    {snapshot.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={snapshot.previewUrl} alt="" className="w-full h-full object-contain" loading="lazy" />
                    ) : (
                      <Bookmark className="w-4 h-4 text-stone-300" aria-hidden />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-stone-900 block truncate" title={snapshot.name}>
                      {snapshot.name}
                    </span>
                    <span className="text-[11px] text-stone-500 font-mono block">
                      {dateTime.format(new Date(snapshot.createdAt))} · {snapshot.dimensions.length}×{snapshot.dimensions.width}×
                      {snapshot.dimensions.height} mm
                    </span>
                  </div>
                  {!confirming && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirm({ kind: "restore", id: snapshot.id })}
                        aria-label={`Khôi phục mốc ${snapshot.name}`}
                        title="Khôi phục"
                        className="w-10 h-10 rounded-full hover:bg-blue-50 text-vibrant-cobalt flex items-center justify-center transition disabled:opacity-40"
                      >
                        <RotateCcw className="w-4 h-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirm({ kind: "delete", id: snapshot.id })}
                        aria-label={`Xoá mốc ${snapshot.name}`}
                        title="Xoá"
                        className="w-10 h-10 rounded-full hover:bg-stone-100 text-stone-500 flex items-center justify-center transition disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden />
                      </button>
                    </div>
                  )}
                </div>
                {confirming && (
                  <div className="mt-2.5 p-3 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2.5">
                    <p className="text-xs text-stone-700 leading-relaxed">
                      {confirming === "restore"
                        ? "Thay thiết kế hiện tại bằng mốc này? Bản hiện tại được lưu thành mốc tự động, bạn có thể hoàn tác."
                        : "Xoá mốc này? Không hoàn tác được."}
                    </p>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={working}
                        onClick={() => setConfirm(null)}
                        className="min-h-[36px] px-4 rounded-full border border-stone-200 hover:bg-white text-stone-700 text-xs font-semibold"
                      >
                        Huỷ
                      </button>
                      <button
                        type="button"
                        disabled={working}
                        onClick={() => void (confirming === "restore" ? restore(snapshot) : remove(snapshot))}
                        className={`min-h-[36px] px-4 rounded-full text-white text-xs font-semibold disabled:opacity-60 disabled:cursor-wait ${
                          confirming === "restore" ? "bg-vibrant-cobalt hover:bg-blue-700" : "bg-stone-900 hover:bg-stone-800"
                        }`}
                      >
                        {working
                          ? confirming === "restore"
                            ? "Đang khôi phục…"
                            : "Đang xoá…"
                          : confirming === "restore"
                          ? "Khôi phục"
                          : "Xoá mốc"}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </StudioDialog>
  );
}
