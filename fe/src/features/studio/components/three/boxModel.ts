"use client";

import * as THREE from "three";
import {
  boxFrameOf,
  CURRENT_FORMULA_VERSION,
  generateDielinePieces,
  matchesPanel,
  multiply,
  panelTransforms,
  pillowShapeOf,
  TEXT_FONT_WEIGHT,
  transformPoint,
  type BoxDimensions,
  type CanvasElement,
  type DielineGeometry,
  type DielinePiece,
  type Mat4,
  type PanelFace,
} from "@wrapfit/shared";
import { cssFontFamily, layoutBoxText } from "../canvas/boxText";

/**
 * 3D model of a box built from its dieline (docs/12 Phase 8, H6): every printable panel is a sheet of paper folded on
 * the hinges the formulas declare (`PanelFace.fold`, `panelTransforms` of @wrapfit/shared), so the model has exactly
 * the size of the printed box; the pillow box, whose faces do not fold flat, is built from `pillowShapeOf`. Each panel
 * shows the elements placed on it, drawn like the 2D canvas. Flaps and glue tabs are not modelled (they sit inside).
 */

export type BoxMaterialTheme = "kraft" | "ivory" | "forest" | "gold_foil";

/** Printed side and inside of the paper for each look of the editor. */
const PAPER: Record<BoxMaterialTheme, { outside: string; inside: string; ink: string }> = {
  ivory: { outside: "#FAF6EE", inside: "#EFE8DC", ink: "#1C1917" },
  kraft: { outside: "#D9B897", inside: "#CDAA85", ink: "#2B1E16" },
  forest: { outside: "#1A362B", inside: "#E8E2D6", ink: "#F5E7B2" },
  gold_foil: { outside: "#D4AF37", inside: "#EFE8DC", ink: "#382205" },
};

/** Panel that carries the showcase decoration when there is no design (home page, intro). */
const MAIN_PANEL = ["panel_front", "lid_top", "sleeve_top", "pillow_front"];
const IMAGE_TYPES = new Set<CanvasElement["type"]>(["image", "logo", "pattern"]);
const isFileUrl = (content: string) => /^(https?:\/\/|\/)/.test(content);

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
  /** Called after a texture changed (image or font loaded): the caller renders a frame. */
  onChange?: () => void;
}

type MakePrinted = (map: THREE.Texture | null, side: THREE.Side, panelId: string) => THREE.MeshPhysicalMaterial;

/** Finish of the printed side: matte paper with a soft sheen, velvet soft-touch for the forest board, foil for gold. */
const FINISH: Record<BoxMaterialTheme, THREE.MeshPhysicalMaterialParameters & { edge: string }> = {
  ivory: { roughness: 0.74, metalness: 0, sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color("#FFFFFF"), envMapIntensity: 0.55, edge: "#B8AC98" },
  kraft: { roughness: 0.9, metalness: 0, sheen: 0.25, sheenRoughness: 0.7, sheenColor: new THREE.Color("#FFF1DC"), envMapIntensity: 0.45, edge: "#8C6B4B" },
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

/** Image drawn inside its box keeping its proportions, centred (like `preserveAspectRatio="xMidYMid meet"`). */
function drawContained(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const ratio = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const w = image.naturalWidth * ratio;
  const h = image.naturalHeight * ratio;
  ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
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
 * Texture of one panel. `region` is the sheet rectangle the texture covers (the panel itself, or for a pillow face
 * the whole face between its tips); elements are placed in panel coordinates, like on the 2D canvas.
 */
function panelTexture(
  panel: PanelFace,
  region: Rect,
  options: BoxModelOptions,
  images: Map<string, HTMLImageElement | null>
): PanelTexture {
  const scale = Math.min(8, Math.max(2, 2048 / Math.max(region.width, region.height)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(region.width * scale));
  canvas.height = Math.max(2, Math.round(region.height * scale));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const paper = PAPER[options.theme];
  const elements = options.elements.filter((el) => matchesPanel(panel, el.panelId));

  const redraw = () => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = paper.outside;
    ctx.fillRect(0, 0, region.width, region.height);
    if (options.pattern) drawPreset(ctx, options.pattern, region.width, region.height);
    ctx.translate(panel.bounds.x - region.x, panel.bounds.y - region.y);

    // Backgrounds first, like the print file.
    const ordered = [...elements].sort((a, b) => Number(b.type === "pattern") - Number(a.type === "pattern"));
    for (const el of ordered) {
      ctx.save();
      ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
      ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
      ctx.translate(-el.width / 2, -el.height / 2);
      if (IMAGE_TYPES.has(el.type)) {
        const image = images.get(el.content);
        if (image) drawContained(ctx, image, el.width, el.height);
      } else if (el.type === "text") {
        const box = layoutBoxText(el);
        ctx.font = `${TEXT_FONT_WEIGHT} ${box.fontSizeMm}px ${cssFontFamily(box.font)}`;
        ctx.fillStyle = el.style?.color || paper.ink;
        ctx.textBaseline = "alphabetic";
        ctx.textAlign = "left";
        for (const line of box.lines) if (line.text) ctx.fillText(line.text, line.x, line.baseline);
      }
      ctx.restore();
    }
    if (options.decoration && MAIN_PANEL.includes(panel.id)) drawDecoration(ctx, panel, options.decoration, options.theme);
    texture.needsUpdate = true;
  };
  redraw();
  return { texture, redraw };
}

// ---------------------------------------------------------------------------------------------------------------
// Geometry

/** A panel as two triangles in sheet coordinates (printed side towards −z, see fold.ts), texture upright. */
function panelGeometry({ x, y, width, height }: Rect): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([x, y, 0, x + width, y, 0, x + width, y + height, 0, x, y + height, 0], 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2));
  geometry.setIndex([0, 2, 1, 0, 3, 2]);
  geometry.computeVertexNormals();
  return geometry;
}

/** Progress of each panel: walls first, then the lid and bottom of a tuck-top box (open: lid swings back past upright). */
function stagedProgress(structure: string, progress: number, open: number) {
  return (panel: PanelFace) => {
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
  inside: THREE.Material,
  edges: THREE.LineBasicMaterial,
  disposables: { dispose(): void }[]
) {
  const group = new THREE.Group();
  const frame = boxFrameOf(geometry)!;
  // Rotation only: the shift to the ground is recomputed for each fold state.
  const rotation: Mat4 = [...frame.slice(0, 12), 0, 0, 0, 1];
  const meshes = geometry.panels.map((panel) => {
    const shape = panelGeometry(panel.bounds);
    const printed = makePrinted(textures.get(panel.id)?.texture ?? null, THREE.FrontSide, panel.id);
    const front = new THREE.Mesh(shape, printed);
    const back = new THREE.Mesh(shape, inside);
    // Hairline on the panel edges: folds and cut edges read crisply, like a pressed crease.
    const outline = new THREE.EdgesGeometry(shape);
    const edge = new THREE.LineSegments(outline, edges);
    edge.raycast = () => {};
    for (const mesh of [front, back]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = panel.id;
    }
    for (const object of [front, back, edge]) {
      object.matrixAutoUpdate = false;
      group.add(object);
    }
    disposables.push(shape, printed, outline);
    return { panel, front, back, edge };
  });

  const update = (progressOf: (panel: PanelFace) => number) => {
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
    const shift: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -(min[0] + max[0]) / 2, -min[1], -(min[2] + max[2]) / 2, 1];
    meshes.forEach(({ front, back, edge }, i) => {
      const matrix = toMatrix(multiply(shift, placed[i]));
      for (const mesh of [front, back, edge]) {
        mesh.matrix.copy(matrix);
        mesh.matrixWorldNeedsUpdate = true;
      }
    });
  };
  return { group, update };
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
      const texture = panelTexture(panel, region, options, images);
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
  for (const url of new Set(options.elements.filter((el) => IMAGE_TYPES.has(el.type) && isFileUrl(el.content)).map((el) => el.content))) {
    const image = new Image();
    image.crossOrigin = "anonymous"; // a storage image without CORS would taint the WebGL texture: it is then skipped
    image.onload = () => {
      images.set(url, image);
      redrawAll();
    };
    image.onerror = () => images.set(url, null);
    image.src = new URL(url, location.href).href;
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

  const folded = pieces.map((piece) => foldedPiece(piece.geometry, textures, makePrinted, inside, edges, disposables));
  folded.forEach((piece) => group.add(piece.group));
  const sizes = pieces.map((piece) => {
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

  const update = (progress: number, open: number) => {
    const progressOf = stagedProgress(structure, progress, open);
    folded.forEach((piece) => piece.update(progressOf));
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
  return {
    group,
    size,
    update,
    highlight,
    dispose: () => {
      disposed = true;
      disposables.forEach((d) => d.dispose());
    },
  };
}
