"use client";

import { Check, Move } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Button, Dialog, Slider } from "@/components/ui";
import { cn } from "@/utils/helpers";

/** Side of the saved avatar, in pixels. */
const OUTPUT = 512;
/** Side of the crop preview on screen. */
const VIEW = 256;

/**
 * Illustrated avatars for people who would rather not upload a photo: a gift box on a brand colour, drawn on a
 * canvas so they upload like any picture.
 */
export const ILLUSTRATED_AVATARS = [
  { id: "lime", label: "Hộp lime", bg: "#C7F1AB", top: "#98E665", left: "#7BCB4A", right: "#458C17", ribbon: "#152B07" },
  { id: "kraft", label: "Hộp kraft", bg: "#F4EFE6", top: "#E8D8C8", left: "#D4A373", right: "#BC6C25", ribbon: "#1A362B" },
  { id: "forest", label: "Hộp xanh rừng", bg: "#D1E7DD", top: "#52796F", left: "#1A362B", right: "#10241C", ribbon: "#D4AF37" },
  { id: "ink", label: "Hộp mực", bg: "#E9EFF5", top: "#CAD5E2", left: "#53647D", right: "#1D293D", ribbon: "#98E665" },
  { id: "orange", label: "Hộp cam FPT", bg: "#FEF1EA", top: "#F26522", left: "#D85314", right: "#B93F0A", ribbon: "#FFFFFF" },
  { id: "blue", label: "Hộp xanh FPT", bg: "#E8F2FA", top: "#3B82F6", left: "#005CA9", right: "#004785", ribbon: "#FFD230" },
] as const;

type Illustration = (typeof ILLUSTRATED_AVATARS)[number];

/** Draws an isometric gift box with a ribbon. */
function drawIllustration(ctx: CanvasRenderingContext2D, size: number, art: Illustration) {
  const s = size / 200;
  ctx.fillStyle = art.bg;
  ctx.fillRect(0, 0, size, size);
  const face = (points: number[][], color: string) => {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s)));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  face([[100, 40], [160, 72], [100, 104], [40, 72]], art.top);
  face([[40, 72], [100, 104], [100, 170], [40, 138]], art.left);
  face([[100, 104], [160, 72], [160, 138], [100, 170]], art.right);
  ctx.strokeStyle = art.ribbon;
  ctx.lineWidth = 7 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(70 * s, 56 * s);
  ctx.lineTo(130 * s, 88 * s);
  ctx.lineTo(130 * s, 154 * s);
  ctx.moveTo(130 * s, 56 * s);
  ctx.lineTo(70 * s, 88 * s);
  ctx.lineTo(70 * s, 154 * s);
  ctx.stroke();
}

const toFile = (canvas: HTMLCanvasElement, name: string) =>
  new Promise<File>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(new File([blob], name, { type: "image/png" })) : reject(new Error("toBlob"))), "image/png"),
  );

export function IllustrationSwatch({ art, selected, onSelect }: { art: Illustration; selected: boolean; onSelect(): void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) drawIllustration(ctx, 96, art);
  }, [art]);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={art.label}
      className={cn(
        "relative size-14 overflow-hidden rounded-full outline-none ring-2 ring-offset-2 transition focus-visible:ring-focus",
        selected ? "ring-landing-green-deep" : "ring-transparent hover:ring-line-strong",
      )}
    >
      <canvas ref={ref} width={96} height={96} className="size-full" aria-hidden />
      {selected && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white" aria-hidden>
          <Check className="size-5" />
        </span>
      )}
    </button>
  );
}

export interface AvatarCropDialogProps {
  /** The picked photo; null for the illustration-only dialog. */
  file: File | null;
  onCancel(): void;
  /** Square PNG ready to upload. */
  onConfirm(file: File): void;
  busy?: boolean;
}

/**
 * Preview before saving: drag the photo to frame it, zoom with the slider (or the mouse wheel), see the round result,
 * then save. Or pick one of the illustrated avatars instead of a photo.
 */
export function AvatarCropDialog({ file, onCancel, onConfirm, busy = false }: AvatarCropDialogProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [art, setArt] = useState<Illustration | null>(file ? null : ILLUSTRATED_AVATARS[0]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  /** Draws the current framing on a canvas of side `size`. */
  const paint = (canvas: HTMLCanvasElement, size: number) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (art || !image) {
      if (art) drawIllustration(ctx, size, art);
      return;
    }
    const base = Math.max(size / image.width, size / image.height) * zoom;
    const w = image.width * base;
    const h = image.height * base;
    const k = size / VIEW;
    ctx.fillStyle = "#F1F5F9";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(image, (size - w) / 2 + offset.x * k, (size - h) / 2 + offset.y * k, w, h);
  };

  useEffect(() => {
    if (canvasRef.current) paint(canvasRef.current, VIEW * 2);
  });

  /** Keeps the photo covering the whole circle. */
  const clampOffset = (x: number, y: number, z = zoom) => {
    if (!image) return { x, y };
    const base = Math.max(VIEW / image.width, VIEW / image.height) * z;
    const maxX = Math.max(0, (image.width * base - VIEW) / 2);
    const maxY = Math.max(0, (image.height * base - VIEW) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
  };

  const save = async () => {
    const out = document.createElement("canvas");
    out.width = OUTPUT;
    out.height = OUTPUT;
    paint(out, OUTPUT);
    onConfirm(await toFile(out, art ? `avatar-${art.id}.png` : "avatar.png"));
  };

  return (
    <Dialog
      title="Ảnh đại diện"
      description="Kéo để căn ảnh, kéo thanh trượt để phóng to. Ảnh hiện trong khung tròn như trên trang."
      onClose={onCancel}
      busy={busy}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Huỷ
          </Button>
          <Button onClick={() => void save()} loading={busy} loadingLabel="Đang lưu…" disabled={!art && !image}>
            Lưu ảnh đại diện
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className={cn("relative size-64 overflow-hidden rounded-full bg-canvas ring-1 ring-line touch-none", image && !art && "cursor-grab active:cursor-grabbing")}
          onPointerDown={(event) => {
            if (!image || art) return;
            (event.target as HTMLElement).setPointerCapture(event.pointerId);
            drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            setOffset(clampOffset(drag.current.ox + event.clientX - drag.current.x, drag.current.oy + event.clientY - drag.current.y));
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onWheel={(event) => {
            if (!image || art) return;
            const next = Math.min(3, Math.max(1, zoom - event.deltaY * 0.002));
            setZoom(next);
            setOffset((current) => clampOffset(current.x, current.y, next));
          }}
        >
          <canvas ref={canvasRef} width={VIEW * 2} height={VIEW * 2} className="size-full" aria-label="Xem trước ảnh đại diện" role="img" />
          {image && !art && (
            <span className="pointer-events-none absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-caption text-white">
              <Move className="size-3.5" aria-hidden /> Kéo để căn
            </span>
          )}
        </div>

        {image && !art && (
          <Slider
            label="Phóng to"
            className="w-full max-w-xs"
            value={zoom}
            min={1}
            max={3}
            step={0.01}
            format={(value) => `${Math.round(value * 100)}%`}
            onChange={(value) => {
              setZoom(value);
              setOffset((current) => clampOffset(current.x, current.y, value));
            }}
          />
        )}

        <div className="w-full border-t border-line pt-4">
          <p className="mb-3 text-label text-fg">Hoặc dùng ảnh minh hoạ</p>
          <div className="flex flex-wrap gap-3">
            {ILLUSTRATED_AVATARS.map((item) => (
              <IllustrationSwatch key={item.id} art={item} selected={art?.id === item.id} onSelect={() => setArt(art?.id === item.id && image ? null : item)} />
            ))}
          </div>
          {image && art && (
            <button type="button" onClick={() => setArt(null)} className="mt-3 text-label font-semibold text-success-fg underline-offset-4 hover:underline">
              Quay lại ảnh của tôi
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
