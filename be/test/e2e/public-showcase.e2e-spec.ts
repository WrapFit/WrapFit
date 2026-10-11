import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { PROJECT_FORKED } from '../../src/common';
import { PrismaService } from '../../src/shared/prisma';
import { signUp } from './helpers/accounts';

/** Sharing, public page, remix and likes (IT3-06). Users use the `@e2e.test` domain and are removed afterwards. */
describe('Public showcase (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const run = Date.now();
  let gina: { id: string; cookie: string }; // author
  let hank: { id: string; cookie: string }; // visitor who remixes
  let source: { id: string; slug: string };

  const api = () => request(app.getHttpServer());
  const as = (user: { cookie: string }) => ({
    get: (url: string) => api().get(url).set('Cookie', user.cookie),
    post: (url: string) => api().post(url).set('Cookie', user.cookie),
    patch: (url: string) => api().patch(url).set('Cookie', user.cookie),
    delete: (url: string) => api().delete(url).set('Cookie', user.cookie),
  });
  const page = (slug = source.slug) => `/api/public/projects/${slug}`;
  const share = (body: Record<string, unknown>, id = source.id, user = gina) =>
    as(user).patch(`/api/projects/${id}/visibility`).send(body);

  const register = async (name: string, fullName: string) => {
    const { id, cookie } = await signUp(app, `${name}-${run}@e2e.test`, fullName);
    return { id, cookie };
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    await app.init();
    prisma = app.get(PrismaService);

    gina = await register('gina', 'Gina Handmade');
    hank = await register('hank', 'Hank');
    const collection = (await as(gina).post('/api/collections').send({ title: 'Của Gina' }).expect(201)).body.id;
    source = (
      await as(gina)
        .post('/api/projects')
        .send({
          templateId: 'tuck-top',
          title: 'Hộp nến Gina',
          dimensions: { length: 120, width: 80, height: 60 },
          collectionId: collection,
          tags: ['nen'],
        })
        .expect(201)
    ).body;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@e2e.test' } } });
    await app.close();
  });

  describe('sharing settings', () => {
    it('keeps a new project private', async () => {
      await api().get(page()).expect(404);
      await as(hank).get(page()).expect(404);
      // Even the owner: the public page shows what everyone else sees.
      await as(gina).get(page()).expect(404);
    });

    it('lets only the owner change visibility and remix permission', async () => {
      const res = await share({ visibility: 'UNLISTED' }).expect(200);
      expect(res.body).toMatchObject({ visibility: 'UNLISTED', allowFork: true });

      await share({ visibility: 'PUBLIC' }, source.id, hank).expect(404);
      await share({ visibility: 'EVERYONE' }).expect(400);
      await share({ allowFork: 'yes' }).expect(400);
    });
  });

  describe('public page', () => {
    it('shows an UNLISTED project to anyone with the link, without private data', async () => {
      const res = await api().get(page()).expect(200);
      expect(res.body).toMatchObject({
        slug: source.slug,
        title: 'Hộp nến Gina',
        visibility: 'UNLISTED',
        allowFork: true,
        template: { id: 'tuck-top' },
        dimensions: { length: 120, width: 80, height: 60, paperThickness: 0.35 },
        materialSpec: { type: 'ivory' },
        canvasState: { elements: [] },
        tags: ['nen'],
        viewsCount: 1,
        likesCount: 0,
        author: { fullName: 'Gina Handmade', shopName: null, avatarUrl: null },
        forkedFrom: null,
        viewer: { isOwner: false, liked: false },
      });
      for (const field of ['id', 'userId', 'status', 'collection', 'collectionId', 'fitcheckState', 'deletedAt']) {
        expect(res.body).not.toHaveProperty(field);
      }
      expect(JSON.stringify(res.body)).not.toContain('@e2e.test');
    });

    it('counts views of visitors only and does not touch updatedAt', async () => {
      const before = (await as(gina).get(`/api/projects/${source.id}`).expect(200)).body.updatedAt;

      // count=false only reads (server-side render of /p/[slug]) and does not use up the visitor's first view.
      expect((await as(hank).get(`${page()}?count=false`).expect(200)).body.viewsCount).toBe(1);
      expect((await as(hank).get(page()).expect(200)).body.viewsCount).toBe(2);
      // Once per viewer: reloading (or a script) does not inflate the count that orders the community hub.
      expect((await as(hank).get(page()).expect(200)).body.viewsCount).toBe(2);
      expect((await api().get(page()).expect(200)).body.viewsCount).toBe(2);
      const own = await as(gina).get(page()).expect(200);
      expect(own.body).toMatchObject({ viewsCount: 2, viewer: { isOwner: true } });

      expect((await as(gina).get(`/api/projects/${source.id}`).expect(200)).body).toMatchObject({
        updatedAt: before,
        viewsCount: 2,
      });
    });

    it('treats an invalid token as an anonymous visitor', async () => {
      const res = await api().get(page()).set('Cookie', 'wf_access=garbage').expect(200);
      expect(res.body.viewer).toEqual({ isOwner: false, liked: false });
    });

    it('answers 404 for unknown or malformed slugs', async () => {
      await api().get(page('doesNotExist')).expect(404);
      await api().get(page('bad%20slug!')).expect(404);
    });
  });

  describe('likes', () => {
    it('requires an account', async () => {
      await api().post(`${page()}/like`).expect(401);
      await api().delete(`${page()}/like`).expect(401);
    });

    it('likes and unlikes idempotently', async () => {
      expect((await as(hank).post(`${page()}/like`).expect(200)).body).toEqual({ liked: true, likesCount: 1 });
      expect((await as(hank).post(`${page()}/like`).expect(200)).body).toEqual({ liked: true, likesCount: 1 });
      expect((await as(gina).post(`${page()}/like`).expect(200)).body).toEqual({ liked: true, likesCount: 2 });

      const view = await as(hank).get(page()).expect(200);
      expect(view.body).toMatchObject({ likesCount: 2, viewer: { liked: true } });

      expect((await as(hank).delete(`${page()}/like`).expect(200)).body).toEqual({ liked: false, likesCount: 1 });
      expect((await as(hank).delete(`${page()}/like`).expect(200)).body).toEqual({ liked: false, likesCount: 1 });
      await as(gina).delete(`${page()}/like`).expect(200);
    });
  });

  describe('remix (fork)', () => {
    let emit: jest.SpyInstance;

    beforeEach(() => {
      emit = jest.spyOn(app.get(EventEmitter2), 'emit');
    });
    afterEach(() => emit.mockRestore());

    it('requires an account', async () => {
      await api().post(`${page()}/fork`).expect(401);
    });

    it('copies the design into my workspace and notifies the author', async () => {
      const res = await as(hank).post(`${page()}/fork`).expect(201);
      expect(res.body).toMatchObject({
        title: 'Hộp nến Gina',
        forkedFromId: source.id,
        collection: null,
        visibility: 'PRIVATE',
        status: 'ACTIVE',
        tags: ['nen'],
      });
      expect(res.body.slug).not.toBe(source.slug);

      // The fork belongs to Hank.
      await as(hank).get(`/api/projects/${res.body.id}`).expect(200);
      await as(gina).get(`/api/projects/${res.body.id}`).expect(404);

      expect(emit).toHaveBeenCalledWith(PROJECT_FORKED, {
        sourceProjectId: source.id,
        sourceOwnerId: gina.id,
        forkProjectId: res.body.id,
        forkedById: hank.id,
      });
    });

    it('credits the original only when the original is PUBLIC (an unlisted link stays secret)', async () => {
      const fork = (await as(hank).post(`${page()}/fork`).expect(201)).body;
      await share({ visibility: 'PUBLIC' }, fork.id, hank).expect(200);

      expect((await api().get(page(fork.slug)).expect(200)).body.forkedFrom).toBeNull();

      await share({ visibility: 'PUBLIC' }).expect(200);
      expect((await api().get(page(fork.slug)).expect(200)).body.forkedFrom).toEqual({
        slug: source.slug,
        title: 'Hộp nến Gina',
        author: { fullName: 'Gina Handmade', shopName: null, avatarUrl: null },
      });
    });

    it('respects "view only" designs, except for their owner', async () => {
      await share({ allowFork: false }).expect(200);
      const res = await as(hank).post(`${page()}/fork`).expect(403);
      expect(res.body.message).toBe('The author does not allow remixing this design');

      // The owner may still copy their own design; nobody is notified.
      await as(gina).post(`${page()}/fork`).expect(201);
      expect(emit).not.toHaveBeenCalled();
      await share({ allowFork: true }).expect(200);
    });
  });

  describe('archive and trash', () => {
    it('keeps archived projects online and hides trashed ones', async () => {
      const status = (value: string) =>
        as(gina).patch(`/api/projects/${source.id}/status`).send({ status: value }).expect(200);

      await status('ARCHIVED');
      await api().get(page()).expect(200);

      await status('DELETED');
      await api().get(page()).expect(404);
      await as(hank).post(`${page()}/like`).expect(404);
      await as(hank).post(`${page()}/fork`).expect(404);
      await share({ visibility: 'PRIVATE' }).expect(409);

      await status('ACTIVE');
      await api().get(page()).expect(200);
    });
  });
});
