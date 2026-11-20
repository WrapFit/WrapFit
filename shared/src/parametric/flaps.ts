/**
 * Flaps of a dieline for the 3D model (docs/21 S6): the outline of a tuck, dust, glue or lock flap as its cut path draws
 * it, hinged on its parent panel. The flaps never change the sheet: their lines stay in `segments`.
 * Owned by IT 2 (Packaging Math)
 */

import { FlapFace, Point2D } from "../types/dieline";

/** A flap from its outline on the sheet; `bounds` is the outline's bounding box (the hinge is one of its sides). */
export function flapFace(
  id: string,
  name: string,
  kind: FlapFace["kind"],
  fold: FlapFace["fold"],
  outline: Point2D[],
  layers?: number,
): FlapFace {
  const xs = outline.map((p) => p.x);
  const ys = outline.map((p) => p.y);
  const [x, y] = [Math.min(...xs), Math.min(...ys)];
  return {
    id,
    name,
    kind,
    fold,
    outline,
    bounds: { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y },
    ...(layers ? { layers } : {}),
  };
}
