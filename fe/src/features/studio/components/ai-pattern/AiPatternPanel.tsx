"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Wand2 } from "lucide-react";
import { BLEED_MM, cutSidesOf, type CanvasElement, type DielineGeometry, type PanelFace } from "@wrapfit/shared";
import { ApiError, generateAiPattern, getAiUsage, uploadFileToStorage } from "@/api";
import { useToast } from "@/components/common/Toast";
import { queryKeys } from "@/hooks/data";
import type { AiPatternResult } from "@/types/api";
import { renderPatternPng, tileBackground } from "./patternImage";

const MAX_THEME = 200;
const SUGGESTIONS = ["Tết hoa mai", "Giáng sinh tuyết", "Lá khuynh diệp", "Hình học Art Deco"];

interface AiPatternPanelProps {
  /** Null in the demo: generating needs an account. */
  projectId: string | null;
  /** Panel that receives the pattern, and the piece it belongs to (its cut lines get the bleed). */
  panel: PanelFace | undefined;
  geometry: DielineGeometry;
  /** Colors of the palette in use, sent as preferred colors. */
  colors: string[];
  /** Adds the pattern under the other elements. */
  onInsert: (element: CanvasElement) => void;
}

/** AI pattern generator (docs/06 §11): theme → seamless tile → printed over the selected panel. */
export function AiPatternPanel({ projectId, panel, geometry, colors, onInsert }: AiPatternPanelProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const usage = useQuery({ queryKey: queryKeys.aiUsage, queryFn: getAiUsage, enabled: projectId !== null, staleTime: 60_000 });
  const [theme, setTheme] = useState("");
  const [useColors, setUseColors] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [result, setResult] = useState<AiPatternResult | null>(null);

  if (!projectId) {
    return (
      <p className="text-xs text-stone-500 leading-relaxed p-3 rounded-2xl bg-stone-50 border border-stone-200/80">
        Đăng nhập và tạo dự án để sinh hoa văn bằng AI.
      </p>
    );
  }

  const quota = usage.data?.aiEnabled ? usage.data : null;
  const exhausted = quota !== null && quota.used >= quota.limit;

  const generate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!theme.trim()) return;
    setGenerating(true);
    try {
      const generated = await generateAiPattern({
        theme: theme.trim(),
        preferredColors: useColors ? colors.slice(0, 5) : undefined,
      });
      setResult(generated);
      if (generated.usage) {
        queryClient.setQueryData(queryKeys.aiUsage, (old: typeof usage.data) =>
          old ? { ...old, used: generated.usage!.used, limit: generated.usage!.limit } : old
        );
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 429 && exhausted) {
        toast.show({ tone: "error", title: "Đã hết lượt AI hôm nay", description: "Lượt mới được cộng lại sau 24 giờ, hoặc nâng cấp gói." });
      } else {
        toast.error(err, "Chưa tạo được hoa văn");
      }
      void usage.refetch();
    } finally {
      setGenerating(false);
    }
  };

  const insert = async () => {
    if (!result || !panel) return;
    setInserting(true);
    try {
      // A background covers the panel and runs BLEED_MM past its cut lines (FitCheck); folds need no bleed.
      const cut = cutSidesOf(panel, geometry);
      const bleed = (side: "top" | "right" | "bottom" | "left") => (cut.has(side) ? BLEED_MM : 0);
      const x = -bleed("left");
      const y = -bleed("top");
      const width = panel.bounds.width + bleed("left") + bleed("right");
      const height = panel.bounds.height + bleed("top") + bleed("bottom");
      const { blob, dpi } = await renderPatternPng(result.tile, width, height);
      const { fileUrl } = await uploadFileToStorage(blob, "IMAGE", projectId);
      onInsert({
        id: `pattern_${Date.now()}`,
        type: "pattern",
        panelId: panel.id,
        x,
        y,
        width: Math.round(width * 100) / 100,
        height: Math.round(height * 100) / 100,
        rotation: 0,
        content: fileUrl,
        dpi,
      });
      toast.show({ tone: "success", title: "Đã phủ hoa văn", description: `${result.themeName} · ${panel.name}` });
    } catch (err) {
      toast.error(err, "Chưa thêm được hoa văn");
    } finally {
      setInserting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-library-accent" aria-hidden /> Hoa văn AI
        </span>
        {quota && (
          <span className={`text-[11px] font-mono ${exhausted ? "text-vibrant-coral-dark" : "text-stone-500"}`}>
            Còn {Math.max(0, quota.limit - quota.used)}/{quota.limit} lượt
          </span>
        )}
      </div>

      <form onSubmit={(event) => void generate(event)} className="space-y-2">
        <label htmlFor="ai-pattern-theme" className="sr-only">
          Chủ đề hoa văn
        </label>
        <input
          id="ai-pattern-theme"
          type="text"
          value={theme}
          maxLength={MAX_THEME}
          onChange={(event) => setTheme(event.target.value)}
          placeholder="Chủ đề, vd. Tết hoa mai"
          className="w-full min-h-[44px] px-3 rounded-xl border border-stone-200 bg-white text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-library-accent"
        />
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setTheme(suggestion)}
              className="min-h-[32px] px-2.5 rounded-full bg-stone-100 hover:bg-stone-200 text-[11px] font-medium text-stone-600"
            >
              {suggestion}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-stone-600 min-h-[32px] cursor-pointer">
          <input
            type="checkbox"
            checked={useColors}
            onChange={(event) => setUseColors(event.target.checked)}
            className="w-4 h-4 accent-[#2563EB]"
          />
          Dùng màu của bảng màu đang chọn
          <span className="flex -space-x-1" aria-hidden>
            {colors.slice(0, 5).map((color) => (
              <span key={color} className="w-3.5 h-3.5 rounded-full border border-white" style={{ backgroundColor: color }} />
            ))}
          </span>
        </label>
        <button
          type="submit"
          disabled={!theme.trim() || generating || exhausted}
          className="w-full min-h-[44px] rounded-full bg-library-accent hover:bg-[#3A7513] text-white text-sm font-semibold shadow-tactile transition flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Wand2 className="w-4 h-4" aria-hidden />
          {generating ? "Đang tạo…" : exhausted ? "Hết lượt hôm nay" : "Tạo hoa văn"}
        </button>
      </form>

      {result && (
        <div className="p-3 rounded-2xl border border-stone-200 bg-white space-y-2.5">
          <div className="h-28 rounded-xl border border-stone-200/80" style={tileBackground(result.tile.svg, 56)} role="img" aria-label={`Xem trước hoa văn ${result.themeName}`} />
          <div>
            <span className="text-sm font-semibold text-stone-900 block">{result.themeName}</span>
            <span className="text-xs text-stone-500 block leading-relaxed">{result.description}</span>
          </div>
          <div className="flex items-center gap-1.5" aria-label="Bảng màu của hoa văn">
            {result.palette.map((color) => (
              <span key={color} title={color} className="w-5 h-5 rounded-md border border-stone-200" style={{ backgroundColor: color }} />
            ))}
            {result.source === "procedural" && (
              <span className="ml-auto text-[10px] text-stone-400 font-mono">thuật toán</span>
            )}
          </div>
          <button
            type="button"
            disabled={inserting || !panel}
            onClick={() => void insert()}
            className="w-full min-h-[44px] rounded-full bg-brand-forest hover:bg-brand-forest-dark text-white text-sm font-semibold transition disabled:opacity-60 disabled:cursor-wait"
          >
            {inserting ? "Đang phủ hoa văn…" : `Dùng cho ${panel?.name ?? "mặt đang chọn"}`}
          </button>
        </div>
      )}
    </div>
  );
}
