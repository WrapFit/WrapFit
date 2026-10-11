"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Download, FileDown, RotateCw, ShieldAlert } from "lucide-react";
import type { FitCheckReport } from "@wrapfit/shared";
import { ApiError, getExportJob, listProjectExports, requestExport } from "@/api";
import { GoiMascot } from "@/components/common/GoiMascot";
import { useToast } from "@/components/common/Toast";
import { queryKeys } from "@/hooks/data";
import type { ExportFileType, ExportJob } from "@/types/api";
import { StudioDialog } from "../dialog/StudioDialog";

const FORMATS: { type: ExportFileType; title: string; hint: string }[] = [
  {
    type: "PDF_CMYK",
    title: "PDF vector CMYK",
    hint: "Cho xưởng in: nét cắt đỏ, nét gấp xanh nét đứt (màu CMYK), chữ và ảnh PNG / JPG.",
  },
  { type: "SVG", title: "SVG nhiều lớp", hint: "Cho máy cắt Cricut, laser; mở bằng Illustrator, CorelDraw, Figma." },
  { type: "DXF", title: "DXF", hint: "Cho máy bế CNC: chỉ nét cắt và nét gấp, không có hình in." },
];

const FORMAT_NAMES: Record<ExportFileType, string> = { PDF_CMYK: "PDF", SVG: "SVG", DXF: "DXF" };

const STATUS_LABELS: Record<ExportJob["status"], string> = {
  PENDING: "Đang chờ",
  PROCESSING: "Đang dựng file",
  COMPLETED: "Xong",
  FAILED: "Lỗi",
};

const isRunning = (job: ExportJob | undefined) => job?.status === "PENDING" || job?.status === "PROCESSING";

/** A download link is used up to 30 seconds before it expires; after that the job is fetched again for a new one. */
const LINK_MARGIN_MS = 30_000;

const dateTime = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" });

interface ExportDialogProps {
  projectId: string;
  /** Saves the pending changes; false when they could not be saved (the export reads the saved project). */
  flush: () => Promise<boolean>;
  /** 422: FitCheck of the server found errors that would ruin the print. */
  onBlocked: (report: FitCheckReport) => void;
  onClose: () => void;
}

/** Print files on the BullMQ queue (docs/06 §7): request, poll every 2 seconds, download, history. */
export function ExportDialog({ projectId, flush, onBlocked, onClose }: ExportDialogProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [starting, setStarting] = useState<ExportFileType | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<FitCheckReport | null>(null);

  // Polling stops on its own when the job is done or the dialog closes.
  const job = useQuery({
    queryKey: queryKeys.exportJob(jobId ?? ""),
    queryFn: () => getExportJob(jobId!),
    enabled: jobId !== null,
    refetchInterval: (query) => (isRunning(query.state.data) || !query.state.data ? 2000 : false),
  });
  const history = useQuery({
    queryKey: queryKeys.projects.exports(projectId),
    queryFn: () => listProjectExports(projectId),
  });

  const current = job.data;
  const status = current?.status;
  useEffect(() => {
    if (status === "COMPLETED" || status === "FAILED") {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.exports(projectId) });
    }
  }, [status, projectId, queryClient]);

  const start = async (fileType: ExportFileType) => {
    setStarting(fileType);
    setBlocked(null);
    try {
      if (!(await flush())) {
        toast.show({
          tone: "error",
          title: "Chưa xuất được file",
          description: "Thay đổi mới nhất chưa lưu được. Đợi trạng thái “Đã lưu” rồi thử lại.",
        });
        return;
      }
      const started = await requestExport(projectId, fileType);
      queryClient.removeQueries({ queryKey: queryKeys.exportJob(started.jobId) });
      setJobId(started.jobId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.fitCheck) {
        setBlocked(err.fitCheck);
      } else {
        toast.error(err, "Chưa xuất được file");
      }
    } finally {
      setStarting(null);
    }
  };

  const download = async (exportJob: ExportJob, fetchedAt: number) => {
    let url = exportJob.downloadUrl;
    const expiresAt = fetchedAt + (exportJob.downloadExpiresIn ?? 0) * 1000 - LINK_MARGIN_MS;
    if (!url || Date.now() > expiresAt) {
      try {
        url = (await getExportJob(exportJob.id)).downloadUrl;
      } catch (err) {
        toast.error(err, "Chưa lấy được link tải");
        return;
      }
    }
    // The link answers with Content-Disposition: attachment, so the editor stays open.
    if (url) window.location.assign(url);
  };

  const waiting = starting !== null || isRunning(current) || (jobId !== null && !current && !job.error);
  const pose = current?.status === "COMPLETED" ? "celebration" : waiting ? "delivery" : null;

  return (
    <StudioDialog
      title="Xuất file in"
      subtitle="CMYK · vector · nét cắt #E53E3E · nét gấp #3182CE"
      icon={<Download className="w-5 h-5" aria-hidden />}
      onClose={onClose}
      widthClass="max-w-lg"
    >
      <div className="space-y-2.5" role="group" aria-label="Định dạng file">
        {FORMATS.map((format) => (
          <button
            key={format.type}
            type="button"
            disabled={waiting}
            onClick={() => void start(format.type)}
            className="w-full min-h-[64px] p-3.5 rounded-2xl border border-stone-200 hover:border-vibrant-cobalt hover:bg-blue-50/40 text-left transition flex items-center justify-between gap-3 group disabled:opacity-60 disabled:hover:border-stone-200 disabled:hover:bg-transparent"
          >
            <span>
              <span className="font-semibold text-sm text-stone-900 group-hover:text-vibrant-cobalt block">{format.title}</span>
              <span className="text-xs text-stone-500 block mt-0.5 leading-relaxed">{format.hint}</span>
            </span>
            {starting === format.type ? (
              <RotateCw className="w-4 h-4 flex-shrink-0 text-vibrant-cobalt animate-spin motion-reduce:animate-none" aria-hidden />
            ) : (
              <FileDown className="w-4 h-4 flex-shrink-0 text-stone-400 group-hover:text-vibrant-cobalt" aria-hidden />
            )}
          </button>
        ))}
      </div>

      {blocked && (
        <div role="alert" className="p-4 rounded-2xl bg-vibrant-coral/10 border border-vibrant-coral/30 space-y-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-vibrant-coral-dark" aria-hidden />
            <div className="text-sm text-stone-800">
              <span className="font-bold block">FitCheck chặn xuất file</span>
              Máy chủ tìm thấy {blocked.violations.filter((v) => v.severity === "error").length} lỗi sẽ làm hỏng bản in.
            </div>
          </div>
          <ul className="space-y-1.5 text-xs text-stone-700">
            {blocked.violations
              .filter((v) => v.severity === "error")
              .slice(0, 4)
              .map((violation) => (
                <li key={violation.id} className="flex gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px text-vibrant-coral-dark" aria-hidden />
                  <span>{violation.message}</span>
                </li>
              ))}
          </ul>
          <button
            type="button"
            onClick={() => onBlocked(blocked)}
            className="min-h-[40px] px-4 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition"
          >
            Mở FitCheck để sửa
          </button>
        </div>
      )}

      {jobId && (
        <div
          role="status"
          className={`p-4 rounded-2xl border flex items-center gap-3 ${
            current?.status === "COMPLETED"
              ? "bg-emerald-50 border-emerald-200"
              : current?.status === "FAILED" || job.error
              ? "bg-vibrant-coral/10 border-vibrant-coral/30"
              : "bg-blue-50 border-blue-200"
          }`}
        >
          {pose && <GoiMascot pose={pose} size={56} className="flex-shrink-0" />}
          <div className="flex-1 min-w-0 text-sm">
            {current?.status === "COMPLETED" ? (
              <>
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" aria-hidden /> File {FORMAT_NAMES[current.fileType]} đã sẵn sàng
                </span>
                <span className="text-xs text-emerald-800 block truncate">{current.fileName}</span>
              </>
            ) : current?.status === "FAILED" ? (
              <>
                <span className="font-bold text-stone-900 block">Xuất file thất bại</span>
                <span className="text-xs text-stone-600 block">{current.error ?? "Thử xuất lại sau ít phút."}</span>
              </>
            ) : job.error ? (
              <span className="text-xs text-stone-700">Chưa hỏi được trạng thái. File vẫn được dựng; xem ở lịch sử bên dưới.</span>
            ) : (
              <>
                <span className="font-bold text-blue-900 block">
                  {current ? STATUS_LABELS[current.status] : "Đang chờ"}…
                </span>
                <span className="text-xs text-blue-800 block">Gói đang dựng file in, thường mất vài giây.</span>
              </>
            )}
          </div>
          {current?.status === "COMPLETED" && (
            <button
              type="button"
              onClick={() => void download(current, job.dataUpdatedAt)}
              className="min-h-[40px] px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex-shrink-0"
            >
              Tải về
            </button>
          )}
        </div>
      )}

      <section aria-labelledby="export-history" className="space-y-2 pt-1 border-t border-stone-100">
        <h3 id="export-history" className="text-xs font-bold text-stone-800 uppercase tracking-wider pt-3">
          Lần xuất gần đây
        </h3>
        {history.isPending ? (
          <p className="text-xs text-stone-500">Đang tải…</p>
        ) : history.error ? (
          <p className="text-xs text-stone-500">
            Chưa tải được lịch sử.{" "}
            <button type="button" onClick={() => void history.refetch()} className="font-semibold text-vibrant-cobalt underline">
              Thử lại
            </button>
          </p>
        ) : history.data.length === 0 ? (
          <p className="text-xs text-stone-500">Chưa có lần xuất nào.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {history.data.slice(0, 6).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0 text-xs">
                  <span className="font-mono font-semibold text-stone-900">{FORMAT_NAMES[item.fileType]}</span>
                  <span className="text-stone-500"> · {dateTime.format(new Date(item.createdAt))}</span>
                  {item.status === "FAILED" && item.error && (
                    <span className="block text-stone-500 truncate" title={item.error}>
                      {item.error}
                    </span>
                  )}
                </div>
                {item.status === "COMPLETED" ? (
                  <button
                    type="button"
                    onClick={() => void download(item, history.dataUpdatedAt)}
                    className="min-h-[36px] px-3 rounded-full border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold flex-shrink-0"
                  >
                    Tải lại
                  </button>
                ) : (
                  <span
                    className={`text-[11px] font-semibold flex-shrink-0 ${
                      item.status === "FAILED" ? "text-vibrant-coral-dark" : "text-stone-500"
                    }`}
                  >
                    {STATUS_LABELS[item.status]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </StudioDialog>
  );
}
