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

  const [centre, middle, edge] = backdrop.mockup;
  const light = ctx.createRadialGradient(width / 2, height * 0.32, 0, width / 2, height * 0.32, Math.max(width, height) * 0.85);
  light.addColorStop(0, centre);
  light.addColorStop(0.55, middle);
  light.addColorStop(1, edge);
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, width, height);

  // The stage frame keeps its aspect; it fills most of the image, a little low like a product shot.
  const scale = Math.min((width * 0.92) / frame.width, (height * 0.86) / frame.height);
  const w = frame.width * scale;
  const h = frame.height * scale;
  ctx.drawImage(frame, (width - w) / 2, (height - h) / 2 + height * 0.03, w, h);

  ctx.font = `600 ${Math.round(height * 0.022)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = backdrop.dark ? "rgba(255,255,255,0.55)" : "rgba(29,41,61,0.45)";
  ctx.fillText("Thiết kế với WrapFit", width - height * 0.035, height - height * 0.03);

  return new Promise((resolve, reject) =>
    canvas.toBlob((png) => (png ? resolve(png) : reject(new Error("PNG encoding failed"))), "image/png")
  );
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
