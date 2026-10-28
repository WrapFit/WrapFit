// Files of the built-in library the export worker ships itself (copies of fe/public, built into dist by nest-cli
// "assets"): a design may show Gói's drawings by their frontend path, and the worker never fetches from the website.
import { readFileSync } from 'fs';
import { basename, join } from 'path';
import { MASCOT_FILES } from '@wrapfit/shared';

const cache = new Map<string, Buffer>();

/** The file behind a built-in library path (`/mascots/goi.webp`), or null for any other content. */
export function libraryFile(url: string): { body: Buffer; contentType: string } | null {
  if (!(MASCOT_FILES as readonly string[]).includes(url)) return null;
  if (!cache.has(url)) cache.set(url, readFileSync(join(__dirname, 'library', 'mascots', basename(url))));
  return { body: cache.get(url)!, contentType: 'image/webp' };
}
