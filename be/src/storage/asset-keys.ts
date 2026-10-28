// The database stores object keys of uploads (`users/<id>/<purpose>/<uuid>.<ext>`), never their URLs: moving the
// bucket or changing the CDN domain then needs a new STORAGE_PUBLIC_URL, not a rewrite of every row. The API keeps
// speaking URLs (`thumbnailUrl`, `avatarUrl`, canvas `content`): they are built here when a row is read and turned
// back into keys when a request is saved. Plain functions so mappers and the worker can use them without DI.

import { parseLibraryArt } from '@wrapfit/shared';

/** Canvas element types whose `content` is the URL of a file (an upload, a static asset or an external image). */
const FILE_ELEMENT_TYPES = new Set(['logo', 'image', 'pattern']);

/** Keys of user uploads: the only keys a client may point at (exports, QR codes... are never placed on a canvas). */
const UPLOAD_KEY = /^users\/[^/?#]+\/[a-z_]+\/[^/?#]+$/;

/**
 * Keys of files that must never have a public URL (print exports): StorageService keeps them in the private bucket
 * and hands them out only through short-lived pre-signed links.
 */
export const PRIVATE_KEY_PREFIX = 'private/';

let publicBase = '';

/** Called once by StorageService with STORAGE_PUBLIC_URL (empty while storage is disabled). */
export function configureAssetBase(publicUrl: string): void {
  publicBase = publicUrl.replace(/\/+$/, '');
}

/** Public URL of a stored key; null without a key, or while storage is disabled. */
export function assetUrl(key: string | null | undefined): string | null {
  return key && publicBase ? `${publicBase}/${key}` : null;
}

export const isUploadKey = (value: string) => UPLOAD_KEY.test(value);

/**
 * Key of a user upload from its public URL, or null for any other URL (static asset, other host, data URL). The
 * scheme is ignored (clients may store the https form of the URL) and so are a query string and a fragment.
 */
export function uploadKeyOf(url: string): string | null {
  if (!publicBase) return null;
  const strip = (value: string) => value.replace(/^https?:\/\//, '');
  const base = `${strip(publicBase)}/`;
  const target = strip(url).split(/[?#]/)[0];
  if (!target.startsWith(base)) return null;
  let key: string;
  try {
    key = decodeURIComponent(target.slice(base.length));
  } catch {
    return null; // malformed escape such as `%E0%A4%A`: not one of our URLs
  }
  return isUploadKey(key) ? key : null;
}

/** An absolute URL (`https:`, `data:`, `javascript:`...) or a protocol-relative one (`//host`): it leaves our site. */
function pointsElsewhere(content: string): boolean {
  // Like browsers: tabs and newlines inside a URL, and spaces / control characters before it, are ignored.
  // eslint-disable-next-line no-control-regex -- stripping control characters is the point here
  const url = content.replace(/[\t\n\r]/g, '').replace(/^[\u0000- ]+/, '');
  return /^[\\/]{2}/.test(url) || URL.canParse(url);
}

/**
 * Whether `content` may stand in a file element of a canvas (logo, image, pattern): an upload of WrapFit (its URL or
 * key), a path of the frontend (`/branding/logo.png`) or the label of a built-in sticker. Never another host or a
 * data URL: the public pages (`/p/<slug>`, unboxing) would load it in the browser of every viewer.
 */
export function isAllowedFileContent(content: string): boolean {
  // Built-in library art (`wf-art:<design>?…`) is drawn from code, never fetched.
  return isUploadKey(content) || uploadKeyOf(content) !== null || !pointsElsewhere(content) || parseLibraryArt(content) !== null;
}

/** Media played by a public page (unboxing music): an upload of WrapFit or a path of the frontend. */
export function isAllowedMediaUrl(url: string): boolean {
  return uploadKeyOf(url) !== null || (url.startsWith('/') && !pointsElsewhere(url));
}

interface CanvasLike {
  elements?: { type: string; content: string }[];
}

const mapFileContents = <T extends CanvasLike>(canvas: T, map: (content: string) => string): T =>
  Array.isArray(canvas?.elements)
    ? {
        ...canvas,
        elements: canvas.elements.map((element) =>
          FILE_ELEMENT_TYPES.has(element.type) && typeof element.content === 'string'
            ? { ...element, content: map(element.content) }
            : element,
        ),
      }
    : canvas;

/** Canvas as stored: upload URLs become keys, every other content is kept as sent. Idempotent. */
export const toStoredCanvas = <T extends CanvasLike>(canvas: T): T =>
  mapFileContents(canvas, (content) => uploadKeyOf(content) ?? content);

/** Canvas as returned to clients: keys become URLs (left as keys while storage is disabled). */
export const toClientCanvas = <T extends CanvasLike>(canvas: T): T =>
  mapFileContents(canvas, (content) => (isUploadKey(content) ? (assetUrl(content) ?? content) : content));

/** Upload keys a stored canvas points at (each once). */
export function storedCanvasKeys(canvas: CanvasLike | null | undefined): string[] {
  const keys = new Set<string>();
  for (const element of canvas?.elements ?? []) {
    if (FILE_ELEMENT_TYPES.has(element.type) && typeof element.content === 'string' && isUploadKey(element.content)) {
      keys.add(element.content);
    }
  }
  return [...keys];
}

/**
 * File contents of `canvas` that point outside WrapFit (see isAllowedFileContent), each once. Contents the saved
 * canvas (`current`, client or stored form) already shows are kept, so a design saved before this rule still saves.
 */
export function disallowedFileContents(canvas: CanvasLike | null | undefined, current?: CanvasLike | null): string[] {
  const kept = new Set((current?.elements ?? []).map((element) => element.content));
  const disallowed = new Set<string>();
  for (const element of canvas?.elements ?? []) {
    const { type, content } = element;
    if (FILE_ELEMENT_TYPES.has(type) && typeof content === 'string' && !kept.has(content) && !isAllowedFileContent(content)) {
      disallowed.add(content);
    }
  }
  return [...disallowed];
}

/** Brand kit as returned to clients: `logoKey` -> `logoUrl` (rows written before keys keep their `logoUrl`). */
export function toClientBrandKit(brandKit: unknown): unknown {
  if (!brandKit || typeof brandKit !== 'object') return brandKit;
  const { logoKey, ...rest } = brandKit as { logoKey?: string | null; logoUrl?: string | null };
  return logoKey !== undefined ? { logoUrl: assetUrl(logoKey), ...rest } : rest;
}
