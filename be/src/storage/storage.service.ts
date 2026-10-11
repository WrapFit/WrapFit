import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { FilePurpose, Prisma } from '@prisma/client';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConfigService } from '../common';
import { PrismaService } from '../shared/prisma';
import type { IProjectFiles, ProjectFile, UploadPurpose } from '../projects';
import { assetUrl, configureAssetBase, PRIVATE_KEY_PREFIX, uploadKeyOf } from './asset-keys';
import { PresignUploadDto } from './dto/presign-upload.dto';
import {
  CONFIRM_UPLOADS_AFTER_MS,
  DOWNLOAD_ONLY_TYPES,
  PENDING_UPLOAD_RESERVE_MS,
  STORAGE_QUOTA_BYTES,
  UPLOAD_RULES,
  UPLOAD_URL_TTL_SECONDS,
} from './storage.rules';

export interface PresignedUpload {
  fileId: string;
  key: string;
  /** PUT the raw file here, with exactly the headers below, before `expiresIn` seconds. */
  uploadUrl: string;
  method: 'PUT';
  /** Signed into the URL: a PUT without one of them, or with another value, is refused (403). */
  headers: { 'Content-Type': string; 'Content-Disposition'?: string };
  /** Public URL of the file once uploaded (use it in canvasState, thumbnailUrl, avatarUrl...). */
  fileUrl: string;
  expiresIn: number;
}

const DELETE_BATCH = 1000; // S3 DeleteObjects limit

/** 400 for a URL of another site where only files of WrapFit may go (thumbnail, avatar, canvas, unboxing music). */
export const fileUrlNotAllowed = () =>
  new BadRequestException({
    code: 'FILE_URL_NOT_ALLOWED',
    message: 'Only files uploaded to WrapFit can be used here (POST /api/storage/presigned-upload)',
  });
const fileNotOwned = () =>
  new BadRequestException({ code: 'FILE_NOT_OWNED', message: 'This file is not one of your uploads' });
/** Rows handled per maintenance run (StorageMaintenanceTask); the rest wait for the next run. */
const MAINTENANCE_BATCH = 200;
/** A bucket object that still cannot be deleted after this many retries is left for an operator (logged). */
const MAX_DELETE_ATTEMPTS = 10;

/** Prisma client or transaction client: quota reads run inside the transaction that records the upload. */
type Db = Prisma.TransactionClient;

/**
 * S3-compatible object storage (Cloudflare R2 in production, SeaweedFS locally). The browser uploads directly
 * with a pre-signed PUT URL whose signature locks the Content-Type and Content-Length, so the API never
 * streams file bytes. Disabled (503) while STORAGE_BUCKET is empty.
 *
 * Two buckets: STORAGE_BUCKET is readable by anyone at STORAGE_PUBLIC_URL (uploads, QR codes); keys under
 * PRIVATE_KEY_PREFIX (print exports) go to STORAGE_PRIVATE_BUCKET, which has no public URL.
 */
@Injectable()
export class StorageService implements IProjectFiles {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket: string;
  private readonly privateBucket: string;
  private readonly publicUrl: string;
  private readonly client?: S3Client;
  /** Signs URLs with the address the browser uses (may differ from the server's, e.g. inside Docker). */
  private readonly signer?: S3Client;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.bucket = config.get('storage.bucket');
    this.privateBucket = config.get('storage.privateBucket') || this.bucket;
    this.publicUrl = config.get('storage.publicUrl').replace(/\/+$/, '');
    // Keys are turned into URLs only while storage is enabled (no bucket = no file can exist).
    configureAssetBase(this.bucket ? this.publicUrl : '');
    if (!this.bucket) return;
    if (this.privateBucket === this.bucket) {
      this.logger.warn(
        'STORAGE_PRIVATE_BUCKET is empty: print exports are stored in the public bucket, readable at STORAGE_PUBLIC_URL by anyone who learns their key',
      );
    }

    const endpoint = config.get('storage.endpoint') || undefined;
    const base: S3ClientConfig = {
      region: config.get('storage.region'),
      forcePathStyle: config.get('storage.forcePathStyle'),
      credentials: {
        accessKeyId: config.get('storage.accessKeyId'),
        secretAccessKey: config.get('storage.secretAccessKey'),
      },
      // Newer SDKs add CRC32 checksums by default; browsers would have to send them, and R2 / SeaweedFS do not need them.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    };
    this.client = new S3Client({ ...base, endpoint });
    this.signer = new S3Client({ ...base, endpoint: config.get('storage.publicEndpoint') || endpoint });
  }

  get enabled(): boolean {
    return this.client !== undefined;
  }

  async presignUpload(userId: string, dto: PresignUploadDto): Promise<PresignedUpload> {
    if (!this.signer) throw new ServiceUnavailableException('File upload is not configured');

    const rule = UPLOAD_RULES[dto.purpose];
    const extension = rule.types[dto.contentType];
    if (!extension) {
      throw new BadRequestException(`contentType must be one of: ${Object.keys(rule.types).join(', ')}`);
    }
    if (dto.size > rule.maxBytes) {
      throw new HttpException(
        `A ${dto.purpose} file can be at most ${rule.maxBytes / 1024 / 1024} MB`,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
    if (dto.projectId) await this.assertEditableProject(dto.projectId, userId);

    const key = `users/${userId}/${dto.purpose.toLowerCase()}/${randomUUID()}.${extension}`;
    // Check and reserve the space in one transaction, serialized per user: parallel requests cannot all pass the check.
    const file = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(4801, hashtext(${userId}))`;
      await this.assertQuota(tx, userId, dto.size);
      return tx.storedFile.create({
        data: { userId, projectId: dto.projectId, key, purpose: dto.purpose, contentType: dto.contentType, size: dto.size },
        select: { id: true },
      });
    });

    const disposition = DOWNLOAD_ONLY_TYPES.has(dto.contentType) ? 'attachment' : undefined;
    const uploadUrl = await getSignedUrl(
      this.signer,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: dto.contentType,
        ContentLength: dto.size,
        ContentDisposition: disposition,
      }),
      {
        expiresIn: UPLOAD_URL_TTL_SECONDS,
        signableHeaders: new Set(['content-type', 'content-length', ...(disposition ? ['content-disposition'] : [])]),
      },
    );

    return {
      fileId: file.id,
      key,
      uploadUrl,
      method: 'PUT',
      headers: { 'Content-Type': dto.contentType, ...(disposition && { 'Content-Disposition': disposition }) },
      fileUrl: assetUrl(key)!,
      expiresIn: UPLOAD_URL_TTL_SECONDS,
    };
  }

  /**
   * Stores a file generated by the backend (e.g. a QR code) and records it like an upload, so it counts in the
   * owner's usage and is deleted with its project. Writing the same key again replaces the file.
   * Returns false while storage is not configured.
   */
  async putGeneratedFile(file: {
    userId: string;
    projectId?: string;
    key: string;
    purpose: FilePurpose;
    contentType: string;
    body: Buffer;
  }): Promise<boolean> {
    if (!this.client) return false;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketOf(file.key),
        Key: file.key,
        ContentType: file.contentType,
        Body: file.body,
      }),
    );
    const record = {
      userId: file.userId,
      projectId: file.projectId,
      purpose: file.purpose,
      contentType: file.contentType,
      size: file.body.length,
      confirmedAt: new Date(), // written by the server itself: it exists
    };
    await this.prisma.storedFile.upsert({
      where: { key: file.key },
      create: { key: file.key, ...record },
      update: record,
    });
    return true;
  }

  /**
   * Key of a file uploaded by a user (`users/...`) from its public URL, or null for any other URL. The scheme is
   * ignored (clients may store the https form of the URL).
   */
  uploadedKeyOf(url: string): string | null {
    return uploadKeyOf(url);
  }

  /**
   * Key of the upload behind `url`, to store as a thumbnail, preview, avatar or logo: the URL must be an upload of
   * WrapFit made by `userId` for one of `purposes` (no hot-linking of other sites or of other users' files).
   */
  async resolveUpload(url: string, userId: string, purposes: UploadPurpose[]): Promise<string> {
    const key = uploadKeyOf(url);
    if (!key) throw fileUrlNotAllowed();
    const file = await this.prisma.storedFile.findUnique({ where: { key }, select: { userId: true, purpose: true } });
    if (file?.userId !== userId || !purposes.includes(file.purpose as UploadPurpose)) throw fileNotOwned();
    return key;
  }

  /**
   * Forgets the avatar or logo a user just replaced or removed, inside the transaction that changed it, and returns
   * its key to delete from the bucket after the commit (`deleteObjects`); null when the file must stay. Only an
   * upload made for that slot (AVATAR, LOGO) and owned by no project is removed: an IMAGE may also be a project
   * thumbnail or snapshot preview, and a logo still shown on a canvas is kept by `project_file_refs`.
   */
  async forgetProfileUpload(db: Db, userId: string, key: string, purpose: 'AVATAR' | 'LOGO'): Promise<string | null> {
    const { count } = await db.storedFile.deleteMany({
      where: { key, userId, purpose, projectId: null, refs: { none: {} } },
    });
    return count ? key : null;
  }

  /**
   * A saved canvas may show the caller's own logos and images, and the uploads it already showed (a remix keeps the
   * images of the original author). Anything else is refused: pointing at another user's file would keep it alive
   * after its owner deleted it.
   */
  async assertCanvasUploads(keys: string[], userId: string, alreadyShown: string[]): Promise<void> {
    const shown = new Set(alreadyShown);
    const added = keys.filter((key) => !shown.has(key));
    if (!added.length) return;
    const owned = await this.prisma.storedFile.count({
      where: { key: { in: added }, userId, purpose: { in: ['LOGO', 'IMAGE'] } },
    });
    if (owned !== added.length) throw fileNotOwned();
  }

  /** Downloads a file from the bucket (print exports embed the user's images). */
  async getObject(key: string): Promise<{ body: Buffer; contentType: string }> {
    if (!this.client) throw new ServiceUnavailableException('File storage is not configured');
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucketOf(key), Key: key }));
    const bytes = await result.Body!.transformToByteArray();
    return { body: Buffer.from(bytes), contentType: result.ContentType ?? 'application/octet-stream' };
  }

  /** Short-lived download link that saves the file under `fileName` (print exports). */
  presignDownload(key: string, fileName: string, expiresIn: number): Promise<string> {
    if (!this.signer) throw new ServiceUnavailableException('File storage is not configured');
    return getSignedUrl(
      this.signer,
      new GetObjectCommand({
        Bucket: this.bucketOf(key),
        Key: key,
        ResponseContentDisposition: `attachment; filename="${fileName.replace(/[^\w.-]/g, '_')}"`,
      }),
      { expiresIn },
    );
  }

  /**
   * Counts confirmed files, plus recent uploads not confirmed yet (their space is reserved while the browser
   * uploads). Uploads that never happened stop counting after PENDING_UPLOAD_RESERVE_MS and are then removed.
   */
  async usage(userId: string, db: Db = this.prisma) {
    const pendingSince = new Date(Date.now() - PENDING_UPLOAD_RESERVE_MS);
    const [user, files] = await Promise.all([
      db.user.findUniqueOrThrow({ where: { id: userId }, select: { subscriptionTier: true } }),
      db.storedFile.aggregate({
        where: { userId, OR: [{ confirmedAt: { not: null } }, { createdAt: { gt: pendingSince } }] },
        _sum: { size: true },
        _count: true,
      }),
    ]);
    return {
      tier: user.subscriptionTier,
      usedBytes: files._sum.size ?? 0,
      quotaBytes: STORAGE_QUOTA_BYTES[user.subscriptionTier],
      fileCount: files._count,
    };
  }

  async detachSharedFiles(projectIds: string[]): Promise<void> {
    if (!projectIds.length) return;
    // The file moves to the oldest other project that shows it (a copy or a remix): it is then deleted with the last
    // project that shows it, instead of staying in the bucket with no project at all. Its owner and quota stay.
    // A remix that starts showing a file after this statement makes the deletion of the projects fail on the foreign
    // key instead of deleting a file it shows (the next run retries).
    await this.prisma.$executeRaw`
      UPDATE stored_files f SET project_id = heir.project_id
      FROM (
        SELECT DISTINCT ON (r.stored_file_id) r.stored_file_id, r.project_id
        FROM project_file_refs r JOIN packaging_projects p ON p.id = r.project_id
        WHERE r.project_id <> ALL(${projectIds}::uuid[])
        ORDER BY r.stored_file_id, p.created_at, p.id
      ) heir
      WHERE heir.stored_file_id = f.id AND f.project_id = ANY(${projectIds}::uuid[])`;
  }

  /**
   * Prepares the deletion of a user and returns the keys of the objects to delete afterwards: their uploads and the
   * generated files of their projects. Uploads that projects of other users still show (remixes) are handed over to
   * the oldest of those projects and its owner, file and quota included: they survive the deletion and go with the
   * last project that shows them.
   */
  async releaseUserFiles(userId: string): Promise<string[]> {
    await this.prisma.$executeRaw`
      UPDATE stored_files f SET user_id = heir.user_id, project_id = heir.project_id
      FROM (
        SELECT DISTINCT ON (r.stored_file_id) r.stored_file_id, r.project_id, p.user_id
        FROM project_file_refs r JOIN packaging_projects p ON p.id = r.project_id
        WHERE p.user_id <> ${userId}::uuid
        ORDER BY r.stored_file_id, p.created_at, p.id
      ) heir
      WHERE heir.stored_file_id = f.id
        AND (f.user_id = ${userId}::uuid
             OR f.project_id IN (SELECT id FROM packaging_projects WHERE user_id = ${userId}::uuid))`;
    const rows = await this.prisma.$queryRaw<{ key: string }[]>`
      SELECT f.key FROM stored_files f
      LEFT JOIN packaging_projects owner ON owner.id = f.project_id
      WHERE f.user_id = ${userId}::uuid OR owner.user_id = ${userId}::uuid`;
    return rows.map((row) => row.key);
  }

  listProjectFiles(projectIds: string[]): Promise<ProjectFile[]> {
    if (!projectIds.length) return Promise.resolve([]);
    return this.prisma.storedFile.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true, key: true },
    }) as Promise<ProjectFile[]>;
  }

  /**
   * Never throws: a file that could not be deleted only costs storage, it must not block a project deletion.
   * Keys that failed are recorded in `orphaned_objects` and retried by StorageMaintenanceTask.
   */
  async deleteObjects(keys: string[]): Promise<void> {
    const failed = await this.tryDeleteObjects(keys);
    if (!failed.length) return;
    try {
      await this.prisma.orphanedObject.createMany({
        data: failed.map(({ key, error }) => ({ key, lastError: error.slice(0, 1000) })),
        skipDuplicates: true,
      });
    } catch (error) {
      this.logger.error(
        `Could not record ${failed.length} undeleted file(s): ${failed.map((f) => f.key).join(', ')}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Called by StorageMaintenanceTask. Checks the uploads whose pre-signed URL has expired: the row is confirmed with
   * the real size when the object exists, and deleted when the browser never uploaded it (it would otherwise count
   * against the quota forever).
   */
  async confirmPendingUploads(now = new Date()): Promise<{ confirmed: number; dropped: number }> {
    const result = { confirmed: 0, dropped: 0 };
    if (!this.client) return result;
    const pending = await this.prisma.storedFile.findMany({
      where: { confirmedAt: null, createdAt: { lt: new Date(now.getTime() - CONFIRM_UPLOADS_AFTER_MS) } },
      select: { id: true, key: true },
      orderBy: { createdAt: 'asc' },
      take: MAINTENANCE_BATCH,
    });
    for (const file of pending) {
      const size = await this.objectSize(file.key);
      if (size === undefined) continue; // storage unreachable: next run
      if (size === null || size === 0) {
        // An empty object is an upload that never completed (and would break `size > 0`): drop it like a missing one.
        // A canvas saved before the upload finished may point at it: its refs go in the same statement.
        const count = await this.prisma.$executeRaw`
          WITH refs AS (
            DELETE FROM project_file_refs r
            USING stored_files f
            WHERE r.stored_file_id = f.id AND f.id = ${file.id}::uuid AND f.confirmed_at IS NULL
          )
          DELETE FROM stored_files WHERE id = ${file.id}::uuid AND confirmed_at IS NULL`;
        result.dropped += count;
        if (count && size === 0) {
          await this.prisma.orphanedObject.upsert({ where: { key: file.key }, create: { key: file.key }, update: {} });
        }
      } else {
        await this.prisma.storedFile.updateMany({ where: { id: file.id }, data: { confirmedAt: now, size } });
        result.confirmed++;
      }
    }
    return result;
  }

  /** Called by StorageMaintenanceTask: retries deleting orphaned objects. Returns how many are gone. */
  async retryOrphanedObjects(): Promise<number> {
    if (!this.client) return 0;
    const orphans = await this.prisma.orphanedObject.findMany({
      where: { attempts: { lt: MAX_DELETE_ATTEMPTS } },
      select: { key: true },
      orderBy: { createdAt: 'asc' },
      take: MAINTENANCE_BATCH,
    });
    if (!orphans.length) return 0;

    const failed = await this.tryDeleteObjects(orphans.map((orphan) => orphan.key));
    const failedKeys = new Set(failed.map((f) => f.key));
    const deleted = orphans.map((orphan) => orphan.key).filter((key) => !failedKeys.has(key));
    if (deleted.length) await this.prisma.orphanedObject.deleteMany({ where: { key: { in: deleted } } });
    for (const { key, error } of failed) {
      const row = await this.prisma.orphanedObject.update({
        where: { key },
        data: { attempts: { increment: 1 }, lastError: error.slice(0, 1000) },
        select: { attempts: true },
      });
      if (row.attempts >= MAX_DELETE_ATTEMPTS) this.logger.error(`Giving up deleting ${key}: ${error}`);
    }
    return deleted.length;
  }

  /** Deletes objects in batches (per bucket) and returns the keys that could not be deleted, with the reason. */
  private async tryDeleteObjects(keys: string[]): Promise<{ key: string; error: string }[]> {
    if (!this.client || !keys.length) return [];
    const failed: { key: string; error: string }[] = [];
    const batches: { bucket: string; keys: string[] }[] = [];
    for (const bucket of new Set([this.bucket, this.privateBucket])) {
      const bucketKeys = keys.filter((key) => this.bucketOf(key) === bucket);
      for (let i = 0; i < bucketKeys.length; i += DELETE_BATCH) {
        batches.push({ bucket, keys: bucketKeys.slice(i, i + DELETE_BATCH) });
      }
    }
    for (const { bucket, keys: batch } of batches) {
      try {
        const result = await this.client.send(
          new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true } }),
        );
        for (const error of result.Errors ?? []) {
          this.logger.warn(`Could not delete ${error.Key}: ${error.Message}`);
          if (error.Key) failed.push({ key: error.Key, error: error.Message ?? 'unknown error' });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Could not delete ${batch.length} file(s): ${message}`);
        failed.push(...batch.map((key) => ({ key, error: message })));
      }
    }
    return failed;
  }

  /** Size of an object in bytes, `null` when it does not exist, `undefined` when storage could not be reached. */
  private async objectSize(key: string): Promise<number | null | undefined> {
    try {
      const head = await this.client!.send(new HeadObjectCommand({ Bucket: this.bucketOf(key), Key: key }));
      return head.ContentLength ?? 0;
    } catch (error) {
      if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return null;
      this.logger.warn(`Could not check ${key}: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }

  /** Print exports (PRIVATE_KEY_PREFIX) live in the bucket without a public URL; everything else in the public one. */
  private bucketOf(key: string): string {
    return key.startsWith(PRIVATE_KEY_PREFIX) ? this.privateBucket : this.bucket;
  }

  private async assertEditableProject(projectId: string, userId: string): Promise<void> {
    const project = await this.prisma.packagingProject.findUnique({
      where: { id: projectId },
      select: { userId: true, status: true },
    });
    if (project?.userId !== userId) throw new NotFoundException('Project not found');
    if (project.status === 'DELETED') {
      throw new ConflictException('Restore the project from the trash before uploading files to it');
    }
  }

  private async assertQuota(db: Db, userId: string, size: number): Promise<void> {
    const { usedBytes, quotaBytes } = await this.usage(userId, db);
    if (usedBytes + size > quotaBytes) {
      throw new ForbiddenException(
        `Storage quota exceeded: ${Math.ceil(usedBytes / 1024 / 1024)} MB of ${quotaBytes / 1024 / 1024} MB used`,
      );
    }
  }
}
