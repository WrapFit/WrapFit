"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Download, FileDown, RotateCw, ShieldAlert } from "lucide-react";
import type { FitCheckReport } from "@wrapfit/shared";
import { ApiError, getExportJob, listProjectExports, requestExport } from "@/api";
import { GoiMascot } from "@/components/common/GoiMascot";
import { useToast } from "@/components/common/Toast";
import { queryKeys } from "@/hooks/data";
import type { ExportFileType, ExportJob } from "@/types/api";
import { StudioDialog } from "../dialog/StudioDialog";
import { buildPrintFile, fileNameFor, isDemoProjectId, OFFLINE_DEMO, saveFile, type ExportDesign } from "./offline";

const FORMATS: { type: ExportFileType; title: string; hint: string }[] = [
  {
    type: "PRINT_PACKAGE",
    title: "Gói gửi nhà in (.ai + PDF + JPG)",
    hint: "File gốc .ai tương thích Illustrator, bản PDF in, bản JPG đối chiếu, SVG/DXF và phiếu kiểm tra 7 tiêu chuẩn in.",
  },
  {
    type: "PDF_CMYK",
    title: "PDF in CMYK nhiều lớp (Offset / Công nghiệp)",
    hint: "Cho xưởng in: lớp Artwork, Crease (#3182CE), CutContour (#E53E3E), Dimensions; chữ đã outline, ảnh CMYK nhúng sẵn, tràn lề 3 mm.",
  },
  {
    type: "PDF_A4_PRINT",
    title: "PDF A4/A3 In Thủ Công (Home DIY - Chị Linh)",
    hint: "Dành cho in máy tại nhà: canh giữa khổ A4/A3, có dấu xén 4 góc (crop marks) và thước căn chuẩn 1:1 (50mm).",
  },
  { type: "SVG", title: "SVG nhiều lớp", hint: "Cho máy cắt Cricut, laser; cùng 4 lớp, mở bằng Illustrator, Inkscape, Figma." },
  { type: "DXF", title: "DXF", hint: "Cho máy bế CNC: lớp CUT và CREASE, mỗi đường là một polyline liền, không có hình in." },
];

const FORMAT_NAMES: Record<ExportFileType, string> = {
  PDF_CMYK: "PDF CMYK",
  PDF_A4_PRINT: "PDF In A4/A3",
  SVG: "SVG",
  DXF: "DXF",
  PRINT_PACKAGE: "Gói nhà in (ZIP)",
};

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
  /** The design on screen, for the files built in the browser when there is no backend (demo, Vercel). */
  design?: ExportDesign;
  /** FitCheck of the design on screen: the browser export blocks on errors like the server does. */
  report?: FitCheckReport;
}

/** A file built in the browser: an ExportJob with a blob URL. */
type LocalJob = ExportJob & { url?: string };

/** Files built in the browser during this visit, by project (the blob URLs live as long as the page). */
const localHistory = new Map<string, LocalJob[]>();

/** Steps of the browser export, so it reads like the server queue (and Gói has time to deliver). */
const LOCAL_STEP_MS = 700;

/** Print files on the BullMQ queue (docs/06 §7): request, poll every 2 seconds, download, history. */
export function ExportDialog({ projectId, flush, onBlocked, onClose, design, report }: ExportDialogProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [starting, setStarting] = useState<ExportFileType | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<FitCheckReport | null>(null);
  // No backend (Vercel, demo project, API unreachable): the files are built in the browser from the design on screen.
  const [offline, setOffline] = useState(() => Boolean(design) && (OFFLINE_DEMO || isDemoProjectId(projectId)));
  const [localJob, setLocalJob] = useState<LocalJob | null>(null);
  const [localJobs, setLocalJobs] = useState<LocalJob[]>(() => localHistory.get(projectId) ?? []);

  // Polling stops on its own when the job is done or the dialog closes.
  const job = useQuery({
    queryKey: queryKeys.exportJob(jobId ?? ""),
    queryFn: () => getExportJob(jobId!),
    enabled: jobId !== null && !offline,
    refetchInterval: (query) => (isRunning(query.state.data) || !query.state.data ? 2000 : false),
  });
  const history = useQuery({
    queryKey: queryKeys.projects.exports(projectId),
    queryFn: () => listProjectExports(projectId),
    enabled: Boolean(projectId && !offline && !isDemoProjectId(projectId)),
  });

  const current: LocalJob | undefined = offline ? localJob ?? undefined : job.data;
  const status = current?.status;
  useEffect(() => {
    if (!offline && (status === "COMPLETED" || status === "FAILED")) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.exports(projectId) });
    }
  }, [status, projectId, queryClient, offline]);

  const startLocal = async (fileType: ExportFileType) => {
    if (!design) return;
    const errors = report?.violations.filter((v) => v.severity === "error") ?? [];
    if (report && errors.length > 0) {
      setBlocked(report);
      return;
    }
    const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
    const base: LocalJob = {
      id: `local-${Date.now()}`,
      projectId,
      fileType,
      status: "PENDING",
      fileName: fileNameFor(design.title, fileType),
      createdAt: new Date().toISOString(),
    } as LocalJob;
    setJobId(base.id);
    setLocalJob(base);
    await wait(LOCAL_STEP_MS);
    setLocalJob({ ...base, status: "PROCESSING" });
    try {
      const [file] = await Promise.all([buildPrintFile(design, fileType), wait(LOCAL_STEP_MS * 1.5)]);
      const done: LocalJob = { ...base, status: "COMPLETED", fileName: file.fileName, url: URL.createObjectURL(file.blob) };
      setLocalJob(done);
      const next = [done, ...(localHistory.get(projectId) ?? [])].slice(0, 6);
      localHistory.set(projectId, next);
      setLocalJobs(next);
    } catch (err) {
      setLocalJob({ ...base, status: "FAILED", error: err instanceof Error ? err.message : "Không dựng được file." } as LocalJob);
    }
  };

  const start = async (fileType: ExportFileType) => {
    setStarting(fileType);
    setBlocked(null);
    if (offline) {
      try {
        await startLocal(fileType);
      } finally {
        setStarting(null);
      }
      return;
    }
    try {
      if (!(await flush())) {
        toast.show({
          tone: "error",
          title: "Chưa xuất được file",
          description: "Thay đổi mới nhất chưa lưu được. Đợi trạng thái “đã lưu” rồi thử lại.",
        });
        return;
      }
      const started = await requestExport(projectId, fileType);
      queryClient.removeQueries({ queryKey: queryKeys.exportJob(started.jobId) });
      setJobId(started.jobId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.fitCheck) {
        setBlocked(err.fitCheck);
      } else if (design && !(err instanceof ApiError && err.status < 500)) {
        // The API cannot be reached (offline demo, server down): build the file in the browser instead.
        setOffline(true);
        await startLocal(fileType);
      } else {
        toast.error(err, "Chưa xuất được file");
      }
    } finally {
      setStarting(null);
    }
  };

  const download = async (exportJob: LocalJob, fetchedAt: number) => {
    if (exportJob.url) {
      saveFile(exportJob.url, exportJob.fileName ?? "wrapfit-print");
      return;
    }
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

  const waiting = starting !== null || isRunning(current) || (!offline && jobId !== null && !current && !job.error);
  const historyItems: LocalJob[] | undefined = offline ? localJobs : history.data;
  const historyPending = !offline && history.isPending && !isDemoProjectId(projectId);
  const historyError = !offline && history.error;
  const pose = current?.status === "COMPLETED" ? "celebration" : waiting ? "delivery" : null;

  return (
    <StudioDialog
      title="Xuất file in"
      subtitle="CMYK · chữ outline · ảnh nhúng · nét cắt #E53E3E · nét gấp #3182CE"
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
            className="w-full min-h-[64px] p-3.5 rounded-3xl border border-landing-line hover:border-fpt-orange hover:bg-orange-50/50 text-left transition flex items-center justify-between gap-3 group disabled:opacity-60 disabled:hover:border-landing-line disabled:hover:bg-transparent"
          >
            <span>
              <span className="font-semibold text-sm text-landing-ink group-hover:text-fpt-orange block">{format.title}</span>
              <span className="text-xs text-landing-muted block mt-0.5 leading-relaxed">{format.hint}</span>
            </span>
            {starting === format.type ? (
              <RotateCw className="w-4 h-4 flex-shrink-0 text-fpt-orange animate-spin motion-reduce:animate-none" aria-hidden />
            ) : (
              <FileDown className="w-4 h-4 flex-shrink-0 text-landing-muted group-hover:text-fpt-orange" aria-hidden />
            )}
          </button>
        ))}
      </div>

      {blocked && (
        <div role="alert" className="p-4 rounded-3xl bg-vibrant-coral/10 border border-vibrant-coral/30 space-y-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-vibrant-coral-dark" aria-hidden />
            <div className="text-sm text-landing-ink">
              <span className="font-bold block">FitCheck chặn xuất file</span>
              Máy chủ tìm thấy {blocked.violations.filter((v) => v.severity === "error").length} lỗi sẽ làm hỏng bản in.
            </div>
          </div>
          <ul className="space-y-1.5 text-xs text-landing-ink">
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
            className="min-h-[40px] px-4 rounded-full bg-landing-green-night hover:bg-black text-white text-xs font-semibold transition"
          >
            Mở FitCheck để sửa
          </button>
        </div>
      )}

      {jobId && (
        <div
          role="status"
          className={`p-4 rounded-3xl border flex items-center gap-3 ${
            current?.status === "COMPLETED"
              ? "bg-success-bg border-success/30"
              : current?.status === "FAILED" || job.error
              ? "bg-vibrant-coral/10 border-vibrant-coral/30"
              : "bg-orange-50 border-orange-200"
          }`}
        >
          {pose && <GoiMascot pose={pose} size={56} className="flex-shrink-0" />}
          <div className="flex-1 min-w-0 text-sm">
            {current?.status === "COMPLETED" ? (
              <>
                <span className="font-bold text-success-fg flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" aria-hidden /> File {FORMAT_NAMES[current.fileType]} đã sẵn sàng
                </span>
                <span className="text-xs text-success-fg block truncate">{current.fileName}</span>
              </>
            ) : current?.status === "FAILED" ? (
              <>
                <span className="font-bold text-landing-ink block">Xuất file thất bại</span>
                <span className="text-xs text-landing-muted block">{current.error ?? "Thử xuất lại sau ít phút."}</span>
              </>
            ) : job.error ? (
              <span className="text-xs text-landing-ink">Chưa hỏi được trạng thái. File vẫn được dựng; xem ở lịch sử bên dưới.</span>
            ) : (
              <>
                <span className="font-bold text-fpt-orange-ink block">
                  {current ? STATUS_LABELS[current.status] : "Đang chờ"}…
                </span>
                <span className="text-xs text-fpt-orange-ink block">Gói đang dựng file in, thường mất vài giây.</span>
              </>
            )}
          </div>
          {current?.status === "COMPLETED" && (
            <button
              type="button"
              onClick={() => void download(current, job.dataUpdatedAt)}
              className="min-h-[40px] px-4 rounded-full bg-success hover:bg-success text-white text-xs font-semibold transition flex-shrink-0"
            >
              Tải về
            </button>
          )}
        </div>
      )}

      {/* Sample Box Order Banner (1-Unit Physical Proof) */}
      <div className="p-3.5 rounded-2xl bg-paper-ivory border border-paper-kraft flex items-center justify-between gap-3">
        <div>
          <span className="font-semibold text-xs text-fg block">Cần cầm mẫu thực tế trước khi in loạt?</span>
          <span className="text-caption text-fg-muted block">WrapFit kết nối xưởng in đối tác in thử 01 hộp mẫu gửi tận tay.</span>
        </div>
        <Link
          href={`/cart?add=${encodeURIComponent(projectId)}`}
          className="px-3.5 py-1.5 rounded-full bg-brand-forest-deep hover:bg-brand-forest text-white text-xs font-semibold shrink-0 transition shadow-xs"
        >
          Đặt in mẫu 1 hộp
        </Link>
      </div>

      <section aria-labelledby="export-history" className="space-y-2 pt-1 border-t border-landing-line">
        <h3 id="export-history" className="font-landing-heading text-base font-bold text-landing-ink pt-3">
          Lần xuất gần đây
        </h3>
        {historyPending ? (
          <p className="text-xs text-landing-muted">Đang tải…</p>
        ) : historyError ? (
          <p className="text-xs text-landing-muted">
            Chưa tải được lịch sử.{" "}
            <button type="button" onClick={() => void history.refetch()} className="font-semibold text-fpt-orange-ink underline">
              Thử lại
            </button>
          </p>
        ) : !historyItems || historyItems.length === 0 ? (
          <p className="text-xs text-landing-muted">Chưa có lần xuất nào.</p>
        ) : (
          <ul className="divide-y divide-landing-line">
            {historyItems.slice(0, 6).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0 text-xs">
                  <span className="font-mono font-semibold text-landing-ink">{FORMAT_NAMES[item.fileType]}</span>
                  <span className="text-landing-muted"> · {dateTime.format(new Date(item.createdAt))}</span>
                  {item.status === "FAILED" && item.error && (
                    <span className="block text-landing-muted truncate" title={item.error}>
                      {item.error}
                    </span>
                  )}
                </div>
                {item.status === "COMPLETED" ? (
                  <button
                    type="button"
                    onClick={() => void download(item, history.dataUpdatedAt)}
                    className="min-h-[36px] px-3 rounded-full border border-landing-line hover:bg-landing-canvas text-landing-ink text-xs font-semibold flex-shrink-0"
                  >
                    Tải lại
                  </button>
                ) : (
                  <span
                    className={`text-caption font-semibold flex-shrink-0 ${
                      item.status === "FAILED" ? "text-vibrant-coral-dark" : "text-landing-muted"
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
