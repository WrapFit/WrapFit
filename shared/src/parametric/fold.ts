/**
 * Folds a flat dieline piece into 3D from the hinges of its panels (`PanelFace.fold`), so the 3D model and the size
 * checks use the same geometry as the print file.
 *
 * Sheet space: x to the right, y down (the dieline coordinates, mm) and, right-handed, z away from whoever looks at the
 * printed side, i.e. towards the unprinted side. Every fold turns the panel towards +z (the inside of a box is the
 * unprinted side), so printed sides end up outside. Box space: x along L, y up, z along W towards the front, origin at
 * the centre of the bottom of the closed piece.
 * Owned by IT 2 (Packaging Math)
 */

import { DielineGeometry, PanelFace, SheetAxis } from "../types/dieline";

/** 4 × 4 matrix, column-major (the layout of three.js `Matrix4.fromArray`). */
export type Mat4 = number[];
export type Vec3 = [number, number, number];

export const IDENTITY: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16).fill(0);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

export function transformPoint(m: Mat4, [x, y, z]: Vec3): Vec3 {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

/** Rotation by `angle` radians around the line through `point` with unit direction `axis`. */
function rotationAround(point: Vec3, axis: Vec3, angle: number): Mat4 {
  const [x, y, z] = axis;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const k = 1 - c;
  const r = [
    [c + x * x * k, x * y * k - z * s, x * z * k + y * s],
    [y * x * k + z * s, c + y * y * k, y * z * k - x * s],
    [z * x * k - y * s, z * y * k + x * s, c + z * z * k],
  ];
  const [px, py, pz] = point;
  // p' = R (p − point) + point
  const tx = px - (r[0][0] * px + r[0][1] * py + r[0][2] * pz);
  const ty = py - (r[1][0] * px + r[1][1] * py + r[1][2] * pz);
  const tz = pz - (r[2][0] * px + r[2][1] * py + r[2][2] * pz);
  return [r[0][0], r[1][0], r[2][0], 0, r[0][1], r[1][1], r[2][1], 0, r[0][2], r[1][2], r[2][2], 0, tx, ty, tz, 1];
}

/** The two ends of the hinge of a panel on the sheet: the side of its bounds named by `edge`. */
export function hingeOf(panel: PanelFace): [Vec3, Vec3] {
  const { x, y, width, height } = panel.bounds;
  switch (panel.fold?.edge) {
    case "top":
      return [[x, y, 0], [x + width, y, 0]];
    case "bottom":
      return [[x, y + height, 0], [x + width, y + height, 0]];
    case "left":
      return [[x, y, 0], [x, y + height, 0]];
    default:
      return [[x + width, y, 0], [x + width, y + height, 0]];
  }
}

/**
 * Sheet-space transform of every panel of a piece: flat point (x, y, 0) of the panel → its folded position. `progress`
 * scales the fold angles (0 = flat sheet, 1 = closed box, negative = folded the other way), for every panel or per
 * panel (staged animations). Panels without `fold` stay where they are.
 */
export function panelTransforms(
  geometry: DielineGeometry,
  progress: number | ((panel: PanelFace) => number) = 1,
): Record<string, Mat4> {
  const progressOf = typeof progress === "number" ? () => progress : progress;
  const byId = new Map(geometry.panels.map((panel) => [panel.id, panel]));
  const result: Record<string, Mat4> = {};
  const resolve = (panel: PanelFace, seen: Set<string>): Mat4 => {
    if (result[panel.id]) return result[panel.id];
    const parent = panel.fold && byId.get(panel.fold.parent);
    if (!panel.fold || !parent || seen.has(panel.id)) return (result[panel.id] = IDENTITY);
    const parentMatrix = resolve(parent, new Set(seen).add(panel.id));
    const [a, b] = hingeOf(panel);
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const axis: Vec3 = [(b[0] - a[0]) / length, (b[1] - a[1]) / length, 0];
    // Turn the panel towards the unprinted side: its centre must move to +z.
    const cx = panel.bounds.x + panel.bounds.width / 2 - a[0];
    const cy = panel.bounds.y + panel.bounds.height / 2 - a[1];
    const lift = axis[0] * cy - axis[1] * cx; // z of axis × (centre − a)
    const angle = ((panel.fold.angle * Math.PI) / 180) * progressOf(panel) * (lift < 0 ? -1 : 1);
    return (result[panel.id] = multiply(parentMatrix, rotationAround(a, axis, angle)));
  };
  for (const panel of geometry.panels) resolve(panel, new Set());
  return result;
}

const AXES: Record<SheetAxis, Vec3> = {
  "+x": [1, 0, 0],
  "-x": [-1, 0, 0],
  "+y": [0, 1, 0],
  "-y": [0, -1, 0],
  "+z": [0, 0, 1],
  "-z": [0, 0, -1],
};

/** Corners of every panel at `progress`, in sheet space. */
export function foldedCorners(geometry: DielineGeometry, progress = 1): Record<string, Vec3[]> {
  const transforms = panelTransforms(geometry, progress);
  return Object.fromEntries(
    geometry.panels.map((panel) => {
      const { x, y, width, height } = panel.bounds;
      const corners: Vec3[] = [
        [x, y, 0],
        [x + width, y, 0],
        [x + width, y + height, 0],
        [x, y + height, 0],
      ];
      return [panel.id, corners.map((corner) => transformPoint(transforms[panel.id], corner))];
    }),
  );
}

/**
 * Sheet space → box space for a piece that declares its `orientation`, or null. The closed piece is centred on x and
 * z and stands on y = 0.
 */
export function boxFrameOf(geometry: DielineGeometry): Mat4 | null {
  if (!geometry.orientation) return null;
  const up = AXES[geometry.orientation.up];
  const front = AXES[geometry.orientation.front];
  const right: Vec3 = [
    up[1] * front[2] - up[2] * front[1],
    up[2] * front[0] - up[0] * front[2],
    up[0] * front[1] - up[1] * front[0],
  ];
  // Rows of the rotation are the box axes written in sheet space.
  const rotation: Mat4 = [right[0], up[0], front[0], 0, right[1], up[1], front[1], 0, right[2], up[2], front[2], 0, 0, 0, 0, 1];
  const points = Object.values(foldedCorners(geometry, 1)).flat().map((p) => transformPoint(rotation, p));
  const min = [0, 1, 2].map((i) => Math.min(...points.map((p) => p[i])));
  const max = [0, 1, 2].map((i) => Math.max(...points.map((p) => p[i])));
  const shift: Mat4 = [...IDENTITY.slice(0, 12), -(min[0] + max[0]) / 2, -min[1], -(min[2] + max[2]) / 2, 1];
  return multiply(shift, rotation);
}

/** Size of the closed piece in box space (x along L, y up, z along W), measured on the paper mid-plane, mm. */
export function foldedSize(geometry: DielineGeometry): { x: number; y: number; z: number } | null {
  const frame = boxFrameOf(geometry);
  if (!frame) return null;
  const points = Object.values(foldedCorners(geometry, 1)).flat().map((p) => transformPoint(frame, p));
  const extent = (i: number) => Math.max(...points.map((p) => p[i])) - Math.min(...points.map((p) => p[i]));
  return { x: extent(0), y: extent(1), z: extent(2) };
}
