import { BadGatewayException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { ConfigService } from '../common';
import { assetUrl, StorageService } from '../storage';
import { SearchStockPhotosDto } from './dto/stock-photos.dto';

const PEXELS_API = 'https://api.pexels.com/v1';
const PER_PAGE = 24;
const TIMEOUT_MS = 15_000;
/** Largest photo copied (bytes): bigger originals are re-encoded, never upscaled. */
const MAX_STORED_BYTES = 15 * 1024 * 1024;
/** Longest side stored: about 40 cm at 300 DPI, more than a gift box face needs. */
const MAX_SIDE_PX = 4800;

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
  ) {}

  async search(query: SearchStockPhotosDto): Promise<{ enabled: boolean; items: StockPhoto[]; page: number; hasMore: boolean }> {
    const page = query.page ?? 1;
    if (!this.config.get('stock.enabled')) return { enabled: false, items: [], page, hasMore: false };
    const q = query.q?.trim();
    const path = q ? `/search?${new URLSearchParams({ query: q, per_page: String(PER_PAGE), page: String(page), locale: 'vi-VN' })}` : `/curated?per_page=${PER_PAGE}&page=${page}`;
    const body = (await this.call(path)) as { photos?: PexelsPhoto[]; next_page?: string };
    const items = (body.photos ?? []).map(toStockPhoto);
    return { enabled: true, items, page, hasMore: !!body.next_page };
  }

  /** Copies a photo into the user's files (IMAGE upload); its public URL, size and credit. */
  async import(userId: string, id: number): Promise<{ url: string; width: number; height: number; attribution: string; pageUrl: string }> {
    if (!this.config.get('stock.enabled')) throw new ServiceUnavailableException({ code: 'STOCK_UNAVAILABLE', message: 'Stock photos are not configured' });
    const photo = (await this.call(`/photos/${id}`)) as PexelsPhoto;
    if (!photo?.src?.original) throw new NotFoundException('Stock photo not found');

    const response = await fetch(photo.src.original, { signal: AbortSignal.timeout(TIMEOUT_MS * 4) });
    if (!response.ok) throw new BadGatewayException({ code: 'STOCK_PROVIDER_ERROR', message: `Pexels answered ${response.status}` });
    let body: Buffer = Buffer.from(await response.arrayBuffer());
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
    const saved = await this.storage.putGeneratedFile({ userId, key, purpose: 'IMAGE', contentType, body });
    if (!saved) throw new ServiceUnavailableException({ code: 'STORAGE_UNAVAILABLE', message: 'File storage is not configured' });
    const stock = toStockPhoto(photo);
    return { url: assetUrl(key)!, width: meta.width ?? photo.width, height: meta.height ?? photo.height, attribution: credit(stock), pageUrl: stock.pageUrl };
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
      throw new BadGatewayException({ code: 'STOCK_PROVIDER_ERROR', message: 'Pexels is unreachable' });
    }
    if (response.status === 404) throw new NotFoundException('Stock photo not found');
    if (!response.ok) {
      this.logger.warn(`Pexels answered ${response.status} for ${path.split('?')[0]}`);
      throw new BadGatewayException({ code: 'STOCK_PROVIDER_ERROR', message: `Pexels answered ${response.status}` });
    }
    return response.json();
  }
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
