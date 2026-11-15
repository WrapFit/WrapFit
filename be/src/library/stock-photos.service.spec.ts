// Stock photos through the backend (docs/23 S15, D10): the key stays on the server, placed photos are copied.
import { BadGatewayException, ForbiddenException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import type { Redis } from 'ioredis';
import sharp from 'sharp';
import type { ConfigService } from '../common';
import type { StorageService } from '../storage';
import { isPhotoUrl, MAX_DOWNLOAD_BYTES, StockPhotosService } from './stock-photos.service';

const PHOTO = {
  id: 42,
  width: 3000,
  height: 2000,
  url: 'https://www.pexels.com/photo/42/',
  alt: 'Bánh quy',
  photographer: 'An Nguyen',
  photographer_url: 'https://www.pexels.com/@an',
  src: { original: 'https://images.pexels.com/42.jpeg', large2x: '', large: '', medium: 'https://images.pexels.com/42-m.jpeg', tiny: '' },
};

const configOf = (key: string) =>
  ({ get: (path: string) => (path === 'stock.enabled' ? key !== '' : path === 'stock.pexelsKey' ? key : undefined) }) as unknown as ConfigService;

const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
/** A download answered by the CDN; `contentLength` overrides the header (a lying or missing one). */
const download = (body: Uint8Array | ReadableStream<Uint8Array>, contentLength?: string) => {
  const headers = new Headers({ 'content-type': 'image/jpeg' });
  if (contentLength !== undefined) headers.set('content-length', contentLength);
  return new Response(body as BodyInit, { status: 200, headers });
};

describe('StockPhotosService', () => {
  const fetchMock = jest.fn();
  const putGeneratedFile = jest.fn().mockResolvedValue(true);
  const assertQuota = jest.fn().mockResolvedValue(undefined);
  const reserveUpload = jest.fn().mockResolvedValue({ id: 'file-1' });
  const storage = { enabled: true, putGeneratedFile, assertQuota, reserveUpload } as unknown as StorageService;
  /** In-memory Redis (get / set ... EX). */
  let store: Map<string, string>;
  let redis: Redis;
  const build = (key = 'secret', client: Redis = redis) => new StockPhotosService(configOf(key), storage, client);

  let jpeg: Buffer;
  beforeAll(async () => {
    jpeg = await sharp({ create: { width: 30, height: 20, channels: 3, background: '#c08040' } }).jpeg().toBuffer();
  });

  beforeEach(() => {
    fetchMock.mockReset();
    putGeneratedFile.mockClear();
    assertQuota.mockReset().mockResolvedValue(undefined);
    reserveUpload.mockReset().mockResolvedValue({ id: 'file-1' });
    store = new Map();
    redis = {
      get: jest.fn(async (key: string) => store.get(key) ?? null),
      set: jest.fn(async (key: string, value: string) => void store.set(key, value)),
    } as unknown as Redis;
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('is off without a key, without calling Pexels', async () => {
    const service = build('');
    await expect(service.search({ q: 'bánh' })).resolves.toEqual({ enabled: false, items: [], page: 1, hasMore: false });
    await expect(service.import('u1', 42)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('searches with the key on the server and lists previews with their credit', async () => {
    fetchMock.mockResolvedValue(json({ photos: [PHOTO], next_page: 'x' }));
    const result = await build().search({ q: 'bánh quy', page: 2 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/search?query=b%C3%A1nh+quy&per_page=24&page=2');
    expect(init.headers).toEqual({ Authorization: 'secret' });
    expect(result).toEqual({
      enabled: true,
      page: 2,
      hasMore: true,
      items: [{ id: 42, width: 3000, height: 2000, alt: 'Bánh quy', thumbUrl: PHOTO.src.medium, photographer: 'An Nguyen', photographerUrl: PHOTO.photographer_url, pageUrl: PHOTO.url }],
    });
  });

  it('lists curated photos without words', async () => {
    fetchMock.mockResolvedValue(json({ photos: [] }));
    await build().search({});
    expect(fetchMock.mock.calls[0][0]).toContain('/curated?per_page=24&page=1');
  });

  it('turns a Pexels failure into 502', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    await expect(build().search({ q: 'x' })).rejects.toBeInstanceOf(BadGatewayException);
  });

  describe('search cache (Redis)', () => {
    it('calls Pexels once for two searches with the same keyword', async () => {
      fetchMock.mockResolvedValue(json({ photos: [PHOTO], next_page: 'x' }));
      const service = build();
      const first = await service.search({ q: 'Bánh  quy ', page: 2 });
      const second = await service.search({ q: 'bánh quy', page: 2 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(second).toEqual(first);
      expect(redis.set).toHaveBeenCalledWith(expect.stringContaining(':search:2:bánh quy'), expect.any(String), 'EX', 600);

      // Another page is another answer.
      await service.search({ q: 'bánh quy', page: 3 });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('keeps curated pages one hour', async () => {
      fetchMock.mockResolvedValue(json({ photos: [] }));
      const service = build();
      await service.search({});
      await service.search({ page: 1 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(redis.set).toHaveBeenCalledWith(expect.stringContaining(':curated:1'), expect.any(String), 'EX', 3600);
    });

    it('falls back to Pexels when Redis is down', async () => {
      fetchMock.mockResolvedValue(json({ photos: [PHOTO] }));
      const down = {
        get: jest.fn().mockRejectedValue(new Error('Stream isn\'t writeable')),
        set: jest.fn().mockRejectedValue(new Error('Stream isn\'t writeable')),
      } as unknown as Redis;
      const service = build('secret', down);
      await expect(service.search({ q: 'hộp' })).resolves.toMatchObject({ enabled: true, items: [{ id: 42 }] });
      await expect(service.search({ q: 'hộp' })).resolves.toMatchObject({ enabled: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('import', () => {
    it('copies a placed photo into the user files as an IMAGE upload, after reserving its stored size', async () => {
      fetchMock.mockResolvedValueOnce(json(PHOTO)).mockResolvedValueOnce(download(jpeg, String(jpeg.length)));
      const result = await build().import('u1', 42);
      expect(fetchMock.mock.calls[1][0]).toBe(PHOTO.src.original);
      expect(fetchMock.mock.calls[1][1]).toMatchObject({ redirect: 'error' });
      const saved = putGeneratedFile.mock.calls[0][0];
      expect(saved).toMatchObject({ userId: 'u1', purpose: 'IMAGE', contentType: 'image/jpeg' });
      expect(saved.key).toMatch(/^users\/u1\/image\/[0-9a-f-]+\.jpg$/);
      expect(reserveUpload).toHaveBeenCalledWith('u1', { key: saved.key, purpose: 'IMAGE', contentType: 'image/jpeg', size: saved.body.length });
      expect(reserveUpload.mock.invocationCallOrder[0]).toBeLessThan(putGeneratedFile.mock.invocationCallOrder[0]);
      expect(result).toMatchObject({ width: 30, height: 20, attribution: 'Ảnh: An Nguyen / Pexels', pageUrl: PHOTO.url });
    });

    it('answers 403 with the quota exhausted and writes no file', async () => {
      // Full account: refused before anything is downloaded.
      assertQuota.mockRejectedValueOnce(new ForbiddenException('Storage quota exceeded'));
      await expect(build().import('u1', 42)).rejects.toBeInstanceOf(ForbiddenException);
      expect(fetchMock).not.toHaveBeenCalled();

      // Room left, but not for this photo once compressed (checked under the lock).
      reserveUpload.mockRejectedValueOnce(new ForbiddenException('Storage quota exceeded'));
      fetchMock.mockResolvedValueOnce(json(PHOTO)).mockResolvedValueOnce(download(jpeg));
      const error = await build().import('u1', 42).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getStatus()).toBe(403);
      expect(putGeneratedFile).not.toHaveBeenCalled();
    });

    it('rejects an original whose Content-Length is above 60 MB, without reading it', async () => {
      const body = new ReadableStream<Uint8Array>({ pull: () => { throw new Error('the body must not be read'); } });
      fetchMock.mockResolvedValueOnce(json(PHOTO)).mockResolvedValueOnce(download(body, String(MAX_DOWNLOAD_BYTES + 1)));
      await expect(build().import('u1', 42)).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(reserveUpload).not.toHaveBeenCalled();
      expect(putGeneratedFile).not.toHaveBeenCalled();
    });

    it('aborts a download that passes 60 MB, whatever Content-Length said', async () => {
      const chunk = new Uint8Array(8 * 1024 * 1024);
      let sent = 0;
      let cancelled = false;
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          sent += chunk.byteLength;
          controller.enqueue(chunk); // endless: only the cap stops it
        },
        cancel() {
          cancelled = true;
        },
      });
      fetchMock.mockResolvedValueOnce(json(PHOTO)).mockResolvedValueOnce(download(body, '1000'));
      await expect(build().import('u1', 42)).rejects.toMatchObject({ response: { code: 'STOCK_PHOTO_TOO_LARGE' } });
      expect(cancelled).toBe(true);
      expect(sent).toBeLessThanOrEqual(MAX_DOWNLOAD_BYTES + 2 * chunk.byteLength);
      expect(putGeneratedFile).not.toHaveBeenCalled();
    });

    it('refuses a photo address outside images.pexels.com without downloading it', async () => {
      fetchMock.mockResolvedValueOnce(json({ ...PHOTO, src: { ...PHOTO.src, original: 'https://evil.example/42.jpeg' } }));
      await expect(build().import('u1', 42)).rejects.toBeInstanceOf(BadGatewayException);
      expect(fetchMock).toHaveBeenCalledTimes(1); // the Pexels lookup only
      expect(putGeneratedFile).not.toHaveBeenCalled();
    });

    it('accepts only https on images.pexels.com exactly', () => {
      expect(isPhotoUrl('https://images.pexels.com/photos/1/a.jpeg')).toBe(true);
      for (const url of [
        'http://images.pexels.com/photos/1/a.jpeg',
        'https://images.pexels.com.evil.example/a.jpeg',
        'https://evil.images.pexels.com/a.jpeg',
        'https://images.pexels.com:8443/a.jpeg',
        'https://user:pw@images.pexels.com/a.jpeg',
        'https://evil.example/@images.pexels.com/a.jpeg',
        'file:///etc/passwd',
        'not a url',
      ]) {
        expect(isPhotoUrl(url)).toBe(false);
      }
    });

    it('fails when the CDN redirects (the redirect may lead to another host)', async () => {
      fetchMock.mockResolvedValueOnce(json(PHOTO)).mockRejectedValueOnce(new TypeError('fetch failed: unexpected redirect'));
      await expect(build().import('u1', 42)).rejects.toBeInstanceOf(BadGatewayException);
      expect(putGeneratedFile).not.toHaveBeenCalled();
    });
  });
});
