import { INestApplication, INestApplicationContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { PrismaService } from '../../src/shared/prisma';
import { WorkerModule } from '../../src/worker';
import { signUp } from './helpers/accounts';

/**
 * Analytics dashboard (docs/17 S7): product events recorded by the API, the worker and the studio, and the summary
 * built from them. Needs `docker compose up -d postgres redis seaweedfs storage-init` (the export runs in a worker).
 */
describe('Analytics (e2e)', () => {
  let app: INestApplication;
  let worker: INestApplicationContext;
  let prisma: PrismaService;

  const run = Date.now();
  let ana: { id: string; cookie: string };
  let ben: { id: string; cookie: string };
  let tuckTop: string;
  let pillow: string;
  let blockedErrors: number;

  const api = () => request(app.getHttpServer());
  const as = (user: { cookie: string }) => ({
    get: (url: string) => api().get(url).set('Cookie', user.cookie),
    post: (url: string) => api().post(url).set('Cookie', user.cookie),
  });
  const summary = async (user: { cookie: string }, query = 'scope=me&days=7') =>
    (await as(user).get(`/api/analytics/summary?${query}`).expect(200)).body;
  const createProject = async (user: { cookie: string }, templateId: string, elements: object[] = []) =>
    (
      await as(user)
        .post('/api/projects')
        .send({ templateId, title: `Hộp ${templateId}`, dimensions: { length: 120, width: 80, height: 30 }, canvasState: { elements } })
        .expect(201)
    ).body.id as string;
  const waitFor = async (jobId: string) => {
    for (let i = 0; i < 100; i++) {
      const res = await as(ana).get(`/api/exports/${jobId}`).expect(200);
      if (res.body.status === 'COMPLETED' || res.body.status === 'FAILED') return res.body;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Export ${jobId} did not finish`);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    await app.init();
    prisma = app.get(PrismaService);
    const workerRef = await Test.createTestingModule({ imports: [WorkerModule] }).compile();
    worker = await workerRef.createNestApplication().init();

    ana = await signUp(app, `ana-${run}@e2e.test`);
    ben = await signUp(app, `ben-${run}@e2e.test`);
    // Clean SVG exports need Pro or an export credit since docs/17 S2; a tier set by hand is kept without a subscription.
    await prisma.user.update({ where: { id: ana.id }, data: { subscriptionTier: 'STARTER' } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: `-${run}@e2e.test` } } });
    await worker.close(); // waits for the BullMQ worker's blocking connection: several seconds
    await app.close();
  }, 30_000);

  it('starts empty: every day of the period, the four box types, no creation time', async () => {
    const body = await summary(ana);
    expect(body).toMatchObject({
      scope: 'me',
      days: 7,
      boxes: { total: 0 },
      fitcheck: { prevented: 0, blockedAtExport: 0, autoFixed: 0, passed: 0, checked: 0 },
      creationTime: { medianSeconds: null, meanSeconds: null, projects: 0 },
      exports: { total: 0, byFormat: [] },
    });
    expect(body.boxes.byDay).toHaveLength(7);
    expect(body.boxes.byDay.at(-1).date).toBe(body.to);
    expect(body.boxTypes).toEqual([
      { type: 'tuck-top', count: 0 },
      { type: 'sleeve-drawer', count: 0 },
      { type: 'lid-base', count: 0 },
      { type: 'pillow', count: 0 },
    ]);
  });

  it('records the projects, the blocked export, Auto-Fix and the studio heartbeats', async () => {
    // A logo 0.5 mm from the cut line: FitCheck refuses the print.
    tuckTop = await createProject(ana, 'tuck-top', [
      { id: 'logo', type: 'logo', panelId: 'panel_front', x: 0.5, y: 0.5, width: 20, height: 20, rotation: 0, content: '/branding/wrapfit-logo.png' },
    ]);
    pillow = await createProject(ana, 'pillow');

    const blocked = await as(ana).post(`/api/projects/${tuckTop}/exports`).send({ fileType: 'PDF_CMYK' }).expect(422);
    blockedErrors = blocked.body.fitCheck.violations.filter((v: { severity: string }) => v.severity === 'error').length;
    expect(blockedErrors).toBeGreaterThan(0);

    await as(ana).post(`/api/projects/${tuckTop}/events`).send({ type: 'AUTO_FIX_APPLIED', fixed: 1 }).expect(204);
    // Two heartbeats of one project within a minute (two tabs) count once.
    await as(ana).post(`/api/projects/${pillow}/events`).send({ type: 'STUDIO_ACTIVE', seconds: 45 }).expect(204);
    await as(ana).post(`/api/projects/${pillow}/events`).send({ type: 'STUDIO_ACTIVE', seconds: 45 }).expect(204);
    expect(await prisma.productEvent.count({ where: { projectId: pillow, type: 'STUDIO_ACTIVE' } })).toBe(1);
    // An earlier minute of work on the same project (heartbeats are a minute apart in the studio).
    await prisma.productEvent.create({
      data: { type: 'STUDIO_ACTIVE', userId: ana.id, projectId: pillow, payload: { seconds: 60 }, createdAt: new Date(Date.now() - 90_000) },
    });
  });

  it('accepts only studio events of the owner, within limits', async () => {
    await as(ana).post(`/api/projects/${pillow}/events`).send({ type: 'STUDIO_ACTIVE', seconds: 61 }).expect(400);
    await as(ana).post(`/api/projects/${pillow}/events`).send({ type: 'STUDIO_ACTIVE' }).expect(400);
    await as(ana).post(`/api/projects/${pillow}/events`).send({ type: 'AUTO_FIX_APPLIED', fixed: 0 }).expect(400);
    await as(ana).post(`/api/projects/${pillow}/events`).send({ type: 'EXPORT_COMPLETED' }).expect(400);
    await as(ben).post(`/api/projects/${pillow}/events`).send({ type: 'AUTO_FIX_APPLIED', fixed: 1 }).expect(404);
  });

  it('counts the completed export in the worker and the active time up to it', async () => {
    const queued = await as(ana).post(`/api/projects/${pillow}/exports`).send({ fileType: 'SVG' }).expect(202);
    expect((await waitFor(queued.body.jobId)).status).toBe('COMPLETED');
    // Work after the first export does not change its creation time.
    await prisma.productEvent.create({
      data: { type: 'STUDIO_ACTIVE', userId: ana.id, projectId: pillow, payload: { seconds: 60 } },
    });

    const body = await summary(ana);
    expect(body.boxes.total).toBe(2);
    expect(body.boxes.byDay.at(-1)).toEqual({ date: body.to, count: 2 });
    expect(body.boxTypes).toEqual(
      expect.arrayContaining([
        { type: 'tuck-top', count: 1 },
        { type: 'pillow', count: 1 },
      ]),
    );
    expect(body.fitcheck).toEqual({
      prevented: blockedErrors + 1,
      blockedAtExport: blockedErrors,
      autoFixed: 1,
      // The empty pillow box scores 100, the tuck-top box with the logo on the cut line does not.
      passed: 1,
      checked: 2,
    });
    expect(body.creationTime).toEqual({ medianSeconds: 105, meanSeconds: 105, projects: 1 });
    expect(body.exports).toEqual({ total: 1, byFormat: [{ fileType: 'SVG', count: 1 }] });
  });

  it('never shows the numbers of one user to another', async () => {
    const body = await summary(ben, 'days=30');
    expect(body).toMatchObject({ scope: 'me', days: 30, boxes: { total: 0 }, fitcheck: { prevented: 0 }, exports: { total: 0 } });
    expect(body.creationTime.projects).toBe(0);
  });

  it('gives anonymous totals of WrapFit, cached for a minute', async () => {
    const body = await summary(ben, 'scope=global&days=7');
    expect(body.scope).toBe('global');
    expect(body.boxes.total).toBeGreaterThanOrEqual(2);
    expect(body.fitcheck.prevented).toBeGreaterThanOrEqual(blockedErrors + 1);
    expect(body.exports.total).toBeGreaterThanOrEqual(1);
    // Only numbers: no id, email or title of anyone.
    const text = JSON.stringify(body);
    for (const secret of [ana.id, ben.id, tuckTop, pillow, `ana-${run}`, 'Hộp']) expect(text).not.toContain(secret);

    await createProject(ben, 'lid-base');
    expect((await summary(ana, 'scope=global&days=7')).boxes.total).toBe(body.boxes.total);
    // "me" is never cached: the dashboard shows the box just made.
    expect((await summary(ben, 'scope=me&days=7')).boxes.total).toBe(1);
  });

  it('refuses unknown scopes and periods, and guests', async () => {
    await as(ana).get('/api/analytics/summary?scope=all').expect(400);
    await as(ana).get('/api/analytics/summary?days=14').expect(400);
    await api().get('/api/analytics/summary').expect(401);
  });
});
