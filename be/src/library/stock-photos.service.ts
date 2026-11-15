import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Redis } from 'ioredis';
import sharp from 'sharp';
import { ConfigService } from '../common';
import { REDIS } from '../shared/redis';
import { assetUrl, StorageService } from '../storage';
import { SearchStockPhotosDto } from './dto/stock-photos.dto';

const PEXELS_API = 'https://api.pexels.com/v1';
const PER_PAGE = 24;
const LOCALE = 'vi-VN';
const TIMEOUT_MS = 15_000;
/** Photos are copied only from Pexels' image CDN: any other scheme, host or port is refused, and so is any redirect. */
const PHOTO_HOST = 'images.pexels.com';
/** Largest original downloaded (bytes): checked on Content-Length, then again on the bytes received. */
export const MAX_DOWNLOAD_BYTES = 60 * 1024 * 1024;
/** Largest photo copied (bytes): bigger originals are re-encoded, never upscaled. */
const MAX_STORED_BYTES = 15 * 1024 * 1024;
/** Longest side stored: about 40 cm at 300 DPI, more than a gift box face needs. */
const MAX_SIDE_PX = 4800;
/**
 * The Pexels key is shared by every user and limited to 200 requests per hour (pexels.com/api/documentation,
 * read 2026-11-16): identical searches, curated pages and photo lookups are answered from Redis meanwhile.
 */
const SEARCH_CACHE_SECONDS = 10 * 60;
const CURATED_CACHE_SECONDS = 60 * 60;
const PHOTO_CACHE_SECONDS = 60 * 60;
/** Bump the version when the cached shape changes. */
const CACHE_PREFIX = `stock:pexels:v1:${PER_PAGE}:${LOCALE}`;

/** A stock photo as the studio lists it. */
export interface StockPhoto {
  id: number;
  width: number;
  height: number;
  alt: string;
  /** Small preview for the grid (Pexels CDN). */
  thumbUrl: string;
  photographer: string;
  photographerUrl: string;
  /** Page of the photo on Pexels (credit link). */
  pageUrl: string;
}

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  alt?: string;
  photographer: string;
  photographer_url: string;
  src: { original: string; large2x: string; large: string; medium: string; tiny: string };
}

const credit = (photo: Pick<StockPhoto, 'photographer'>) => `Ảnh: ${photo.photographer} / Pexels`;
const providerError = (message: string) => new BadGatewayException({ code: 'STOCK_PROVIDER_ERROR', message });
const tooLarge = () =>
  new UnprocessableEntityException({
    code: 'STOCK_PHOTO_TOO_LARGE',
    message: `This photo is larger than ${MAX_DOWNLOAD_BYTES / 1024 / 1024} MB and cannot be imported`,
  });

/** Words of a search as sent to Pexels and used in the cache key: same words, same key. */
const normalizeQuery = (q?: string) => (q ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');

/**
 * Stock photos of the studio (docs/23 S15, D10): searched on Pexels through the backend, so the API key never
 * reaches the browser, and copied into the user's files when placed, so the print files keep working whatever
 * happens to the outside link. Pexels' licence allows commercial use without credit; the credit is still shown.
 */
@Injectable()
export class StockPhotosService {
  private readonly logger = new Logger(StockPhotosService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly storage: StorageService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async search(query: SearchStockPhotosDto): Promise<{ enabled: boolean; items: StockPhoto[]; page: number; hasMore: boolean }> {
    const page = query.page ?? 1;
    if (!this.config.get('stock.enabled')) return { enabled: false, items: [], page, hasMore: false };
    const q = normalizeQuery(query.q);
    const [cacheKey, ttl, path] = q
      ? [
          `${CACHE_PREFIX}:search:${page}:${q}`,
          SEARCH_CACHE_SECONDS,
          `/search?${new URLSearchParams({ query: q, per_page: String(PER_PAGE), page: String(page), locale: LOCALE })}`,
        ]
      : [`${CACHE_PREFIX}:curated:${page}`, CURATED_CACHE_SECONDS, `/curated?per_page=${PER_PAGE}&page=${page}`];
    const result = await this.cached(cacheKey, ttl, async () => {
      const body = (await this.call(path)) as { photos?: PexelsPhoto[]; next_page?: string };
      return { items: (body.photos ?? []).map(toStockPhoto), hasMore: !!body.next_page };
    });
    return { enabled: true, page, ...result };
  }

  /**
   * Copies a photo into the user's files (IMAGE upload); its public URL, size and credit. 403 when the quota is full
   * (checked before downloading, and again with the size actually stored), 422 for an original above
   * MAX_DOWNLOAD_BYTES.
   */
  async import(userId: string, id: number): Promise<{ url: string; width: number; height: number; attribution: string; pageUrl: string }> {
    if (!this.config.get('stock.enabled')) throw new ServiceUnavailableException({ code: 'STOCK_UNAVAILABLE', message: 'Stock photos are not configured' });
    if (!this.storage.enabled) throw new ServiceUnavailableException({ code: 'STORAGE_UNAVAILABLE', message: 'File storage is not configured' });
    // Early answer for a full account: nothing is downloaded. The space itself is held below, once the size is known.
    await this.storage.assertQuota(userId, 1);
    const photo = await this.cached(`${CACHE_PREFIX}:photo:${id}`, PHOTO_CACHE_SECONDS, () => this.call(`/photos/${id}`) as Promise<PexelsPhoto>);
    if (!photo?.src?.original) throw new NotFoundException('Stock photo not found');

    // shortcut: the photo is downloaded (up to MAX_DOWNLOAD_BYTES) and decoded by sharp inside the API process, which
    // holds the original plus its decoded pixels (a 50 MP photo is about 200 MB of RGBA) per import in flight. The
    // import throttle (10/min) bounds one client, not many at once. When the API runs short of memory, or before it
    // runs on small instances, move the copy to a BullMQ job in the worker (like AI images) and answer a job id.
    let body = await this.download(photo.src.original);
    let meta = await sharp(body).metadata();
    let contentType = meta.format === 'png' ? 'image/png' : 'image/jpeg';
    let extension = meta.format === 'png' ? 'png' : 'jpg';
    if (body.length > MAX_STORED_BYTES || Math.max(meta.width ?? 0, meta.height ?? 0) > MAX_SIDE_PX || (meta.format !== 'jpeg' && meta.format !== 'png')) {
      body = await sharp(body).rotate().resize({ width: MAX_SIDE_PX, height: MAX_SIDE_PX, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 92 }).toBuffer();
      meta = await sharp(body).metadata();
      contentType = 'image/jpeg';
      extension = 'jpg';
    }

    const key = `users/${userId}/image/${randomUUID()}.${extension}`;
    // Quota checked with the size stored, under the per-user lock; the pending row keeps a parallel import from
    // passing the same check before this file is written.
    await this.storage.reserveUpload(userId, { key, purpose: 'IMAGE', contentType, size: body.length });
    const saved = await this.storage.putGeneratedFile({ userId, key, purpose: 'IMAGE', contentType, body });
    if (!saved) throw new ServiceUnavailableException({ code: 'STORAGE_UNAVAILABLE', message: 'File storage is not configured' });
    const stock = toStockPhoto(photo);
    return { url: assetUrl(key)!, width: meta.width ?? photo.width, height: meta.height ?? photo.height, attribution: credit(stock), pageUrl: stock.pageUrl };
  }

  /** Answer from Redis when present, else from `load` (then stored). Redis being down only costs a Pexels call. */
  private async cached<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    // Failures are not logged here: RedisModule logs the outage once.
    const hit = await this.redis.get(key).catch(() => null);
    if (hit) {
      try {
        return JSON.parse(hit) as T;
      } catch {
        // unreadable entry: load it again and overwrite it
      }
    }
    const value = await load();
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds).catch(() => undefined);
    return value;
  }

  /** Downloads an original from PHOTO_HOST, never more than MAX_DOWNLOAD_BYTES, whatever Content-Length says. */
  private async download(url: string): Promise<Buffer> {
    if (!isPhotoUrl(url)) {
      this.logger.warn(`Pexels gave a photo address outside ${PHOTO_HOST}: ${url.slice(0, 200)}`);
      throw providerError('Pexels gave an unexpected photo address');
    }
    let response: Response;
    try {
      // The CDN serves originals directly: a redirect, which could lead to another host, fails the request.
      response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS * 4) });
    } catch (error) {
      this.logger.warn(`Pexels photo unreachable: ${(error as Error).message}`);
      throw providerError('Pexels is unreachable');
    }
    if (!response.ok || !response.body) {
      await response.body?.cancel().catch(() => undefined);
      throw providerError(`Pexels answered ${response.status}`);
    }
    if (Number(response.headers.get('content-length')) > MAX_DOWNLOAD_BYTES) {
      await response.body.cancel().catch(() => undefined);
      throw tooLarge();
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > MAX_DOWNLOAD_BYTES) {
          await reader.cancel().catch(() => undefined);
          throw tooLarge();
        }
        chunks.push(value);
      }
    } catch (error) {
      if (error instanceof UnprocessableEntityException) throw error;
      this.logger.warn(`Pexels photo download failed: ${(error as Error).message}`);
      throw providerError('Pexels download failed');
    }
    return Buffer.concat(chunks);
  }

  private async call(path: string): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(`${PEXELS_API}${path}`, {
        headers: { Authorization: this.config.get('stock.pexelsKey') },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.warn(`Pexels unreachable: ${(error as Error).message}`);
      throw providerError('Pexels is unreachable');
    }
    if (response.status === 404) throw new NotFoundException('Stock photo not found');
    if (!response.ok) {
      this.logger.warn(`Pexels answered ${response.status} for ${path.split('?')[0]}`);
      throw providerError(`Pexels answered ${response.status}`);
    }
    return response.json();
  }
}

/** https on PHOTO_HOST exactly: no other scheme, host, port or credentials. */
export function isPhotoUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return parsed.protocol === 'https:' && parsed.hostname === PHOTO_HOST && parsed.port === '' && !parsed.username && !parsed.password;
}

function toStockPhoto(photo: PexelsPhoto): StockPhoto {
  return {
    id: photo.id,
    width: photo.width,
    height: photo.height,
    alt: photo.alt ?? '',
    thumbUrl: photo.src.medium,
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    pageUrl: photo.url,
  };
}
