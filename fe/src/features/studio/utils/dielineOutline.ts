import { segmentPoints, type DielineGeometry, type Point2D } from "@wrapfit/shared";

const TOLERANCE_MM = 0.05;
const same = (a: Point2D, b: Point2D) => Math.abs(a.x - b.x) < TOLERANCE_MM && Math.abs(a.y - b.y) < TOLERANCE_MM;
const num = (value: number) => Number(value.toFixed(2));

/**
 * Outline of a flat piece: its cut segments joined end to end into closed loops (like `strokesOf` of the print export,
 * be/src/export/rendering/print-layout.ts), as SVG path data in sheet mm. The die-cut sheet is filled with it, the
 * artwork is clipped to it and the bleed is drawn around it. Open chains (slits inside the blank) are left out; an
 * empty list means the cut lines do not close, and the caller falls back to the panel rectangles.
 */
export function outlinePaths(geometry: DielineGeometry): string[] {
  const edges = geometry.segments
    .filter((segment) => segment.type === "cut")
    .map((segment) => segmentPoints(segment, 0.2))
    .filter((points) => points.length >= 2);
  const used = new Set<number>();
  const loops: string[] = [];

  for (let first = 0; first < edges.length; first++) {
    if (used.has(first)) continue;
    used.add(first);
    const chain = [...edges[first]];
    for (let extended = true; extended; ) {
      extended = false;
      const end = chain[chain.length - 1];
      for (let i = 0; i < edges.length; i++) {
        if (used.has(i)) continue;
        const edge = edges[i];
        if (same(edge[0], end)) chain.push(...edge.slice(1));
        else if (same(edge[edge.length - 1], end)) chain.push(...[...edge].reverse().slice(1));
        else continue;
        used.add(i);
        extended = true;
        break;
      }
    }
    if (chain.length < 4 || !same(chain[0], chain[chain.length - 1])) continue;
    chain.pop();
    loops.push(`M ${chain.map((p) => `${num(p.x)} ${num(p.y)}`).join(" L ")} Z`);
  }
  return loops;
}

/** Outline of the piece, or the union of its panel rectangles when the cut lines do not close. */
export function sheetPath(geometry: DielineGeometry): string {
  const loops = outlinePaths(geometry);
  if (loops.length > 0) return loops.join(" ");
  return geometry.panels
    .map(({ bounds: { x, y, width, height } }) => `M ${x} ${y} h ${width} v ${height} h ${-width} Z`)
    .join(" ");
}
