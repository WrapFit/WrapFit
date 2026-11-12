import { ServiceUnavailableException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import type { ConfigService } from '../../common';
import { CloudinaryService } from './cloudinary.service';

const configOf = (values: Record<string, string>) => ({ get: (path: string) => values[path] }) as unknown as ConfigService;

const disabled = { 'cloudinary.folder': 'wrapfit', 'cloudinary.cloudName': '' };
const enabled = {
  'cloudinary.folder': 'wrapfit-dev',
  'cloudinary.cloudName': 'wrapfit-cloud',
  'cloudinary.apiKey': '123456789012345',
  'cloudinary.apiSecret': 'secret',
};

describe('CloudinaryService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('stays disabled without a cloud name', async () => {
    const service = new CloudinaryService(configOf(disabled));
    expect(service.enabled).toBe(false);
    expect(service.folder).toBe('wrapfit');
    expect(() => service.client).toThrow(ServiceUnavailableException);
    await expect(service.ping()).resolves.toEqual({ ok: false, error: 'CLOUDINARY_CLOUD_NAME is empty' });
  });

  it('configures the SDK with HTTPS URLs', () => {
    const service = new CloudinaryService(configOf(enabled));
    expect(service.enabled).toBe(true);
    expect(service.client.config()).toMatchObject({ cloud_name: 'wrapfit-cloud', api_key: '123456789012345', secure: true });
    expect(service.client.url('wrapfit-dev/sample.png')).toMatch(/^https:\/\/res\.cloudinary\.com\/wrapfit-cloud\//);
  });

  it('reports the Admin API error of a failed ping', async () => {
    jest.spyOn(cloudinary.api, 'ping').mockRejectedValue({ error: { message: 'Invalid api_key', http_code: 401 } });
    const service = new CloudinaryService(configOf(enabled));
    await expect(service.ping()).resolves.toEqual({ ok: false, error: 'Invalid api_key (HTTP 401)' });
  });

  it('passes a successful ping', async () => {
    jest.spyOn(cloudinary.api, 'ping').mockResolvedValue({ status: 'ok' });
    await expect(new CloudinaryService(configOf(enabled)).ping()).resolves.toEqual({ ok: true });
  });
});
