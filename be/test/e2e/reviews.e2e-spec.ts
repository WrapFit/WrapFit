import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { MAX_COMMENTS_PER_PROJECT } from '../../src/reviews/reviews.service';
import { PrismaService } from '../../src/shared/prisma';
import { signUp } from './helpers/accounts';

/**
 * Design review links (docs/23 S23, audit findings 20 and 21): the three public endpoints a reviewer uses without an
 * account, and the owner side they meet. Users use the `@e2e.test` domain and are removed afterwards.
 */
describe('Design review links (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const run = Date.now();
  let owner: { id: string; cookie: string };
  let projectId: string;
  let token: string;

  const api = () => request(app.getHttpServer());
  const as = (user: { cookie: string }) => ({
    get: (url: string) => api().get(url).set('Cookie', user.cookie),
    post: (url: string) => api().post(url).set('Cookie', user.cookie),
    patch: (url: string) => api().patch(url).set('Cookie', user.cookie),
    delete: (url: string) => api().delete(url).set('Cookie', user.cookie),
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    await app.init();
    prisma = app.get(PrismaService);

    owner = await signUp(app, `reviewer-owner-${run}@e2e.test`);
    projectId = (
      await as(owner)
        .post('/api/projects')
        .send({ templateId: 'tuck-top', title: 'Hộp trà Tết', dimensions: { length: 120, width: 80, height: 60 } })
        .expect(201)
    ).body.id;
    token = (await as(owner).post(`/api/projects/${projectId}/review/link`).expect(200)).body.token;
  });

  beforeEach(() => {
    // The public endpoints allow 5 to 60 requests a minute: each test starts with a fresh count (both maps of the
    // in-memory store).
    const store = app.get(ThrottlerStorage) as unknown as { storage: Map<string, unknown>; hitExpirations: Map<string, unknown> };
    store.storage.clear();
    store.hitExpirations.clear();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: `-${run}@e2e.test` } } });
    await app.close();
  });

  it('opens the design to anyone with the link, never to an unknown or malformed one', async () => {
    expect(token).toMatch(/^[A-Za-z0-9_-]{24}$/);
    const res = await api().get(`/api/review/${token}`).expect(200);
    expect(res.body).toMatchObject({ title: 'Hộp trà Tết', structure: 'tuck-top', version: expect.any(Number), approval: null, comments: [] });

    await api().get(`/api/review/${'A'.repeat(24)}`).expect(404);
    await api().get('/api/review/short').expect(404);
  });

  it('takes a guest comment and shows it to the owner', async () => {
    const comment = await api()
      .post(`/api/review/${token}/comments`)
      .send({ authorName: '  Chị Hoa  ', body: 'Logo to hơn chút', panelId: 'panel_front', x: 20, y: 30 })
      .expect(201);
    expect(comment.body).toMatchObject({ authorName: 'Chị Hoa', byOwner: false, body: 'Logo to hơn chút', panelId: 'panel_front', x: 20, y: 30 });
    await api().post(`/api/review/${token}/comments`).send({ body: 'Không tên' }).expect(400);

    const state = await as(owner).get(`/api/projects/${projectId}/review`).expect(200);
    expect(state.body.comments).toEqual([expect.objectContaining({ id: comment.body.id, byOwner: false })]);
  });

  it('approves the version the reviewer saw, and answers 409 DESIGN_CHANGED for a stale one', async () => {
    const seen = (await api().get(`/api/review/${token}`).expect(200)).body.version as number;
    // The owner saves the design again while the reviewer still looks at the old one.
    const saved = await as(owner)
      .patch(`/api/projects/${projectId}`)
      .send({ version: seen, canvasState: { elements: [], backgroundPattern: 'tet' } })
      .expect(200);
    expect(saved.body.version).toBeGreaterThan(seen);

    const stale = await api().post(`/api/review/${token}/approve`).send({ name: 'Xưởng in Minh', version: seen }).expect(409);
    expect(stale.body.code).toBe('DESIGN_CHANGED');
    await api().post(`/api/review/${token}/approve`).send({ name: 'Xưởng in Minh', version: saved.body.version + 0.5 }).expect(400);

    const approved = await api().post(`/api/review/${token}/approve`).send({ name: 'Xưởng in Minh', version: saved.body.version }).expect(200);
    expect(approved.body).toMatchObject({ approvedBy: 'Xưởng in Minh', approvedVersion: saved.body.version, current: true });
    const state = await as(owner).get(`/api/projects/${projectId}/review`).expect(200);
    expect(state.body.approval).toMatchObject({ approvedVersion: saved.body.version, current: true });
  });

  it('lets the owner answer when guests have filled their share of comments', async () => {
    const guests = await prisma.designComment.count({ where: { projectId, authorUserId: null } });
    await prisma.designComment.createMany({
      data: Array.from({ length: MAX_COMMENTS_PER_PROJECT - guests }, (_, i) => ({ projectId, authorName: 'Spam', body: `spam ${i}` })),
    });

    const refused = await api().post(`/api/review/${token}/comments`).send({ authorName: 'Spam', body: 'one more' }).expect(400);
    expect(refused.body.code).toBe('TOO_MANY_COMMENTS');
    const reply = await as(owner).post(`/api/projects/${projectId}/review/comments`).send({ body: 'Đã nhận, cảm ơn chị' }).expect(201);
    expect(reply.body).toMatchObject({ byOwner: true });

    // Every comment is shown, the owner's reply after the 500 of the guests included.
    const view = await api().get(`/api/review/${token}`).expect(200);
    expect(view.body.comments).toHaveLength(MAX_COMMENTS_PER_PROJECT + 1);
    expect(view.body.comments.at(-1)).toMatchObject({ id: reply.body.id, byOwner: true });
    await prisma.designComment.deleteMany({ where: { projectId, authorName: 'Spam' } });
  });

  it('never writes the full token to the access log', async () => {
    const log = jest.spyOn(Logger.prototype, 'log');
    try {
      await api().get(`/api/review/${token}`).expect(200);
      await api().post(`/api/review/${token}/comments`).send({ authorName: 'An', body: 'Màu nền?' }).expect(201);
      const lines = log.mock.calls.map(([line]) => String(line)).filter((line) => line.includes('/api/review/'));
      expect(lines).toEqual([
        expect.stringContaining(`GET /api/review/${token.slice(0, 4)}*** 200`),
        expect.stringContaining(`POST /api/review/${token.slice(0, 4)}***/comments 201`),
      ]);
      for (const line of lines) expect(line).not.toContain(token);
    } finally {
      log.mockRestore();
    }
  });

  it('answers 404 on every public endpoint once the owner turns the link off', async () => {
    await as(owner).delete(`/api/projects/${projectId}/review/link`).expect(200);
    await api().get(`/api/review/${token}`).expect(404);
    await api().post(`/api/review/${token}/comments`).send({ authorName: 'An', body: 'Còn đó không?' }).expect(404);
    await api().post(`/api/review/${token}/approve`).send({ name: 'An', version: 1 }).expect(404);
    // The approval is kept for the owner.
    const state = await as(owner).get(`/api/projects/${projectId}/review`).expect(200);
    expect(state.body).toMatchObject({ token: null, approval: expect.objectContaining({ approvedBy: 'Xưởng in Minh' }) });
  });
});
