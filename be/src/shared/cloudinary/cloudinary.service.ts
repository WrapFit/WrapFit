import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '../../common';

export type CloudinaryCheck = { ok: true } | { ok: false; error: string };

/** The SDK rejects with `{ error: { message, http_code } }`, not with an Error. */
function describe(error: unknown): string {
  const nested = (error as { error?: { message?: string; http_code?: number } } | undefined)?.error;
  if (nested?.message) return nested.http_code ? `${nested.message} (HTTP ${nested.http_code})` : nested.message;
  return error instanceof Error ? error.message : String(error);
}

/**
 * Connection to Cloudinary, the public image CDN of the storage plan (docs/wrapfit_architecture_security_blueprint.md,
 * section 4): avatars, shop logos, AI textures and project thumbnails, delivered with `f_auto,q_auto`. Print exports
 * and database backups stay in R2 (StorageService). Only the connection for now: no upload of the app goes here yet.
 * Disabled while CLOUDINARY_CLOUD_NAME is empty.
 */
@Injectable()
export class CloudinaryService {
  /** Root folder of this environment: every asset goes under `<folder>/...`. */
  readonly folder: string;
  private readonly sdk?: typeof cloudinary;

  constructor(config: ConfigService) {
    this.folder = config.get('cloudinary.folder');
    const cloudName = config.get('cloudinary.cloudName');
    if (!cloudName) return;

    // The SDK keeps one process-wide configuration: this is the only place that sets it.
    cloudinary.config({
      cloud_name: cloudName,
      api_key: config.get('cloudinary.apiKey'),
      api_secret: config.get('cloudinary.apiSecret'),
      secure: true,
    });
    this.sdk = cloudinary;
  }

  get enabled(): boolean {
    return this.sdk !== undefined;
  }

  /** The configured SDK (`uploader`, `url`, `api`). Throws 503 while Cloudinary is disabled. */
  get client(): typeof cloudinary {
    if (!this.sdk) throw new ServiceUnavailableException('Cloudinary is not configured');
    return this.sdk;
  }

  /** Checks the credentials with the Admin API (`GET /ping`), which counts toward its hourly rate limit. */
  async ping(): Promise<CloudinaryCheck> {
    if (!this.sdk) return { ok: false, error: 'CLOUDINARY_CLOUD_NAME is empty' };
    try {
      await this.sdk.api.ping();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: describe(error) };
    }
  }
}
