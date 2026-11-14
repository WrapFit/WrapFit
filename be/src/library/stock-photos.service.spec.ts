// Stock photos through the backend (docs/23 S15, D10): the key stays on the server, placed photos are copied.
import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import sharp from 'sharp';
import type { ConfigService } from '../common';
import type { StorageService } from '../storage';
import { StockPhotosService } from './stock-photos.service';

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

describe('StockPhotosService', () => {
  const fetchMock = jest.fn();
  const putGeneratedFile = jest.fn().mockResolvedValue(true);
  const storage = { putGeneratedFile } as unknown as StorageService;

  beforeEach(() => {
    fetchMock.mockReset();
    putGeneratedFile.mockClear();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('is off without a key, without calling Pexels', async () => {
    const service = new StockPhotosService(configOf(''), storage);
    await expect(service.search({ q: 'bánh' })).resolves.toEqual({ enabled: false, items: [], page: 1, hasMore: false });
    await expect(service.import('u1', 42)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('searches with the key on the server and lists previews with their credit', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ photos: [PHOTO], next_page: 'x' }) });
    const service = new StockPhotosService(configOf('secret'), storage);
    const result = await service.search({ q: 'bánh quy', page: 2 });
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
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ photos: [] }) });
    await new StockPhotosService(configOf('secret'), storage).search({});
    expect(fetchMock.mock.calls[0][0]).toContain('/curated?per_page=24&page=1');
  });

  it('turns a Pexels failure into 502', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    await expect(new StockPhotosService(configOf('secret'), storage).search({ q: 'x' })).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('copies a placed photo into the user files as an IMAGE upload', async () => {
    const jpeg = await sharp({ create: { width: 30, height: 20, channels: 3, background: '#c08040' } }).jpeg().toBuffer();
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => PHOTO })
      .mockResolvedValueOnce({ ok: true, status: 200, arrayBuffer: async () => jpeg.buffer.slice(jpeg.byteOffset, jpeg.byteOffset + jpeg.length) });
    const result = await new StockPhotosService(configOf('secret'), storage).import('u1', 42);
    expect(fetchMock.mock.calls[1][0]).toBe(PHOTO.src.original);
    const saved = putGeneratedFile.mock.calls[0][0];
    expect(saved).toMatchObject({ userId: 'u1', purpose: 'IMAGE', contentType: 'image/jpeg' });
    expect(saved.key).toMatch(/^users\/u1\/image\/[0-9a-f-]+\.jpg$/);
    expect(result).toMatchObject({ width: 30, height: 20, attribution: 'Ảnh: An Nguyen / Pexels', pageUrl: PHOTO.url });
  });
});
