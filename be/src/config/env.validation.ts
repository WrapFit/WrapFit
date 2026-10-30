import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 8080;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET: string;

  /**
   * Derives the one-time links of verify / reset emails. Empty = JWT_REFRESH_SECRET (older .env files). Changing it
   * invalidates the links already sent, and only them: rotate it separately from the JWT secrets.
   */
  @IsString()
  AUTH_TOKEN_SECRET: string = '';

  @IsInt()
  @Min(60)
  JWT_ACCESS_TTL_SECONDS: number = 900;

  @IsInt()
  @Min(60)
  JWT_REFRESH_TTL_SECONDS: number = 604800;

  @IsInt()
  @Min(4)
  @Max(15)
  BCRYPT_ROUNDS: number = 10;

  @IsString()
  CORS_ORIGINS: string = '*';

  @IsIn(['true', 'false'])
  SWAGGER_ENABLED: string = 'true';

  @IsInt()
  @Min(1)
  THROTTLE_TTL_SECONDS: number = 60;

  @IsInt()
  @Min(1)
  THROTTLE_LIMIT: number = 100;

  /** Where the browser lands after Google login (the Next.js frontend). */
  @IsUrl({ require_tld: false, protocols: ['http', 'https'], require_protocol: true })
  FRONTEND_URL: string = 'http://localhost:3000';

  /** `Secure` flag on auth cookies. Empty = automatic (on in production). */
  @IsIn(['', 'true', 'false'])
  COOKIE_SECURE: string = '';

  /** Google OAuth 2.0 — leave both empty to disable "Sign in with Google". */
  @IsString()
  GOOGLE_CLIENT_ID: string = '';

  @IsString()
  GOOGLE_CLIENT_SECRET: string = '';

  /** Must be listed as an "Authorized redirect URI" of the Google OAuth client. */
  @IsUrl({ require_tld: false, protocols: ['http', 'https'], require_protocol: true })
  GOOGLE_CALLBACK_URL: string = 'http://localhost:8080/api/auth/google/callback';

  /**
   * S3-compatible object storage (Cloudflare R2, AWS S3, MinIO). Leave STORAGE_BUCKET empty to disable uploads.
   * Endpoint: R2 `https://<account-id>.r2.cloudflarestorage.com`, MinIO `http://localhost:9000`, AWS: empty.
   */
  @IsString()
  STORAGE_ENDPOINT: string = '';

  /** Endpoint written into pre-signed URLs, when the browser reaches storage at another address (Docker). */
  @IsString()
  STORAGE_PUBLIC_ENDPOINT: string = '';

  /** `auto` for R2, e.g. `ap-southeast-1` for AWS, `us-east-1` for MinIO. */
  @IsString()
  STORAGE_REGION: string = 'auto';

  @IsString()
  STORAGE_BUCKET: string = '';

  /**
   * Bucket without any public URL for print exports, downloaded only through short-lived pre-signed links. Empty =
   * exports go to STORAGE_BUCKET, where anyone who learns their key can read them (a warning is logged at startup).
   */
  @IsString()
  STORAGE_PRIVATE_BUCKET: string = '';

  @IsString()
  STORAGE_ACCESS_KEY_ID: string = '';

  @IsString()
  STORAGE_SECRET_ACCESS_KEY: string = '';

  /** Public base URL of uploaded files, e.g. `https://cdn.wrapfit.vn` or `http://localhost:9000/wrapfit`. */
  @IsString()
  STORAGE_PUBLIC_URL: string = '';

  /** `true` for MinIO (http://host/bucket/key URLs). */
  @IsIn(['true', 'false'])
  STORAGE_FORCE_PATH_STYLE: string = 'false';

  /**
   * R2 bucket of the encrypted database dumps (`pg_dump | age`), with no public URL. Written by the backup job, never
   * by the API: only `npm run storage:check` reads it for now. Empty = no backup bucket.
   */
  @IsString()
  STORAGE_BACKUP_BUCKET: string = '';

  /**
   * Cloudinary account of the public image CDN (avatars, logos, AI textures, thumbnails). Set the three together or
   * leave them all empty (Cloudinary disabled). Dashboard → Settings → API Keys.
   */
  @IsString()
  CLOUDINARY_CLOUD_NAME: string = '';

  @IsString()
  CLOUDINARY_API_KEY: string = '';

  @IsString()
  CLOUDINARY_API_SECRET: string = '';

  /** Root folder of this environment's assets, e.g. `wrapfit` in production and `wrapfit-dev` on a laptop. */
  @IsString()
  @IsNotEmpty()
  CLOUDINARY_FOLDER: string = 'wrapfit';

  /** Claude API key for the AI pattern generator. Empty = built-in procedural patterns only (free). */
  @IsString()
  ANTHROPIC_API_KEY: string = '';

  /** Model of the default `fast` quality (every plan). */
  @IsString()
  @IsNotEmpty()
  AI_MODEL_FAST: string = 'claude-haiku-5-5';

  /** Model of the `premium` quality (paid plans only). */
  @IsString()
  @IsNotEmpty()
  AI_MODEL_PREMIUM: string = 'claude-opus-5-5';

  /** Deprecated alias of AI_MODEL_FAST, used only when AI_MODEL_FAST is not set. */
  @IsString()
  AI_MODEL: string = '';

  /**
   * Cost fuse in USD per calendar month (Vietnam time), estimated from the tokens in `ai_generations`. Once reached,
   * every request gets the procedural generator until the next month. Empty = no limit.
   */
  @Matches(/^(\d+(\.\d+)?)?$/, { message: 'AI_MONTHLY_BUDGET_USD must be a number of USD such as 20 or 7.5, or empty' })
  AI_MONTHLY_BUDGET_USD: string = '';

  @IsInt()
  @Min(1000)
  AI_TIMEOUT_MS: number = 30000;

  /**
   * `true` = `POST /payments/:id/simulate-confirm` marks a payment paid without a bank transfer, and the checkout shows
   * "Giả lập đã thanh toán" (CP4 demo, docs/17 M6). Keep `false` wherever real money is taken.
   */
  @IsIn(['true', 'false'])
  PAYMENT_SIMULATION: string = 'false';

  /** Account on the VietQR codes: 6-digit NAPAS BIN of the bank. All three empty = a sample account labelled "Mô phỏng". */
  @Matches(/^(\d{6})?$/, { message: 'VIETQR_BANK_BIN must be the 6-digit NAPAS BIN of the bank, or empty' })
  VIETQR_BANK_BIN: string = '';

  @Matches(/^[0-9A-Za-z]{0,19}$/, { message: 'VIETQR_ACCOUNT_NO must be letters and digits only (at most 19), or empty' })
  VIETQR_ACCOUNT_NO: string = '';

  /** Account holder as the bank shows it, upper case without accents, e.g. CONG TY WRAPFIT. */
  @IsString()
  VIETQR_ACCOUNT_NAME: string = '';

  /** `json` = one JSON object per log line (log collectors), `text` = readable. Empty = json in production. */
  @IsIn(['', 'json', 'text'])
  LOG_FORMAT: string = '';

  /** `true` behind a reverse proxy (Caddy in production): rate limits and sessions use the client IP. */
  @IsIn(['true', 'false'])
  TRUST_PROXY: string = 'false';

  /** Redis for the BullMQ queues (export). `rediss://` enables TLS. */
  @IsString()
  @IsNotEmpty()
  REDIS_URL: string = 'redis://localhost:6379';

  /** How many export jobs one worker process renders in parallel. */
  @IsInt()
  @Min(1)
  @Max(16)
  EXPORT_CONCURRENCY: number = 2;

  /**
   * SMTP relay of the worker (verify-email and reset-password messages). The defaults are Mailpit from
   * docker-compose.yml: every message is caught and shown at http://localhost:8025, nothing leaves the machine.
   */
  @IsString()
  @IsNotEmpty()
  SMTP_HOST: string = 'localhost';

  @IsInt()
  @Min(1)
  @Max(65535)
  SMTP_PORT: number = 1025;

  /** `true` = implicit TLS (port 465). `false` = plain, upgraded with STARTTLS when the server offers it (587). */
  @IsIn(['true', 'false'])
  SMTP_SECURE: string = 'false';

  /** Both empty = no authentication (Mailpit). */
  @IsString()
  SMTP_USER: string = '';

  @IsString()
  SMTP_PASS: string = '';

  /** Sender shown to users; its domain needs SPF/DKIM records at the provider in production. */
  @IsString()
  @IsNotEmpty()
  MAIL_FROM: string = 'WrapFit <no-reply@wrapfit.local>';
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n - ');
    throw new Error(`Invalid environment variables:\n - ${details}`);
  }
  if (!validated.GOOGLE_CLIENT_ID !== !validated.GOOGLE_CLIENT_SECRET) {
    throw new Error(
      'Invalid environment variables:\n - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set together (or both left empty)',
    );
  }
  if (validated.AUTH_TOKEN_SECRET && validated.AUTH_TOKEN_SECRET.length < 32) {
    throw new Error('Invalid environment variables:\n - AUTH_TOKEN_SECRET must be at least 32 characters (or empty)');
  }
  if (!validated.SMTP_USER !== !validated.SMTP_PASS) {
    throw new Error('Invalid environment variables:\n - SMTP_USER and SMTP_PASS must be set together (or both left empty)');
  }
  if (validated.STORAGE_BUCKET) {
    const missing = (['STORAGE_ACCESS_KEY_ID', 'STORAGE_SECRET_ACCESS_KEY', 'STORAGE_PUBLIC_URL'] as const).filter(
      (key) => !validated[key],
    );
    if (missing.length) {
      throw new Error(`Invalid environment variables:\n - STORAGE_BUCKET is set, so ${missing.join(', ')} must be set too`);
    }
  }
  const cloudinary = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const;
  if (cloudinary.some((key) => validated[key]) && !cloudinary.every((key) => validated[key])) {
    throw new Error(
      'Invalid environment variables:\n - CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET must be set together (or all left empty)',
    );
  }
  const vietqr = ['VIETQR_BANK_BIN', 'VIETQR_ACCOUNT_NO', 'VIETQR_ACCOUNT_NAME'] as const;
  if (vietqr.some((key) => validated[key]) && !vietqr.every((key) => validated[key])) {
    throw new Error(
      'Invalid environment variables:\n - VIETQR_BANK_BIN, VIETQR_ACCOUNT_NO and VIETQR_ACCOUNT_NAME must be set together (or all left empty)',
    );
  }
  if (!config.AI_MODEL_FAST && validated.AI_MODEL) validated.AI_MODEL_FAST = validated.AI_MODEL;
  return validated;
}
