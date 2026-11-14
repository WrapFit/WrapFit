// Print layout of a design, ported from be/src/export/rendering/print-layout.ts so the demo without a backend (Vercel)
// builds the same sheet as the export worker: same pieces, same placement, same joined cut / crease strokes.
import {
  insidePieces,
  placeElements,
  printsInside,
  segmentPoints,
  type BoxDimensions,
  type CanvasElement,
  type DielineGeometry,
  type PlacedArt,
  type PlacedBarcode,
  type PlacedImage,
  type PlacedText,
  type PrintSide,
} from "@wrapfit/shared";
import { dielinePiecesOf } from "@/features/studio/utils/dieline";

/** Margin around the artwork and gap between pieces, in mm. */
export const SHEET_MARGIN_MM = 20;
export const PIECE_GAP_MM = 20;

export interface PlacedPiece {
  name: string;
  geometry: DielineGeometry;
  /** Top-left corner of the piece on the sheet, mm. */
  x: number;
  y: number;
}

/** A continuous cut or crease line. Coordinates are mm on the sheet. */
export interface Stroke {
  type: "cut" | "crease";
  /** SVG / PDF path data (absolute commands). */
  d: string;
  /** Points along the line, curves sampled (DXF polylines). */
  points: [number, number][];
  closed: boolean;
}

export interface PrintLayout {
  title: string;
  structure: string;
  dimensions: BoxDimensions;
  /** Sheet size including margins, mm. */
  width: number;
  height: number;
  pieces: PlacedPiece[];
  /** Placed elements (shared `placeElements`): `order` is the paint order across all kinds. */
  texts: PlacedText[];
  images: PlacedImage[];
  barcodes: PlacedBarcode[];
  arts: PlacedArt[];
  strokes: Stroke[];
  /**
   * The inside of the sheet (docs/23 S5), when the design prints there: the same sheet mirrored left to right, as the
   * press sees the back of the paper, with the elements of `side: "inside"`. Printed as its own page.
   */
  inside?: PrintLayout;
}

const JOIN_TOLERANCE_MM = 0.01;
const NUMBER = /[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
const num = (value: number) => Number(value.toFixed(3)).toString();
type Point = [number, number];
const same = (p: Point, q: Point) => Math.abs(p[0] - q[0]) <= JOIN_TOLERANCE_MM && Math.abs(p[1] - q[1]) <= JOIN_TOLERANCE_MM;

/** A curve segment moved onto the sheet: its start point and the commands after the leading `M` (null if relative). */
function placedCurve(pathString: string, dx: number, dy: number, start: Point): { from: Point; rest: string } | null {
  if (!/^\s*M/i.test(pathString) || /[a-ln-z]/.test(pathString.replace(/e[-+]?\d/gi, ""))) return null;
  let index = 0;
  const moved = pathString.replace(NUMBER, (value) => num(Number(value) + (index++ % 2 === 0 ? dx : dy)));
  const [x, y] = (moved.match(NUMBER) ?? []).slice(0, 2).map(Number);
  if (!same([x, y], start)) return null;
  let seen = 0;
  const rest = moved.replace(/^\s*M\s*/i, "").replace(NUMBER, (value) => (seen++ < 2 ? "" : value)).replace(/^[\s,]+/, "");
  return { from: [x, y], rest };
}

type Edge = { a: Point; b: Point; curve?: string; samples?: Point[] };

/** Joins the cut and crease segments of a placed piece into continuous strokes. */
function strokesOf(piece: PlacedPiece): Stroke[] {
  const strokes: Stroke[] = [];
  for (const type of ["cut", "crease"] as const) {
    const edges: Edge[] = [];
    for (const seg of piece.geometry.segments) {
      if (seg.type !== type) continue;
      const a: Point = [piece.x + seg.start.x, piece.y + seg.start.y];
      const b: Point = [piece.x + seg.end.x, piece.y + seg.end.y];
      if (!seg.pathString) {
        edges.push({ a, b });
        continue;
      }
      const curve = placedCurve(seg.pathString, piece.x, piece.y, a);
      const samples = segmentPoints(seg)
        .slice(1)
        .map((p): Point => [piece.x + p.x, piece.y + p.y]);
      if (curve) edges.push({ a, b, curve: curve.rest, samples });
      else strokes.push({ type, d: `M ${num(a[0])} ${num(a[1])} L ${num(b[0])} ${num(b[1])}`, points: [a, b], closed: false });
    }

    const used = new Set<number>();
    for (let first = 0; first < edges.length; first++) {
      if (used.has(first)) continue;
      used.add(first);
      let start = edges[first].a;
      let steps: { to: Point; curve?: string; samples?: Point[] }[] = [
        { to: edges[first].b, curve: edges[first].curve, samples: edges[first].samples },
      ];
      for (let extended = true; extended; ) {
        extended = false;
        const end = steps[steps.length - 1].to;
        for (let i = 0; i < edges.length && !extended; i++) {
          if (used.has(i)) continue;
          const edge = edges[i];
          if (same(edge.a, end)) steps.push({ to: edge.b, curve: edge.curve, samples: edge.samples });
          else if (!edge.curve && same(edge.b, end)) steps.push({ to: edge.a });
          else continue;
          used.add(i);
          extended = true;
        }
        for (let i = 0; i < edges.length && !extended; i++) {
          if (used.has(i)) continue;
          const edge = edges[i];
          if (same(edge.b, start)) {
            steps = [{ to: start, curve: edge.curve, samples: edge.samples }, ...steps];
            start = edge.a;
          } else if (!edge.curve && same(edge.a, start)) {
            steps = [{ to: start }, ...steps];
            start = edge.b;
          } else continue;
          used.add(i);
          extended = true;
        }
      }

      const closed = steps.length > 1 && same(steps[steps.length - 1].to, start);
      const commands = steps.map((step, index) => {
        if (step.curve) return step.curve;
        return closed && index === steps.length - 1 ? "" : `L ${num(step.to[0])} ${num(step.to[1])}`;
      });
      const d = [`M ${num(start[0])} ${num(start[1])}`, ...commands.filter(Boolean), ...(closed ? ["Z"] : [])].join(" ");
      const points: Point[] = [start, ...steps.flatMap((step) => (step.curve && step.samples?.length ? step.samples : [step.to]))];
      if (closed) points.pop();
      strokes.push({ type, d, points, closed });
    }
  }
  return strokes;
}

/** Lays the pieces out left to right and places the text and image elements on their panels. */
export function buildPrintLayout(input: {
  title: string;
  structure: string;
  formulaVersion?: number;
  dimensions: BoxDimensions;
  elements: CanvasElement[];
  side?: PrintSide;
}): PrintLayout {
  const pieces: PlacedPiece[] = [];
  let cursor = SHEET_MARGIN_MM;
  let tallest = 0;
  for (const piece of dielinePiecesOf(input.structure, input.dimensions, input.formulaVersion)) {
    pieces.push({ ...piece, x: cursor, y: SHEET_MARGIN_MM });
    cursor += piece.geometry.totalBoundingBox.width + PIECE_GAP_MM;
    tallest = Math.max(tallest, piece.geometry.totalBoundingBox.height);
  }

  const isFile = (content: string) => /^(https?:|data:image\/|blob:|\/)/.test(content);
  const { texts, images, barcodes, arts } = placeElements(pieces, input.elements, { isFile, side: input.side });

  const sheet: PrintLayout = {
    title: input.title,
    structure: input.structure,
    dimensions: input.dimensions,
    width: cursor - PIECE_GAP_MM + SHEET_MARGIN_MM,
    height: tallest + 2 * SHEET_MARGIN_MM,
    pieces,
    texts,
    images,
    barcodes,
    arts,
    strokes: pieces.flatMap(strokesOf),
  };
  if (input.side === "inside" || !printsInside(input.elements)) return sheet;
  // Inside: every piece mirrored, and the pieces themselves in mirrored order across the sheet.
  const insideSheet = insidePieces(pieces).map((piece) => ({ ...piece, x: sheet.width - piece.x - piece.geometry.totalBoundingBox.width }));
  const placedInside = placeElements(insideSheet, input.elements, { isFile, side: "inside" });
  return {
    ...sheet,
    inside: {
      ...sheet,
      title: `${input.title} (mặt trong)`,
      pieces: insideSheet,
      ...placedInside,
      strokes: insideSheet.flatMap(strokesOf),
    },
  };
}
