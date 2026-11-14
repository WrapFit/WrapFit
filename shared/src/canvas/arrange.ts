/**
 * Arranging several layers (docs/23 S8, S12): align, distribute, group, resize and turn with handles, snap to guides.
 * Pure functions on panel coordinates (mm), shared by the canvas, the toolbar and the keyboard shortcuts.
 */
import { envelopeOf } from "../fitcheck/validator";
import type { CanvasElement } from "../types/project";
import { isBackground, samePanel, type Box } from "./elements";

export type AlignMode = "left" | "center" | "right" | "top" | "middle" | "bottom";

/** Envelope of several elements (their turned boxes), in panel coordinates. */
export function boundsOf(elements: CanvasElement[]): Box | null {
  if (!elements.length) return null;
  const boxes = elements.map(envelopeOf);
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.width));
  const bottom = Math.max(...boxes.map((b) => b.y + b.height));
  return { x, y, width: right - x, height: bottom - y };
}

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * Aligns the elements `ids` (movable ones on one face). With two or more, to the box around them; with one, to its
 * face (`face`: width and height of the panel). Locked layers do not move.
 */
export function alignElements(elements: CanvasElement[], ids: string[], mode: AlignMode, face: { width: number; height: number }): CanvasElement[] {
  const chosen = elements.filter((el) => ids.includes(el.id) && !el.locked && !isBackground(el));
  if (!chosen.length) return elements;
  const target = chosen.length > 1 ? boundsOf(chosen)! : { x: 0, y: 0, width: face.width, height: face.height };
  return elements.map((el) => {
    if (!chosen.includes(el)) return el;
    const env = envelopeOf(el);
    let dx = 0;
    let dy = 0;
    if (mode === "left") dx = target.x - env.x;
    if (mode === "center") dx = target.x + target.width / 2 - (env.x + env.width / 2);
    if (mode === "right") dx = target.x + target.width - (env.x + env.width);
    if (mode === "top") dy = target.y - env.y;
    if (mode === "middle") dy = target.y + target.height / 2 - (env.y + env.height / 2);
    if (mode === "bottom") dy = target.y + target.height - (env.y + env.height);
    return dx || dy ? { ...el, x: round(el.x + dx), y: round(el.y + dy) } : el;
  });
}

/** Spaces three or more elements evenly between the first and the last, along x or y (gaps between their boxes). */
export function distributeElements(elements: CanvasElement[], ids: string[], axis: "x" | "y"): CanvasElement[] {
  const chosen = elements.filter((el) => ids.includes(el.id) && !el.locked && !isBackground(el));
  if (chosen.length < 3) return elements;
  const pos = (el: CanvasElement) => (axis === "x" ? envelopeOf(el).x : envelopeOf(el).y);
  const size = (el: CanvasElement) => (axis === "x" ? envelopeOf(el).width : envelopeOf(el).height);
  const sorted = [...chosen].sort((a, b) => pos(a) - pos(b));
  const start = pos(sorted[0]);
  const end = pos(sorted[sorted.length - 1]) + size(sorted[sorted.length - 1]);
  const gap = (end - start - sorted.reduce((sum, el) => sum + size(el), 0)) / (sorted.length - 1);
  const moved = new Map<string, number>();
  let cursor = start;
  for (const el of sorted) {
    moved.set(el.id, cursor - pos(el));
    cursor += size(el) + gap;
  }
  return elements.map((el) => {
    const d = moved.get(el.id);
    if (!d) return el;
    return axis === "x" ? { ...el, x: round(el.x + d) } : { ...el, y: round(el.y + d) };
  });
}

/** Can these elements be grouped (two or more, same face and side, none a background)? */
export function canGroup(elements: CanvasElement[], ids: string[]): boolean {
  const chosen = elements.filter((el) => ids.includes(el.id));
  return chosen.length > 1 && chosen.every((el) => !isBackground(el) && samePanel(el.panelId, chosen[0].panelId) && (el.side ?? "outside") === (chosen[0].side ?? "outside"));
}

/** Gives the elements one group id: selecting one selects the group, moving one moves them all. */
export function groupElements(elements: CanvasElement[], ids: string[], groupId: string): CanvasElement[] {
  if (!canGroup(elements, ids)) return elements;
  return elements.map((el) => (ids.includes(el.id) ? { ...el, groupId } : el));
}

export function ungroupElements(elements: CanvasElement[], ids: string[]): CanvasElement[] {
  const groups = new Set(elements.filter((el) => ids.includes(el.id) && el.groupId).map((el) => el.groupId));
  return elements.map((el) => (el.groupId && groups.has(el.groupId) ? { ...el, groupId: null } : el));
}

/** The ids selected when `id` is clicked: its whole group, or itself. */
export function selectionOf(elements: CanvasElement[], id: string): string[] {
  const el = elements.find((item) => item.id === id);
  if (!el?.groupId) return [id];
  return elements.filter((item) => item.groupId === el.groupId).map((item) => item.id);
}

/** A resize handle: which sides move (-1 left / top, 1 right / bottom, 0 none). */
export type Handle = { sx: -1 | 0 | 1; sy: -1 | 0 | 1 };

/**
 * New box of an element dragged by a handle (in its own turned frame, like Canva): `local` is the pointer move in the
 * element's axes (mm). `keepRatio` keeps the proportions (Shift, and always on corners of photos); `fromCenter` grows
 * both sides (Alt). Never smaller than `min` mm.
 */
export function resizeBox(
  start: { x: number; y: number; width: number; height: number; rotation: number },
  handle: Handle,
  local: { x: number; y: number },
  options: { keepRatio?: boolean; fromCenter?: boolean; min?: number } = {}
): { x: number; y: number; width: number; height: number } {
  const min = options.min ?? 1;
  const k = options.fromCenter ? 2 : 1;
  let width = handle.sx ? Math.max(min, start.width + handle.sx * local.x * k) : start.width;
  let height = handle.sy ? Math.max(min, start.height + handle.sy * local.y * k) : start.height;
  if (options.keepRatio && handle.sx && handle.sy) {
    const scale = Math.max(width / start.width, height / start.height);
    width = Math.max(min, start.width * scale);
    height = Math.max(min, start.height * scale);
  }
  // Shift of the centre, in the element's axes: the opposite side stays put (or the centre, from the centre).
  const shiftX = options.fromCenter ? 0 : (handle.sx * (width - start.width)) / 2;
  const shiftY = options.fromCenter ? 0 : (handle.sy * (height - start.height)) / 2;
  const a = (start.rotation * Math.PI) / 180;
  const cx = start.x + start.width / 2 + shiftX * Math.cos(a) - shiftY * Math.sin(a);
  const cy = start.y + start.height / 2 + shiftX * Math.sin(a) + shiftY * Math.cos(a);
  return { x: round(cx - width / 2), y: round(cy - height / 2), width: round(width), height: round(height) };
}

/** A line the moving box may snap to: x or y in panel coordinates, and where it comes from (for the guide drawn). */
export interface SnapLine {
  axis: "x" | "y";
  at: number;
}

/**
 * Snaps a moving box to the closest lines within `threshold` mm: its left / centre / right to the x lines, its top /
 * middle / bottom to the y lines. Returns the corrected move and the lines it snapped to.
 */
export function snapBox(box: Box, lines: SnapLine[], threshold: number): { dx: number; dy: number; hits: SnapLine[] } {
  const best = (axis: "x" | "y") => {
    const edges = axis === "x" ? [box.x, box.x + box.width / 2, box.x + box.width] : [box.y, box.y + box.height / 2, box.y + box.height];
    let found: { delta: number; line: SnapLine } | null = null;
    for (const line of lines) {
      if (line.axis !== axis) continue;
      for (const edge of edges) {
        const delta = line.at - edge;
        if (Math.abs(delta) <= threshold && (!found || Math.abs(delta) < Math.abs(found.delta))) found = { delta, line };
      }
    }
    return found;
  };
  const x = best("x");
  const y = best("y");
  return { dx: x?.delta ?? 0, dy: y?.delta ?? 0, hits: [x?.line, y?.line].filter((line): line is SnapLine => !!line) };
}
