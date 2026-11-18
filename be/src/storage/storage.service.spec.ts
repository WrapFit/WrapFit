import { Prisma } from '@prisma/client';
import { BadRequestException, ForbiddenException, HttpStatus, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { readFileSync } from 'fs';
import type { ConfigService } from '../common';
import type { PrismaService } from '../shared/prisma';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  const env = (overrides: Record<string, string | boolean> = {}) =>
    ({
      get: (key: string) =>
        ({
          'storage.endpoint': 'http://127.0.0.1:8333',
          'storage.publicEndpoint': 'http://cdn.local:8333',
          'storage.region': 'us-east-1',
          'storage.bucket': 'wrapfit',
          'storage.accessKeyId': 'key',
          'storage.secretAccessKey': 'secret',
          'storage.publicUrl': 'https://cdn.wrapfit.vn/',
          'storage.forcePathStyle': true,
          ...overrides,
        })[key] ?? '',
    }) as unknown as ConfigService;

  let prisma: {
    storedFile: Record<string, jest.Mock>;
    user: Record<string, jest.Mock>;
    packagingProject: Record<string, jest.Mock>;
    orphanedObject: Record<string, jest.Mock>;
    $transaction: jest.Mock;
    $executeRaw: jest.Mock;
  };
  const build = (overrides?: Record<string, string | boolean>) => new StorageService(env(overrides), prisma as unknown as PrismaService);

  beforeEach(() => {
    prisma = {
      storedFile: {
        create: jest.fn().mockResolvedValue({ id: 'file-1' }),
        aggregate: jest.fn().mockResolvedValue({ _sum: { size: 10 * 1024 * 1024 }, _count: 3 }),
      },
      user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ subscriptionTier: 'FREE' }) },
      packagingProject: { findUnique: jest.fn() },
      orphanedObject: { createMany: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn(), update: jest.fn() },
      // Interactive transaction: the callback receives the same mocks as its transaction client.
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
      $executeRaw: jest.fn(),
    };
  });
  /** Replaces the S3 client calls of a service: `send` receives the SDK command objects. */
  const mockS3 = (service: StorageService, send: (command: { input: unknown }) => unknown) =>
    jest.spyOn(service['client']!, 'send').mockImplementation(send as never);

  it('answers 503 while storage is not configured', async () => {
    const service = build({ 'storage.bucket': '' });
    expect(service.enabled).toBe(false);
    await expect(service.presignUpload('u-1', { purpose: 'LOGO', contentType: 'image/png', size: 100 })).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('signs a PUT locked to the declared type and size, on the public endpoint', async () => {
    const result = await build().presignUpload('u-1', { purpose: 'LOGO', contentType: 'image/svg+xml', size: 2048 });

    expect(result.key).toMatch(/^users\/u-1\/logo\/[0-9a-f-]{36}\.svg$/);
    expect(result.fileUrl).toBe(`https://cdn.wrapfit.vn/${result.key}`);
    const url = new URL(result.uploadUrl);
    expect(url.origin).toBe('http://cdn.local:8333');
    expect(url.pathname).toBe(`/wrapfit/${result.key}`);
    // An SVG is stored as a download (scripts in it never run on the CDN domain): the disposition is signed too.
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('content-disposition;content-length;content-type;host');
    expect(result.headers).toEqual({ 'Content-Type': 'image/svg+xml', 'Content-Disposition': 'attachment' });
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(prisma.storedFile.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'u-1', size: 2048, purpose: 'LOGO' }) }),
    );
  });

  it('lets raster images be shown inline', async () => {
    const result = await build().presignUpload('u-1', { purpose: 'IMAGE', contentType: 'image/png', size: 100 });
    expect(new URL(result.uploadUrl).searchParams.get('X-Amz-SignedHeaders')).toBe('content-length;content-type;host');
    expect(result.headers).toEqual({ 'Content-Type': 'image/png' });
  });

  it('checks the format and the size of each kind of file', async () => {
    const service = build();
    await expect(service.presignUpload('u-1', { purpose: 'IMAGE', contentType: 'image/svg+xml', size: 1 })).rejects.toThrow(
      BadRequestException,
    );
    const tooBig = await service
      .presignUpload('u-1', { purpose: 'THUMBNAIL', contentType: 'image/webp', size: 3 * 1024 * 1024 })
      .catch((error) => error);
    expect(tooBig.getStatus()).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(prisma.storedFile.create).not.toHaveBeenCalled();
  });

  it('reserves the space under a per-user lock, and counts confirmed files plus uploads still in progress', async () => {
    await build().presignUpload('u-1', { purpose: 'IMAGE', contentType: 'image/png', size: 1024 });

    expect(prisma.$executeRaw).toHaveBeenCalled(); // pg_advisory_xact_lock, before the quota read
    expect(prisma.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.storedFile.aggregate.mock.invocationCallOrder[0],
    );
    expect(prisma.storedFile.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u-1', OR: [{ confirmedAt: { not: null } }, { createdAt: { gt: expect.any(Date) } }] },
      }),
    );
  });

  it('enforces the quota of the subscription tier', async () => {
    prisma.storedFile.aggregate.mockResolvedValue({ _sum: { size: 95 * 1024 * 1024 }, _count: 40 });
    await expect(
      build().presignUpload('u-1', { purpose: 'IMAGE', contentType: 'image/png', size: 6 * 1024 * 1024 }),
    ).rejects.toThrow(ForbiddenException);

    prisma.user.findUniqueOrThrow.mockResolvedValue({ subscriptionTier: 'STARTER' });
    await expect(
      build().presignUpload('u-1', { purpose: 'IMAGE', contentType: 'image/png', size: 6 * 1024 * 1024 }),
    ).resolves.toMatchObject({ fileId: 'file-1' });
  });

  it('forgets a replaced avatar or logo only when it is a free upload of that slot', async () => {
    const tx = { storedFile: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) } };
    const service = build();
    await expect(service.forgetProfileUpload(tx as never, 'u-1', 'users/u-1/logo/a.png', 'LOGO')).resolves.toBe(
      'users/u-1/logo/a.png',
    );
    expect(tx.storedFile.deleteMany).toHaveBeenCalledWith({
      where: { key: 'users/u-1/logo/a.png', userId: 'u-1', purpose: 'LOGO', projectId: null, refs: { none: {} } },
    });

    // Shown on a canvas, attached to a project or uploaded as IMAGE: nothing matches, the file stays.
    tx.storedFile.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.forgetProfileUpload(tx as never, 'u-1', 'users/u-1/logo/a.png', 'LOGO')).resolves.toBeNull();
  });

  describe('maintenance', () => {
    it('deletes the uploads nothing has used for a day, rows first, then their objects', async () => {
      const service = build();
      const queryRaw = jest.fn().mockResolvedValue([{ key: 'users/u-1/logo/never-saved.png' }]);
      Object.assign(prisma, { $queryRaw: queryRaw });
      const send = jest.fn(async () => ({}));
      mockS3(service, send);
      const now = new Date('2026-10-12T10:00:00Z');

      await expect(service.dropUnusedUploads(now)).resolves.toBe(1);
      const [sql, ...values] = queryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
      for (const place of ['project_file_refs', 'avatar_key', 'logoKey', 'thumbnail_key', 'preview_key']) {
        expect(sql.join('?')).toContain(place);
      }
      expect(values[0]).toEqual(new Date('2026-10-11T10:00:00Z')); // made more than 24 hours ago
      expect(send).toHaveBeenCalledTimes(1);

      queryRaw.mockResolvedValue([]);
      send.mockClear();
      await expect(service.dropUnusedUploads(now)).resolves.toBe(0);
      expect(send).not.toHaveBeenCalled();
    });

    it('confirms uploads that exist with their real size and drops the ones never uploaded', async () => {
      const service = build();
      prisma.storedFile.findMany = jest.fn().mockResolvedValue([
        { id: 'f-1', key: 'users/u-1/image/a.png' },
        { id: 'f-2', key: 'users/u-1/image/never.png' },
        { id: 'f-3', key: 'users/u-1/image/later.png' },
      ]);
      prisma.storedFile.updateMany = jest.fn();
      prisma.$executeRaw.mockResolvedValue(1); // DELETE of the row (and its refs)
      mockS3(service, async (command) => {
        const key = (command.input as { Key: string }).Key;
        if (key.endsWith('a.png')) return { ContentLength: 4242 };
        if (key.endsWith('never.png')) {
          throw Object.assign(new Error('NotFound'), { $metadata: { httpStatusCode: 404 } });
        }
        throw new Error('socket hang up'); // storage unreachable: left for the next run
      });
      jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);

      await expect(service.confirmPendingUploads()).resolves.toEqual({ confirmed: 1, dropped: 1 });
      expect(prisma.storedFile.updateMany).toHaveBeenCalledWith({
        where: { id: 'f-1' },
        data: { confirmedAt: expect.any(Date), size: 4242 },
      });
      // One statement drops the refs of a canvas saved before the upload finished, then the unconfirmed row.
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      const [sql, ...params] = prisma.$executeRaw.mock.calls[0];
      expect(sql.join('?')).toMatch(
        /DELETE FROM project_file_refs[\s\S]*DELETE FROM stored_files WHERE id = \?::uuid AND confirmed_at IS NULL/,
      );
      expect(params).toContain('f-2');
    });

    it('drops an empty object like a missing one and queues its key for deletion', async () => {
      const service = build();
      prisma.storedFile.findMany = jest.fn().mockResolvedValue([{ id: 'f-1', key: 'users/u-1/image/empty.png' }]);
      prisma.storedFile.updateMany = jest.fn();
      prisma.$executeRaw.mockResolvedValue(1); // DELETE of the row (and its refs)
      prisma.orphanedObject.upsert = jest.fn();
      mockS3(service, async () => ({ ContentLength: 0 }));

      await expect(service.confirmPendingUploads()).resolves.toEqual({ confirmed: 0, dropped: 1 });
      expect(prisma.storedFile.updateMany).not.toHaveBeenCalled();
      expect(prisma.orphanedObject.upsert).toHaveBeenCalledWith({
        where: { key: 'users/u-1/image/empty.png' },
        create: { key: 'users/u-1/image/empty.png' },
        update: {},
      });
    });

    it('records objects it could not delete, and deletes them on a later run', async () => {
      const service = build();
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
      jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
      const send = mockS3(service, async () => {
        throw new Error('503 Slow Down');
      });

      await service.deleteObjects(['projects/p-1/a.png', 'projects/p-1/b.png']);
      expect(prisma.orphanedObject.createMany).toHaveBeenCalledWith({
        data: [
          { key: 'projects/p-1/a.png', lastError: '503 Slow Down' },
          { key: 'projects/p-1/b.png', lastError: '503 Slow Down' },
        ],
        skipDuplicates: true,
      });

      prisma.orphanedObject.findMany.mockResolvedValue([{ key: 'projects/p-1/a.png' }, { key: 'projects/p-1/b.png' }]);
      prisma.orphanedObject.update.mockResolvedValue({ attempts: 2 });
      const partial = { Errors: [{ Key: 'projects/p-1/b.png', Message: 'AccessDenied' }] };
      send.mockImplementation((async () => partial) as never);

      await expect(service.retryOrphanedObjects()).resolves.toBe(1);
      expect(prisma.orphanedObject.deleteMany).toHaveBeenCalledWith({ where: { key: { in: ['projects/p-1/a.png'] } } });
      expect(prisma.orphanedObject.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'projects/p-1/b.png' },
          data: expect.objectContaining({ lastError: 'AccessDenied' }),
        }),
      );
    });
  });

  describe('putGeneratedFile when the row cannot be written (docs/30 review round 4)', () => {
    const qr = { userId: 'u-1', projectId: 'p-1', key: 'projects/p-1/unboxing/qr-x.png', purpose: 'QR_CODE' as const, contentType: 'image/png', body: Buffer.from('qr') };
    const commands = (send: jest.SpyInstance) => send.mock.calls.map(([command]) => command.constructor.name);

    it('deletes the uploaded object when its project (or user) is gone: P2003', async () => {
      const service = build();
      const send = mockS3(service, async () => ({}));
      const gone = new Prisma.PrismaClientKnownRequestError('Foreign key constraint violated on the constraint: `stored_files_project_id_fkey`', {
        code: 'P2003',
        clientVersion: 'test',
      });
      prisma.storedFile.upsert = jest.fn().mockRejectedValue(gone);
      await expect(service.putGeneratedFile(qr)).rejects.toBe(gone);
      expect(commands(send)).toEqual(['PutObjectCommand', 'DeleteObjectsCommand']);
    });

    it('keeps the object on any other error: a row may already point at it', async () => {
      const service = build();
      const send = mockS3(service, async () => ({}));
      prisma.storedFile.upsert = jest.fn().mockRejectedValue(new Error('connection reset'));
      await expect(service.putGeneratedFile(qr)).rejects.toThrow('connection reset');
      expect(commands(send)).toEqual(['PutObjectCommand']);
    });
  });

  describe('private bucket (print exports)', () => {
    const exportKey = 'private/projects/p-1/exports/job-1.pdf';

    it('keeps private keys in the bucket without a public URL', async () => {
      const service = build({ 'storage.privateBucket': 'wrapfit-private' });
      const send = mockS3(service, async () => ({}));
      prisma.storedFile.upsert = jest.fn();

      await expect(
        service.putGeneratedFile({ userId: 'u-1', key: exportKey, purpose: 'EXPORT', contentType: 'application/pdf', body: Buffer.from('%PDF') }),
      ).resolves.toBe(true);
      await service.deleteObjects([exportKey, 'users/u-1/image/a.png']);

      const buckets = send.mock.calls.map(([command]) => (command.input as { Bucket: string }).Bucket);
      expect(buckets).toEqual(['wrapfit-private', 'wrapfit', 'wrapfit-private']);
      const download = new URL(await service.presignDownload(exportKey, 'hop.pdf', 900));
      expect(download.pathname).toBe(`/wrapfit-private/${exportKey}`);
    });

    it('falls back to the public bucket while STORAGE_PRIVATE_BUCKET is empty', async () => {
      const download = new URL(await build().presignDownload(exportKey, 'hop.pdf', 900));
      expect(download.pathname).toBe(`/wrapfit/${exportKey}`);
    });
  });

  it('recognizes the URLs of user uploads only (any scheme), for the print export', () => {
    const service = build();
    expect(service.uploadedKeyOf('https://cdn.wrapfit.vn/users/u-1/image/a.png')).toBe('users/u-1/image/a.png');
    expect(service.uploadedKeyOf('http://cdn.wrapfit.vn/users/u-1/logo/b%20c.svg?v=2')).toBe('users/u-1/logo/b c.svg');
    expect(service.uploadedKeyOf('https://cdn.wrapfit.vn/projects/p-1/exports/x.pdf')).toBeNull(); // not an upload
    expect(service.uploadedKeyOf('https://evil.example/users/u-1/image/a.png')).toBeNull();
    expect(service.uploadedKeyOf('https://cdn.wrapfit.vn.evil.example/users/a.png')).toBeNull();
    expect(build({ 'storage.bucket': '', 'storage.publicUrl': '' }).uploadedKeyOf('https://cdn.wrapfit.vn/users/a.png')).toBeNull();
  });

  describe('inspectFont (docs/23 S13)', () => {
    const playfair = readFileSync(require.resolve('@expo-google-fonts/playfair-display/400Regular/PlayfairDisplay_400Regular.ttf'));
    const url = 'https://cdn.wrapfit.vn/users/u-1/font/a.ttf';
    const inspect = (body: Buffer) => {
      const service = build();
      jest.spyOn(service, 'resolveUpload').mockResolvedValue('users/u-1/font/a.ttf');
      jest.spyOn(service, 'getObject').mockResolvedValue({ body, contentType: 'font/ttf' } as never);
      return service.inspectFont('u-1', url);
    };

    it('reads the family name of a font that draws Vietnamese', async () => {
      await expect(inspect(playfair)).resolves.toEqual({ url, family: 'Playfair Display' });
    });

    it('answers 422 FONT_UNREADABLE, not 500, for a font whose cmap table is broken (audit finding 22)', async () => {
      // The real Playfair file with every cmap subtable pointing past the end of the file: the font opens, the first
      // glyph lookup throws (fontkit reads the table lazily).
      const broken = Buffer.from(playfair);
      const tableCount = broken.readUInt16BE(4);
      const record = [...Array(tableCount).keys()].map((i) => 12 + 16 * i).find((r) => broken.toString('latin1', r, r + 4) === 'cmap')!;
      const cmap = broken.readUInt32BE(record + 8);
      for (let i = 0; i < broken.readUInt16BE(cmap + 2); i++) broken.writeUInt32BE(0x7ffffff0, cmap + 4 + 8 * i + 4);

      const error = await inspect(broken).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect((error as UnprocessableEntityException).getResponse()).toMatchObject({ code: 'FONT_UNREADABLE' });
      await expect(inspect(Buffer.from('not a font at all'))).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
