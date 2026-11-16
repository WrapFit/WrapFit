import { INestApplication, INestApplicationContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Redis } from 'ioredis';
import { AddressInfo } from 'net';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { MAX_NOTIFICATIONS_PER_USER, NOTIFICATIONS_CHANGED, pruneNotifications } from '../../src/notifications';
import { PrismaService } from '../../src/shared/prisma';
import { REDIS } from '../../src/shared/redis';
import { WorkerModule } from '../../src/worker';
import { signUp } from './helpers/accounts';
import { deleteUsers } from './helpers/cleanup';
import { createPaidOrder } from './helpers/orders';

/**
 * Notification inbox (docs/25 S8) across modules, against PostgreSQL, Redis and SeaweedFS: a remix in the API and an
 * export in a real worker context both land in the inbox, and the worker's notification reaches an open socket of the
 * API through Redis. Needs `docker compose up -d postgres redis seaweedfs storage-init`.
 */
describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let worker: INestApplicationContext;
  let prisma: PrismaService;
  let baseUrl: string;

  const run = Date.now();
  type Account = { id: string; cookie: string };
  let ana: Account; // author
  let binh: Account; // remixes
  let chi: Account; // remixes too
  let source: { id: string; slug: string };
  const orderIds: string[] = [];

  const api = () => request(app.getHttpServer());
  const as = (user: Account) => ({
    get: (url: string) => api().get(url).set('Cookie', user.cookie),
    post: (url: string) => api().post(url).set('Cookie', user.cookie),
    patch: (url: string) => api().patch(url).set('Cookie', user.cookie),
  });
  const register = async (name: string, fullName?: string) => {
    const { id, cookie } = await signUp(app, `notif-${name}-${run}@e2e.test`, fullName);
    return { id, cookie };
  };
  const newProject = async (user: Account, title: string) =>
    (
      await as(user)
        .post('/api/projects')
        .send({
          templateId: 'tuck-top',
          title,
          dimensions: { length: 120, width: 80, height: 60 },
          canvasState: {
            elements: [
              { id: 't1', type: 'text', panelId: 'panel_front', x: 10, y: 10, width: 60, height: 10, rotation: 0, content: 'Xin chào' },
            ],
          },
        })
        .expect(201)
    ).body as { id: string; slug: string };
  const publish = (user: Account, projectId: string) =>
    as(user).patch(`/api/projects/${projectId}/visibility`).send({ visibility: 'PUBLIC', allowFork: true }).expect(200);
  const remix = (user: Account, slug = source.slug) => as(user).post(`/api/public/projects/${slug}/fork`).expect(201);
  /** Listeners run after the response: wait for what they store. */
  const eventually = async <T>(read: () => Promise<T>, done: (value: T) => boolean): Promise<T> => {
    for (let i = 0; i < 100; i++) {
      const value = await read();
      if (done(value)) return value;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('Condition not reached');
  };
  const inbox = async (user: Account, query = '') => (await as(user).get(`/api/notifications${query}`).expect(200)).body;
  const unread = async (user: Account) => (await as(user).get('/api/notifications/unread-count').expect(200)).body.count as number;
  const rowsOf = (userId: string) => prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  const connect = (user: Account) =>
    new Promise<Socket>((resolve, reject) => {
      const socket = io(`${baseUrl}/events`, { path: '/api/socket.io', reconnection: false, extraHeaders: { cookie: user.cookie } });
      socket.once('connect', () => resolve(socket));
      socket.once('connect_error', reject);
    });
  const exportFile = async (user: Account, projectId: string, fileType = 'DXF') => {
    const jobId = (await as(user).post(`/api/projects/${projectId}/exports`).send({ fileType }).expect(202)).body.jobId as string;
    return eventually(
      async () => (await as(user).get(`/api/exports/${jobId}`).expect(200)).body,
      (job) => job.status === 'COMPLETED' || job.status === 'FAILED',
    );
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    await app.listen(0, '127.0.0.1');
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
    prisma = app.get(PrismaService);
    const workerRef = await Test.createTestingModule({ imports: [WorkerModule] }).compile();
    worker = await workerRef.createNestApplication().init();

    ana = await register('ana', 'Ana Thiệp');
    binh = await register('binh', 'Bình');
    chi = await register('chi');
    await prisma.user.update({ where: { id: chi.id }, data: { shopName: 'Tiệm Chi' } });
    source = await newProject(ana, 'Hộp trà Ana');
    await publish(ana, source.id);
  });

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await deleteUsers(prisma, { email: { endsWith: `-${run}@e2e.test` } });
    await worker.close();
    await app.close();
  }, 30_000);

  describe('remix', () => {
    it('stores one notification for the author, linking to the author design, and none for a self-remix', async () => {
      await remix(ana); // her own design: nothing
      const fork = (await remix(binh)).body;
      const [row] = await eventually(() => rowsOf(ana.id), (rows) => rows.length > 0);
      expect(row).toMatchObject({ type: 'PROJECT_REMIXED', projectId: source.id, actorId: binh.id, count: 1, readAt: null });
      expect(row.projectId).not.toBe(fork.id);
      await new Promise((resolve) => setTimeout(resolve, 200)); // the self-remix event had time to land too
      expect(await rowsOf(ana.id)).toHaveLength(1);
      expect(await rowsOf(binh.id)).toHaveLength(0);

      expect((await inbox(ana)).items).toEqual([
        {
          id: row.id,
          type: 'PROJECT_REMIXED',
          createdAt: row.createdAt.toISOString(),
          readAt: null,
          project: { id: source.id, title: 'Hộp trà Ana' },
          count: 1,
          actorName: 'Bình',
          export: null,
        },
      ]);
      expect(await unread(ana)).toBe(1);
    });

    it('folds further remixes into the unread row, and starts a new one once it is read', async () => {
      const [first] = await rowsOf(ana.id);
      await remix(chi);
      await remix(binh);
      const [folded] = await eventually(() => rowsOf(ana.id), (rows) => rows[0]?.count === 3);
      expect(folded.id).toBe(first.id);
      expect(await rowsOf(ana.id)).toHaveLength(1);
      expect((await inbox(ana)).items[0]).toMatchObject({ count: 3, actorName: 'Bình' });

      await as(ana).post(`/api/notifications/${first.id}/read`).expect(204);
      await remix(chi);
      const rows = await eventually(() => rowsOf(ana.id), (list) => list.length === 2);
      expect(rows[0]).toMatchObject({ count: 1, actorId: chi.id, readAt: null });
      // No full name: the shop name.
      expect((await inbox(ana)).items[0]).toMatchObject({ actorName: 'Tiệm Chi', readAt: null });
      expect((await inbox(ana)).items[1].readAt).not.toBeNull();
    });

    it('pushes the change to the author open socket', async () => {
      const socket = await connect(ana);
      try {
        const changed = new Promise((resolve) => socket.once(NOTIFICATIONS_CHANGED, resolve));
        await remix(binh);
        await expect(changed).resolves.toEqual({});
      } finally {
        socket.close();
      }
    });
  });

  describe('my inbox only', () => {
    it("never lets another user read, count or mark someone else's notifications", async () => {
      const [row] = await rowsOf(ana.id);
      expect((await inbox(binh)).items.map((item: { id: string }) => item.id)).not.toContain(row.id);
      expect(await unread(binh)).toBe(0);
      await as(binh).post(`/api/notifications/${row.id}/read`).expect(404);
      await as(binh).post('/api/notifications/read-all').expect(200, { updated: 0 });
      expect((await prisma.notification.findUniqueOrThrow({ where: { id: row.id } })).readAt).toBeNull();
      await api().get('/api/notifications').expect(401);
      await as(ana).post('/api/notifications/not-a-uuid/read').expect(400);
    });

    it('marks one and then all as read', async () => {
      const before = await unread(ana);
      expect(before).toBeGreaterThan(0);
      const [row] = await rowsOf(ana.id);
      await as(ana).post(`/api/notifications/${row.id}/read`).expect(204);
      await as(ana).post(`/api/notifications/${row.id}/read`).expect(204); // again: no change
      expect(await unread(ana)).toBe(before - 1);
      const { updated } = (await as(ana).post('/api/notifications/read-all').expect(200)).body;
      expect(updated).toBe(before - 1);
      expect(await unread(ana)).toBe(0);
    });

    it('pages newest first without skipping two rows created in the same millisecond', async () => {
      const dan = await register('dan');
      const project = await newProject(dan, 'Hộp Dan');
      const at = new Date('2026-11-01T08:00:00.123Z');
      await prisma.notification.createMany({
        data: [
          { userId: dan.id, type: 'PROJECT_REMIXED', projectId: project.id, createdAt: at },
          { userId: dan.id, type: 'PROJECT_REMIXED', projectId: project.id, createdAt: at },
          { userId: dan.id, type: 'PROJECT_REMIXED', projectId: project.id, createdAt: new Date(at.getTime() - 1000) },
        ],
      });
      const first = await inbox(dan, '?limit=1');
      const second = await inbox(dan, `?limit=1&before=${encodeURIComponent(first.nextBefore)}`);
      const third = await inbox(dan, `?limit=1&before=${encodeURIComponent(second.nextBefore)}`);
      const ids = [first, second, third].map((page) => page.items[0].id);
      expect(new Set(ids).size).toBe(3);
      expect(third.items[0].createdAt).toBe('2026-11-01T07:59:59.123Z');
      expect(third.nextBefore).toBeNull();
      expect(first.items[0]).toMatchObject({ actorName: null, count: 1 });
      await as(dan).get('/api/notifications?before=yesterday').expect(400);
      await as(dan).get('/api/notifications?limit=51').expect(400);
    });
  });

  describe('export', () => {
    let projectId: string;
    beforeAll(async () => {
      projectId = (await newProject(binh, 'Hộp Bình in')).id;
      orderIds.push(await createPaidOrder(prisma, binh.id, projectId, run));
    });

    it('stores one notification for the owner when the worker finishes, and pushes it through Redis', async () => {
      const socket = await connect(binh);
      try {
        const changed = new Promise((resolve) => socket.once(NOTIFICATIONS_CHANGED, resolve));
        const job = await exportFile(binh, projectId);
        expect(job.status).toBe('COMPLETED');
        const rows = await eventually(
          () => prisma.notification.findMany({ where: { userId: binh.id, type: 'EXPORT_COMPLETED' } }),
          (list) => list.length > 0,
        );
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ projectId, actorId: null, payload: { exportJobId: job.id, fileType: 'DXF' } });
        await expect(changed).resolves.toEqual({});
        const item = (await inbox(binh)).items.find((entry: { type: string }) => entry.type === 'EXPORT_COMPLETED');
        expect(item).toMatchObject({ project: { id: projectId, title: 'Hộp Bình in' }, export: { jobId: job.id, fileType: 'DXF' } });
      } finally {
        socket.close();
      }
    });

    it('keeps the stored row and completes the job when the worker cannot publish to Redis', async () => {
      const redis = worker.get<Redis>(REDIS);
      const publish = jest.spyOn(redis, 'publish').mockRejectedValue(new Error('Redis down'));
      try {
        const job = await exportFile(binh, projectId, 'SVG');
        expect(job.status).toBe('COMPLETED');
        await eventually(
          () => prisma.notification.count({ where: { userId: binh.id, type: 'EXPORT_COMPLETED' } }),
          (count) => count === 2,
        );
        expect(publish).toHaveBeenCalled();
      } finally {
        publish.mockRestore();
      }
    });
  });

  it('prunes read notifications after 30 days and keeps the newest 200 per user', async () => {
    const eve = await register('eve');
    const project = await newProject(eve, 'Hộp Eve');
    const now = new Date();
    const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const base = { userId: eve.id, type: 'EXPORT_COMPLETED' as const, projectId: project.id };
    const oldRead = await prisma.notification.create({ data: { ...base, createdAt: daysAgo(40), readAt: daysAgo(39) } });
    const oldUnread = await prisma.notification.create({ data: { ...base, createdAt: daysAgo(40) } });
    const recentRead = await prisma.notification.create({ data: { ...base, createdAt: daysAgo(2), readAt: daysAgo(1) } });

    const fay = await register('fay');
    const fayProject = await newProject(fay, 'Hộp Fay');
    const extra = 5;
    await prisma.notification.createMany({
      data: Array.from({ length: MAX_NOTIFICATIONS_PER_USER + extra }, (_, i) => ({
        userId: fay.id,
        type: 'EXPORT_COMPLETED' as const,
        projectId: fayProject.id,
        createdAt: new Date(now.getTime() - i * 1000),
      })),
    });

    const result = await pruneNotifications(prisma, now);
    expect(result.read).toBeGreaterThanOrEqual(1);
    expect(result.overCap).toBeGreaterThanOrEqual(extra);
    const left = (await rowsOf(eve.id)).map((row) => row.id);
    expect(left).not.toContain(oldRead.id);
    expect(left).toEqual(expect.arrayContaining([oldUnread.id, recentRead.id]));
    const fayRows = await rowsOf(fay.id);
    expect(fayRows).toHaveLength(MAX_NOTIFICATIONS_PER_USER);
    // The newest are the ones kept.
    expect(fayRows[fayRows.length - 1].createdAt.getTime()).toBe(now.getTime() - (MAX_NOTIFICATIONS_PER_USER - 1) * 1000);
  });
});
