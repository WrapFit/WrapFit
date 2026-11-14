/* ds-artwork: mockup images paint the scene and a small signature (docs/15_DESIGN_SYSTEM.md §2). */
import type { Backdrop } from "@/features/studio/components/three/backdrops";

export interface MockupFormat {
  id: "square" | "portrait" | "landscape";
  label: string;
  /** Where it is used. */
  hint: string;
  width: number;
  height: number;
}

/** Sizes of the social networks and shops (Facebook, Instagram, Shopee: 1080 px). */
export const MOCKUP_FORMATS: readonly MockupFormat[] = [
  { id: "square", label: "Vuông 1:1", hint: "Bài đăng, Shopee", width: 1080, height: 1080 },
  { id: "portrait", label: "Dọc 4:5", hint: "Instagram, Facebook", width: 1080, height: 1350 },
  { id: "landscape", label: "Ngang 16:9", hint: "Website, slide", width: 1920, height: 1080 },
];

/**
 * A product photo of the box: the scene's light as a radial gradient, the rendered box (WebGL frame with a transparent
 * background) in the middle, a small signature. `frame` is drawn at once, before any await: the WebGL drawing buffer
 * is not kept between frames.
 */
export function renderMockup(frame: HTMLCanvasElement, backdrop: Backdrop, format: MockupFormat): Promise<Blob> {
  const { width, height } = format;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas 2D unavailable"));

  paintScene(ctx, backdrop, width, height);

  // Only the box (and its shadow), cut out of the wide stage frame: each format then frames it at its own aspect.
  // Pasting the whole frame made the three sizes the same small landscape picture on more or less background.
  const box = opaqueBounds(frame);
  const scale = Math.min((width * 0.9) / box.width, (height * 0.86) / box.height);
  const w = box.width * scale;
  const h = box.height * scale;
  ctx.drawImage(frame, box.x, box.y, box.width, box.height, (width - w) / 2, (height - h) / 2 + height * 0.02, w, h);

  paintSignature(ctx, backdrop, width, height);

  return new Promise((resolve, reject) =>
    canvas.toBlob((png) => (png ? resolve(png) : reject(new Error("PNG encoding failed"))), "image/png")
  );
}

/** The scene's light as a radial gradient over the whole canvas (mockups and the folding-box clip). */
export function paintScene(ctx: CanvasRenderingContext2D, backdrop: Backdrop, width: number, height: number) {
  const [centre, middle, edge] = backdrop.mockup;
  const light = ctx.createRadialGradient(width / 2, height * 0.32, 0, width / 2, height * 0.32, Math.max(width, height) * 0.85);
  light.addColorStop(0, centre);
  light.addColorStop(0.55, middle);
  light.addColorStop(1, edge);
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, width, height);
}

/** "Thiết kế với WrapFit" in the bottom right corner. */
export function paintSignature(ctx: CanvasRenderingContext2D, backdrop: Backdrop, width: number, height: number) {
  ctx.font = `600 ${Math.round(height * 0.022)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = backdrop.dark ? "rgba(255,255,255,0.55)" : "rgba(29,41,61,0.45)";
  ctx.fillText("Thiết kế với WrapFit", width - height * 0.035, height - height * 0.03);
}

/** Rectangle of the opaque pixels of `frame` (the box, not its soft shadow) (the whole frame when it has none or cannot be read). */
function opaqueBounds(frame: HTMLCanvasElement): { x: number; y: number; width: number; height: number } {
  const whole = { x: 0, y: 0, width: frame.width, height: frame.height };
  // Scanned on a small copy: fast, and a few pixels of slack do not matter.
  const step = Math.max(1, Math.ceil(Math.max(frame.width, frame.height) / 400));
  const sw = Math.ceil(frame.width / step);
  const sh = Math.ceil(frame.height / step);
  const probe = document.createElement("canvas");
  probe.width = sw;
  probe.height = sh;
  const pctx = probe.getContext("2d", { willReadFrequently: true });
  if (!pctx || sw === 0 || sh === 0) return whole;
  pctx.drawImage(frame, 0, 0, sw, sh);
  let data: Uint8ClampedArray;
  try {
    data = pctx.getImageData(0, 0, sw, sh).data;
  } catch {
    return whole;
  }
  let minX = sw, minY = sh, maxX = -1, maxY = -1;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      // Above the ground shadow (ShadowMaterial, opacity 0.18 ≈ alpha 46): the box itself is opaque.
      if (data[(y * sw + x) * 4 + 3] > 128) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return whole;
  // Back to frame pixels, with room around the box for its soft shadow (never a hard edge cut through it).
  const padX = Math.ceil((maxX - minX + 1) * 0.3);
  const padY = Math.ceil((maxY - minY + 1) * 0.3);
  const x = Math.max(0, (minX - padX) * step);
  const y = Math.max(0, (minY - padY) * step);
  return {
    x,
    y,
    width: Math.min(frame.width, (maxX + 1 + padX) * step) - x,
    height: Math.min(frame.height, (maxY + 1 + padY) * step) - y,
  };
}

/** Saves a blob under this file name (the browser's download). */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** File name from a title: no accents, no spaces. */
export const fileSlug = (title: string) =>
  title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "hop-qua";
