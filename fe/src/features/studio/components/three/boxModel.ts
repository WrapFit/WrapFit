"use client";

import * as THREE from "three";
import {
  CUBIC_ARC_K,
  boxFrameOf,
  cutSidesOf,
  CURRENT_FORMULA_VERSION,
  generateDielinePieces,
  isBackground,
  matchesPanel,
  multiply,
  FINISH_SPOTS,
  orderElements,
  printsInside,
  panelTransforms,
  blendOf,
  insertLayoutOf,
  shadowOf,
  pillowShapeOf,
  sideOf,
  transformPoint,
  type BoxDimensions,
  type CanvasElement,
  type DielineGeometry,
  type DielinePiece,
  type Mat4,
  type DielineOpening,
  type PanelFace,
  type Point2D,
  type PrintSide,
} from "@wrapfit/shared";
import { elementImageKey, recoloredSrc } from "../../utils/svgRecolor";
import { drawImageOnCanvas, drawTextOnCanvas } from "../canvas/elementVisuals";
import { drawArt, elementArt } from "../library/elementArt";
import { placedCarrierCups, STANDARD_350ML_Y_SEAT } from "./cupModel";

/**
 * 3D model of a box built from its dieline (docs-old/12 Phase 8, H6): every printable panel is a sheet of paper folded on
 * the hinges the formulas declare (`PanelFace.fold`, `panelTransforms` of @wrapfit/shared), so the model has exactly
 * the size of the printed box; the pillow box, whose faces do not fold flat, is built from `pillowShapeOf`. Each panel
 * shows the elements placed on it, drawn like the 2D canvas. Flaps and glue tabs are not modelled (they sit inside).
 */

/**
 * Look of the paper. The studio prints on ivory, kraft, duplex (white, grey back) and rigid board (printed paper laminated
 * on grey board); `forest` and `gold_foil` are showcase looks of the marketing pages.
 */
export type BoxMaterialTheme = "kraft" | "ivory" | "duplex" | "rigid" | "forest" | "gold_foil";

/** Printed side and inside of the paper for each look of the editor. */
const PAPER: Record<BoxMaterialTheme, { outside: string; inside: string; ink: string }> = {
  ivory: { outside: "#FAF6EE", inside: "#EFE8DC", ink: "#1C1917" },
  kraft: { outside: "#D9B897", inside: "#CDAA85", ink: "#2B1E16" },
  duplex: { outside: "#F7F7F3", inside: "#B9BCB7", ink: "#1C1917" },
  rigid: { outside: "#FBFAF6", inside: "#8E8A82", ink: "#1C1917" },
  forest: { outside: "#1A362B", inside: "#E8E2D6", ink: "#F5E7B2" },
  gold_foil: { outside: "#D4AF37", inside: "#EFE8DC", ink: "#382205" },
};

/** Panel that carries the showcase decoration when there is no design (home page, intro). */
const MAIN_PANEL = ["panel_front", "lid_top", "sleeve_top", "pillow_front", "mailer_lid", "gable_front", "tag_front", "card_front", "band_top", "panel_sticker"];
const IMAGE_TYPES = new Set<CanvasElement["type"]>(["image", "logo", "pattern"]);
// blob: and data: URLs are uploads kept in the browser (offline demo, storage out of reach): they load into the 3D
// texture too.
const isFileUrl = (content: string) => /^(https?:\/\/|\/|blob:|data:image\/)/.test(content);

export interface BoxModelOptions {
  structure: string;
  dimensions: BoxDimensions;
  /** Formulas of the project; versions without hinges (1, 2) are shown with the current formulas. */
  formulaVersion?: number;
  elements: CanvasElement[];
  theme: BoxMaterialTheme;
  /** Background preset of the editor ("tet", "xmas"…), drawn under the artwork. */
  pattern: string | null;
  /** Decoration text when the box shows no design (marketing pages); null for a real design. */
  decoration: string | null;
  /** Paper fibres on the printed side (bump and roughness maps of the viewer). */
  surface?: { bumpMap: THREE.Texture | null; roughnessMap: THREE.Texture | null; bumpScale: number };
  /** Whether to place 350ml takeaway cups into the cup carrier in 3D (default: true for cup-carrier) */
  showCups?: boolean;
  /** Called after a texture changed (image or font loaded): the caller renders a frame. */
  onChange?: () => void;
}

type MakePrinted = (map: THREE.Texture | null, side: THREE.Side, panelId: string) => THREE.MeshPhysicalMaterial;

/** Finish of the printed side: matte paper with a soft sheen, velvet soft-touch for the forest board, foil for gold. */
const FINISH: Record<BoxMaterialTheme, THREE.MeshPhysicalMaterialParameters & { edge: string }> = {
  ivory: { roughness: 0.74, metalness: 0, sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color("#FFFFFF"), envMapIntensity: 0.55, edge: "#B8AC98" },
  kraft: { roughness: 0.9, metalness: 0, sheen: 0.25, sheenRoughness: 0.7, sheenColor: new THREE.Color("#FFF1DC"), envMapIntensity: 0.45, edge: "#8C6B4B" },
  duplex: { roughness: 0.66, metalness: 0, sheen: 0.3, sheenRoughness: 0.55, sheenColor: new THREE.Color("#FFFFFF"), envMapIntensity: 0.55, edge: "#8E918C" },
  rigid: { roughness: 0.58, metalness: 0, sheen: 0.3, sheenRoughness: 0.5, sheenColor: new THREE.Color("#FFFFFF"), envMapIntensity: 0.6, edge: "#6F6A62" },
  forest: { roughness: 0.62, metalness: 0, sheen: 0.8, sheenRoughness: 0.45, sheenColor: new THREE.Color("#6FA58A"), envMapIntensity: 0.5, edge: "#0B1F16" },
  gold_foil: { roughness: 0.3, metalness: 0.88, clearcoat: 0.45, clearcoatRoughness: 0.25, envMapIntensity: 1.15, edge: "#8F6E17" },
};

/** Glow of the panel under the pointer (lime of the brand). */
const HOVER_GLOW = new THREE.Color("#98E665");

export interface BoxModel {
  group: THREE.Group;
  /** Folds the box: 0 = flat sheet, 1 = closed; `open` (0 → 1) opens the lid or pulls the drawer. */
  update(progress: number, open: number): void;
  /** Lights up the panel with this mesh name (pointer over it); null clears it. */
  highlight(panelId: string | null): void;
  /** Size of the closed box, mm (x along L, y up, z along W; the pillow box lies with L front to back). */
  size: { x: number; y: number; z: number };
  /** Dynamically adjusts physical visual paper thickness on panel cuts and rims (mm). */
  setThickness?(thicknessMm: number): void;
  /** Instantly shows or hides takeaway cups without rebuilding the 3D model. */
  setCupsVisible?(visible: boolean): void;
  dispose(): void;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Pieces with hinges: those of the project, else (formula versions 1, 2) those of the current formulas. */
export function foldablePieces(structure: string, dimensions: BoxDimensions, formulaVersion?: number): DielinePiece[] {
  const own = generateDielinePieces(structure, dimensions, formulaVersion ?? CURRENT_FORMULA_VERSION);
  if (structure === "pillow" || own.every((piece) => piece.geometry.orientation)) return own;
  return generateDielinePieces(structure, dimensions, CURRENT_FORMULA_VERSION);
}

// ---------------------------------------------------------------------------------------------------------------
// Textures

type Rect = { x: number; y: number; width: number; height: number };

/** Background presets of the editor, drawn in mm. */
function drawPreset(ctx: CanvasRenderingContext2D, preset: string, width: number, height: number) {
  const name = preset.toLowerCase();
  ctx.save();
  if (name.includes("tet") || name.includes("mai") || name.includes("xuan")) {
    for (let y = 6; y < height + 12; y += 18) {
      for (let x = 6; x < width + 12; x += 18) {
        ctx.fillStyle = "rgba(212, 175, 55, 0.35)";
        for (let p = 0; p < 5; p++) {
          const a = (p * 2 * Math.PI) / 5;
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#E53E3E";
        ctx.beginPath();
        ctx.arc(x, y, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (name.includes("xmas") || name.includes("noel") || name.includes("tuyet")) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 0.3;
    for (let y = 7; y < height + 14; y += 15) {
      for (let x = 7; x < width + 14; x += 15) {
        ctx.beginPath();
        ctx.moveTo(x - 1.6, y);
        ctx.lineTo(x + 1.6, y);
        ctx.moveTo(x, y - 1.6);
        ctx.lineTo(x, y + 1.6);
        ctx.moveTo(x - 1.1, y - 1.1);
        ctx.lineTo(x + 1.1, y + 1.1);
        ctx.moveTo(x - 1.1, y + 1.1);
        ctx.lineTo(x + 1.1, y - 1.1);
        ctx.stroke();
      }
    }
  } else if (name.includes("botanical") || name.includes("la") || name.includes("leaf")) {
    ctx.fillStyle = "rgba(82, 121, 111, 0.28)";
    for (let y = 8; y < height + 16; y += 16) {
      for (let x = 8; x < width + 16; x += 16) {
        ctx.beginPath();
        ctx.ellipse(x, y, 2.2, 1, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 1.9, y - 1.1, 1.9, 0.8, -Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    ctx.strokeStyle = "rgba(212, 175, 55, 0.25)";
    ctx.lineWidth = 0.2;
    for (let y = 0; y <= height; y += 9) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    for (let x = 0; x <= width; x += 9) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawDecoration(ctx: CanvasRenderingContext2D, panel: PanelFace, text: string, theme: BoxMaterialTheme) {
  const { width, height } = panel.bounds;
  const color = theme === "forest" ? "#D4AF37" : theme === "gold_foil" ? "#4A2F08" : "#1A362B";
  const frameW = Math.min(width * 0.62, 90);
  const frameH = Math.min(height * 0.5, frameW * 0.8);
  const x = (width - frameW) / 2;
  const y = (height - frameH) / 2;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.3, frameW / 160);
  ctx.strokeRect(x, y, frameW, frameH);
  ctx.strokeRect(x + 1.2, y + 1.2, frameW - 2.4, frameH - 2.4);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `italic 600 ${frameH * 0.22}px "Playfair Display", serif`;
  ctx.fillText("WrapFit", width / 2, height / 2 - frameH * 0.08, frameW * 0.9);
  ctx.font = `500 ${frameH * 0.08}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(text.toUpperCase(), width / 2, height / 2 + frameH * 0.2, frameW * 0.9);
  ctx.restore();
}

interface PanelTexture {
  texture: THREE.CanvasTexture;
  redraw: () => void;
}

/**
 * Draws an element with the look of its print finish (docs-old/23 S6): the element is drawn on its own layer, then foil
 * becomes a metal gradient, spot UV a glossy sheen and embossing a light / shadow relief, inside its own shape only.
 */
function drawFinished(ctx: CanvasRenderingContext2D, el: CanvasElement, draw: (layer: CanvasRenderingContext2D) => void) {
  const finish = el.finish ? FINISH_SPOTS[el.finish] : null;
  if (!finish) return draw(ctx);
  const layer = document.createElement("canvas");
  layer.width = ctx.canvas.width;
  layer.height = ctx.canvas.height;
  const lctx = layer.getContext("2d");
  if (!lctx) return draw(ctx);
  const at = ctx.getTransform();
  lctx.setTransform(at);
  draw(lctx);
  lctx.globalCompositeOperation = "source-atop";
  if (finish.metallic) {
    const gradient = lctx.createLinearGradient(0, 0, el.width, el.height);
    gradient.addColorStop(0, "#FFFFFF");
    gradient.addColorStop(0.35, finish.display);
    gradient.addColorStop(0.65, "#FFFFFF");
    gradient.addColorStop(1, finish.display);
    lctx.globalAlpha = 0.85;
    lctx.fillStyle = gradient;
    lctx.fillRect(0, 0, el.width, el.height);
  } else if (el.finish === "spot_uv") {
    const gradient = lctx.createLinearGradient(0, 0, el.width, el.height);
    gradient.addColorStop(0, "rgba(255,255,255,0.55)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.05)");
    gradient.addColorStop(1, "rgba(255,255,255,0.4)");
    lctx.fillStyle = gradient;
    lctx.fillRect(0, 0, el.width, el.height);
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (el.finish === "emboss" || el.finish === "deboss") {
    // Relief: a light edge on one side and a shadow on the other (swapped for debossing).
    const off = Math.max(1, Math.round(ctx.canvas.width / 400));
    const raised = el.finish === "emboss";
    ctx.globalAlpha = 0.35;
    ctx.filter = "brightness(0)";
    ctx.drawImage(layer, raised ? off : -off, raised ? off : -off);
    ctx.filter = "brightness(2)";
    ctx.drawImage(layer, raised ? -off : off, raised ? -off : off);
    ctx.filter = "none";
    ctx.globalAlpha = 1;
  }
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}

/**
 * Texture of one panel. `region` is the sheet rectangle the texture covers (the panel itself, or for a pillow face
 * the whole face between its tips); elements are placed in panel coordinates, like on the 2D canvas.
 */
function panelTexture(
  panel: PanelFace,
  region: Rect,
  options: BoxModelOptions,
  images: Map<string, HTMLImageElement | null>,
  /** The inside is seen from inside the box: its elements are drawn mirrored on the back of the panel (docs-old/23 S5). */
  side: PrintSide = "outside",
  /** Faces of the same piece: their images, text and shapes may run over this one (backgrounds stay on their face). */
  piecePanels: PanelFace[] = [panel]
): PanelTexture {
  const scale = Math.min(8, Math.max(2, 2048 / Math.max(region.width, region.height)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(region.width * scale));
  canvas.height = Math.max(2, Math.round(region.height * scale));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const paper = PAPER[options.theme];
  // One side of the sheet, visible layers only, in paint order (docs-old/23 D3).
  const elements = orderElements(options.elements).flatMap((el) => {
    if (el.hidden || sideOf(el) !== side) return [];
    if (matchesPanel(panel, el.panelId)) return [{ el, dx: 0, dy: 0 }];
    if (isBackground(el)) return [];
    const owner = piecePanels.find((p) => matchesPanel(p, el.panelId));
    return owner ? [{ el, dx: owner.bounds.x - panel.bounds.x, dy: owner.bounds.y - panel.bounds.y }] : [];
  });

  const redraw = () => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = side === "inside" ? paper.inside : paper.outside;
    ctx.fillRect(0, 0, region.width, region.height);
    if (side === "inside") {
      // The back of the panel shows the texture mirrored: draw it mirrored so it reads right from inside the box.
      ctx.translate(region.width, 0);
      ctx.scale(-1, 1);
    } else if (options.pattern) {
      drawPreset(ctx, options.pattern, region.width, region.height);
    }
    ctx.translate(panel.bounds.x - region.x, panel.bounds.y - region.y);

    for (const { el, dx, dy } of elements) {
      ctx.save();
      ctx.translate(dx, dy);
      if (typeof el.style?.opacity === "number") ctx.globalAlpha = Math.min(1, Math.max(0, el.style.opacity));
      const blend = blendOf(el.style);
      if (blend) ctx.globalCompositeOperation = blend;
      ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
      ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
      const shadow = shadowOf(el.style);
      if (shadow) {
        // Canvas shadows live in device pixels: the offset goes through the current (turned) transform by hand.
        const m = ctx.getTransform();
        const r = parseInt(shadow.color.slice(1, 3), 16);
        const g = parseInt(shadow.color.slice(3, 5), 16);
        const b = parseInt(shadow.color.slice(5, 7), 16);
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${shadow.opacity})`;
        ctx.shadowBlur = shadow.blur * Math.hypot(m.a, m.b);
        ctx.shadowOffsetX = m.a * shadow.x + m.c * shadow.y;
        ctx.shadowOffsetY = m.b * shadow.x + m.d * shadow.y;
      }
      if (el.flipX || el.flipY) ctx.scale(el.flipX ? -1 : 1, el.flipY ? -1 : 1);
      ctx.translate(-el.width / 2, -el.height / 2);
      drawFinished(ctx, el, (target) => {
        const art = elementArt(el);
        if (art) {
          drawArt(target, art); // shapes, library stickers, labels, backgrounds and barcodes: vectors
        } else if (IMAGE_TYPES.has(el.type)) {
          const image = images.get(elementImageKey(el));
          if (image) drawImageOnCanvas(target, el, image); // crop, fill, frame, adjustments (docs-old/23 S10)
        } else if (el.type === "text") {
          drawTextOnCanvas(target, el, paper.ink); // spacing, outline, curve (docs-old/23 S9)
        }
      });
      ctx.restore();
    }
    if (side === "outside" && options.decoration && MAIN_PANEL.includes(panel.id)) drawDecoration(ctx, panel, options.decoration, options.theme);
    texture.needsUpdate = true;
  };
  redraw();
  return { texture, redraw };
}

// ---------------------------------------------------------------------------------------------------------------
// Geometry

/**
 * A panel in sheet coordinates (printed side towards −z, see fold.ts), texture upright: two triangles, or its outline
 * (gable ends) with its windows and hand holes cut out (docs-old/23 S17).
 */
function panelGeometry({ x, y, width, height }: Rect, outline?: Point2D[], holes: DielineOpening[] = []): THREE.BufferGeometry {
  if (outline || holes.length > 0) {
    const corners = outline ?? [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ];
    const shape = new THREE.Shape(corners.map((p) => new THREE.Vector2(p.x, p.y)));
    for (const hole of holes) {
      const r = Math.min(hole.radius, hole.width / 2, hole.height / 2);
      const path = new THREE.Path();
      const x1 = hole.x + hole.width;
      const y1 = hole.y + hole.height;
      // Cup holes are true circles (cubic corners, like their cut line); the older holes keep their quadratic corners.
      const round = hole.kind === "cup";
      const corner = (cx: number, cy: number, ex: number, ey: number, sx: number, sy: number) =>
        round
          ? path.bezierCurveTo(sx + (cx - sx) * CUBIC_ARC_K, sy + (cy - sy) * CUBIC_ARC_K, ex + (cx - ex) * CUBIC_ARC_K, ey + (cy - ey) * CUBIC_ARC_K, ex, ey)
          : path.quadraticCurveTo(cx, cy, ex, ey);
      path.moveTo(hole.x + r, hole.y);
      path.lineTo(x1 - r, hole.y);
      corner(x1, hole.y, x1, hole.y + r, x1 - r, hole.y);
      path.lineTo(x1, y1 - r);
      corner(x1, y1, x1 - r, y1, x1, y1 - r);
      path.lineTo(hole.x + r, y1);
      corner(hole.x, y1, hole.x, y1 - r, hole.x + r, y1);
      path.lineTo(hole.x, hole.y + r);
      corner(hole.x, hole.y, hole.x + r, hole.y, hole.x, hole.y + r);
      shape.holes.push(path);
    }
    const geometry = new THREE.ShapeGeometry(shape, 6);
    const position = geometry.getAttribute("position");
    const uv = new Float32Array(position.count * 2);
    for (let i = 0; i < position.count; i++) {
      uv[2 * i] = (position.getX(i) - x) / width;
      uv[2 * i + 1] = 1 - (position.getY(i) - y) / height;
    }
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    // ShapeGeometry faces +z; the printed side of a panel faces −z.
    const index = geometry.getIndex()!;
    for (let i = 0; i < index.count; i += 3) {
      const b = index.getX(i + 1);
      index.setX(i + 1, index.getX(i + 2));
      index.setX(i + 2, b);
    }
    geometry.computeVertexNormals();
    return geometry;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([x, y, 0, x + width, y, 0, x + width, y + height, 0, x, y + height, 0], 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2));
  geometry.setIndex([0, 2, 1, 0, 3, 2]);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Visual rim band connecting front face (z = 0) and back face (z = -1) along cut edges of a panel.
 * Crease lines (fold hinges) are excluded so hinges never crack or z-fight.
 */
function panelCutRimGeometry(
  panel: PanelFace,
  geometry: DielineGeometry,
  openings?: DielineOpening[]
): THREE.BufferGeometry | null {
  const { x, y, width, height } = panel.bounds;
  const segments: Array<{ from: [number, number]; to: [number, number] }> = [];

  if (panel.outline && panel.outline.length >= 3) {
    const pts = panel.outline;
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      const isCrease = geometry.segments.some((seg) => {
        if (seg.type !== "crease") return false;
        const dx = seg.end.x - seg.start.x;
        const dy = seg.end.y - seg.start.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq < 1e-4) return false;
        const t = Math.max(0, Math.min(1, ((mx - seg.start.x) * dx + (my - seg.start.y) * dy) / lenSq));
        const projX = seg.start.x + t * dx;
        const projY = seg.start.y + t * dy;
        return Math.hypot(mx - projX, my - projY) < 1.0;
      });
      if (!isCrease) {
        segments.push({ from: [p1.x, p1.y], to: [p2.x, p2.y] });
      }
    }
  } else {
    const cutSides = cutSidesOf(panel, geometry);
    if (cutSides.has("top")) {
      segments.push({ from: [x, y], to: [x + width, y] });
    }
    if (cutSides.has("right")) {
      segments.push({ from: [x + width, y], to: [x + width, y + height] });
    }
    if (cutSides.has("bottom")) {
      segments.push({ from: [x + width, y + height], to: [x, y + height] });
    }
    if (cutSides.has("left")) {
      segments.push({ from: [x, y + height], to: [x, y] });
    }
  }

  if (openings && openings.length > 0) {
    for (const hole of openings) {
      if (hole.kind === "cup") {
        const cx = hole.x + hole.width / 2;
        const cy = hole.y + hole.height / 2;
        const rx = hole.width / 2;
        const ry = hole.height / 2;
        const STEPS = 20;
        for (let i = 0; i < STEPS; i++) {
          const a1 = (i / STEPS) * Math.PI * 2;
          const a2 = ((i + 1) / STEPS) * Math.PI * 2;
          segments.push({
            from: [cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry],
            to: [cx + Math.cos(a2) * rx, cy + Math.sin(a2) * ry],
          });
        }
      } else {
        const hx = hole.x;
        const hy = hole.y;
        const hw = hole.width;
        const hh = hole.height;
        segments.push(
          { from: [hx, hy], to: [hx + hw, hy] },
          { from: [hx + hw, hy], to: [hx + hw, hy + hh] },
          { from: [hx + hw, hy + hh], to: [hx, hy + hh] },
          { from: [hx, hy + hh], to: [hx, hy] }
        );
      }
    }
  }

  if (segments.length === 0) return null;

  const vertices: number[] = [];
  const indices: number[] = [];

  segments.forEach((seg, idx) => {
    const [x1, y1] = seg.from;
    const [x2, y2] = seg.to;
    const base = idx * 4;
    // z spans from 0 (front face) to 1 (unit depth along +Z into inside)
    vertices.push(
      x1, y1, 0,
      x2, y2, 0,
      x2, y2, 1,
      x1, y1, 1
    );
    indices.push(
      base, base + 1, base + 2,
      base, base + 2, base + 3
    );
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function visualThicknessOf(t: number): number {
  const mm = t > 0 ? t : 0.38;
  // Scaled so 0.20mm is ~0.7mm, 0.38mm is ~1.33mm, 0.80mm is ~2.8mm
  // This makes the physical paper thickness clearly felt and visible on screen without breaking hinges
  return Math.max(0.35, mm * 3.5);
}

/**
 * Progress of each panel: walls first, then the lid and bottom of a tuck-top box (open: lid swings back past upright).
 * Mailer: the walls rise, their inner layers roll over the rim, then the lid closes; open, the lid swings back.
 */
function stagedProgress(structure: string, progress: number, open: number) {
  return (panel: PanelFace) => {
    // A card opens like a book, a belly band comes off the box (docs-old/23 S18).
    if (structure === "folded-card") return mix(progress, 0.42, open);
    if (structure === "belly-band") return mix(progress, 0.55, open);
    if (structure === "gable") {
      // Walls and bottom first, then the roofs close and the handles rise; open, the roofs swing back out.
      if (panel.id.startsWith("gable_roof_") || panel.id.startsWith("gable_handle_")) {
        return mix(clamp01((progress - 0.55) / 0.45), -0.6, open);
      }
      return clamp01(progress / 0.55);
    }
    if (structure === "cup-carrier") {
      // Walls rise from the base, then the shoulders close in and the handles meet; open, the shoulders swing out.
      if (panel.id.startsWith("carrier_shoulder_") || panel.id.startsWith("carrier_handle_")) {
        return mix(clamp01((progress - 0.5) / 0.5), -0.5, open);
      }
      return clamp01(progress / 0.5);
    }
    if (structure === "mailer") {
      if (panel.id === "mailer_lid") return mix(clamp01((progress - 0.6) / 0.4), -0.25, open);
      if (panel.id.endsWith("_inner")) return clamp01((progress - 0.3) / 0.4);
      return clamp01(progress / 0.45);
    }
    if (structure !== "tuck-top") return progress;
    if (panel.id === "panel_top_lid") return mix(clamp01((progress - 0.55) / 0.45), -0.32, open);
    if (panel.id === "panel_bottom") return clamp01((progress - 0.45) / 0.45);
    return clamp01(progress / 0.6);
  };
}

const toMatrix = (m: Mat4) => new THREE.Matrix4().fromArray(m);

/** One folded piece: a group whose meshes follow `panelTransforms`; it stands on y = 0, centred on x and z. */
function foldedPiece(
  geometry: DielineGeometry,
  textures: Map<string, PanelTexture>,
  makePrinted: MakePrinted,
  insideOf: (panelId: string) => THREE.Material,
  edges: THREE.LineBasicMaterial,
  paperCore: THREE.Material,
  initialThickness: number,
  disposables: { dispose(): void }[],
  initialElevation = 0
) {
  const group = new THREE.Group();
  const frame = boxFrameOf(geometry)!;
  // Rotation only: the shift to the ground is recomputed for each fold state.
  const rotation: Mat4 = [...frame.slice(0, 12), 0, 0, 0, 1];
  const lastMatrices: Record<string, Mat4> = {};
  let currentVisualThickness = visualThicknessOf(initialThickness);
  let currentElevation = initialElevation;
  let lastProgressOf: ((panel: PanelFace) => number) | null = null;

  const meshes = geometry.panels.map((panel) => {
    const shape = panelGeometry(panel.bounds, panel.outline, geometry.openings?.filter((o) => o.panelId === panel.id));
    const isCarrierBase = panel.id === "carrier_base";
    const isBasePanel = isCarrierBase || panel.id.endsWith("_base") || panel.id.endsWith("_bottom");
    const printed = makePrinted(textures.get(panel.id)?.texture ?? null, THREE.FrontSide, panel.id);
    if (isBasePanel) {
      printed.polygonOffset = false;
    }
    const front = new THREE.Mesh(shape, printed);
    // For cup-carrier base or open trays, the upper surface facing into the tray displays the paper inside texture/color,
    // ensuring the bottom is completely visible, solid, and seamless from both above and below without reference errors.
    const backMaterial = insideOf(panel.id);
    if (isBasePanel && "polygonOffset" in backMaterial) {
      (backMaterial as THREE.MeshStandardMaterial).polygonOffset = false;
    }
    const back = new THREE.Mesh(shape, backMaterial);

    // Rim quad mesh along perimeter cut edges & inner cut holes
    const rimGeo = panelCutRimGeometry(panel, geometry, geometry.openings?.filter((o) => o.panelId === panel.id));
    const rim = rimGeo ? new THREE.Mesh(rimGeo, paperCore) : null;

    // Hairline on the panel edges: folds and cut edges read crisply, like a pressed crease.
    const outline = new THREE.EdgesGeometry(shape);
    const edge = new THREE.LineSegments(outline, edges);
    edge.raycast = () => {};

    for (const mesh of [front, back]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = panel.id;
    }
    if (rim && rimGeo) {
      rim.castShadow = true;
      rim.receiveShadow = true;
      rim.name = `${panel.id}_rim`;
      rim.matrixAutoUpdate = false;
      group.add(rim);
      disposables.push(rimGeo);
    }
    for (const object of [front, back, edge]) {
      object.matrixAutoUpdate = false;
      group.add(object);
    }
    disposables.push(shape, printed, outline);
    return { panel, front, back, rim, edge };
  });

  const update = (progressOf: (panel: PanelFace) => number) => {
    lastProgressOf = progressOf;
    const transforms = panelTransforms(geometry, progressOf);
    const placed = meshes.map(({ panel }) => multiply(rotation, transforms[panel.id]));
    const corners = meshes.flatMap(({ panel }, i) => {
      const { x, y, width, height } = panel.bounds;
      return [
        [x, y, 0],
        [x + width, y, 0],
        [x + width, y + height, 0],
        [x, y + height, 0],
      ].map((p) => transformPoint(placed[i], p as [number, number, number]));
    });
    const min = [0, 1, 2].map((i) => Math.min(...corners.map((p) => p[i])));
    const max = [0, 1, 2].map((i) => Math.max(...corners.map((p) => p[i])));
    // 0.6 mm elevation so every box rests cleanly on top of tables/podiums/mats, completely eliminating z-fighting and bottom clipping
    const BOX_GROUND_CLEARANCE = 0.6 + currentElevation;
    const shift: Mat4 = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      -(min[0] + max[0]) / 2, -min[1] + BOX_GROUND_CLEARANCE, -(min[2] + max[2]) / 2, 1
    ];
    meshes.forEach(({ front, back, rim, edge, panel }, i) => {
      const mat = multiply(shift, placed[i]);
      lastMatrices[panel.id] = mat;
      const matrix = toMatrix(mat);

      // Front face stays precisely at outer fold crease (z = 0)
      front.matrix.copy(matrix);
      front.matrixWorldNeedsUpdate = true;

      // Edge outline
      edge.matrix.copy(matrix);
      edge.matrixWorldNeedsUpdate = true;

      // Back face pushed inward into the interior of the box along local +Z
      const backMatrix = matrix.clone();
      backMatrix.elements[12] += backMatrix.elements[8] * currentVisualThickness;
      backMatrix.elements[13] += backMatrix.elements[9] * currentVisualThickness;
      backMatrix.elements[14] += backMatrix.elements[10] * currentVisualThickness;
      back.matrix.copy(backMatrix);
      back.matrixWorldNeedsUpdate = true;

      // Rim quad band scaled along local Z by currentVisualThickness
      if (rim) {
        const rimMatrix = matrix.clone();
        rimMatrix.elements[8] *= currentVisualThickness;
        rimMatrix.elements[9] *= currentVisualThickness;
        rimMatrix.elements[10] *= currentVisualThickness;
        rim.matrix.copy(rimMatrix);
        rim.matrixWorldNeedsUpdate = true;
      }
    });
  };

  const setThickness = (newThicknessMm: number) => {
    currentVisualThickness = visualThicknessOf(newThicknessMm);
    if (lastProgressOf) {
      update(lastProgressOf);
    }
  };

  const setGroundElevation = (newElevation: number) => {
    currentElevation = newElevation;
    if (lastProgressOf) {
      update(lastProgressOf);
    }
  };

  return {
    group,
    update,
    setThickness,
    setGroundElevation,
    getPanelMatrix: (panelId: string) => lastMatrices[panelId] ?? null,
  };
}

/**
 * Partitions of a divider insert, standing in the tray where insertLayoutOf puts them (they have no hinges): long ones
 * along L between the rows, cross ones along W between the columns, on the bottom of the tray.
 */
function placedDividers(
  geometry: DielineGeometry,
  dimensions: BoxDimensions,
  textures: Map<string, PanelTexture>,
  makePrinted: MakePrinted,
  insideOf: (panelId: string) => THREE.Material,
  edges: THREE.LineBasicMaterial,
  disposables: { dispose(): void }[]
) {
  const group = new THREE.Group();
  const layout = insertLayoutOf(dimensions);
  const base = dimensions.paperThickness / 2;
  for (const panel of geometry.panels) {
    const { x, y, width: w, height: h } = panel.bounds;
    const index = Number(panel.id.split("_").pop()) - 1;
    const long = panel.id.startsWith("divider_long_");
    const top = base + y + h;
    // Sheet (x right, y down) → box: x along the partition, y up.
    const m: Mat4 = long
      ? [1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, -x - w / 2, top, layout.rowLines[index] - dimensions.width / 2, 1]
      : [0, 0, 1, 0, 0, -1, 0, 0, 1, 0, 0, 0, layout.colLines[index] - dimensions.length / 2, top, -x - w / 2, 1];
    const shape = panelGeometry(panel.bounds);
    const printed = makePrinted(textures.get(panel.id)?.texture ?? null, THREE.DoubleSide, panel.id);
    const mesh = new THREE.Mesh(shape, printed);
    mesh.name = panel.id;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(shape), edges);
    edge.raycast = () => {};
    for (const object of [mesh, edge]) {
      object.matrixAutoUpdate = false;
      object.matrix.copy(toMatrix(m));
      group.add(object);
    }
    void insideOf;
    disposables.push(shape, printed, edge.geometry);
  }
  return group;
}

/**
 * Pillow box: two bowed faces pinched at both ends by the end flaps folded in at 45° (see pillow.ts). The axis (L) runs
 * front to back, so texts, which run across the faces on the sheet, read from the front.
 */
function pillowModel(
  dimensions: BoxDimensions,
  geometry: DielineGeometry,
  textures: Map<string, PanelTexture>,
  makePrinted: MakePrinted,
  inside: THREE.Material,
  disposables: { dispose(): void }[]
) {
  const { chord, sagitta, endDepth: d, bodyLength } = pillowShapeOf(dimensions);
  const group = new THREE.Group();
  const U = 32;
  const V = 24;
  // Half length of a face at u ∈ [−1, 1] across it: the curved creases are d (1 − u²) from each tip line.
  const halfOf = (u: number) => bodyLength / 2 - d * (1 - u * u);
  const faces = geometry.panels.map((panel, index) => {
    const sign = index === 0 ? 1 : -1;
    const shape = new THREE.BufferGeometry();
    const vertices = (U + 1) * (V + 1);
    shape.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(vertices * 3), 3));
    // The texture covers the face from tip to tip; the face itself stops at the curved creases (see `halfOf`).
    const uv: number[] = [];
    const indices: number[] = [];
    for (let j = 0; j <= V; j++) {
      for (let i = 0; i <= U; i++) {
        const half = halfOf((i / U) * 2 - 1);
        const along = -half + (2 * half * j) / V;
        uv.push(i / U, 1 - (along + bodyLength / 2) / bodyLength);
      }
    }
    for (let j = 0; j < V; j++) {
      for (let i = 0; i < U; i++) {
        const a = j * (U + 1) + i;
        indices.push(a, a + U + 1, a + 1, a + 1, a + U + 1, a + U + 2);
      }
    }
    shape.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    shape.setIndex(indices);
    const material = makePrinted(textures.get(panel.id)?.texture ?? null, THREE.DoubleSide, panel.id);
    const mesh = new THREE.Mesh(shape, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = panel.id;
    // End flaps: a strip from the curved crease down to the tip line at each end.
    const flaps = new THREE.BufferGeometry();
    flaps.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(2 * (U + 1) * 2 * 3), 3));
    const flapIndices: number[] = [];
    for (const end of [0, 1]) {
      const base = end * 2 * (U + 1);
      for (let i = 0; i < U; i++) {
        const a = base + i * 2;
        flapIndices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
      }
    }
    flaps.setIndex(flapIndices);
    const flapMesh = new THREE.Mesh(flaps, inside);
    flapMesh.castShadow = true;
    group.add(mesh, flapMesh);
    disposables.push(shape, material, flaps);
    return { sign, shape, flaps };
  });

  const update = (progress: number) => {
    const s = sagitta * Math.max(progress, 0.02);
    const alpha = 2 * Math.atan2(2 * s, chord);
    const radius = chord / (2 * Math.sin(alpha));
    for (const { sign, shape, flaps } of faces) {
      const position = shape.getAttribute("position") as THREE.BufferAttribute;
      const flapPosition = flaps.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i <= U; i++) {
        const u = (i / U) * 2 - 1;
        const phi = u * alpha;
        const across = radius * Math.sin(phi) * sign;
        const lift = (radius * Math.cos(phi) - radius * Math.cos(alpha)) * sign + s;
        const half = halfOf(u);
        for (let j = 0; j <= V; j++) {
          const along = -half + (2 * half * j) / V;
          position.setXYZ(j * (U + 1) + i, across, lift, along);
        }
        for (const end of [0, 1]) {
          const direction = end === 0 ? -1 : 1;
          const base = end * 2 * (U + 1) + i * 2;
          flapPosition.setXYZ(base, across, lift, direction * half);
          flapPosition.setXYZ(base + 1, across, s, (direction * bodyLength) / 2);
        }
      }
      position.needsUpdate = true;
      flapPosition.needsUpdate = true;
      shape.computeVertexNormals();
      flaps.computeVertexNormals();
      shape.computeBoundingSphere();
      flaps.computeBoundingSphere();
    }
  };
  return { group, update, size: { x: chord, y: 2 * sagitta, z: bodyLength } };
}

// ---------------------------------------------------------------------------------------------------------------

export function buildBoxModel(options: BoxModelOptions): BoxModel {
  const { structure, dimensions } = options;
  const pieces = foldablePieces(structure, dimensions, options.formulaVersion);
  const disposables: { dispose(): void }[] = [];
  const paper = PAPER[options.theme];
  // Inside of the folded panels (seen from behind), and of the pillow end flaps (seen from both sides).
  const inside = new THREE.MeshStandardMaterial({
    color: paper.inside,
    roughness: 0.92,
    metalness: 0,
    side: THREE.BackSide,
    envMapIntensity: 0.5,
    // Light bounces inside a paper box: the walls glow a little instead of turning grey in their own shadow.
    emissive: new THREE.Color(paper.inside),
    emissiveIntensity: 0.35,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const flapPaper = new THREE.MeshStandardMaterial({ color: paper.outside, roughness: 0.9, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.5 });
  const { edge: edgeColor, ...finish } = FINISH[options.theme];
  const edges = new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: options.theme === "forest" ? 0.5 : 0.32 });
  disposables.push(inside, flapPaper, edges);
  const foil = options.theme === "gold_foil";
  const printedOf = new Map<string, THREE.MeshPhysicalMaterial[]>();
  const makePrinted: MakePrinted = (map, side, panelId) => {
    const material = new THREE.MeshPhysicalMaterial({
      ...finish,
      map,
      side,
      bumpMap: options.surface?.bumpMap ?? null,
      bumpScale: options.surface?.bumpScale ?? 0,
      roughnessMap: foil ? null : (options.surface?.roughnessMap ?? null),
      emissive: HOVER_GLOW,
      emissiveIntensity: 0,
      // The edge hairlines sit exactly on the panels: the faces step back a little so the lines win the depth test.
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    printedOf.set(panelId, [...(printedOf.get(panelId) ?? []), material]);
    return material;
  };
  let lit: string | null = null;
  const highlight = (panelId: string | null) => {
    if (panelId === lit) return;
    printedOf.get(lit ?? "")?.forEach((material) => (material.emissiveIntensity = 0));
    printedOf.get(panelId ?? "")?.forEach((material) => (material.emissiveIntensity = 0.14));
    lit = panelId;
  };

  // Images of the design, loaded once; textures redraw when they arrive.
  const images = new Map<string, HTMLImageElement | null>();
  const textures = new Map<string, PanelTexture>();
  for (const piece of pieces) {
    for (const panel of piece.geometry.panels) {
      const region =
        structure === "pillow"
          ? { x: panel.bounds.x, y: pillowShapeOf(dimensions).endDepth, width: panel.bounds.width, height: pillowShapeOf(dimensions).bodyLength }
          : panel.bounds;
      const texture = panelTexture(panel, region, options, images, "outside", piece.geometry.panels);
      textures.set(panel.id, texture);
      disposables.push(texture.texture);
    }
  }
  let disposed = false;
  const redrawAll = () => {
    if (disposed) return;
    textures.forEach((t) => t.redraw());
    options.onChange?.();
  };
  // One image per file and colour swaps (recoloured SVG logos, docs-old/23 S14).
  const sources = new Map(options.elements.filter((el) => IMAGE_TYPES.has(el.type) && isFileUrl(el.content)).map((el) => [elementImageKey(el), el] as const));
  for (const [key, el] of sources) {
    void recoloredSrc(el.content, el.style?.colorMap).then((src) => {
      if (disposed) return;
      const image = new Image();
      image.crossOrigin = "anonymous"; // a storage image without CORS would taint the WebGL texture: it is then skipped
      image.onload = () => {
        images.set(key, image);
        redrawAll();
      };
      image.onerror = () => images.set(key, null);
      image.src = src.startsWith("data:") ? src : new URL(src, location.href).href;
    });
  }
  if (typeof document !== "undefined" && document.fonts) void document.fonts.ready.then(redrawAll);

  const group = new THREE.Group();
  const t = dimensions.paperThickness;

  if (structure === "pillow") {
    const model = pillowModel(dimensions, pieces[0].geometry, textures, makePrinted, flapPaper, disposables);
    group.add(model.group);
    return {
      group,
      size: model.size,
      update: (progress) => model.update(progress),
      highlight,
      dispose: () => {
        disposed = true;
        disposables.forEach((d) => d.dispose());
      },
    };
  }

  // The inside print (docs-old/23 S5): a textured copy of the inside paper for each panel, when the design prints there.
  const insideMaterials = new Map<string, THREE.Material>();
  if (printsInside(options.elements)) {
    for (const piece of pieces) {
      for (const panel of piece.geometry.panels) {
        const texture = panelTexture(panel, panel.bounds, options, images, "inside", piece.geometry.panels);
        textures.set(`inside:${panel.id}`, texture);
        const material = inside.clone() as THREE.MeshStandardMaterial;
        material.color = new THREE.Color("#FFFFFF");
        material.emissiveIntensity = 0.15;
        material.map = texture.texture;
        insideMaterials.set(panel.id, material);
        disposables.push(texture.texture, material);
      }
    }
  }
  const insideOf = (panelId: string) => insideMaterials.get(panelId) ?? inside;
  // Pieces that fold; the partitions of an insert have no hinges and are placed in the tray instead.
  const foldable = pieces.filter((piece) => piece.geometry.orientation);
  const loose = structure === "insert" ? pieces.find((piece) => !piece.geometry.orientation) : undefined;
  const dividers = loose ? placedDividers(loose.geometry, dimensions, textures, makePrinted, insideOf, edges, disposables) : null;
  if (dividers) group.add(dividers);

  // 350ml takeaway cups inside cup-carrier holes
  const showCups = options.showCups ?? (dimensions.showCups !== false);
  const carrierCups = structure === "cup-carrier" ? placedCarrierCups(dimensions, disposables, showCups) : null;
  const carrierElevation = structure === "cup-carrier" && showCups ? STANDARD_350ML_Y_SEAT : 0;
  if (carrierCups) {
    carrierCups.setVisible(showCups);
    group.add(carrierCups.group);
  }

  const paperCore = new THREE.MeshStandardMaterial({
    color: new THREE.Color(edgeColor || "#C8BCA8"),
    roughness: 0.92,
    metalness: 0,
    side: THREE.DoubleSide,
    polygonOffset: false,
  });
  disposables.push(paperCore);

  const folded = foldable.map((piece) =>
    foldedPiece(
      piece.geometry,
      textures,
      makePrinted,
      insideOf,
      edges,
      paperCore,
      dimensions.paperThickness,
      disposables,
      structure === "cup-carrier" ? carrierElevation : 0
    )
  );
  folded.forEach((piece) => group.add(piece.group));
  const sizes = foldable.map((piece) => {
    const frame = boxFrameOf(piece.geometry)!;
    const corners = piece.geometry.panels.flatMap((panel) => {
      const m = multiply(frame, panelTransforms(piece.geometry, 1)[panel.id]);
      const { x, y, width, height } = panel.bounds;
      return [
        [x, y, 0],
        [x + width, y + height, 0],
        [x + width, y, 0],
        [x, y + height, 0],
      ].map((p) => transformPoint(m, p as [number, number, number]));
    });
    const extent = (i: number) => Math.max(...corners.map((p) => p[i])) - Math.min(...corners.map((p) => p[i]));
    return { x: extent(0), y: extent(1), z: extent(2) };
  });

  let lastProgress = 1;
  let lastOpen = 0;
  const update = (progress: number, open: number) => {
    lastProgress = progress;
    lastOpen = open;
    const progressOf = stagedProgress(structure, progress, open);
    folded.forEach((piece) => piece.update(progressOf));
    if (carrierCups && folded[0]) {
      const baseMatrix = folded[0].getPanelMatrix("carrier_base");
      if (baseMatrix) {
        carrierCups.update(baseMatrix, progress);
      }
    }
    if (dividers) {
      // The partitions drop into the tray once its walls stand; "open" lifts them out.
      const settle = clamp01((progress - 0.7) / 0.3);
      dividers.visible = progress > 0.55;
      dividers.position.y = ((1 - settle) * 1.5 + open * 1.1) * dimensions.height;
    }
    if (structure === "lid-base") {
      // The lid top rests on the rim of the base (mid-planes one thickness apart), lifted while open or folding.
      const [base, lid] = sizes;
      const lift = mix((1 - progress) * 1.4, 0.8, open);
      folded[1].group.position.y = base.y + t - lid.y + lift * dimensions.height;
    } else if (structure === "sleeve-drawer") {
      const [sleeve, drawer] = sizes;
      const slide = mix(1 - progress, 0.75, open);
      folded[1].group.position.set(slide * sleeve.x * 0.7, (sleeve.y - drawer.y) / 2, 0);
    }
  };

  const size = sizes.reduce((all, s) => ({ x: Math.max(all.x, s.x), y: Math.max(all.y, s.y), z: Math.max(all.z, s.z) }));
  if (structure === "cup-carrier" && showCups) {
    size.y += STANDARD_350ML_Y_SEAT;
  }
  return {
    group,
    size,
    update,
    setThickness(thicknessMm: number) {
      folded.forEach((piece) => piece.setThickness?.(thicknessMm));
      options.onChange?.();
    },
    setCupsVisible(visible: boolean) {
      if (carrierCups) {
        carrierCups.setVisible(visible);
      }
      if (structure === "cup-carrier") {
        const newElevation = visible ? STANDARD_350ML_Y_SEAT : 0;
        folded.forEach((piece) => piece.setGroundElevation?.(newElevation));
        update(lastProgress, lastOpen);
      }
      options.onChange?.();
    },
    highlight,
    dispose: () => {
      disposed = true;
      disposables.forEach((d) => d.dispose());
    },
  };
}
