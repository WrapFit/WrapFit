"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, Sparkles, Wand2 } from "lucide-react";
import { BLEED_BOX_MM, cutSidesOf, type CanvasElement, type DielineGeometry, type PanelFace } from "@wrapfit/shared";
import { ApiError, errorMessage, generateAiPattern, getAiUsage, uploadFileToStorage } from "@/api";
import { useToast } from "@/components/common/Toast";
import { RadioGroup } from "@/components/ui";
import { queryKeys } from "@/hooks/data";
import type { AiPatternResult, AiUsage, GeneratePatternRequest } from "@/types/api";
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

type Quality = NonNullable<GeneratePatternRequest["quality"]>;

/** AI pattern generator (docs/06 §11), paid with xu (docs/19): theme → seamless tile → printed over the selected panel. */
export function AiPatternPanel({ projectId, panel, geometry, colors, onInsert }: AiPatternPanelProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const usage = useQuery({ queryKey: queryKeys.aiUsage, queryFn: getAiUsage, enabled: projectId !== null, staleTime: 60_000 });
  const [theme, setTheme] = useState("");
  const [useColors, setUseColors] = useState(true);
  const [quality, setQuality] = useState<Quality>("fast");
  const [generating, setGenerating] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [result, setResult] = useState<AiPatternResult | null>(null);

  if (!projectId) {
    return (
      <p className="text-xs text-landing-muted leading-relaxed p-3 rounded-3xl bg-landing-canvas border border-landing-line">
        Đăng nhập và tạo dự án để sinh hoa văn bằng AI.
      </p>
    );
  }

  // AI off or the monthly budget of WrapFit spent: the procedural generator answers, for free.
  const paid = usage.data?.aiEnabled === true && !usage.data.budgetReached ? usage.data : null;
  const cost = paid ? paid.patternCost[quality] : 0;
  const short = paid !== null && paid.xu.balance < cost;

  const generate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!theme.trim()) return;
    setGenerating(true);
    try {
      const generated = await generateAiPattern({
        theme: theme.trim(),
        preferredColors: useColors ? colors.slice(0, 5) : undefined,
        quality,
      });
      setResult(generated);
      const spent = generated.usage;
      if (spent) {
        queryClient.setQueryData(queryKeys.aiUsage, (old: AiUsage | undefined) =>
          old ? { ...old, xu: { ...old.xu, balance: spent.balance } } : old
        );
        void queryClient.invalidateQueries({ queryKey: queryKeys.billing });
      }
      if (spent && spent.charged === 0 && generated.source === "procedural") {
        toast.show({ tone: "info", title: "AI đang bận, đã dùng hoa văn thuật toán", description: "Xu của lượt này đã được hoàn." });
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === "INSUFFICIENT_CREDITS") {
        toast.show({ tone: "error", title: "Không đủ xu", description: errorMessage(err) });
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
      // A background covers the panel and runs BLEED_BOX_MM (3 mm) past its cut lines (bleed 2–3 mm); folds need no bleed.
      const cut = cutSidesOf(panel, geometry);
      const bleed = (side: "top" | "right" | "bottom" | "left") => (cut.has(side) ? BLEED_BOX_MM : 0);
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
        <span className="font-landing-heading text-base font-bold text-landing-ink flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-fpt-orange-ink" aria-hidden /> Hoa văn AI
        </span>
        {usage.data && (
          <span
            className={`inline-flex items-center gap-1 text-cad-spec-micro font-mono tabular-nums ${short ? "text-danger-fg" : "text-landing-muted"}`}
            title="Số xu còn lại trong ví"
          >
            <Coins className="w-3 h-3" aria-hidden />
            {usage.data.xu.balance.toLocaleString("vi-VN")} xu
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
          className="w-full min-h-[44px] px-3 rounded-xl border border-landing-line bg-white text-sm text-landing-ink placeholder:text-landing-muted focus:outline-none focus:border-fpt-orange"
        />
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setTheme(suggestion)}
              className="min-h-[32px] px-2.5 rounded-full bg-landing-canvas hover:bg-landing-tile text-caption font-medium text-landing-muted"
            >
              {suggestion}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-landing-muted min-h-[32px] cursor-pointer">
          <input
            type="checkbox"
            checked={useColors}
            onChange={(event) => setUseColors(event.target.checked)}
            className="w-4 h-4 accent-vibrant-cobalt"
          />
          Dùng màu của bảng màu đang chọn
          <span className="flex -space-x-1" aria-hidden>
            {colors.slice(0, 5).map((color) => (
              <span key={color} className="w-3.5 h-3.5 rounded-full border border-white" style={{ backgroundColor: color }} />
            ))}
          </span>
        </label>
        {paid && (
          <RadioGroup<Quality>
            label="Chất lượng"
            hideLabel
            inline
            value={quality}
            onChange={setQuality}
            options={[
              { value: "fast", label: `Nhanh · ${paid.patternCost.fast} xu` },
              { value: "premium", label: `Cao cấp · ${paid.patternCost.premium} xu` },
            ]}
          />
        )}
        <button
          type="submit"
          disabled={!theme.trim() || generating || short}
          className="w-full min-h-[44px] rounded-full bg-fpt-orange hover:bg-fpt-orange-ink text-white text-sm font-semibold shadow-none transition flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Wand2 className="w-4 h-4" aria-hidden />
          {generating ? "Đang tạo…" : short ? "Không đủ xu" : paid ? `Tạo hoa văn · ${cost} xu` : "Tạo hoa văn"}
        </button>
        {usage.data && !paid && (
          <p className="text-caption text-landing-muted">AI đang tắt: hoa văn được tạo bằng thuật toán, không tốn xu.</p>
        )}
        {short && (
          <p className="text-caption text-danger-fg">
            Cần {cost} xu, ví còn {paid!.xu.balance} xu.{" "}
            <Link href="/dashboard/billing" className="underline font-semibold">
              Nạp xu
            </Link>
          </p>
        )}
      </form>

      {result && (
        <div className="p-3 rounded-3xl border border-landing-line bg-white space-y-2.5">
          <div className="h-28 rounded-xl border border-landing-line" style={tileBackground(result.tile.svg, 56)} role="img" aria-label={`Xem trước hoa văn ${result.themeName}`} />
          <div>
            <span className="text-sm font-semibold text-landing-ink block">{result.themeName}</span>
            <span className="text-xs text-landing-muted block leading-relaxed">{result.description}</span>
          </div>
          <div className="flex items-center gap-1.5" aria-label="Bảng màu của hoa văn">
            {result.palette.map((color) => (
              <span key={color} title={color} className="w-5 h-5 rounded-md border border-landing-line" style={{ backgroundColor: color }} />
            ))}
            {result.source === "procedural" && (
              <span className="ml-auto text-cad-spec-micro text-landing-muted font-mono">thuật toán</span>
            )}
          </div>
          <button
            type="button"
            disabled={inserting || !panel}
            onClick={() => void insert()}
            className="w-full min-h-[44px] rounded-full bg-landing-green-night hover:bg-black text-white text-sm font-semibold transition disabled:opacity-60 disabled:cursor-wait"
          >
            {inserting ? "Đang phủ hoa văn…" : `Dùng cho ${panel?.name ?? "mặt đang chọn"}`}
          </button>
        </div>
      )}
    </div>
  );
}
