/**
 * A repeat tile described as data, never as raw SVG: generators (Claude or procedural) return shapes, and
 * `renderPatternSvg` validates every value before building the markup. Nothing a generator returns can inject
 * scripts, links or external resources into the SVG.
 */
export interface PatternTile {
  /** Side of the square tile in px (the tile repeats in both directions). */
  size: number;
  /** Hex color, or null for a transparent background. */
  background: string | null;
  circles: { cx: number; cy: number; r: number; fill: string; opacity: number }[];
  rects: { x: number; y: number; width: number; height: number; rotate: number; fill: string; opacity: number }[];
  lines: { x1: number; y1: number; x2: number; y2: number; stroke: string; strokeWidth: number; opacity: number }[];
  /** `d` may only contain path commands and numbers. `fill` null = outline only. */
  paths: { d: string; fill: string | null; stroke: string | null; strokeWidth: number; opacity: number }[];
}

export interface PatternDesign {
  themeName: string;
  description: string;
  /** 4 to 6 hex colors, most important first. */
  palette: string[];
  tile: PatternTile;
}

/** `fast` = AI_MODEL_FAST (every plan), `premium` = AI_MODEL_PREMIUM (paid plans). */
export type AiQuality = 'fast' | 'premium';

export interface PatternRequest {
  theme: string;
  /** Brand colors the pattern should use (hex). */
  preferredColors: string[];
  /** Which model answers; the procedural generator ignores it. Default `fast`. */
  quality?: AiQuality;
}

/** Result of a generator, with what to bill / record. */
export interface GeneratedPattern {
  design: PatternDesign;
  usage?: { model: string; inputTokens: number; outputTokens: number };
}

export interface PatternGenerator {
  generate(request: PatternRequest): Promise<GeneratedPattern>;
}
