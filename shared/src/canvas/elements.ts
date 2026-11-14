/**
 * Layers of a design (docs/23 §3–§4): which elements are backgrounds, the paint order, moving layers, duplicating, the
 * printable box of a face and refitting the backgrounds when the box size changes. Pure functions, shared by the
 * editor, the 3D box and the print files.
 *
 * Paint order is the order of `CanvasState.elements` (D3): the first element is painted first, under the others.
 * `orderElements` keeps every background under every artwork element.
 */
import { cutSidesOf, matchesPanel } from "../fitcheck/validator";
import { BLEED_BOX_MM } from "../print/prepress";
import { insidePieces } from "./inside";
import type { DielineGeometry, PanelFace } from "../types/dieline";
import {
  CANVAS_SCHEMA_VERSION,
  type CanvasElement,
  type CanvasState,
  type ElementFinish,
  type ElementRole,
  type PrintSide,
} from "../types/project";

export type Box = { x: number; y: number; width: number; height: number };

/** A new element id, unique within a design (`<prefix>_<time>_<random>`, at most 64 characters like the API allows). */
export function newElementId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`.slice(0, 64);
}

export function roleOf(element: Pick<CanvasElement, "role" | "type">): ElementRole {
  return element.role ?? (element.type === "pattern" ? "background" : "artwork");
}

export const isBackground = (element: Pick<CanvasElement, "role" | "type">): boolean => roleOf(element) === "background";

export const sideOf = (element: Pick<CanvasElement, "side">): PrintSide => element.side ?? "outside";

/** Can the user drag, resize, nudge or delete it on the canvas? (Backgrounds change from "Nền theo mặt" only.) */
export function isMovable(element: Pick<CanvasElement, "role" | "type" | "locked" | "hidden">): boolean {
  return !element.locked && !element.hidden && !isBackground(element);
}

/** Every background under every artwork element, each group in its own order (stable). */
export function orderElements(elements: CanvasElement[]): CanvasElement[] {
  const backgrounds = elements.filter(isBackground);
  if (!backgrounds.length || elements.indexOf(backgrounds[backgrounds.length - 1]) === backgrounds.length - 1) return elements;
  return [...backgrounds, ...elements.filter((el) => !isBackground(el))];
}

/** Upgrades a canvas state saved before docs/23: backgrounds under the artwork, current schema version. */
export function normalizeCanvas<T extends Pick<CanvasState, "elements" | "schemaVersion">>(state: T): T {
  const elements = orderElements(state.elements ?? []);
  if (elements === state.elements && state.schemaVersion === CANVAS_SCHEMA_VERSION) return state;
  return { ...state, elements, schemaVersion: CANVAS_SCHEMA_VERSION };
}

/** Do two panel ids name the same face? Elements may use the short id ("front") or the full one ("panel_front"). */
export function samePanel(a: string, b: string): boolean {
  const short = (id: string) => (id.startsWith("panel_") ? id.slice(6) : id);
  return short(a) === short(b);
}

/** Elements stacked with `element`: same face, same side of the sheet, same role. */
function sameStack(element: CanvasElement) {
  return (other: CanvasElement) =>
    samePanel(other.panelId, element.panelId) && sideOf(other) === sideOf(element) && isBackground(other) === isBackground(element);
}

/** The layers of one face and side, in paint order (bottom first). */
export function layerStack(elements: CanvasElement[], panelId: string, side: PrintSide = "outside"): CanvasElement[] {
  return elements.filter((el) => samePanel(el.panelId, panelId) && sideOf(el) === side);
}

export type LayerMove = "forward" | "backward" | "front" | "back";

/** Where `id` would go for `move`, or null when it is already there. */
function layerTarget(elements: CanvasElement[], id: string, move: LayerMove): { from: number; to: number } | null {
  const from = elements.findIndex((el) => el.id === id);
  if (from < 0) return null;
  const stack = elements.map((el, index) => ({ el, index })).filter(({ el }) => sameStack(elements[from])(el)).map(({ index }) => index);
  const pos = stack.indexOf(from);
  const last = stack.length - 1;
  if ((move === "forward" || move === "front") && pos === last) return null;
  if ((move === "backward" || move === "back") && pos === 0) return null;
  const to = move === "forward" ? stack[pos + 1] : move === "front" ? stack[last] : move === "backward" ? stack[pos - 1] : stack[0];
  return { from, to };
}

export function canMoveLayer(elements: CanvasElement[], id: string, move: LayerMove): boolean {
  return layerTarget(elements, id, move) !== null;
}

/** Moves one layer up or down its stack (face + side + role); other stacks keep their order. */
export function moveLayer(elements: CanvasElement[], id: string, move: LayerMove): CanvasElement[] {
  const target = layerTarget(elements, id, move);
  if (!target) return elements;
  const next = [...elements];
  const [element] = next.splice(target.from, 1);
  next.splice(target.to, 0, element);
  return next;
}

/**
 * Puts the elements of one stack in the order `ids` (paint order, bottom first), e.g. after a drag in the layers panel.
 * Elements of `ids` keep the slots the stack already used in the array; unknown ids are ignored.
 */
export function reorderLayers(elements: CanvasElement[], ids: string[]): CanvasElement[] {
  const wanted = ids.map((id) => elements.find((el) => el.id === id)).filter((el): el is CanvasElement => !!el);
  if (wanted.length < 2) return elements;
  const slots = elements.map((el, index) => (ids.includes(el.id) ? index : -1)).filter((index) => index >= 0);
  const next = [...elements];
  slots.forEach((slot, i) => (next[slot] = wanted[i]));
  return next;
}

/**
 * Copies of `ids`, `offset` mm right and down, each placed just above its original. New ids from `newId`; copies of a
 * group share a new group id. Backgrounds are not duplicated.
 */
export function duplicateElements(
  elements: CanvasElement[],
  ids: string[],
  newId: (original: CanvasElement) => string,
  offset = 5
): { elements: CanvasElement[]; ids: string[] } {
  const groups = new Map<string, string>();
  const created: string[] = [];
  const next: CanvasElement[] = [];
  for (const el of elements) {
    next.push(el);
    if (!ids.includes(el.id) || isBackground(el)) continue;
    let groupId = el.groupId ?? null;
    if (groupId) {
      if (!groups.has(groupId)) groups.set(groupId, `${groupId}_copy_${created.length}`);
      groupId = groups.get(groupId)!;
    }
    const copy: CanvasElement = { ...el, id: newId(el), x: el.x + offset, y: el.y + offset, groupId, locked: false };
    created.push(copy.id);
    next.push(copy);
  }
  return { elements: next, ids: created };
}

/** Finishes the design asks the print shop for, from its elements (D8). */
export function finishesOf(elements: CanvasElement[]): ElementFinish[] {
  const found = new Set<ElementFinish>();
  for (const el of elements) if (el.finish && !el.hidden) found.add(el.finish);
  return [...found];
}

/** The printable box of a face, in face coordinates: the face plus the bleed on its cut sides (folds get none). */
export function panelPrintBox(panel: PanelFace, geometry: DielineGeometry): Box {
  const cut = cutSidesOf(panel, geometry);
  const bleed = (side: "top" | "right" | "bottom" | "left") => (cut.has(side) ? BLEED_BOX_MM : 0);
  return {
    x: -bleed("left"),
    y: -bleed("top"),
    width: panel.bounds.width + bleed("left") + bleed("right"),
    height: panel.bounds.height + bleed("top") + bleed("bottom"),
  };
}

/** Does this face, with its bleed, cover a glue area? Ink there stops the glue, so it gets no background. */
export function panelTouchesGlue(panel: PanelFace, geometry: DielineGeometry): boolean {
  const box = panelPrintBox(panel, geometry);
  const onSheet = { x: panel.bounds.x + box.x, y: panel.bounds.y + box.y, width: box.width, height: box.height };
  return !!geometry.glueAreas?.some(
    (g) => onSheet.x < g.x + g.width && g.x < onSheet.x + onSheet.width && onSheet.y < g.y + g.height && g.y < onSheet.y + onSheet.height
  );
}

/** The face an element sits on, and its piece. */
export function findPanel(
  pieces: { geometry: DielineGeometry }[],
  panelId: string
): { panel: PanelFace; geometry: DielineGeometry } | null {
  for (const piece of pieces) {
    const panel = piece.geometry.panels.find((p) => matchesPanel(p, panelId));
    if (panel) return { panel, geometry: piece.geometry };
  }
  return null;
}

/**
 * Backgrounds fitted to their faces again (after a size change, a formula upgrade or a template). Returns the same array
 * when nothing moved, so the editor history gets no empty step.
 */
export function refitBackgrounds(elements: CanvasElement[], pieces: { geometry: DielineGeometry }[]): CanvasElement[] {
  let changed = false;
  // Inside backgrounds sit on the mirrored dieline: their bleed is on the mirrored cut sides (docs/23 S5).
  let inside: { geometry: DielineGeometry }[] | null = null;
  const next = elements.map((el) => {
    if (!isBackground(el)) return el;
    const found = findPanel(sideOf(el) === "inside" ? (inside ??= insidePieces(pieces)) : pieces, el.panelId);
    if (!found) return el;
    const box = panelPrintBox(found.panel, found.geometry);
    const close = (a: number, b: number) => Math.abs(a - b) < 0.001;
    if (close(el.x, box.x) && close(el.y, box.y) && close(el.width, box.width) && close(el.height, box.height) && !el.rotation) return el;
    changed = true;
    return { ...el, ...box, rotation: 0 };
  });
  return changed ? next : elements;
}

/** A background element covering one face (face + bleed), under the artwork. */
export function backgroundFor(
  panel: PanelFace,
  geometry: DielineGeometry,
  content: string,
  options: { id?: string; side?: PrintSide; fit?: CanvasElement["fit"] } = {}
): CanvasElement {
  return {
    id: options.id ?? `bg_${panel.id}`,
    type: "pattern",
    role: "background",
    panelId: panel.id,
    ...panelPrintBox(panel, geometry),
    rotation: 0,
    content,
    ...(options.side && options.side !== "outside" ? { side: options.side } : {}),
    ...(options.fit ? { fit: options.fit } : {}),
  };
}

/**
 * Replaces the background of one face and side (or adds one), keeping the backgrounds under the artwork.
 * `content` null removes it.
 */
export function setPanelBackground(
  elements: CanvasElement[],
  panel: PanelFace,
  geometry: DielineGeometry,
  content: string | null,
  options: { side?: PrintSide; fit?: CanvasElement["fit"]; id?: string } = {}
): CanvasElement[] {
  const side = options.side ?? "outside";
  const rest = elements.filter((el) => !(isBackground(el) && matchesPanel(panel, el.panelId) && sideOf(el) === side));
  if (content === null) return rest;
  const id = options.id ?? `bg_${panel.id}${side === "inside" ? "_in" : ""}`;
  return orderElements([backgroundFor(panel, geometry, content, { ...options, id, side }), ...rest]);
}
