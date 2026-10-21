// Unboxing pages without a backend (the Vercel demo). The whole gift travels inside the link the QR code opens:
// `/unbox/demo#g=<payload>`, where the payload is the gift as JSON, deflated and base64url-encoded. The part after `#`
// never reaches a server, so the page opens on any phone that scans the code, with no API and no account.
import QRCode from "qrcode";
import type { BoxDimensions, BoxStructureType } from "@wrapfit/shared";
import { BOX_STRUCTURES } from "@/features/studio/utils/boxStructures";
import { materialSpecFor } from "@/features/studio/utils/projectMaterial";
import type { ParticleEffect, PublicUnboxing, UnboxingConfig } from "@/types/api";

/** Slug of the offline unboxing page; the gift itself is in the hash. */
export const OFFLINE_UNBOX_SLUG = "demo";
const HASH_KEY = "g";
/** Longest payload put in a QR code: beyond this the code gets too dense to scan from a printed box. */
const MAX_PAYLOAD_CHARS = 1400;

/** What the recipient sees: the note, the effect and the box it came in. */
export interface OfflineGift {
  recipientName: string;
  giftNote: string;
  particleEffect: ParticleEffect;
  senderName?: string;
  title: string;
  structure: BoxStructureType;
  dimensions: BoxDimensions;
  materialTheme?: string;
}

type Packed = { r: string; n: string; e: ParticleEffect; f?: string; t: string; s: BoxStructureType; d: [number, number, number, number]; m?: string };

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromBase64Url = (text: string) => {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
};

async function transform(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** Packs a gift for the link; "z" + deflate when the browser can, "j" + plain JSON otherwise. */
async function pack(gift: OfflineGift): Promise<string> {
  const packed: Packed = {
    r: gift.recipientName,
    n: gift.giftNote,
    e: gift.particleEffect,
    f: gift.senderName,
    t: gift.title,
    s: gift.structure,
    d: [gift.dimensions.length, gift.dimensions.width, gift.dimensions.height, gift.dimensions.paperThickness],
    m: gift.materialTheme,
  };
  const json = new TextEncoder().encode(JSON.stringify(packed));
  if (typeof CompressionStream !== "undefined") return "z" + toBase64Url(await transform(json, new CompressionStream("deflate-raw")));
  return "j" + toBase64Url(json);
}

/** Reads a gift packed by `pack`; null when the link is damaged. */
export async function unpackGift(payload: string): Promise<OfflineGift | null> {
  try {
    const bytes = fromBase64Url(payload.slice(1));
    const json = payload[0] === "z" ? await transform(bytes, new DecompressionStream("deflate-raw")) : bytes;
    const p = JSON.parse(new TextDecoder().decode(json)) as Packed;
    if (typeof p.r !== "string" || typeof p.n !== "string" || !Array.isArray(p.d)) return null;
    return {
      recipientName: p.r,
      giftNote: p.n,
      particleEffect: p.e ?? "confetti",
      senderName: p.f,
      title: p.t,
      structure: p.s,
      dimensions: { length: p.d[0], width: p.d[1], height: p.d[2], paperThickness: p.d[3] },
      materialTheme: p.m,
    };
  } catch {
    return null;
  }
}

/** The gift in the current page's hash (`#g=…`), if any. */
export async function giftFromLocation(): Promise<OfflineGift | null> {
  if (typeof window === "undefined") return null;
  const payload = new URLSearchParams(window.location.hash.slice(1)).get(HASH_KEY);
  return payload ? unpackGift(payload) : null;
}

/** The offline gift in the shape of `GET /public/unboxing/:slug`, so the page renders it like a saved one. */
export function giftToPublic(gift: OfflineGift): PublicUnboxing {
  const structure = BOX_STRUCTURES.find((s) => s.id === gift.structure);
  const themes = ["kraft", "ivory", "forest", "gold_foil"] as const;
  const theme = themes.find((t) => t === gift.materialTheme) ?? "kraft";
  return {
    recipientName: gift.recipientName,
    giftNote: gift.giftNote,
    audioTrackUrl: null,
    particleEffect: gift.particleEffect,
    viewsCount: 1,
    sender: { fullName: gift.senderName ?? null, shopName: null, avatarUrl: null },
    box: {
      title: gift.title,
      template: { id: gift.structure, name: structure?.vietnameseName ?? gift.title },
      dimensions: gift.dimensions,
      materialSpec: materialSpecFor(theme, gift.dimensions.paperThickness),
      canvasState: { elements: [], materialTheme: gift.materialTheme ?? null },
      thumbnailUrl: null,
    },
  };
}

/**
 * Link of the unboxing page with the gift inside. A very long note is shortened so the QR code stays scannable;
 * `shortened` tells the dialog to say so.
 */
export async function offlineUnboxUrl(gift: OfflineGift): Promise<{ url: string; shortened: boolean }> {
  let note = gift.giftNote;
  let payload = await pack(gift);
  while (payload.length > MAX_PAYLOAD_CHARS && note.length > 40) {
    note = note.slice(0, Math.floor(note.length * 0.85)).trimEnd() + "…";
    payload = await pack({ ...gift, giftNote: note });
  }
  const url = `${window.location.origin}/unbox/${OFFLINE_UNBOX_SLUG}#${HASH_KEY}=${payload}`;
  return { url, shortened: note !== gift.giftNote };
}

/** QR code of a link: PNG data URL (1200 px, for screens and print) and SVG text (vector, for print). */
export async function qrCodeOf(url: string): Promise<{ png: string; svg: string }> {
  const options = { errorCorrectionLevel: "M" as const, margin: 2, color: { dark: "#1D293D", light: "#FFFFFF" } };
  const [png, svg] = await Promise.all([QRCode.toDataURL(url, { ...options, width: 1200 }), QRCode.toString(url, { ...options, type: "svg" })]);
  return { png, svg };
}

// ---------------------------------------------------------------- the creator's side

const storageKey = (projectId: string) => `wrapfit.unboxing.${projectId}`;

/** Offline unboxing of a project, kept in this browser so the dialog shows the code again next time. */
export function loadOfflineUnboxing(projectId: string): UnboxingConfig | null {
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    return raw ? (JSON.parse(raw) as UnboxingConfig) : null;
  } catch {
    return null;
  }
}

export function storeOfflineUnboxing(projectId: string, config: UnboxingConfig | null) {
  try {
    if (config) window.localStorage.setItem(storageKey(projectId), JSON.stringify(config));
    else window.localStorage.removeItem(storageKey(projectId));
  } catch {
    // Storage blocked: the code still works for this visit.
  }
}

/** Builds the unboxing config of a project without the API: link with the gift inside and its QR code. */
export async function createOfflineUnboxing(gift: OfflineGift, previous: UnboxingConfig | null): Promise<UnboxingConfig & { shortened: boolean }> {
  const { url, shortened } = await offlineUnboxUrl(gift);
  const qr = await qrCodeOf(url);
  return {
    slug: OFFLINE_UNBOX_SLUG,
    recipientName: gift.recipientName,
    giftNote: gift.giftNote,
    audioTrackUrl: null,
    particleEffect: gift.particleEffect,
    viewsCount: previous?.viewsCount ?? 0,
    createdAt: previous?.createdAt ?? new Date().toISOString(),
    qrCodeUrl: qr.png,
    qrCodeSvgUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.svg)}`,
    unboxUrl: url,
    shortened,
  };
}
