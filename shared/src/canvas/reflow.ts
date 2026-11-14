/**
 * Smart resize (docs/23 S20): when the box changes size, every element keeps its place on its face by its anchor —
 * a title in the middle of the front stays in the middle, a logo in the top-left corner stays in that corner. An
 * element without an anchor gets the one its position suggests (thirds of the face). Backgrounds are refitted to
 * their faces elsewhere (refitBackgrounds); elements that no longer fit are shrunk back inside the safe area.
 */
import type { DielinePiece } from "../parametric/registry";
import type { PanelFace } from "../types/dieline";
import type { CanvasElement } from "../types/project";
import { autoFixElements } from "../fitcheck/validator";
import { findPanel, isBackground, sideOf } from "./elements";
import { insidePieces } from "./inside";
import { uprightRotationOf } from "../fitcheck/reading";

export type ElementAnchor = NonNullable<CanvasElement["anchor"]>;

/** Elements at least this share of the face wide (or tall) stretch with it. */
const STRETCH_SHARE = 0.85;

/** The anchor an element's position suggests: the third of the face its centre is in, or stretch when it spans it. */
export function inferAnchor(element: Pick<CanvasElement, "x" | "y" | "width" | "height">, panel: PanelFace): ElementAnchor {
  const { width: W, height: H } = panel.bounds;
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  return {
    h: element.width >= W * STRETCH_SHARE ? "stretch" : cx < W / 3 ? "left" : cx > (2 * W) / 3 ? "right" : "center",
    v: element.height >= H * STRETCH_SHARE ? "stretch" : cy < H / 3 ? "top" : cy > (2 * H) / 3 ? "bottom" : "middle",
  };
}

/** The anchor an element follows: its own, else the inferred one. */
export const anchorOf = (element: CanvasElement, panel: PanelFace): ElementAnchor => element.anchor ?? inferAnchor(element, panel);

/** New start and length along one axis of a face that grew by `delta` (negative: shrank). */
function along(start: number, length: number, delta: number, anchor: ElementAnchor["h"] | ElementAnchor["v"]) {
  switch (anchor) {
    case "right":
    case "bottom":
      return { start: start + delta, length };
    case "center":
    case "middle":
      return { start: start + delta / 2, length };
    case "stretch":
      // Same distances to both sides of the face.
      return { start, length: Math.max(1, length + delta) };
    default:
      return { start, length };
  }
}

/**
 * Elements after the box changed from `before` to `after` (pieces of the same structure, or of another one: faces
 * are matched by id). Untouched: hidden elements, backgrounds, elements whose face is gone or did not change size.
 */
export function reflowElements(before: DielinePiece[], after: DielinePiece[], elements: CanvasElement[]): CanvasElement[] {
  let insideBefore: DielinePiece[] | null = null;
  let insideAfter: DielinePiece[] | null = null;
  const moved = new Set<string>();
  const next = elements.map((element) => {
    if (element.hidden || isBackground(element)) return element;
    const inside = sideOf(element) === "inside";
    const old = findPanel(inside ? (insideBefore ??= insidePieces(before)) : before, element.panelId);
    const now = findPanel(inside ? (insideAfter ??= insidePieces(after)) : after, element.panelId);
    if (!old || !now) return element;
    const dw = now.panel.bounds.width - old.panel.bounds.width;
    const dh = now.panel.bounds.height - old.panel.bounds.height;
    if (Math.abs(dw) < 1e-6 && Math.abs(dh) < 1e-6) return element;
    const anchor = anchorOf(element, old.panel);
    const h = along(element.x, element.width, dw, anchor.h);
    const v = along(element.y, element.height, dh, anchor.v);
    moved.add(element.id);
    return { ...element, x: h.start, y: v.start, width: h.length, height: v.length };
  });
  if (moved.size === 0) return elements;
  // Whatever no longer fits its (smaller) face is shrunk and pulled back inside the safe area.
  const fixed = autoFixElements(after, next.filter((el) => moved.has(el.id)));
  const byId = new Map(fixed.map((el) => [el.id, el]));
  return next.map((el) => byId.get(el.id) ?? el);
}

/** The same elements with their inferred anchors written down (templates ship with explicit anchors). */
export function withAnchors(pieces: DielinePiece[], elements: CanvasElement[]): CanvasElement[] {
  let inside: DielinePiece[] | null = null;
  return elements.map((element) => {
    if (element.anchor || isBackground(element)) return element;
    const found = findPanel(sideOf(element) === "inside" ? (inside ??= insidePieces(pieces)) : pieces, element.panelId);
    return found ? { ...element, anchor: inferAnchor(element, found.panel) } : element;
  });
}

/**
 * Texts turned to read upright on the folded box (docs/23 S21) where a face reads upside down in the editor (the lid
 * of a tuck-top box, the back wall of a mailer): turned 180° about their centre, so their place does not change.
 */
export function turnTextsUpright(pieces: DielinePiece[], elements: CanvasElement[]): CanvasElement[] {
  return elements.map((element) => {
    if (element.type !== "text" || sideOf(element) === "inside" || element.rotation) return element;
    const found = findPanel(pieces, element.panelId);
    return found && uprightRotationOf(found.geometry, found.panel.id) === 180 ? { ...element, rotation: 180 } : element;
  });
}
