import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { CommonModule, ConfigService } from './common';
import { configuration, validateEnv } from './config';

/**
 * Checks the file storage of the environment before the app depends on it: each R2 / S3 bucket of the STORAGE_*
 * variables (public, private, backup) is reachable with the API token. Reads only, writes nothing.
 *   npm --workspace=be run storage:check                       (development, reads be/.env)
 *   docker compose exec backend node dist/storage-check.js     (production container)
 * Exit code 0 = every configured bucket answered; a bucket left empty is reported as skipped.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv, load: [configuration] }),
    CommonModule,
  ],
})
class StorageCheckModule {}

function reason(error: unknown): string {
  // Node reports an unreachable host as an AggregateError of one connection error per address (IPv4, IPv6).
  if (error instanceof AggregateError && error.errors.length) return reason(error.errors[0]);
  if (!(error instanceof Error)) return String(error);
  return error.message && error.message !== error.name ? `${error.name}: ${error.message}` : error.name;
}

/**
 * HeadBucket answers without a body, so the SDK only knows the status and reports "UnknownError": name its usual
 * cause instead (R2 meanings, https://developers.cloudflare.com/r2/api/error-codes/).
 */
const HEAD_BUCKET_HINTS: Record<number, string> = {
  400: 'access key or bucket name malformed',
  401: 'access key not recognised',
  403: 'token has no access to this bucket, or secret key wrong',
  404: 'no bucket with this name',
};

async function checkBuckets(config: ConfigService): Promise<boolean> {
  const buckets = {
    STORAGE_BUCKET: config.get('storage.bucket'),
    STORAGE_PRIVATE_BUCKET: config.get('storage.privateBucket'),
    STORAGE_BACKUP_BUCKET: config.get('storage.backupBucket'),
  };
  if (!buckets.STORAGE_BUCKET) {
    console.log('R2 / S3: skipped (STORAGE_BUCKET is empty, uploads disabled)');
    return true;
  }
  const endpoint = config.get('storage.endpoint') || undefined;
  console.log(`R2 / S3: ${endpoint ?? 'AWS S3'} (region ${config.get('storage.region')})`);
  const client = new S3Client({
    endpoint,
    region: config.get('storage.region'),
    forcePathStyle: config.get('storage.forcePathStyle'),
    credentials: {
      accessKeyId: config.get('storage.accessKeyId'),
      secretAccessKey: config.get('storage.secretAccessKey'),
    },
  });

  let ok = true;
  try {
    for (const [variable, bucket] of Object.entries(buckets)) {
      if (!bucket) {
        console.log(`  ${variable}: skipped (empty)`);
        continue;
      }
      try {
        await client.send(new HeadBucketCommand({ Bucket: bucket }));
        console.log(`  ${variable} "${bucket}": OK`);
      } catch (error) {
        const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
        const cause = (status && HEAD_BUCKET_HINTS[status]) || reason(error);
        console.error(`  ${variable} "${bucket}": failed${status ? ` (HTTP ${status})` : ''}, ${cause}`);
        ok = false;
      }
    }
  } finally {
    client.destroy();
  }
  return ok;
}

async function main(): Promise<number> {
  const app = await NestFactory.createApplicationContext(StorageCheckModule, { logger: ['error', 'warn'] });
  try {
    return (await checkBuckets(app.get(ConfigService))) ? 0 : 1;
  } finally {
    await app.close();
  }
}

main().then((code) => process.exit(code));
