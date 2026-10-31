"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Coins, ImagePlus, Wand2 } from "lucide-react";
import { nearestAspectRatio, type PanelFace } from "@wrapfit/shared";
import { createAiImages, getAiImageCatalog, getAiImageJob, getAiUsage, listAiImages, runAiImageTool } from "@/api";
import { GoiMascot, type MascotPose } from "@/components/common/GoiMascot";
import { useToast } from "@/components/common/Toast";
import { Badge, Button, DropdownMenu, NumberStepper, RadioGroup, Switch, Textarea } from "@/components/ui";
import { queryKeys } from "@/hooks/data";
import type { AiImageJob, AiImageOutput, AiImageTool, AiUsage } from "@/types/api";
import { cn } from "@/utils/helpers";

const MAX_PROMPT = 500;
const POLL_MS = 2_000;
/** Below this the print looks soft (FitCheck warns under 300 DPI, refuses under 150): suggest an upscale (docs/19 S4). */
const UPSCALE_HINT_DPI = 200;
const GALLERY_PAGE = 12;
const SUGGESTIONS = ["Hoa đào màu nước, nền kem", "Lá monstera, phong cách tối giản", "Họa tiết gốm Bát Tràng xanh lam"];
const TOOL_LABELS: Record<AiImageTool, string> = { upscale: "Phóng to cho in", "remove-bg": "Xóa nền", vectorize: "Chuyển sang vector SVG" };
const TIER_LABELS = { draft: "Nháp", standard: "Tiêu chuẩn", premium: "Cao cấp", vector: "Vector" } as const;

const running = (job: AiImageJob | undefined) => job?.status === "PENDING" || job?.status === "PROCESSING";

/**
 * One click, one id: the server answers a repeated request with the same job instead of charging twice. A UUID v4;
 * `crypto.randomUUID` is missing on plain-http pages other than localhost (a phone on the LAN).
 */
function newRequestId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

interface AiImagePanelProps {
  /** Null in the demo: AI images need an account. */
  projectId: string | null;
  /** Face that receives the image; its proportions pick the aspect ratio. */
  panel: PanelFace | undefined;
  /** Places the image on the face; returns its print resolution (FitCheck), or null when nothing was placed. */
  onPlace: (output: AiImageOutput) => { dpi: number } | null;
}

/** "Ảnh AI" of the studio (docs/19 S4): a prompt, a model priced in xu, images drawn for the face in use. */
export function AiImagePanel({ projectId, panel, onPlace }: AiImagePanelProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const signedIn = projectId !== null;
  const catalog = useQuery({ queryKey: queryKeys.aiImageCatalog, queryFn: getAiImageCatalog, enabled: signedIn, staleTime: 5 * 60_000 });
  const usage = useQuery({ queryKey: queryKeys.aiUsage, queryFn: getAiUsage, enabled: signedIn, staleTime: 60_000 });
  const [prompt, setPrompt] = useState("");
  const [modelKey, setModelKey] = useState<string | null>(null);
  const [numImages, setNumImages] = useState(1);
  const [allowText, setAllowText] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [lowDpi, setLowDpi] = useState<{ outputId: string; dpi: number } | null>(null);

  const job = useQuery({
    queryKey: [...queryKeys.aiImages, "job", jobId],
    queryFn: () => getAiImageJob(jobId!),
    enabled: jobId !== null,
    refetchInterval: (query) => (running(query.state.data) ? POLL_MS : false),
  });
  const gallery = useQuery({
    queryKey: queryKeys.aiImages,
    queryFn: () => listAiImages({ limit: GALLERY_PAGE }),
    enabled: signedIn && galleryOpen,
  });

  // The job just ended: a failed one gave its xu back, a finished one joins "Ảnh AI của tôi".
  const lastStatus = useRef<string | undefined>(undefined);
  const status = job.data?.status;
  useEffect(() => {
    const before = lastStatus.current;
    lastStatus.current = status;
    if (!before || before === status) return;
    if (status === "FAILED") {
      // The server's message already says the xu came back.
      toast.show({ tone: "error", title: "Chưa tạo được ảnh", description: job.data?.error ?? "Lỗi phía WrapFit. Xu đã được hoàn lại." });
      void usage.refetch();
    }
    if (status === "COMPLETED") void queryClient.invalidateQueries({ queryKey: queryKeys.aiImages, exact: true });
  }, [status, job.data?.error, toast, usage, queryClient]);

  if (!signedIn) {
    return (
      <p className="rounded-panel border border-line bg-surface-sunken p-3 text-caption leading-relaxed text-fg-muted">
        Đăng nhập và tạo dự án để tạo ảnh AI cho mặt hộp.
      </p>
    );
  }
  if (catalog.data && (!catalog.data.enabled || catalog.data.models.length === 0)) {
    return <p className="rounded-panel bg-surface-sunken p-3 text-caption text-fg-muted">Tạo ảnh AI đang tắt trên máy chủ này.</p>;
  }

  const models = catalog.data?.models ?? [];
  const model = models.find((m) => m.key === modelKey) ?? models[0];
  const count = model ? Math.min(numImages, model.maxImages) : 1;
  const cost = model ? model.xu * count : 0;
  const balance = usage.data?.xu.balance;
  const short = balance !== undefined && balance < cost;
  const aspectRatio = model && panel ? nearestAspectRatio(panel.bounds.width, panel.bounds.height, model.aspectRatios) : "1:1";
  const busy = submitting || running(job.data);

  /** Charges the job and starts polling it; keeps the balance the server returned. */
  const started = (result: { job: AiImageJob; balance: number }) => {
    setJobId(result.job.id);
    setLowDpi(null);
    queryClient.setQueryData([...queryKeys.aiImages, "job", result.job.id], result.job);
    queryClient.setQueryData(queryKeys.aiUsage, (old: AiUsage | undefined) => (old ? { ...old, xu: { ...old.xu, balance: result.balance } } : old));
    void queryClient.invalidateQueries({ queryKey: queryKeys.billing });
  };

  const generate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!model || !prompt.trim() || busy) return;
    setSubmitting(true);
    try {
      started(
        await createAiImages({
          prompt: prompt.trim(),
          modelKey: model.key,
          aspectRatio,
          numImages: count,
          allowText: model.supportsText && allowText,
          clientRequestId: newRequestId(),
        })
      );
    } catch (err) {
      toast.error(err, "Chưa tạo được ảnh");
      void usage.refetch();
    } finally {
      setSubmitting(false);
    }
  };

  const runTool = async (output: AiImageOutput, tool: AiImageTool) => {
    if (busy) return;
    setSubmitting(true);
    try {
      started(await runAiImageTool(output.id, tool, newRequestId()));
    } catch (err) {
      toast.error(err, `Chưa ${TOOL_LABELS[tool].toLowerCase()} được`);
      void usage.refetch();
    } finally {
      setSubmitting(false);
    }
  };

  const place = (output: AiImageOutput) => {
    const placed = onPlace(output);
    if (!placed) return;
    setLowDpi(placed.dpi < UPSCALE_HINT_DPI ? { outputId: output.id, dpi: placed.dpi } : null);
    toast.show({ tone: "success", title: "Đã đặt ảnh AI", description: panel?.name });
  };

  const pose: MascotPose = busy ? "delivery" : lowDpi ? "measuring" : status === "COMPLETED" ? "celebration" : "presenting";
  const outputs = job.data?.status === "COMPLETED" ? job.data.outputs : [];
  const tools = catalog.data?.tools;

  const outputCard = (output: AiImageOutput) => {
    const vector = output.width === null;
    return (
      <li key={output.id} className="overflow-hidden rounded-panel border border-line bg-surface-raised">
        {output.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- files of the WrapFit bucket, sizes vary
          <img src={output.url} alt={job.data?.prompt ?? "Ảnh AI"} className="aspect-square w-full bg-surface-sunken object-contain" />
        ) : (
          <div className="aspect-square w-full bg-surface-sunken" />
        )}
        <div className="flex items-center gap-1 p-1.5">
          <Button
            size="sm"
            variant="primary"
            className="min-w-0 flex-1 px-2"
            title={`Dùng cho ${panel?.name ?? "mặt đang chọn"}`}
            onClick={() => place(output)}
            disabled={!output.url || !panel}
          >
            <span className="truncate">Dùng cho {panel?.name ?? "mặt"}</span>
          </Button>
          {tools && !vector && (
            <DropdownMenu
              label="Công cụ ảnh AI"
              align="end"
              items={(Object.keys(tools) as AiImageTool[]).map((tool) => ({
                id: tool,
                label: `${TOOL_LABELS[tool]} · ${tools[tool]} xu`,
                disabled: busy || (balance !== undefined && balance < tools[tool]),
                onSelect: () => void runTool(output, tool),
              }))}
              renderTrigger={(props) => (
                <Button {...props} size="icon-sm" variant="ghost" aria-label="Công cụ: phóng to, xóa nền, vector hóa">
                  <Wand2 aria-hidden />
                </Button>
              )}
            />
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-landing-heading text-base font-bold text-fg">
          <ImagePlus className="size-3.5 text-fpt-orange-ink" aria-hidden /> Ảnh AI
        </span>
        {balance !== undefined && (
          <Link
            href="/dashboard/billing"
            title="Ví xu: nạp thêm ở trang Thanh toán & gói"
            className={cn("inline-flex min-h-8 items-center gap-1 rounded-full px-2 font-mono text-cad-spec-micro tabular-nums hover:bg-surface-sunken", short ? "text-danger-fg" : "text-fg-muted")}
          >
            <Coins className="size-3" aria-hidden />
            {balance.toLocaleString("vi-VN")} xu
          </Link>
        )}
      </div>

      <form onSubmit={(event) => void generate(event)} className="space-y-3">
        <label htmlFor="ai-image-prompt" className="sr-only">
          Mô tả ảnh
        </label>
        <Textarea
          id="ai-image-prompt"
          value={prompt}
          maxLength={MAX_PROMPT}
          rows={3}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Mô tả ảnh cho mặt hộp, vd. hoa đào màu nước trên nền kem"
          className="min-h-20 text-body-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setPrompt(suggestion)}
              className="min-h-8 rounded-full bg-surface-sunken px-2.5 text-caption font-medium text-fg-muted hover:text-fg"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {models.length > 0 && model && (
          <RadioGroup
            label="Model"
            variant="card"
            value={model.key}
            onChange={setModelKey}
            options={models.map((m) => ({
              value: m.key,
              label: (
                <span className="flex items-center gap-1.5">
                  {m.label}
                  <Badge size="sm" tone={m.tier === "premium" ? "warning" : m.tier === "vector" ? "info" : "neutral"}>
                    {TIER_LABELS[m.tier]}
                  </Badge>
                  <span className="ml-auto font-mono tabular-nums text-fg-muted">{m.xu} xu</span>
                </span>
              ),
              description: m.summary,
            }))}
          />
        )}

        {model && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-caption text-fg-muted">
              Tỉ lệ <span className="font-mono text-fg">{aspectRatio}</span>
              {panel && (
                <>
                  {" "}
                  theo {panel.name} ({Math.round(panel.bounds.width)} × {Math.round(panel.bounds.height)} mm)
                </>
              )}
            </span>
            {model.maxImages > 1 && (
              <NumberStepper label="Số ảnh" unit="ảnh" size="sm" min={1} max={model.maxImages} value={count} onChange={setNumImages} />
            )}
          </div>
        )}
        {model?.supportsText && (
          <Switch checked={allowText} onChange={setAllowText} label="Cho phép chữ trong ảnh" description="Mặc định ảnh không có chữ, để bạn tự thêm chữ in sắc nét." />
        )}

        <Button type="submit" variant="brand" size="lg" block disabled={!model || !prompt.trim() || busy || short} leadingIcon={<Wand2 aria-hidden />}>
          {busy ? "Đang tạo…" : short ? "Không đủ xu" : `Tạo · ${cost} xu`}
        </Button>
        {short && (
          <p className="text-caption text-danger-fg">
            Cần {cost} xu, ví còn {balance} xu.{" "}
            <Link href="/dashboard/billing" className="font-semibold underline">
              Nạp xu
            </Link>
          </p>
        )}
      </form>

      {(busy || job.data) && (
        <div className="flex items-center gap-2 rounded-panel bg-surface-sunken p-2.5" role="status" aria-live="polite">
          <GoiMascot pose={pose} size={44} showPhotoBadge={false} interactive={false} enableTracking={false} />
          <p className="text-caption leading-relaxed text-fg-muted">
            {busy
              ? "Gói đang vẽ ảnh, thường mất 10–40 giây. Bạn cứ thiết kế tiếp."
              : lowDpi
                ? `Ảnh chỉ đạt ${lowDpi.dpi} DPI ở cỡ này, dưới ${UPSCALE_HINT_DPI} DPI nên in sẽ mờ. Hãy phóng to ảnh (${tools?.upscale ?? 20} xu) rồi đặt lại.`
                : status === "COMPLETED"
                  ? "Ảnh xong rồi! Chọn ảnh để đặt lên mặt hộp."
                  : status === "FAILED"
                    ? "Lần này chưa được, xu đã về ví."
                    : null}
          </p>
        </div>
      )}
      {lowDpi && tools && (
        <Button
          size="sm"
          variant="outline"
          block
          disabled={busy}
          onClick={() => {
            const output = outputs.find((o) => o.id === lowDpi.outputId) ?? gallery.data?.items.find((o) => o.id === lowDpi.outputId);
            if (output) void runTool(output, "upscale");
          }}
        >
          Phóng to ảnh · {tools.upscale} xu
        </Button>
      )}

      {outputs.length > 0 && <ul className="grid grid-cols-2 gap-2">{outputs.map(outputCard)}</ul>}

      <div className="border-t border-line pt-3">
        <button
          type="button"
          aria-expanded={galleryOpen}
          onClick={() => setGalleryOpen((open) => !open)}
          className="flex min-h-11 w-full items-center justify-between rounded-control text-label font-semibold text-fg outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40"
        >
          Ảnh AI của tôi
          <ChevronDown className={cn("size-4 transition-transform", galleryOpen && "rotate-180")} aria-hidden />
        </button>
        {galleryOpen && (
          <div className="space-y-2">
            <p className="text-caption text-fg-muted">Ảnh chưa dùng được giữ 30 ngày; ảnh đã đặt lên thiết kế được giữ cùng thiết kế.</p>
            {gallery.isPending ? (
              <p className="text-caption text-fg-muted">Đang tải…</p>
            ) : gallery.data && gallery.data.items.length > 0 ? (
              <ul className="grid grid-cols-2 gap-2">{gallery.data.items.map(outputCard)}</ul>
            ) : (
              <p className="text-caption text-fg-muted">Chưa có ảnh nào.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
