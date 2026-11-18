"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eraser, Sparkles } from "lucide-react";
import { XU_TOOL_COST, type CanvasElement } from "@wrapfit/shared";
import { getAiImageJob, runAiUploadTool } from "@/api";
import { useToast } from "@/components/common/Toast";
import { buttonClass } from "@/components/ui";
import { queryKeys } from "@/hooks/data";
import type { AiImageJob, AiImageTool } from "@/types/api";
import { newRequestId } from "./AiImagePanel";

/** The tools offered on a photo of the canvas (docs/23 S20); vectorizing stays in the AI panel. */
const TOOLS: { tool: Extract<AiImageTool, "remove-bg" | "upscale">; label: string; icon: typeof Eraser; done: string }[] = [
  { tool: "remove-bg", label: "Xóa nền", icon: Eraser, done: "Đã xóa nền ảnh" },
  { tool: "upscale", label: "Tăng độ phân giải", icon: Sparkles, done: "Đã tăng độ phân giải" },
];

/** How long a tool may take before the studio stops waiting (the job goes on; its result lands in "Ảnh AI của tôi"). */
const MAX_WAIT_MS = 180_000;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Raster files of WrapFit (uploads, AI images): an SVG or a library artwork has nothing for these tools to do. */
export const takesImageTools = (element: CanvasElement) =>
  (element.type === "image" || element.type === "logo") &&
  /^(https?:\/\/|\/|data:image\/(png|jpeg|webp))/.test(element.content) &&
  !/\.svg(\?|#|$)/i.test(element.content) &&
  !element.content.startsWith("data:image/svg");

/**
 * "Công cụ AI" of an image (docs/23 S20): background removal and upscaling, paid in xu, run on the image itself (an
 * upload or an AI image). The result replaces the image in its frame; Ctrl+Z brings the old one back.
 */
export function ImageAiTools({ element, onChange, lowDpi }: { element: CanvasElement; onChange(element: CanvasElement): void; lowDpi: boolean }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<AiImageTool | null>(null);

  const run = async (tool: AiImageTool, done: string) => {
    if (busy) return;
    setBusy(tool);
    try {
      const started = await runAiUploadTool(element.content, tool, newRequestId());
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiUsage });
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing });
      let job: AiImageJob = started.job;
      const deadline = Date.now() + MAX_WAIT_MS;
      while ((job.status === "PENDING" || job.status === "PROCESSING") && Date.now() < deadline) {
        await wait(1500);
        job = await getAiImageJob(job.id);
      }
      const output = job.status === "COMPLETED" ? job.outputs[0] : undefined;
      if (!output?.url) {
        throw new Error(job.status === "FAILED" ? job.error ?? "Không xử lý được ảnh, xu đã được hoàn lại." : "Ảnh đang được xử lý lâu hơn thường lệ; kết quả sẽ có trong Ảnh AI của tôi.");
      }
      const next: CanvasElement = { ...element, content: output.url };
      // The same frame on the box now holds more pixels.
      if (tool === "upscale" && output.width && element.type !== "logo") next.dpi = Math.round(output.width / (element.width / 25.4));
      onChange(next);
      toast.show({ tone: "success", title: done, description: `${XU_TOOL_COST[tool]} xu. Bấm Ctrl+Z để quay lại ảnh cũ.` });
    } catch (err) {
      toast.error(err, "Chưa xử lý được ảnh");
    } finally {
      setBusy(null);
    }
  };

  return (
    <fieldset className="space-y-2 rounded-panel bg-surface-raised p-3 ring-1 ring-inset ring-line">
      <legend className="px-1 text-label font-semibold text-fg">Công cụ AI</legend>
      <div className="grid grid-cols-2 gap-2">
        {TOOLS.map(({ tool, label, icon: Icon, done }) => (
          <button
            key={tool}
            type="button"
            disabled={busy !== null}
            onClick={() => run(tool, done)}
            className={buttonClass({ variant: tool === "upscale" && lowDpi ? "primary" : "secondary", size: "sm", block: true })}
          >
            <Icon className="size-4" aria-hidden />
            <span className="flex flex-col items-start leading-tight">
              <span>{busy === tool ? "Đang xử lý…" : label}</span>
              <span className="text-label-sm opacity-80">{XU_TOOL_COST[tool]} xu</span>
            </span>
          </button>
        ))}
      </div>
      <p className="text-caption leading-5 text-fg-muted">
        {lowDpi ? "Ảnh này in sẽ mờ: tăng độ phân giải trước khi đặt in." : "Kết quả thay ảnh trong khung, giữ nguyên vị trí và kích thước."}
      </p>
    </fieldset>
  );
}
