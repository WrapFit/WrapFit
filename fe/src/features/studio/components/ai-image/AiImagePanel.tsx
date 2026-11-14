"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, Coins, ImagePlus, Wand2 } from "lucide-react";
import { nearestAspectRatio, type PanelFace } from "@wrapfit/shared";
import { createAiImages, getAiImageCatalog, getAiImageJob, getAiUsage, listAiImages, runAiImageTool } from "@/api";
import { GoiMascot, type MascotPose } from "@/components/common/GoiMascot";
import { useToast } from "@/components/common/Toast";
import { Badge, Button, DropdownMenu, NumberStepper, RadioGroup, Switch, Textarea } from "@/components/ui";
import { queryKeys } from "@/hooks/data";
import { CheckoutDialog } from "@/features/payments";
import { formatVnd } from "@/features/pricing";
import type { AiImageJob, AiImageOutput, AiImageTool, AiUsage, XuPackPurpose } from "@/types/api";
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
export function newRequestId(): string {
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
  const [buyingPack, setBuyingPack] = useState<XuPackPurpose | null>(null);
  const [confirmingCost, setConfirmingCost] = useState(false);

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
  const deficit = Math.max(0, cost - (balance ?? 0));
  const recommendedPack: XuPackPurpose = deficit <= 500 ? "XU_500" : deficit <= 1050 ? "XU_1050" : "XU_2200";
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
    if (!model || !prompt.trim() || busy || short) return;
    if (cost >= 100 && !confirmingCost) {
      setConfirmingCost(true);
      return;
    }
    setConfirmingCost(false);
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
    const expiresMs = output.keepUntil ? new Date(output.keepUntil).getTime() - Date.now() : 0;
    const daysLeft = Math.max(0, Math.ceil(expiresMs / (1000 * 60 * 60 * 24)));
    const isExpired = output.keepUntil ? daysLeft <= 0 : false;
    const isUrgent = output.keepUntil ? daysLeft <= 3 : false;

    return (
      <li key={output.id} className="group relative overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-xs hover:shadow-md transition-all duration-300 flex flex-col">
        <div className="relative aspect-square w-full bg-surface-sunken overflow-hidden">
          {output.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- files of the WrapFit bucket, sizes vary
            <img
              src={output.url}
              alt={job.data?.prompt ?? "Ảnh AI"}
              className={cn("aspect-square w-full object-contain transition-transform duration-300 group-hover:scale-105", isExpired && "opacity-50 grayscale")}
            />
          ) : (
            <div className="aspect-square w-full" />
          )}

          {output.keepUntil && (
            <span
              title={isExpired ? "Ảnh đã hết hạn lưu trữ" : `Tự động xóa sau ${daysLeft} ngày nếu không gắn vào thiết kế`}
              className={cn(
                "absolute top-2 right-2 rounded-control px-2 py-0.5 font-mono text-cad-spec-micro font-medium tracking-tight shadow-xs border transition-all select-none",
                isExpired
                  ? "bg-danger-bg text-danger-fg border-danger-line"
                  : isUrgent
                    ? "bg-danger-bg text-danger-fg border-danger-line"
                    : daysLeft <= 7
                      ? "bg-warning-bg text-warning-fg border-warning-line"
                      : "bg-white/95 text-fg-muted border-line"
              )}
            >
              {isExpired ? "Hết hạn" : `Còn ${daysLeft} ngày`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 p-2 mt-auto bg-surface-raised border-t border-line/60">
          <Button
            size="sm"
            variant="primary"
            className="min-w-0 flex-1 px-2.5 text-xs font-semibold shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all"
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
                <Button {...props} size="icon-sm" variant="ghost" aria-label="Công cụ: phóng to, xóa nền, vector hóa" className="hover:bg-amber-500/10 hover:text-amber-700">
                  <Wand2 className="size-3.5" aria-hidden />
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
          <button
            type="button"
            onClick={() => setBuyingPack("XU_500")}
            title="Ví xu: bấm để nạp thêm qua VietQR"
            className={cn(
              "group inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 font-mono text-cad-spec-micro tabular-nums transition-all border cursor-pointer",
              "bg-surface-sunken hover:bg-surface-raised border-line hover:border-fpt-orange",
              short ? "border-danger-fg text-danger-fg bg-danger-bg/20" : "text-fg"
            )}
          >
            <Coins className="size-3.5 text-fpt-orange-ink" aria-hidden />
            <span className="font-semibold">{balance.toLocaleString("vi-VN")} xu</span>
            <span className="rounded-full bg-fpt-orange size-3.5 flex items-center justify-center text-white text-label-sm font-bold group-hover:scale-110 transition-transform">
              +
            </span>
          </button>
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

        {confirmingCost && (
          <div className="rounded-control border border-warning/60 bg-warning-bg/40 p-2.5 text-caption text-warning-fg animate-in fade-in-50">
            <div className="flex items-center gap-1.5 font-semibold text-fg">
              <AlertTriangle className="size-3.5 text-warning-fg shrink-0" aria-hidden />
              <span>Xác nhận dùng {cost} xu?</span>
            </div>
            <p className="mt-1 text-xs text-fg-muted">
              Tác vụ này tiêu tốn <strong>{cost} xu Wrap</strong> (≈ {formatVnd(cost * 100)}). Bấm nút bên dưới lần nữa để bắt đầu.
            </p>
            <button
              type="button"
              onClick={() => setConfirmingCost(false)}
              className="mt-1 text-xs text-fg-muted underline hover:text-fg"
            >
              Hủy thao tác
            </button>
          </div>
        )}

        <Button
          type="submit"
          variant="brand"
          size="lg"
          block
          disabled={!model || !prompt.trim() || busy || short}
          leadingIcon={<Wand2 aria-hidden />}
        >
          {busy
            ? "Đang tạo…"
            : short
              ? "Không đủ xu"
              : confirmingCost
                ? `Xác nhận tạo · ${cost} xu`
                : `Tạo · ${cost} xu`}
        </Button>

        {short && (
          <div className="flex items-center justify-between rounded-control border border-danger-line/60 bg-danger-bg/20 p-2.5 text-caption text-danger-fg">
            <span>Cần {cost} xu, ví còn {balance} xu.</span>
            <button
              type="button"
              onClick={() => setBuyingPack(recommendedPack)}
              className="rounded-full bg-fpt-orange px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-fpt-orange-dark transition-colors"
            >
              Nạp nhanh ({recommendedPack === "XU_500" ? "500 xu" : recommendedPack === "XU_1050" ? "1.050 xu" : "2.200 xu"})
            </button>
          </div>
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

      {buyingPack && (
        <CheckoutDialog
          purpose={buyingPack}
          onClose={() => setBuyingPack(null)}
        />
      )}
    </div>
  );
}
