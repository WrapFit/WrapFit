import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { PrismaService } from '../../src/shared/prisma';
import { signUp } from './helpers/accounts';

/**
 * Template hub (IT3-07). Needs the seeded database (box templates + curated designs).
 * Hub responses are cached per URL for 60 s, so every query here uses a URL of its own.
 */
describe('Template hub (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const run = Date.now();
  const tag = `e2e-${run}`; // unique tag: isolates this run's community projects and bypasses the cache
  const TET_CANDLE = '6f1c2a80-0001-4c3e-9a51-7d0e5a1f0001'; // seeded "Hộp Nến Tết Lộc Xuân"
  let usesBefore: number;
  let ivy: { cookie: string };
  let jack: { cookie: string };

  const api = () => request(app.getHttpServer());
  const as = (user: { cookie: string }) => ({
    get: (url: string) => api().get(url).set('Cookie', user.cookie),
    post: (url: string) => api().post(url).set('Cookie', user.cookie),
    patch: (url: string) => api().patch(url).set('Cookie', user.cookie),
  });
  const register = async (name: string, fullName: string) => {
    const { id, cookie } = await signUp(app, `${name}-${run}@e2e.test`, fullName);
    return { id, cookie };
  };
  const hub = async (query: string) => (await api().get(`/api/templates/hub?${query}`).expect(200)).body;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    await app.init();
    prisma = app.get(PrismaService);

    usesBefore = (await prisma.designTemplate.findUniqueOrThrow({ where: { id: TET_CANDLE } })).usesCount;
    ivy = await register('ivy', 'Ivy Candles');
    jack = await register('jack', 'Jack');
  });

  afterAll(async () => {
    await prisma.designTemplate.update({ where: { id: TET_CANDLE }, data: { usesCount: usesBefore } });
    await prisma.designTemplate.deleteMany({ where: { tags: { has: tag } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: '@e2e.test' } } });
    await app.close();
  });

  describe('box structures', () => {
    it('lists the four structures with their size limits, without login', async () => {
      const res = await api().get('/api/templates/structures').expect(200);
      expect(res.body.map((s: { id: string }) => s.id)).toEqual(['lid-base', 'pillow', 'sleeve-drawer', 'tuck-top']);
      expect(res.body[3]).toMatchObject({
        id: 'tuck-top',
        dimensionLimits: { length: { min: 40, max: 600 }, width: { min: 30, max: 600 }, height: { min: 20, max: 600 } },
      });
      expect(res.body[3].formulaSchema).toBeUndefined();
    });
  });

  describe('curated designs', () => {
    it('lists curated designs first by sort order, as light cards', async () => {
      const body = await hub('section=curated&limit=50');
      expect(body.meta.total).toBeGreaterThanOrEqual(6);
      expect(body.items[0]).toMatchObject({
        id: TET_CANDLE,
        title: 'Hộp Nến Tết Lộc Xuân',
        structure: { id: 'tuck-top', name: expect.any(String) },
        occasion: 'TET',
        industry: 'CANDLES',
        materialSpec: { type: 'kraft' },
        dimensions: { length: 90, width: 90, height: 110 },
        tags: expect.arrayContaining(['tet']),
        usesCount: expect.any(Number),
      });
      expect(body.items[0].canvasState).toBeUndefined();
    });

    it.each([
      ['occasion=TET', (c: Record<string, unknown>) => c.occasion === 'TET'],
      ['industry=JEWELRY', (c: Record<string, unknown>) => c.industry === 'JEWELRY'],
      ['structure=lid-base', (c: { structure: { id: string } }) => c.structure.id === 'lid-base'],
      ['material=duplex', (c: { materialSpec: { type: string } }) => c.materialSpec.type === 'duplex'],
      ['q=noel', (c: { tags: string[] }) => c.tags.includes('noel')],
      ['q=GIÁNG%20SINH', (c: { title: string }) => c.title.includes('Giáng Sinh')],
    ])('filters by %s', async (query, matches) => {
      const body = await hub(`${query}&limit=50`);
      expect(body.items.length).toBeGreaterThan(0);
      for (const card of body.items) expect(matches(card)).toBe(true);
    });

    it('combines filters', async () => {
      const body = await hub('occasion=TET&industry=CANDLES&structure=tuck-top&material=kraft&limit=49');
      expect(body.items.map((c: { id: string }) => c.id)).toContain(TET_CANDLE);
      const jewelry = (await hub('occasion=TET&industry=JEWELRY&limit=48')).items;
      for (const c of jewelry) expect(c).toMatchObject({ occasion: 'TET', industry: 'JEWELRY' });
      expect((await hub('occasion=TET&industry=JEWELRY&structure=lid-base&material=kraft&limit=48')).items).toEqual([]);
    });

    it('validates the filters', async () => {
      await api().get('/api/templates/hub?occasion=HALLOWEEN').expect(400);
      await api().get('/api/templates/hub?section=popular').expect(400);
      await api().get('/api/templates/hub?material=plastic').expect(400);
      await api().get('/api/templates/hub?structure=Bad!').expect(400);
    });

    it('returns a design with its canvas and the limits for resizing', async () => {
      const res = await api().get(`/api/templates/${TET_CANDLE}`).expect(200);
      expect(res.body).toMatchObject({
        id: TET_CANDLE,
        structure: { id: 'tuck-top' },
        canvasState: { elements: expect.any(Array) },
        dimensionLimits: { length: { min: 40, max: 600 } },
      });
      expect(res.body.canvasState.elements.length).toBeGreaterThan(0);

      await api().get('/api/templates/7d0c3f6e-2f1a-4c55-9a43-2a0f5a7c9b11').expect(404);
      await api().get('/api/templates/tuck-top').expect(400);
    });

    it('caches hub responses for a minute', async () => {
      const url = `section=curated&q=${tag}`;
      expect((await hub(url)).meta.total).toBe(0);

      await prisma.designTemplate.create({
        data: {
          boxTemplateId: 'pillow',
          title: 'Cache probe',
          dimensions: { length: 100, width: 60, height: 30, paperThickness: 0.35 },
          materialSpec: { type: 'ivory', gsm: 300, caliper: 0.35, finish: 'matte' },
          canvasState: { elements: [] },
          tags: [tag],
        },
      });

      expect((await hub(url)).meta.total).toBe(0); // same URL: cached
      expect((await hub(`${url}&page=1`)).meta.total).toBe(1); // new URL: fresh
    });
  });

  describe('"Dùng mẫu này" (start a project from a design)', () => {
    const useTemplate = (body: Record<string, unknown>) =>
      as(ivy)
        .post('/api/projects')
        .send({ templateId: 'tuck-top', title: 'Nến Tết của Ivy', designTemplateId: TET_CANDLE, ...body });

    it('copies the material and canvas of the design and counts the use', async () => {
      const design = (await api().get(`/api/templates/${TET_CANDLE}`).expect(200)).body;
      const res = await useTemplate({ dimensions: design.dimensions }).expect(201);

      expect(res.body).toMatchObject({
        template: { id: 'tuck-top' },
        dimensions: design.dimensions,
        materialSpec: design.materialSpec,
        canvasState: design.canvasState,
      });
      const { usesCount } = await prisma.designTemplate.findUniqueOrThrow({ where: { id: TET_CANDLE } });
      expect(usesCount).toBe(usesBefore + 1);
    });

    it('accepts the gift size with a client-scaled canvas, within the structure limits', async () => {
      const scaled = { elements: [] };
      const res = await useTemplate({ dimensions: { length: 70, width: 70, height: 85 }, canvasState: scaled }).expect(201);
      expect(res.body.canvasState).toEqual(scaled);

      await useTemplate({ dimensions: { length: 30, width: 70, height: 85 } }).expect(400);
    });

    it('rejects a structure that does not match the design', async () => {
      const res = await useTemplate({ templateId: 'pillow', dimensions: { length: 100, width: 60, height: 30 } }).expect(
        400,
      );
      expect(res.body.message).toBe('templateId must be tuck-top for this design template');
    });
  });

  describe('community section', () => {
    let popular: string;

    beforeAll(async () => {
      const create = async (title: string, extra: Record<string, unknown> = {}) =>
        (
          await as(ivy)
            .post('/api/projects')
            .send({ templateId: 'tuck-top', title, dimensions: { length: 120, width: 80, height: 60 }, tags: [tag], ...extra })
            .expect(201)
        ).body as { id: string; slug: string };
      const share = (id: string, visibility: string) =>
        as(ivy).patch(`/api/projects/${id}/visibility`).send({ visibility }).expect(200);

      const quiet = await create('Hộp cộng đồng ít tim', { occasion: 'TET' });
      const liked = await create('Hộp cộng đồng nhiều tim', { occasion: 'TET', industry: 'CANDLES' });
      const unlisted = await create('Hộp link riêng');
      const archived = await create('Hộp đã lưu trữ');
      await create('Hộp riêng tư');
      // Text 0.5 mm from the fold: FitCheck score 70, below the 90 needed for the hub (UC-14).
      const notReady = await create('Hộp chưa đạt FitCheck', {
        canvasState: {
          elements: [{ id: 't', type: 'text', panelId: 'front', x: 0.5, y: 5, width: 30, height: 8, rotation: 0, content: 'Tết' }],
        },
      });
      for (const p of [quiet, liked, archived, notReady]) await share(p.id, 'PUBLIC');
      await share(unlisted.id, 'UNLISTED');
      await as(ivy).patch(`/api/projects/${archived.id}/status`).send({ status: 'ARCHIVED' }).expect(200);

      await as(jack).post(`/api/public/projects/${liked.slug}/like`).expect(200);
      await as(jack).post(`/api/public/projects/${liked.slug}/fork`).expect(201);
      popular = liked.slug;
    });

    it('lists PUBLIC active projects only, most liked first, with author and remix count', async () => {
      const body = await hub(`section=community&q=${tag}`);
      expect(body.items.map((c: { title: string }) => c.title)).toEqual(['Hộp cộng đồng nhiều tim', 'Hộp cộng đồng ít tim']);
      expect(body.items[0]).toMatchObject({
        slug: popular,
        structure: { id: 'tuck-top' },
        occasion: 'TET',
        industry: 'CANDLES',
        likesCount: 1,
        usesCount: 1,
        fitcheckScore: 100,
        author: { fullName: 'Ivy Candles', shopName: null, avatarUrl: null },
      });
      for (const field of ['id', 'userId', 'canvasState', 'visibility', 'status']) {
        expect(body.items[0]).not.toHaveProperty(field);
      }
    });

    it('applies the same filters as the curated section', async () => {
      const titles = async (query: string) =>
        (await hub(`section=community&q=${tag}&${query}`)).items.map((c: { title: string }) => c.title);
      expect(await titles('industry=CANDLES')).toEqual(['Hộp cộng đồng nhiều tim']);
      expect(await titles('occasion=TET&structure=pillow')).toEqual([]);
    });
  });
});
