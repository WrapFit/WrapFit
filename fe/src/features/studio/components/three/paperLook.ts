/* ds-artwork: generated paper grain and cut-edge layers of the 3D box draw real paper colours (docs/13_DESIGN_SYSTEM.md §2). */
import * as THREE from "three";
import type { BoxMaterialTheme } from "./boxModel";

/**
 * Generated look of each paper of the editor (docs/21 S5): the grain printed into the colour of every face, and the
 * layers seen on a cut edge. Drawn on canvases at run time: no photo of anyone's paper is shipped.
 */

/** Width of one grain tile on the sheet, mm. The tile repeats in sheet coordinates, so every face has the same grain. */
export const GRAIN_TILE_MM = 40;
const GRAIN_PX = 512;
/** Length of one core tile along a cut edge, mm. */
export const CORE_TILE_MM = 6;

type Side = "outside" | "inside";

/** Fibres and flecks of a paper side; `null`: a smooth coated or metal face that shows none. */
interface GrainRecipe {
  /** Short fibres: [count per tile, colour, length range in mm]. */
  fibres: Array<[number, string, number, number]>;
  /** Round flecks of recycled board: [count per tile, colour, radius range in mm]. */
  flecks?: Array<[number, string, number, number]>;
  /** Soft cloudy patches (the "formation" of the sheet): [count per tile, darker, lighter alpha]. */
  clouds?: [number, number];
}

const RECIPES: Record<BoxMaterialTheme, Record<Side, GrainRecipe | null>> = {
  kraft: {
    outside: {
      fibres: [
        [1100, "rgba(92, 58, 28, 0.2)", 0.4, 2.6],
        [600, "rgba(255, 238, 210, 0.16)", 0.4, 2],
      ],
      clouds: [30, 0.04],
    },
    inside: {
      fibres: [
        [1100, "rgba(92, 58, 28, 0.22)", 0.4, 2.6],
        [500, "rgba(255, 238, 210, 0.14)", 0.4, 2],
      ],
      clouds: [30, 0.045],
    },
  },
  ivory: {
    outside: { fibres: [[320, "rgba(170, 150, 120, 0.07)", 0.3, 1.6]] },
    inside: { fibres: [[420, "rgba(150, 132, 104, 0.09)", 0.3, 1.8]], clouds: [16, 0.02] },
  },
  // Coated white top, recycled grey back with its flecks.
  duplex: {
    outside: { fibres: [[160, "rgba(140, 140, 140, 0.04)", 0.2, 1]] },
    inside: {
      fibres: [
        [500, "rgba(70, 70, 70, 0.14)", 0.3, 1.8],
        [300, "rgba(235, 235, 230, 0.16)", 0.3, 1.4],
      ],
      flecks: [
        [700, "rgba(48, 48, 50, 0.3)", 0.05, 0.2],
        [40, "rgba(40, 70, 150, 0.35)", 0.05, 0.16],
        [30, "rgba(160, 50, 40, 0.3)", 0.05, 0.14],
      ],
      clouds: [18, 0.028],
    },
  },
  // Wrapped greyboard: smooth art paper outside, the board inside.
  rigid: {
    outside: { fibres: [[200, "rgba(150, 140, 120, 0.05)", 0.3, 1.2]] },
    inside: {
      fibres: [[700, "rgba(40, 38, 34, 0.16)", 0.3, 2]],
      flecks: [
        [900, "rgba(30, 30, 28, 0.32)", 0.05, 0.22],
        [300, "rgba(220, 216, 206, 0.3)", 0.05, 0.18],
      ],
      clouds: [20, 0.035],
    },
  },
  // Soft-touch dark board: a faint pale fibre here and there.
  forest: {
    outside: { fibres: [[380, "rgba(255, 255, 255, 0.05)", 0.3, 1.6]] },
    inside: { fibres: [[420, "rgba(150, 132, 104, 0.08)", 0.3, 1.8]] },
  },
  gold_foil: {
    outside: null,
    inside: { fibres: [[420, "rgba(150, 132, 104, 0.08)", 0.3, 1.8]] },
  },
};

/** Draws `paint` at (x, y) and again across the tile's edges, so the tile repeats without a seam. */
function wrapped(size: number, x: number, y: number, reach: number, paint: (x: number, y: number) => void) {
  for (const dx of [-size, 0, size]) {
    for (const dy of [-size, 0, size]) {
      const px = x + dx;
      const py = y + dy;
      if (px > -reach && px < size + reach && py > -reach && py < size + reach) paint(px, py);
    }
  }
}

const grainCache = new Map<string, HTMLCanvasElement | null>();

/** Transparent tile of the paper's grain, GRAIN_TILE_MM wide, drawn once per paper side. */
export function paperGrain(theme: BoxMaterialTheme, side: Side): HTMLCanvasElement | null {
  const key = `${theme}:${side}`;
  if (grainCache.has(key)) return grainCache.get(key) ?? null;
  const recipe = RECIPES[theme][side];
  if (!recipe || typeof document === "undefined") {
    grainCache.set(key, null);
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = GRAIN_PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const pxPerMm = GRAIN_PX / GRAIN_TILE_MM;
  const random = (min: number, max: number) => min + Math.random() * (max - min);

  if (recipe.clouds) {
    const [count, alpha] = recipe.clouds;
    for (let i = 0; i < count; i++) {
      const radius = random(4, 10) * pxPerMm;
      const dark = Math.random() > 0.5;
      wrapped(GRAIN_PX, random(0, GRAIN_PX), random(0, GRAIN_PX), radius, (x, y) => {
        const cloud = ctx.createRadialGradient(x, y, 0, x, y, radius);
        cloud.addColorStop(0, dark ? `rgba(0, 0, 0, ${alpha})` : `rgba(255, 255, 255, ${alpha})`);
        cloud.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = cloud;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      });
    }
  }
  ctx.lineCap = "round";
  for (const [count, color, minMm, maxMm] of recipe.fibres) {
    ctx.strokeStyle = color;
    for (let i = 0; i < count; i++) {
      const length = random(minMm, maxMm) * pxPerMm;
      const angle = random(0, Math.PI * 2);
      const bend = random(-0.3, 0.3) * length;
      ctx.lineWidth = random(0.6, 1.4);
      wrapped(GRAIN_PX, random(0, GRAIN_PX), random(0, GRAIN_PX), length, (x, y) => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + Math.cos(angle) * length * 0.5 + bend, y + Math.sin(angle) * length * 0.5 - bend, x + Math.cos(angle) * length, y + Math.sin(angle) * length);
        ctx.stroke();
      });
    }
  }
  for (const [count, color, minMm, maxMm] of recipe.flecks ?? []) {
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const radius = random(minMm, maxMm) * pxPerMm;
      wrapped(GRAIN_PX, random(0, GRAIN_PX), random(0, GRAIN_PX), radius, (x, y) => {
        ctx.beginPath();
        ctx.ellipse(x, y, radius, radius * random(0.5, 1), random(0, Math.PI), 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
  grainCache.set(key, canvas);
  return canvas;
}

/**
 * Fills the sheet rectangle `region` (mm, the canvas already scaled to mm) with the grain, anchored to the sheet so
 * that neighbouring faces line up across a fold.
 */
export function fillGrain(ctx: CanvasRenderingContext2D, grain: HTMLCanvasElement, region: { x: number; y: number; width: number; height: number }) {
  const pattern = ctx.createPattern(grain, "repeat");
  if (!pattern) return;
  const mmPerPx = GRAIN_TILE_MM / grain.width;
  pattern.setTransform(new DOMMatrix().translate(-region.x, -region.y).scale(mmPerPx));
  ctx.save();
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, region.width, region.height);
  ctx.restore();
}

const plainCache = new Map<string, HTMLCanvasElement>();

/**
 * A repeating tile of unprinted paper: its colour with its grain, GRAIN_TILE_MM wide. The inside of a box that prints
 * nothing there wears it instead of a flat colour. Null for a paper side without grain.
 */
export function plainPaperTexture(theme: BoxMaterialTheme, side: Side, color: string): THREE.CanvasTexture | null {
  const grain = paperGrain(theme, side);
  if (!grain) return null;
  const key = `${theme}:${side}:${color}`;
  let canvas = plainCache.get(key);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = grain.width;
    canvas.height = grain.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(grain, 0, 0);
    plainCache.set(key, canvas);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Layers across a cut edge, from the printed side to the inside: colour and where each one ends (0–1). */
const CORE_LAYERS: Record<BoxMaterialTheme, Array<[string, number]>> = {
  ivory: [["#F1ECE2", 1]],
  kraft: [["#B48F67", 1]],
  duplex: [["#FBFAF6", 0.14], ["#A7A9A4", 1]],
  rigid: [["#F4F1EA", 0.1], ["#8A867E", 0.9], ["#D6D0C4", 1]],
  forest: [["#1A362B", 0.12], ["#E1DBCE", 1]],
  gold_foil: [["#C9A227", 0.08], ["#ECE5D8", 1]],
};

const coreCache = new Map<BoxMaterialTheme, HTMLCanvasElement>();

/**
 * Texture of a cut edge: the paper's layers across its thickness (v: 0 at the printed side) and cut fibres along it
 * (u: one tile per CORE_TILE_MM). The rim geometry carries matching UVs.
 */
export function paperCoreTexture(theme: BoxMaterialTheme): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  let canvas = coreCache.get(theme);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // Canvas textures are flipped: v = 0 (the printed side) is the bottom row of the canvas.
    let from = 0;
    for (const [color, to] of CORE_LAYERS[theme]) {
      ctx.fillStyle = color;
      ctx.fillRect(0, canvas.height * (1 - to), canvas.width, canvas.height * (to - from) + 1);
      from = to;
    }
    // Cut fibres: thin streaks across the thickness, lighter and darker than the layer.
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";
      const x = Math.random() * canvas.width;
      const h = canvas.height * (0.2 + Math.random() * 0.8);
      ctx.fillRect(x, Math.random() * (canvas.height - h), 1 + Math.random(), h);
    }
    coreCache.set(theme, canvas);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}
