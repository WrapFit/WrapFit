// Pure layout for print files: which dieline pieces a box has and where each one sits on the sheet (mm).
// Geometry comes from the parametric engine of IT2 (`@wrapfit/shared`); nothing here depends on NestJS.
import {
  fontSizeMmOf,
  libraryArt,
  MASCOT_FILES,
  PT_TO_MM,
  segmentPoints,
  type BoxDimensions,
  type CanvasElement,
  type DielineGeometry,
  type VectorArt,
} from '@wrapfit/shared';
import { dielinePieces, matchesPanel } from '../../projects';

export { dielinePieces, matchesPanel, UnsupportedFormulaVersionError, UnsupportedStructureError } from '../../projects';

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
  type: 'cut' | 'crease';
  /** SVG / PDF path data (absolute commands). */
  d: string;
  /** Points along the line, curves sampled within 0.1 mm (DXF polylines). */
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
  /**
   * Text elements placed on the sheet (mm, top-left of the element box). The renderers lay the lines out with
   * `layoutTextBox` of `@wrapfit/shared`, exactly like the editor canvas.
   */
  texts: {
    content: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSizeMm: number;
    /** Size in points: large black texts print in rich black. */
    fontSizePt: number;
    fontFamily: string | undefined;
    fontSize: number | undefined;
    color: string;
    /** Degrees, around the centre of the box (like the canvas). */
    rotation: number;
  }[];
  /**
   * Logos, images and patterns (by URL) placed on the sheet, drawn under the texts (mm, top-left of the box). The file
   * keeps its proportions, centred in the box; rotation is around the centre of the box.
   */
  images: {
    url: string;
    /** Photos and patterns print near-black as rich black; logos keep plain K. */
    type: CanvasElement['type'];
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  }[];
  /** Barcode elements (EAN-13 or QR code of `content`), drawn as vectors in K100 on white (mm, top-left of the box). */
  barcodes: { content: string; x: number; y: number; width: number; height: number; rotation: number }[];
  /**
   * Vector art of the built-in library (`wf-art:` contents), generated at the element size. Backgrounds print under the
   * images, stickers and labels over them (mm, top-left of the element box; rotation around its centre).
   */
  arts: { art: VectorArt; background: boolean; x: number; y: number; width: number; height: number; rotation: number }[];
  /** Cut and crease lines joined end to end: die makers need unbroken cut lines. */
  strokes: Stroke[];
}

/** Element types drawn from an uploaded file; `content` is the file URL. */
const IMAGE_TYPES = new Set<CanvasElement['type']>(['logo', 'image', 'pattern']);

/** Two segment ends closer than this (mm) are joined. */
const JOIN_TOLERANCE_MM = 0.01;
const NUMBER = /[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
const num = (value: number) => Number(value.toFixed(3)).toString();
type Point = [number, number];
const same = (p: Point, q: Point) => Math.abs(p[0] - q[0]) <= JOIN_TOLERANCE_MM && Math.abs(p[1] - q[1]) <= JOIN_TOLERANCE_MM;

/**
 * A curve segment moved onto the sheet, split into its start point and the commands after the leading `M`.
 * Null when the path uses relative or arc commands, or does not start at the segment start.
 */
function placedCurve(pathString: string, dx: number, dy: number, start: Point): { from: Point; rest: string } | null {
  if (!/^\s*M/i.test(pathString) || /[a-ln-z]/.test(pathString.replace(/e[-+]?\d/gi, ''))) return null;
  let index = 0;
  const moved = pathString.replace(NUMBER, (value) => num(Number(value) + (index++ % 2 === 0 ? dx : dy)));
  const [x, y] = (moved.match(NUMBER) ?? []).slice(0, 2).map(Number);
  if (!same([x, y], start)) return null;
  // Drop "M x y": the commands that follow draw the curve from the current point.
  let seen = 0;
  const rest = moved.replace(/^\s*M\s*/i, '').replace(NUMBER, (value) => (seen++ < 2 ? '' : value)).replace(/^[\s,]+/, '');
  return { from: [x, y], rest };
}

/** `samples`: points of a curve after its start, on the sheet. */
type Edge = { a: Point; b: Point; curve?: string; samples?: Point[] };

/** Joins the cut and crease segments of a placed piece into continuous strokes. */
export function strokesOf(piece: PlacedPiece): Stroke[] {
  const strokes: Stroke[] = [];
  for (const type of ['cut', 'crease'] as const) {
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
      // Each step draws from the previous point to `to`. Straight edges may be walked backwards, curves only forwards.
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
        return closed && index === steps.length - 1 ? '' : `L ${num(step.to[0])} ${num(step.to[1])}`;
      });
      const d = [`M ${num(start[0])} ${num(start[1])}`, ...commands.filter(Boolean), ...(closed ? ['Z'] : [])].join(' ');
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
  /** Dieline formulas the project is pinned to. */
  formulaVersion: number;
  dimensions: BoxDimensions;
  elements: CanvasElement[];
}): PrintLayout {
  const pieces: PlacedPiece[] = [];
  let cursor = SHEET_MARGIN_MM;
  let tallest = 0;
  for (const piece of dielinePieces(input.structure, input.dimensions, input.formulaVersion)) {
    pieces.push({ ...piece, x: cursor, y: SHEET_MARGIN_MM });
    cursor += piece.geometry.totalBoundingBox.width + PIECE_GAP_MM;
    tallest = Math.max(tallest, piece.geometry.totalBoundingBox.height);
  }

  const texts: PrintLayout['texts'] = [];
  const images: PrintLayout['images'] = [];
  const barcodes: PrintLayout['barcodes'] = [];
  const arts: PrintLayout['arts'] = [];
  for (const element of input.elements) {
    const isText = element.type === 'text';
    const isBarcode = element.type === 'barcode';
    const art = IMAGE_TYPES.has(element.type) ? libraryArt(element.content, element.width, element.height) : null;
    // Files: uploads (by URL) and Gói's drawings, which the worker ships.
    const isFile = /^https?:\/\//.test(element.content) || (MASCOT_FILES as readonly string[]).includes(element.content);
    const drawn = isText || isBarcode ? !!element.content.trim() : IMAGE_TYPES.has(element.type) && (!!art || isFile);
    if (!drawn) continue;
    // The first piece that has the panel wins (see matchesPanel for the accepted ids).
    const piece = pieces.find((p) => p.geometry.panels.some((panel) => matchesPanel(panel, element.panelId)));
    const panel = piece?.geometry.panels.find((p) => matchesPanel(p, element.panelId));
    if (!piece || !panel) continue;
    const x = piece.x + panel.bounds.x + element.x;
    const y = piece.y + panel.bounds.y + element.y;
    if (art) {
      const { width, height, rotation } = element;
      arts.push({ art, background: element.type === 'pattern', x, y, width, height, rotation });
    } else if (isBarcode) {
      const content = element.content.trim();
      barcodes.push({ content, x, y, width: element.width, height: element.height, rotation: element.rotation });
    } else if (isText) {
      // Font sizes are points in the editor.
      const fontSizeMm = fontSizeMmOf(element);
      texts.push({
        content: element.content,
        x,
        y,
        width: element.width,
        height: element.height,
        fontSizeMm,
        fontSizePt: fontSizeMm / PT_TO_MM,
        fontFamily: element.style?.fontFamily,
        fontSize: element.style?.fontSize,
        color: element.style?.color ?? '#000000',
        rotation: element.rotation,
      });
    } else {
      images.push({ url: element.content, type: element.type, x, y, width: element.width, height: element.height, rotation: element.rotation });
    }
  }

  return {
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
}
