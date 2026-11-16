import { NotFoundException } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { PrismaService } from '../shared/prisma';
import { NOTIFICATIONS_CHANNEL } from './notifications.constants';
import { NotificationsListener } from './notifications.listener';
import { NotificationsService } from './notifications.service';

/** The database side (cursor, collapse, removal, pruning) is covered by test/e2e/notifications.e2e-spec.ts. */
describe('NotificationsService', () => {
  const author = '0190a000-0000-7000-8000-00000000000a';
  const remixer = '0190a000-0000-7000-8000-00000000000b';
  const source = '0190a000-0000-7000-8000-0000000000c1';

  const build = () => {
    const prisma = {
      notification: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(3),
      },
    };
    const redis = { publish: jest.fn().mockResolvedValue(1) };
    const service = new NotificationsService(prisma as unknown as PrismaService, redis as unknown as Redis);
    return { service, prisma, redis };
  };
  const forked = { sourceProjectId: source, sourceOwnerId: author, forkProjectId: 'fork-1', forkedById: remixer };

  describe('remix', () => {
    it('stores one notification for the author, about the author design, and pushes it', async () => {
      const { service, prisma, redis } = build();
      await service.notifyRemix(forked);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: author, type: 'PROJECT_REMIXED', projectId: source, actorId: remixer }),
      });
      // Never the remixer's private copy.
      expect(JSON.stringify(prisma.notification.create.mock.calls)).not.toContain('fork-1');
      expect(redis.publish).toHaveBeenCalledWith(NOTIFICATIONS_CHANNEL, author);
    });

    it('stores nothing when the author remixes their own design', async () => {
      const { service, prisma, redis } = build();
      await service.notifyRemix({ ...forked, forkedById: author });
      expect(prisma.notification.updateMany).not.toHaveBeenCalled();
      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(redis.publish).not.toHaveBeenCalled();
    });

    it('folds a remix into the unread notification of the same design instead of adding a row', async () => {
      const { service, prisma } = build();
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });
      await service.notifyRemix(forked);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: author, type: 'PROJECT_REMIXED', projectId: source, readAt: null },
        data: { actorId: remixer, count: { increment: 1 }, createdAt: expect.any(Date) },
      });
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });
  });

  it('stores one notification per finished export for its owner', async () => {
    const { service, prisma, redis } = build();
    await service.notifyExportCompleted({ exportJobId: 'job-1', projectId: 'p-1', userId: author, fileType: 'PDF_CMYK' });
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: { userId: author, type: 'EXPORT_COMPLETED', projectId: 'p-1', payload: { exportJobId: 'job-1', fileType: 'PDF_CMYK' } },
    });
    expect(redis.publish).toHaveBeenCalledWith(NOTIFICATIONS_CHANNEL, author);
  });

  it('keeps the stored row and does not throw when Redis cannot publish', async () => {
    const { service, prisma, redis } = build();
    redis.publish.mockRejectedValue(new Error("Stream isn't writeable and enableOfflineQueue options is false"));
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
    await expect(
      service.notifyExportCompleted({ exportJobId: 'job-1', projectId: 'p-1', userId: author, fileType: 'SVG' }),
    ).resolves.toBeUndefined();
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
  });

  describe('list', () => {
    const row = (over: Record<string, unknown> = {}) => ({
      id: '0190a000-0000-7000-8000-000000000001',
      type: 'PROJECT_REMIXED',
      count: 1,
      payload: {},
      readAt: null,
      createdAt: new Date('2026-11-16T03:00:00.000Z'),
      project: { id: source, title: 'Hộp trà' },
      actor: { fullName: 'Lan', shopName: 'Tiệm Lan', anonymizedAt: null },
      ...over,
    });

    it('reads only my rows, newest first, and gives the next cursor', async () => {
      const { service, prisma } = build();
      prisma.notification.findMany.mockResolvedValue([row(), row({ id: '0190a000-0000-7000-8000-000000000002' })]);
      const page = await service.list(author, 1);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: author }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 2 }),
      );
      expect(page.items).toHaveLength(1);
      expect(page.nextBefore).toBe('2026-11-16T03:00:00.000Z_0190a000-0000-7000-8000-000000000001');
    });

    it.each([
      ['the full name', { fullName: ' Lan ', shopName: 'Tiệm Lan', anonymizedAt: null }, 'Lan'],
      ['the shop name without a full name', { fullName: null, shopName: 'Tiệm Lan', anonymizedAt: null }, 'Tiệm Lan'],
      ['nothing for an account without a name', { fullName: null, shopName: '', anonymizedAt: null }, null],
      ['nothing for an anonymized account', { fullName: 'Lan', shopName: null, anonymizedAt: new Date() }, null],
      ['nothing for a deleted account', null, null],
    ])('names the remixer with %s', async (_label, actor, name) => {
      const { service, prisma } = build();
      prisma.notification.findMany.mockResolvedValue([row({ actor })]);
      expect((await service.list(author, 20)).items[0]).toMatchObject({ actorName: name, export: null });
    });

    it('shows an export with its job and no actor', async () => {
      const { service, prisma } = build();
      prisma.notification.findMany.mockResolvedValue([
        row({ type: 'EXPORT_COMPLETED', actor: null, payload: { exportJobId: 'job-1', fileType: 'DXF' } }),
      ]);
      expect((await service.list(author, 20)).items[0]).toMatchObject({
        actorName: null,
        export: { jobId: 'job-1', fileType: 'DXF' },
        project: { id: source, title: 'Hộp trà' },
      });
    });
  });

  it('counts my unread notifications only', async () => {
    const { service, prisma } = build();
    await expect(service.unreadCount(author)).resolves.toEqual({ count: 3 });
    expect(prisma.notification.count).toHaveBeenCalledWith({ where: { userId: author, readAt: null } });
  });

  describe('mark read', () => {
    it('marks one of mine', async () => {
      const { service, prisma } = build();
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });
      await service.markRead(author, 'n-1');
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'n-1', userId: author, readAt: null },
        data: { readAt: expect.any(Date) },
      });
    });

    it('is idempotent for one already read', async () => {
      const { service, prisma } = build();
      prisma.notification.findFirst.mockResolvedValue({ id: 'n-1' });
      await expect(service.markRead(author, 'n-1')).resolves.toBeUndefined();
    });

    it("answers 404 for someone else's notification", async () => {
      const { service, prisma } = build();
      await expect(service.markRead(remixer, 'n-1')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.notification.findFirst).toHaveBeenCalledWith({ where: { id: 'n-1', userId: remixer }, select: { id: true } });
    });

    it('marks all of mine', async () => {
      const { service, prisma } = build();
      prisma.notification.updateMany.mockResolvedValue({ count: 4 });
      await expect(service.markAllRead(author)).resolves.toEqual({ updated: 4 });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: author, readAt: null },
        data: { readAt: expect.any(Date) },
      });
    });
  });

  it('never lets a failed notification reach the request or the export job that emitted the event', async () => {
    const { service, prisma } = build();
    prisma.notification.create.mockRejectedValue(new Error('database down'));
    const listener = new NotificationsListener(service);
    jest.spyOn(listener['logger'], 'error').mockImplementation(() => undefined);
    await expect(
      listener.onExportCompleted({ exportJobId: 'job-1', projectId: 'p-1', userId: author, fileType: 'SVG' }),
    ).resolves.toBeUndefined();
    await expect(listener.onProjectForked(forked)).resolves.toBeUndefined();
  });
});
