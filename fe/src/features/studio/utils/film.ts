/* ds-artwork: the folding-box clip paints the scene and a small signature, like the mockups (docs/15 §2, docs/23 S19). */
import { buildGifPalette, GifWriter } from "@wrapfit/shared";
import type { Backdrop } from "@/features/studio/components/three/backdrops";
import { paintScene, paintSignature } from "@/features/studio/utils/mockup";

/** Length of the clip, seconds (docs/23 S19: 6–8 s). */
export const CLIP_SECONDS = 7;
/** Largest file worth sharing in a chat or a shop page. */
export const MAX_CLIP_BYTES = 10 * 1024 * 1024;

/** Scripted camera and fold of the 3D stage (InteractiveFoldingBox3D `filmRef`). */
export interface FilmApi {
  /** Takes the stage over (the live view pauses); false when no box is shown yet. */
  start(): boolean;
  /** Poses the box at `t` (0 → 1 over the clip), renders, returns the WebGL canvas: read it at once. */
  frame(t: number): HTMLCanvasElement;
  /** Gives the stage back as it was. */
  end(): void;
}

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/**
 * The clip: the flat sheet, folded closed by mid-clip, a moment closed, then the lid opens; the camera turns slowly
 * around the box the whole time.
 */
export function filmPose(t: number): { progress: number; open: number; yaw: number } {
  return {
    progress: smooth((t - 0.06) / 0.5),
    open: smooth((t - 0.72) / 0.16),
    yaw: -0.75 + 1.5 * t,
  };
}

/** Video formats the browser can record, best first (Safari records MP4). */
export function videoFormat(): { mimeType: string; extension: "webm" | "mp4" } | null {
  if (typeof MediaRecorder === "undefined" || typeof HTMLCanvasElement.prototype.captureStream !== "function") return null;
  for (const mimeType of ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"]) {
    if (MediaRecorder.isTypeSupported(mimeType)) return { mimeType, extension: mimeType.startsWith("video/mp4") ? "mp4" : "webm" };
  }
  return null;
}

/** One frame of the clip on a square canvas: the scene, the box cut square out of the stage frame, the signature. */
function paintFrame(ctx: CanvasRenderingContext2D, frame: HTMLCanvasElement, backdrop: Backdrop, size: number) {
  paintScene(ctx, backdrop, size, size);
  const side = Math.min(frame.width, frame.height);
  ctx.drawImage(frame, (frame.width - side) / 2, (frame.height - side) / 2, side, side, 0, 0, size, size);
  paintSignature(ctx, backdrop, size, size);
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, ms)));

/**
 * Records the clip as a video in real time (MediaRecorder on a canvas stream), `size` × `size` px. The stage plays the
 * clip while it records.
 */
export async function recordVideo(
  film: FilmApi,
  backdrop: Backdrop,
  { size = 720, fps = 30, onProgress }: { size?: number; fps?: number; onProgress?: (done: number) => void } = {}
): Promise<{ blob: Blob; extension: "webm" | "mp4" }> {
  const format = videoFormat();
  if (!format) throw new Error("Video recording is not supported");
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx || !film.start()) throw new Error("Nothing to record");
  try {
    // Frames are pushed by hand when the browser allows it, so the video holds exactly the frames drawn.
    const manual = typeof (window as { CanvasCaptureMediaStreamTrack?: unknown }).CanvasCaptureMediaStreamTrack !== "undefined";
    const stream = canvas.captureStream(manual ? 0 : fps);
    const track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };
    // About 6 Mbit/s: 7 s stays near 5 MB.
    const recorder = new MediaRecorder(stream, { mimeType: format.mimeType, videoBitsPerSecond: 6_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
    const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));
    const total = Math.round(CLIP_SECONDS * fps);
    paintFrame(ctx, film.frame(0), backdrop, size);
    recorder.start();
    const startedAt = performance.now();
    for (let i = 0; i <= total; i++) {
      paintFrame(ctx, film.frame(i / total), backdrop, size);
      track.requestFrame?.();
      onProgress?.(i / total);
      await wait(startedAt + ((i + 1) * 1000) / fps - performance.now());
    }
    recorder.stop();
    await stopped;
    stream.getTracks().forEach((t) => t.stop());
    return { blob: new Blob(chunks, { type: format.mimeType.split(";")[0] }), extension: format.extension };
  } finally {
    film.end();
  }
}

/** Builds the clip as an animated GIF, `size` × `size` px at `fps` (frames are rendered as fast as the page allows). */
export async function recordGif(
  film: FilmApi,
  backdrop: Backdrop,
  { size = 400, fps = 12, onProgress }: { size?: number; fps?: number; onProgress?: (done: number) => void } = {}
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || !film.start()) throw new Error("Nothing to record");
  const total = Math.round(CLIP_SECONDS * fps);
  const frames: Uint8ClampedArray[] = [];
  try {
    for (let i = 0; i < total; i++) {
      paintFrame(ctx, film.frame(i / (total - 1)), backdrop, size);
      frames.push(ctx.getImageData(0, 0, size, size).data);
      onProgress?.((0.5 * (i + 1)) / total);
      if (i % 4 === 3) await wait(0);
    }
  } finally {
    film.end();
  }
  // One palette for the whole clip, from a frame in six (enough to see every colour of the box and the scene).
  const palette = buildGifPalette(frames.filter((_, i) => i % 6 === 0 || i === frames.length - 1), 2);
  const writer = new GifWriter(size, size, 1000 / fps, palette);
  for (const [i, pixels] of frames.entries()) {
    writer.add(pixels);
    onProgress?.(0.5 + (0.5 * (i + 1)) / total);
    if (i % 3 === 2) await wait(0);
  }
  return new Blob([writer.finish() as Uint8Array<ArrayBuffer>], { type: "image/gif" });
}
