/**
 * Building blocks of the dieline formulas: a writer for cut and crease segments, and the points of a curved segment.
 * Owned by IT 2 (Packaging Math)
 */

import { DielineSegment, LineType, Point2D } from "../types/dieline";

const num = (value: number) => Number(value.toFixed(3)).toString();

/** Collects the segments of one piece. Curves are quadratic Béziers in `pathString` (absolute "M … Q …"). */
export function segmentWriter() {
  const segments: DielineSegment[] = [];
  const line = (id: string, type: LineType, start: Point2D, end: Point2D) => {
    segments.push({ id, type, start, end });
  };
  /** Consecutive straight segments through the points: `${id}_1`, `${id}_2`… */
  const path = (id: string, type: LineType, points: Point2D[]) =>
    points.slice(1).forEach((end, i) => line(`${id}_${i + 1}`, type, points[i], end));
  /** Quadratic Bézier from `start` to `end`; it passes halfway between the chord midpoint and `control`. */
  const curve = (id: string, type: LineType, start: Point2D, control: Point2D, end: Point2D) => {
    segments.push({
      id,
      type,
      start,
      end,
      pathString: `M ${num(start.x)} ${num(start.y)} Q ${num(control.x)} ${num(control.y)} ${num(end.x)} ${num(end.y)}`,
    });
  };
  return { segments, line, path, curve };
}

const COMMAND = /([MLQC])([^MLQC]*)/gi;

/**
 * Points along a segment, from `start` to `end`: the two ends for a straight segment, the curve sampled so the chords
 * stay within `tolerance` mm of it for a curved one (absolute M, L, Q, C commands; anything else falls back to the
 * chord). Used by the DXF export, which has no Bézier entity, and by the geometry tests.
 */
export function segmentPoints(segment: DielineSegment, tolerance = 0.1): Point2D[] {
  if (!segment.pathString) return [segment.start, segment.end];
  const points: Point2D[] = [];
  let current: Point2D | null = null;
  for (const [, command, args] of segment.pathString.matchAll(COMMAND)) {
    const n = (args.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? []).map(Number);
    const at = (i: number): Point2D => ({ x: n[i], y: n[i + 1] });
    if (command !== command.toUpperCase()) return [segment.start, segment.end];
    if (command === "M" || command === "L") {
      current = at(0);
      points.push(current);
      continue;
    }
    if (!current) return [segment.start, segment.end];
    const controls = command === "Q" ? [at(0)] : [at(0), at(2)];
    const end = command === "Q" ? at(2) : at(4);
    // Control polygon length bounds the curve length; a chord of a curve of radius ≥ that length deviates little.
    const hull = [current, ...controls, end];
    const reach = hull.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - hull[i].x, p.y - hull[i].y), 0);
    const steps = Math.max(2, Math.min(256, Math.ceil(Math.sqrt(reach / (8 * Math.max(tolerance, 1e-3))) * 4)));
    for (let step = 1; step <= steps; step++) {
      const u = step / steps;
      const v = 1 - u;
      const p0 = current;
      if (controls.length === 1) {
        const [c] = controls;
        points.push({ x: v * v * p0.x + 2 * v * u * c.x + u * u * end.x, y: v * v * p0.y + 2 * v * u * c.y + u * u * end.y });
      } else {
        const [c1, c2] = controls;
        points.push({
          x: v * v * v * p0.x + 3 * v * v * u * c1.x + 3 * v * u * u * c2.x + u * u * u * end.x,
          y: v * v * v * p0.y + 3 * v * v * u * c1.y + 3 * v * u * u * c2.y + u * u * u * end.y,
        });
      }
    }
    current = end;
  }
  return points.length >= 2 ? points : [segment.start, segment.end];
}
