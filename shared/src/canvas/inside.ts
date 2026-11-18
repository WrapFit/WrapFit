/**
 * The inside of the sheet (docs/23 S5, D7). Seen from the inside, the flat dieline is the outside one mirrored left to
 * right: elements with `side: "inside"` are placed on that mirrored dieline, in the coordinates of their (mirrored)
 * face, exactly as the user sees them in the editor. The print shop prints the inside as its own page with the same
 * mirrored dieline, so the back of the sheet registers with the cut of the front.
 */
import type { DielinePiece } from "../parametric/registry";
import type { DielineGeometry, PanelFace } from "../types/dieline";
import type { CanvasElement } from "../types/project";

const num = (value: number) => Number(value.toFixed(3)).toString();

/**
 * Absolute SVG path data mirrored around x = width / 2. Handles M L C S Q T H V Z (the commands of the dielines);
 * every x coordinate becomes `width - x`, y coordinates stay.
 */
export function mirrorPath(d: string, width: number): string {
  let command = "";
  let index = 0;
  return d.replace(/([MLCSQTHVZmlcsqthvz])|([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)/g, (token, letter: string | undefined) => {
    if (letter) {
      command = letter.toUpperCase();
      index = 0;
      return token;
    }
    const value = Number(token);
    // H takes x values only, V y values only; the others alternate x, y.
    const isX = command === "H" ? true : command === "V" ? false : index % 2 === 0;
    index++;
    return num(isX ? width - value : value);
  });
}

const SWAP_EDGE = { left: "right", right: "left", top: "top", bottom: "bottom" } as const;

/** The dieline seen from the inside: every panel, line and glue area mirrored left to right. */
export function mirrorGeometry(geometry: DielineGeometry): DielineGeometry {
  const width = geometry.totalBoundingBox.width;
  const mirrorX = (x: number) => width - x;
  const panels: PanelFace[] = geometry.panels.map((panel) => ({
    ...panel,
    bounds: { ...panel.bounds, x: mirrorX(panel.bounds.x + panel.bounds.width) },
    ...(panel.fold ? { fold: { ...panel.fold, edge: SWAP_EDGE[panel.fold.edge] } } : {}),
    ...(panel.outline ? { outline: panel.outline.map((p) => ({ ...p, x: mirrorX(p.x) })) } : {}),
  }));
  return {
    ...geometry,
    panels,
    segments: geometry.segments.map((segment) => ({
      ...segment,
      start: { ...segment.start, x: mirrorX(segment.start.x) },
      end: { ...segment.end, x: mirrorX(segment.end.x) },
      ...(segment.pathString ? { pathString: mirrorPath(segment.pathString, width) } : {}),
    })),
    ...(geometry.glueAreas ? { glueAreas: geometry.glueAreas.map((g) => ({ ...g, x: mirrorX(g.x + g.width) })) } : {}),
    ...(geometry.openings ? { openings: geometry.openings.map((o) => ({ ...o, x: mirrorX(o.x + o.width) })) } : {}),
  };
}

const mirrored = new WeakMap<DielineGeometry, DielineGeometry>();

/** The pieces of a box seen from the inside (cached per geometry). */
export function insidePieces<T extends Pick<DielinePiece, "geometry">>(pieces: T[]): T[] {
  return pieces.map((piece) => {
    let geometry = mirrored.get(piece.geometry);
    if (!geometry) {
      geometry = mirrorGeometry(piece.geometry);
      mirrored.set(piece.geometry, geometry);
    }
    return { ...piece, geometry };
  });
}

/** Does the design print on the inside of the sheet (a second printing pass)? */
export function printsInside(elements: CanvasElement[]): boolean {
  return elements.some((el) => el.side === "inside" && !el.hidden);
}
