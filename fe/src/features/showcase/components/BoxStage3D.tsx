"use client";

import type { BoxDimensions, BoxStructureType, CanvasState, MaterialSpecification } from "@wrapfit/shared";
import dynamic from "next/dynamic";
import React, { Component, useMemo } from "react";
import { BoxPreview } from "@/features/templates/components/BoxPreview";
import { materialThemeOf } from "@/features/studio/utils/projectMaterial";
import { usePrefersReducedMotion } from "../usePrefersReducedMotion";

type Environment = "studio" | "marble" | "kraft_wood" | "forest_velvet" | "festive_glow" | "transparent";

// three.js only loads in the browser, after the page is interactive.
const InteractiveFoldingBox3D = dynamic(
  () => import("@/features/studio/components/three/InteractiveFoldingBox3D").then((m) => m.InteractiveFoldingBox3D),
  { ssr: false, loading: () => <StageLoading /> },
);

interface BoxStage3DProps {
  structure: BoxStructureType;
  dimensions: BoxDimensions;
  materialSpec: MaterialSpecification | null;
  canvasState: CanvasState | null;
  /** Name of the design: accessible label, and the line printed in the lid frame. */
  title: string;
  /** Lid / drawer open. */
  open?: boolean;
  /** 0 flat sheet → 1 folded box (default). */
  foldProgress?: number;
  /** No frame of its own: the box sits on the parent's surface. */
  frameless?: boolean;
  environment?: Environment;
  className?: string;
}

/**
 * The one WebGL canvas of a public page: a saved design folded in 3D (structure, real mm size, paper look, and the
 * artwork of its canvas on each panel). Pixel ratio is clamped to 2 by the box component; auto-rotation stops for reduced motion.
 * Without WebGL the parametric sketch is shown instead.
 */
export function BoxStage3D({
  structure,
  dimensions,
  materialSpec,
  canvasState,
  title,
  open,
  foldProgress = 1,
  frameless = false,
  environment = "studio",
  className = "",
}: BoxStage3DProps) {
  const reducedMotion = usePrefersReducedMotion();
  const { length, width, height, paperThickness } = dimensions;
  // The box rebuilds its whole scene when these props change identity: keep them stable across renders.
  const dims = useMemo(
    () => ({ length, width, height, paperThickness }),
    [length, width, height, paperThickness],
  );
  // Every element on its panel, like the print file (texts, images, logos, patterns).
  const elements = useMemo(() => canvasState?.elements ?? [], [canvasState]);
  const theme = materialThemeOf(canvasState?.materialTheme, materialSpec ?? undefined);

  return (
    <div className={`relative min-w-0 ${className}`} role="group" aria-label={`Mô hình 3D: ${title}`}>
      <WebGlBoundary
        fallback={
          <div className="flex h-full min-h-[460px] flex-col items-center justify-center gap-3 rounded-squircle-lg border border-stone-200 bg-paper-ivory p-8">
            <BoxPreview structure={structure} dimensions={dims} material={materialSpec?.type} className="w-full max-w-sm" />
            <p className="text-center text-xs text-stone-500">Thiết bị này không hiển thị được 3D, đây là bản phác thảo của hộp.</p>
          </div>
        }
      >
        <InteractiveFoldingBox3D
          dimensions={dims}
          foldProgress={foldProgress}
          boxType={structure}
          theme={theme}
          elements={elements}
          backgroundPatternSvg={canvasState?.backgroundPattern ?? null}
          autoRotate={!reducedMotion}
          environment={environment}
          interactiveOpenState={open}
          enableMacroZoom={false}
          showStatusBar={false}
          frameless={frameless}
          className="h-full"
        />
      </WebGlBoundary>
    </div>
  );
}

function StageLoading() {
  return (
    <div
      role="status"
      className="flex h-full min-h-[460px] flex-col items-center justify-center gap-3 rounded-squircle-lg border border-stone-200 bg-paper-ivory"
    >
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-brand-forest motion-reduce:animate-none" />
      <span className="font-mono text-xs uppercase tracking-wider text-stone-500">Đang dựng hộp 3D…</span>
    </div>
  );
}

/** Creating a WebGL renderer throws on devices or browsers without WebGL. */
class WebGlBoundary extends Component<{ children: React.ReactNode; fallback: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
