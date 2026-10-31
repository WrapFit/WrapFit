import { AI_IMAGE_MODELS, type AiImageModelKey } from '@wrapfit/shared';
import { splitList, type EnvironmentVariables } from '../env.validation';

/**
 * Every setting of the application, built from the validated environment (env.validation.ts). The NODE_ENV files next
 * to this one (development / production / test) override parts of it. Read it with the ConfigService of CommonModule:
 * `config.get('auth.jwt.accessTtlSeconds')` is a number.
 */
export const config = (env: EnvironmentVariables) => ({
  app: {
    env: env.NODE_ENV,
    port: env.PORT,
    /** Where the browser lands after Google login and where email links point (the Next.js frontend). */
    frontendUrl: env.FRONTEND_URL,
    corsOrigins: env.CORS_ORIGINS,
    /** Behind a reverse proxy (Caddy in production): rate limits and sessions use the client IP. */
    trustProxy: env.TRUST_PROXY === 'true',
    swaggerEnabled: env.SWAGGER_ENABLED === 'true',
  },
  auth: {
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
      accessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
      refreshTtlSeconds: env.JWT_REFRESH_TTL_SECONDS,
    },
    /** Derives the links of verify / reset emails. JWT_REFRESH_SECRET for .env files written before it existed. */
    tokenSecret: env.AUTH_TOKEN_SECRET || env.JWT_REFRESH_SECRET,
    bcryptRounds: env.BCRYPT_ROUNDS,
    /** `Secure` flag on auth cookies. COOKIE_SECURE empty = off here, on in production (envs/production.ts). */
    cookieSecure: env.COOKIE_SECURE === 'true',
    /** Both empty = "Sign in with Google" disabled. */
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackUrl: env.GOOGLE_CALLBACK_URL,
    },
  },
  throttle: {
    ttlSeconds: env.THROTTLE_TTL_SECONDS,
    limit: env.THROTTLE_LIMIT,
  },
  /** S3-compatible object storage. `bucket` empty = uploads disabled. */
  storage: {
    endpoint: env.STORAGE_ENDPOINT,
    publicEndpoint: env.STORAGE_PUBLIC_ENDPOINT,
    region: env.STORAGE_REGION,
    bucket: env.STORAGE_BUCKET,
    /** No public URL: print exports. Empty = `bucket`. */
    privateBucket: env.STORAGE_PRIVATE_BUCKET,
    accessKeyId: env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
    publicUrl: env.STORAGE_PUBLIC_URL,
    forcePathStyle: env.STORAGE_FORCE_PATH_STYLE === 'true',
    /** Encrypted database dumps, written by the backup job. Empty = none. */
    backupBucket: env.STORAGE_BACKUP_BUCKET,
  },
  /** Public image CDN (shared/cloudinary). `cloudName` empty = disabled. */
  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
    folder: env.CLOUDINARY_FOLDER,
  },
  /**
   * `anthropicApiKey` empty = built-in procedural patterns only (and AI image prompts sent as typed). `monthlyBudgetUsd`
   * null = no cost fuse.
   */
  ai: {
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    models: { fast: env.AI_MODEL_FAST, premium: env.AI_MODEL_PREMIUM },
    timeoutMs: env.AI_TIMEOUT_MS,
    monthlyBudgetUsd: env.AI_MONTHLY_BUDGET_USD ? Number(env.AI_MONTHLY_BUDGET_USD) : null,
    /** AI images paid with xu (docs/19). `enabled` false = the routes answer 503 and the studio hides the panel. */
    image: {
      provider: env.AI_IMAGE_PROVIDER as 'fal' | 'fake',
      falKey: env.FAL_KEY,
      enabled: env.AI_IMAGE_PROVIDER === 'fake' || env.FAL_KEY !== '',
      models: (env.AI_IMAGE_MODELS
        ? splitList(env.AI_IMAGE_MODELS)
        : AI_IMAGE_MODELS.filter((model) => model.enabled).map((model) => model.key)) as AiImageModelKey[],
      timeoutMs: env.AI_IMAGE_TIMEOUT_MS,
      concurrency: env.AI_IMAGE_CONCURRENCY,
    },
    usdVndRate: env.USD_VND_RATE,
  },
  /**
   * `simulation` = payments can be confirmed by a button instead of a bank transfer (CP4 demo). `vietqr` null = the
   * sample account of payments/vietqr.ts, shown as "Mô phỏng".
   */
  payments: {
    simulation: env.PAYMENT_SIMULATION === 'true',
    vietqr: env.VIETQR_BANK_BIN
      ? { bankBin: env.VIETQR_BANK_BIN, accountNo: env.VIETQR_ACCOUNT_NO, accountName: env.VIETQR_ACCOUNT_NAME }
      : null,
  },
  redis: {
    url: env.REDIS_URL,
  },
  export: {
    concurrency: env.EXPORT_CONCURRENCY,
  },
  mail: {
    from: env.MAIL_FROM,
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE === 'true',
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  },
});
