/**
 * An open tray folded from one sheet: a bottom, four walls and four corner glue tabs. The base and the lid of the lid &
 * base box and the drawer of the sleeve box are trays (formula version 3).
 * Owned by IT 2 (Packaging Math)
 *
 *          ┌tab┐ front wall ┌tab┐
 *   left wall   bottom    right wall
 *          ┌tab┐ back wall  ┌tab┐
 *
 * A lid swaps the front and back walls (`frontAtTop: false`): turned over, its top then reads upright from the front,
 * and so does its front wall.
 *
 * The tabs hinge on the ends of the front and back walls and are glued inside the left and right walls. Their ends are
 * slanted so they clear the bottom and the rim. Since version 3 is frozen once a later version exists, change this
 * file only together with a new version (copy it to tray.v3.ts first).
 */

import { DielineGeometry, PanelFace } from "../types/dieline";
import { segmentWriter } from "./segments";
import type { BoxDimensions, BoxStructureType, SheetAxis } from "../types/dieline";

export interface TrayPanels {
  bottom: { id: string; name: string };
  front: { id: string; name: string };
  back: { id: string; name: string };
  left: { id: string; name: string };
  right: { id: string; name: string };
}

/**
 * A tray whose bottom is `length` × `width` and whose walls are `wall` high, all measured from crease to crease (or
 * crease to rim) on the mid-plane of the paper.
 */
export function generateTray(input: {
  structureType: BoxStructureType;
  dimensions: BoxDimensions;
  length: number;
  width: number;
  wall: number;
  panels: TrayPanels;
  /** "+z" when the tray opens upwards (base, drawer), "-z" when it is turned over as a lid (z: see fold.ts). */
  up: SheetAxis;
  /** Front wall above the bottom on the sheet (default), or below it (lids). */
  frontAtTop?: boolean;
}): DielineGeometry {
  const { length: L, width: W, wall: H } = input;
  const frontAtTop = input.frontAtTop ?? true;
  // Wall above the bottom on the sheet, wall below it.
  const ids = frontAtTop ? input.panels : { ...input.panels, front: input.panels.back, back: input.panels.front };
  const tab = Math.min(15, H * 0.8, W / 2 - 2); // how far a tab reaches along the side wall
  const rimTaper = Math.min(1, H / 10);
  const bottomTaper = Math.min(tab / 2, H / 3);

  const x0 = H;
  const x1 = H + L;
  const y0 = H;
  const y1 = H + W;
  const xEnd = x1 + H;
  const yEnd = y1 + H;

  const panels: PanelFace[] = [
    { ...ids.bottom, bounds: { x: x0, y: y0, width: L, height: W } },
    { ...ids.front, bounds: { x: x0, y: 0, width: L, height: H }, fold: { parent: ids.bottom.id, edge: "bottom", angle: 90 } },
    { ...ids.back, bounds: { x: x0, y: y1, width: L, height: H }, fold: { parent: ids.bottom.id, edge: "top", angle: 90 } },
    { ...ids.left, bounds: { x: 0, y: y0, width: H, height: W }, fold: { parent: ids.bottom.id, edge: "right", angle: 90 } },
    { ...ids.right, bounds: { x: x1, y: y0, width: H, height: W }, fold: { parent: ids.bottom.id, edge: "left", angle: 90 } },
  ];

  const { segments, line, path } = segmentWriter();
  line("crease_front", "crease", { x: x0, y: y0 }, { x: x1, y: y0 });
  line("crease_back", "crease", { x: x0, y: y1 }, { x: x1, y: y1 });
  line("crease_left", "crease", { x: x0, y: y0 }, { x: x0, y: y1 });
  line("crease_right", "crease", { x: x1, y: y0 }, { x: x1, y: y1 });
  line("crease_tab_front_left", "crease", { x: x0, y: 0 }, { x: x0, y: y0 });
  line("crease_tab_front_right", "crease", { x: x1, y: 0 }, { x: x1, y: y0 });
  line("crease_tab_back_left", "crease", { x: x0, y: y1 }, { x: x0, y: yEnd });
  line("crease_tab_back_right", "crease", { x: x1, y: y1 }, { x: x1, y: yEnd });

  path("cut_outline", "cut", [
    { x: x0, y: 0 },
    { x: x1, y: 0 },
    { x: x1 + tab, y: rimTaper },
    { x: x1 + tab, y: y0 - bottomTaper },
    { x: x1, y: y0 },
    { x: xEnd, y: y0 },
    { x: xEnd, y: y1 },
    { x: x1, y: y1 },
    { x: x1 + tab, y: y1 + bottomTaper },
    { x: x1 + tab, y: yEnd - rimTaper },
    { x: x1, y: yEnd },
    { x: x0, y: yEnd },
    { x: x0 - tab, y: yEnd - rimTaper },
    { x: x0 - tab, y: y1 + bottomTaper },
    { x: x0, y: y1 },
    { x: 0, y: y1 },
    { x: 0, y: y0 },
    { x: x0, y: y0 },
    { x: x0 - tab, y: y0 - bottomTaper },
    { x: x0 - tab, y: rimTaper },
    { x: x0, y: 0 },
  ]);

  return {
    structureType: input.structureType,
    dimensions: input.dimensions,
    totalBoundingBox: { width: xEnd, height: yEnd },
    panels,
    segments,
    glueAreas: [
      { x: x0 - tab, y: 0, width: tab, height: H },
      { x: x1, y: 0, width: tab, height: H },
      { x: x0 - tab, y: y1, width: tab, height: H },
      { x: x1, y: y1, width: tab, height: H },
    ],
    orientation: { up: input.up, front: frontAtTop ? "-y" : "+y" },
  };
}
