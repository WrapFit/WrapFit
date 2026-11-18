/**
 * Which way is up on each face once the box is folded (docs/23 S21), worked out from the hinges of the dieline
 * (fold.ts) rather than written in every generator: text on a wall reads with its top towards the sky, text on the
 * top of the box reads from the front (its top towards the back), text on a sloped roof reads up the slope. The bottom
 * of the box and pieces without hinges have no reading direction.
 * Owned by IT 2 (Production Physics)
 */
import { boxFrameOf, multiply, panelTransforms, transformPoint, type Vec3 } from "../parametric/fold";
import type { DielineGeometry } from "../types/dieline";

export type ReadingRotation = 0 | 90 | 180 | 270;

const cache = new WeakMap<DielineGeometry, Map<string, ReadingRotation | null>>();

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v: Vec3): Vec3 => {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
};

/**
 * Canvas rotation (degrees, clockwise as in the editor) at which a text on this face reads upright on the closed box;
 * null when the face has no reading direction (bottom, a piece without hinges, a face that does not fold flat).
 */
export function uprightRotationOf(geometry: DielineGeometry, panelId: string): ReadingRotation | null {
  let perPanel = cache.get(geometry);
  if (!perPanel) cache.set(geometry, (perPanel = new Map()));
  if (perPanel.has(panelId)) return perPanel.get(panelId)!;
  const result = compute(geometry, panelId);
  perPanel.set(panelId, result);
  return result;
}

function compute(geometry: DielineGeometry, panelId: string): ReadingRotation | null {
  const panel = geometry.panels.find((p) => p.id === panelId);
  const frame = panel && boxFrameOf(geometry);
  if (!panel || !frame) return null;
  const m = multiply(frame, panelTransforms(geometry, 1)[panel.id]);
  const { x, y, width, height } = panel.bounds;
  const origin: Vec3 = [x + width / 2, y + height / 2, 0];
  const at = transformPoint(m, origin);
  const towards = (v: Vec3): Vec3 => {
    const p = transformPoint(m, [origin[0] + v[0], origin[1] + v[1], origin[2] + v[2]]);
    return [p[0] - at[0], p[1] - at[1], p[2] - at[2]];
  };
  const right = towards([1, 0, 0]);
  const up = towards([0, -1, 0]); // the top of the face in the editor
  const normal = unit(towards([0, 0, -1])); // the printed side, outwards

  // What "up" should be for a reader of this face.
  let wanted: Vec3;
  if (normal[1] > 0.9) wanted = [0, 0, -1]; // the top of the box, read from the front
  else if (normal[1] < -0.9) return null; // the bottom
  else wanted = unit([-normal[1] * normal[0], 1 - normal[1] * normal[1], -normal[1] * normal[2]]); // up the wall / slope

  let best: ReadingRotation = 0;
  let score = -Infinity;
  for (const rotation of [0, 90, 180, 270] as const) {
    const r = (rotation * Math.PI) / 180;
    const textUp: Vec3 = [Math.sin(r) * right[0] + Math.cos(r) * up[0], Math.sin(r) * right[1] + Math.cos(r) * up[1], Math.sin(r) * right[2] + Math.cos(r) * up[2]];
    const s = dot(unit(textUp), wanted);
    if (s > score) {
      score = s;
      best = rotation;
    }
  }
  return score > 0.7 ? best : null;
}

/** How far a rotation is from the upright one, in degrees from 0 to 180. */
export function turnFromUpright(rotation: number, upright: ReadingRotation): number {
  const d = (((rotation - upright) % 360) + 360) % 360;
  return d > 180 ? 360 - d : d;
}

/** WCAG contrast ratio of two #RRGGBB colours (1 to 21); null when one cannot be read. */
export function contrastRatio(a: string, b: string): number | null {
  const luminance = (hex: string) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return null;
    const channel = (i: number) => {
      const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  };
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
