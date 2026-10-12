import { INestApplication } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CURRENT_FORMULA_VERSION } from '@wrapfit/shared';
import { execFileSync } from 'node:child_process';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { MAX_SNAPSHOTS_PER_PROJECT } from '../../src/projects/application/snapshots.service';
import { MAX_AUTOMATIC_SNAPSHOTS } from '../../src/projects';
import { FitCheckBackfillTask } from '../../src/projects/presentation/fitcheck-backfill.task';
import { TrashPurgeTask } from '../../src/projects/presentation/trash-purge.task';
import { PrismaService } from '../../src/shared/prisma';
import { signUp, uploadPng } from './helpers/accounts';

/**
 * Projects CRUD (IT3-03), lifecycle, duplicate, snapshots and trash purge (IT3-04). Needs the migrated and seeded database (box templates).
 * Users use the `@e2e.test` domain; deleting them cascades to their projects and collections.
 */
describe('Projects API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const run = Date.now();
  let carol: { id: string; cookie: string };
  let dave: { id: string; cookie: string };
  let carolCollection: string;
  let daveCollection: string;

  const api = () => request(app.getHttpServer());
  const as = (user: { cookie: string }) => ({
    get: (url: string) => api().get(url).set('Cookie', user.cookie),
    post: (url: string) => api().post(url).set('Cookie', user.cookie),
    patch: (url: string) => api().patch(url).set('Cookie', user.cookie),
    delete: (url: string) => api().delete(url).set('Cookie', user.cookie),
  });

  const register = async (name: string) => {
    const { id, cookie } = await signUp(app, `${name}-${run}@e2e.test`);
    return { id, cookie };
  };

  const newProject = (overrides: Record<string, unknown> = {}) => ({
    templateId: 'tuck-top',
    title: 'Hộp nến thơm',
    dimensions: { length: 120, width: 80, height: 60 },
    ...overrides,
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    await app.init();
    prisma = app.get(PrismaService);

    carol = await register('carol');
    dave = await register('dave');
    carolCollection = (await as(carol).post('/api/collections').send({ title: 'Tết 2026' }).expect(201)).body.id;
    daveCollection = (await as(dave).post('/api/collections').send({ title: 'Dave' }).expect(201)).body.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@e2e.test' } } });
    await app.close();
  });

  it('requires authentication', async () => {
    await api().get('/api/projects').expect(401);
    await api().post('/api/projects').send(newProject()).expect(401);
  });

  describe('create', () => {
    it('creates a project with defaults filled in', async () => {
      const res = await as(carol)
        .post('/api/projects')
        .send(newProject({ title: '  Hộp nến thơm  ', tags: ['Tet', ' tet ', 'nen-thom'], collectionId: carolCollection }))
        .expect(201);

      expect(res.body).toMatchObject({
        title: 'Hộp nến thơm',
        status: 'ACTIVE',
        visibility: 'PRIVATE',
        template: { id: 'tuck-top' },
        collection: { id: carolCollection, title: 'Tết 2026' },
        dimensions: { length: 120, width: 80, height: 60, paperThickness: 0.42 },
        materialSpec: { type: 'ivory', gsm: 300, caliper: 0.42, finish: 'matte' },
        canvasState: { elements: [] },
        tags: ['tet', 'nen-thom'],
      });
      expect(res.body.slug).toMatch(/^[\w-]{10}$/);
      expect(res.body.userId).toBeUndefined();
      // UUIDv7: time-ordered primary keys (version nibble 7, RFC 9562 variant).
      expect(res.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('stores a canvas that follows the @wrapfit/shared contract', async () => {
      const element = {
        id: 'el-1',
        type: 'text',
        panelId: 'front',
        x: 10,
        y: 12,
        width: 60,
        height: 20,
        rotation: 0,
        content: 'Chúc mừng năm mới',
        style: { fontFamily: 'Lora', fontSize: 14, color: '#2B1E16' },
      };
      const res = await as(carol)
        .post('/api/projects')
        .send(
          newProject({
            templateId: 'pillow',
            title: 'Hộp gối trang sức',
            // A pillow box is at most half as thick as wide.
            dimensions: { length: 120, width: 80, height: 40 },
            materialSpec: { type: 'kraft', gsm: 350, caliper: 0.45, finish: 'raw' },
            canvasState: { elements: [element] },
          }),
        )
        .expect(201);
      expect(res.body.canvasState).toEqual({ elements: [element] });
      expect(res.body.dimensions.paperThickness).toBe(0.45);
    });

    it('accepts the editor autosave payload and keeps its look presets, never raw SVG', async () => {
      // Own user: the list tests below count carol's projects.
      const erin = await register('erin');
      const created = await as(erin).post('/api/projects').send(newProject()).expect(201);
      // Exactly what fe/src/app/editor/[id]/page.tsx sends (materialSpecFor("gold_foil", 0.52)).
      const autosave = {
        version: created.body.version,
        title: 'Hộp nến thơm',
        dimensions: { length: 120, width: 80, height: 60, paperThickness: 0.52 },
        materialSpec: { type: 'duplex', gsm: 400, finish: 'glossy', caliper: 0.52 },
        canvasState: { elements: [], backgroundPattern: 'tet', backgroundTheme: 'cyber_citron', materialTheme: 'gold_foil' },
      };
      const saved = await as(erin).patch(`/api/projects/${created.body.id}`).send(autosave).expect(200);
      expect(saved.body.canvasState).toEqual(autosave.canvasState);

      const cleared = { ...autosave.canvasState, backgroundPattern: null };
      await as(erin)
        .patch(`/api/projects/${created.body.id}`)
        .send({ version: saved.body.version, canvasState: cleared })
        .expect(200);

      const svg = await as(erin)
        .patch(`/api/projects/${created.body.id}`)
        .send({ canvasState: { elements: [], backgroundPattern: '<svg onload="alert(1)"/>' } })
        .expect(400);
      expect(svg.body.message).toEqual([expect.stringContaining('backgroundPattern must be a preset id')]);
      // The box structure belongs to the project: the editor no longer sends it.
      await as(erin).patch(`/api/projects/${created.body.id}`).send({ templateId: 'pillow' }).expect(400);
    });

    it('rejects invalid payloads with readable messages', async () => {
      const res = await as(carol)
        .post('/api/projects')
        .send(newProject({ dimensions: { length: 10, width: 80, height: 60 } }))
        .expect(400);
      expect(res.body.message).toEqual(['dimensions.length must not be less than 40']);

      await as(carol).post('/api/projects').send(newProject({ templateId: 'mystery-box' })).expect(400);
      await as(carol).post('/api/projects').send(newProject({ title: '   ' })).expect(400);
      await as(carol)
        .post('/api/projects')
        .send(newProject({ materialSpec: { type: 'plastic', gsm: 300, caliper: 0.3, finish: 'matte' } }))
        .expect(400);
      await as(carol)
        .post('/api/projects')
        .send(newProject({ canvasState: { elements: [{ id: 'x', type: 'video' }] } }))
        .expect(400);
      // Fields outside the API contract (owner, status...) are refused.
      await as(carol).post('/api/projects').send(newProject({ userId: dave.id })).expect(400);
      await as(carol).post('/api/projects').send(newProject({ status: 'DELETED' })).expect(400);
    });

    it("refuses to put a project in another user's collection", async () => {
      const res = await as(carol)
        .post('/api/projects')
        .send(newProject({ collectionId: daveCollection }))
        .expect(400);
      expect(res.body.message).toBe('collectionId must be one of your collections');
    });
  });

  describe('list', () => {
    beforeAll(async () => {
      await as(carol).post('/api/projects').send(newProject({ title: 'Hộp bánh trung thu' })).expect(201);
      const archived = await as(carol).post('/api/projects').send(newProject({ title: 'Hộp cũ' })).expect(201);
      await as(carol).patch(`/api/projects/${archived.body.id}/status`).send({ status: 'ARCHIVED' }).expect(200);
      await as(dave).post('/api/projects').send(newProject({ title: 'Hộp nến của Dave' })).expect(201);
    });

    it('returns only my active projects, newest first, without the canvas', async () => {
      const res = await as(carol).get('/api/projects').expect(200);
      expect(res.body.meta).toEqual({ total: 3, page: 1, limit: 20, totalPages: 1 });
      expect(res.body.items.map((p: { title: string }) => p.title)).toEqual([
        'Hộp bánh trung thu',
        'Hộp gối trang sức',
        'Hộp nến thơm',
      ]);
      expect(res.body.items[0].canvasState).toBeUndefined();
      // Dashboard card (UC-03): paper and print readiness, computed by the server-side FitCheck.
      expect(res.body.items[1]).toMatchObject({
        materialSpec: { type: 'kraft', gsm: 350 },
        fitcheckScore: expect.any(Number),
      });
      expect(res.body.items[0].fitcheckScore).toBe(100); // empty canvas
    });

    it('filters by status, collection and search text', async () => {
      const titles = async (query: string) =>
        (await as(carol).get(`/api/projects?${query}`).expect(200)).body.items.map((p: { title: string }) => p.title);

      expect(await titles('status=ARCHIVED')).toEqual(['Hộp cũ']);
      expect(await titles(`collectionId=${carolCollection}`)).toEqual(['Hộp nến thơm']);
      expect(await titles('collectionId=none&sortBy=title&order=asc')).toEqual(['Hộp bánh trung thu', 'Hộp gối trang sức']);
      expect(await titles(`q=${encodeURIComponent('TRUNG THU')}`)).toEqual(['Hộp bánh trung thu']);
      expect(await titles('q=Tet')).toEqual(['Hộp nến thơm']); // exact tag
      expect(await titles('templateId=pillow')).toEqual(['Hộp gối trang sức']);
      expect(await titles('templateId=hexagon')).toEqual([]);
    });

    it('paginates and validates the query', async () => {
      const res = await as(carol).get('/api/projects?limit=2&page=2').expect(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.meta).toEqual({ total: 3, page: 2, limit: 2, totalPages: 2 });

      await as(carol).get('/api/projects?status=GONE').expect(400);
      await as(carol).get('/api/projects?collectionId=abc').expect(400);
      await as(carol).get('/api/projects?sortBy=userId').expect(400);
      await as(carol).get('/api/projects?templateId=Tuck%20Top').expect(400);
    });
  });

  describe('read, update, delete', () => {
    let projectId: string;

    beforeAll(async () => {
      projectId = (await as(carol).post('/api/projects').send(newProject({ title: 'Hộp để sửa' })).expect(201)).body.id;
    });

    it('returns the project to its owner only', async () => {
      const res = await as(carol).get(`/api/projects/${projectId}`).expect(200);
      expect(res.body).toMatchObject({ id: projectId, title: 'Hộp để sửa', canvasState: { elements: [] } });

      // Another user cannot tell the project exists.
      const hidden = await as(dave).get(`/api/projects/${projectId}`).expect(404);
      expect(hidden.body.message).toBe('Project not found');
      await as(dave).patch(`/api/projects/${projectId}`).send({ title: 'hijack' }).expect(404);
      await as(dave).delete(`/api/projects/${projectId}`).expect(404);

      await as(carol).get('/api/projects/not-a-uuid').expect(400);
      await as(carol).get('/api/projects/7d0c3f6e-2f1a-4c55-9a43-2a0f5a7c9b11').expect(404);
    });

    it('updates fields and re-validates dimensions against the template', async () => {
      const thumbnailUrl = await uploadPng(app, carol.cookie, 'THUMBNAIL', projectId);
      const res = await as(carol)
        .patch(`/api/projects/${projectId}`)
        .send({
          title: 'Hộp đã sửa',
          dimensions: { length: 150, width: 90, height: 70, paperThickness: 0.5 },
          collectionId: carolCollection,
          thumbnailUrl,
          tags: ['Moi'],
        })
        .expect(200);
      expect(res.body).toMatchObject({
        title: 'Hộp đã sửa',
        dimensions: { length: 150, width: 90, height: 70, paperThickness: 0.5 },
        collection: { id: carolCollection },
        thumbnailUrl,
        tags: ['moi'],
      });
      // The database keeps the object key, not the URL.
      const stored = await prisma.packagingProject.findUniqueOrThrow({ where: { id: projectId } });
      expect(thumbnailUrl.endsWith(`/${stored.thumbnailKey}`)).toBe(true);
      expect(stored.thumbnailKey).toMatch(/^users\//);

      const cleared = await as(carol)
        .patch(`/api/projects/${projectId}`)
        .send({ collectionId: null, thumbnailUrl: null })
        .expect(200);
      expect(cleared.body).toMatchObject({ title: 'Hộp đã sửa', collection: null, thumbnailUrl: null });

      await as(carol)
        .patch(`/api/projects/${projectId}`)
        .send({ dimensions: { length: 700, width: 90, height: 70 } })
        .expect(400);
      await as(carol).patch(`/api/projects/${projectId}`).send({ templateId: 'pillow' }).expect(400);
      // Only the caller's own uploads: no image of another site, no file of another user.
      const external = await as(carol)
        .patch(`/api/projects/${projectId}`)
        .send({ thumbnailUrl: 'https://insecure.example/a.png' })
        .expect(400);
      expect(external.body.code).toBe('FILE_URL_NOT_ALLOWED');
      const othersFile = await uploadPng(app, dave.cookie, 'THUMBNAIL');
      const foreign = await as(carol).patch(`/api/projects/${projectId}`).send({ thumbnailUrl: othersFile }).expect(400);
      expect(foreign.body.code).toBe('FILE_NOT_OWNED');
      const otherCanvas = await as(carol)
        .patch(`/api/projects/${projectId}`)
        .send({ canvasState: { elements: [{ id: 'i', type: 'image', panelId: 'front', x: 0, y: 0, width: 10, height: 10, rotation: 0, content: othersFile }] } })
        .expect(400);
      expect(otherCanvas.body.code).toBe('FILE_NOT_OWNED');

      // Public pages load the files of a canvas: no other site, no data URL; frontend paths and sticker labels are fine.
      const canvasWith = (content: string, style?: Record<string, unknown>) => ({
        canvasState: { elements: [{ id: 'i', type: 'logo', panelId: 'front', x: 0, y: 0, width: 10, height: 10, rotation: 0, content, style }] },
      });
      for (const content of ['https://tracker.example/pixel.png', '//tracker.example/p.png', 'data:image/svg+xml,<svg/>']) {
        const res = await as(carol).patch(`/api/projects/${projectId}`).send(canvasWith(content)).expect(400);
        expect(res.body.code).toBe('FILE_URL_NOT_ALLOWED');
      }
      await as(carol).patch(`/api/projects/${projectId}`).send(canvasWith('/branding/wrapfit-logo.png')).expect(200);
      await as(carol).patch(`/api/projects/${projectId}`).send(canvasWith('Bé Gói Vẫy Tay')).expect(200);
      // Colors and fonts end up in SVG and CSS: plain values only.
      await as(carol).patch(`/api/projects/${projectId}`).send(canvasWith('Logo', { color: 'red;background:url(//x)' })).expect(400);
      await as(carol).patch(`/api/projects/${projectId}`).send(canvasWith('Logo', { fontFamily: 'x;}body{' })).expect(400);
      await as(carol)
        .patch(`/api/projects/${projectId}`)
        .send(canvasWith('Logo', { color: '#1A362B', fillColor: '#FFF', fontFamily: "'Big Shoulders Display', sans-serif" }))
        .expect(200);
    });

    it('refuses a save based on an older version instead of overwriting the newer one (409)', async () => {
      const { version } = (await as(carol).get(`/api/projects/${projectId}`).expect(200)).body;

      // Tab A saves first: the version moves on.
      const saved = await as(carol).patch(`/api/projects/${projectId}`).send({ version, title: 'Tab A' }).expect(200);
      expect(saved.body.version).toBe(version + 1);

      // Tab B still holds the old version.
      const stale = await as(carol).patch(`/api/projects/${projectId}`).send({ version, title: 'Tab B' }).expect(409);
      expect(stale.body).toMatchObject({ code: 'PROJECT_VERSION_CONFLICT', currentVersion: version + 1 });
      expect((await as(carol).get(`/api/projects/${projectId}`).expect(200)).body.title).toBe('Tab A');

      // Sharing settings do not touch the design: they leave the version alone.
      await as(carol).patch(`/api/projects/${projectId}/visibility`).send({ allowFork: false }).expect(200);
      await as(carol).patch(`/api/projects/${projectId}`).send({ version: version + 1, title: 'Hộp đã sửa' }).expect(200);
    });

    it('rejects null for fields that cannot be cleared (400, not 500)', async () => {
      for (const field of ['title', 'dimensions', 'materialSpec', 'canvasState', 'tags']) {
        await as(carol).patch(`/api/projects/${projectId}`).send({ [field]: null }).expect(400);
      }
      for (const field of ['visibility', 'allowFork']) {
        await as(carol).patch(`/api/projects/${projectId}/visibility`).send({ [field]: null }).expect(400);
      }
    });

    it('deletes permanently only from the trash, and a trashed project is read-only', async () => {
      const notInTrash = await as(carol).delete(`/api/projects/${projectId}`).expect(409);
      expect(notInTrash.body.message).toBe('Move the project to the trash before deleting it permanently');

      await as(carol).patch(`/api/projects/${projectId}/status`).send({ status: 'DELETED' }).expect(200);
      await as(carol).patch(`/api/projects/${projectId}`).send({ title: 'x' }).expect(409);

      await as(carol).delete(`/api/projects/${projectId}`).expect(204);
      await as(carol).get(`/api/projects/${projectId}`).expect(404);
    });
  });

  describe('lifecycle: archive, trash, restore', () => {
    let projectId: string;
    const setStatus = (status: string, user = carol) =>
      as(user).patch(`/api/projects/${projectId}/status`).send({ status });

    beforeAll(async () => {
      projectId = (await as(carol).post('/api/projects').send(newProject({ title: 'Hộp vòng đời' })).expect(201)).body.id;
    });

    it('archives and un-archives', async () => {
      expect((await setStatus('ARCHIVED').expect(200)).body).toMatchObject({ status: 'ARCHIVED', deletedAt: null });
      expect((await setStatus('ACTIVE').expect(200)).body).toMatchObject({ status: 'ACTIVE', deletedAt: null });
    });

    it('moves to the trash with a timestamp, idempotently, and restores', async () => {
      const trashed = (await setStatus('DELETED').expect(200)).body;
      expect(trashed.status).toBe('DELETED');
      expect(Date.now() - new Date(trashed.deletedAt).getTime()).toBeLessThan(60_000);

      // Trashing again must not restart the 30-day countdown.
      expect((await setStatus('DELETED').expect(200)).body.deletedAt).toBe(trashed.deletedAt);
      const inTrash = await as(carol).get('/api/projects?status=DELETED').expect(200);
      expect(inTrash.body.items.map((p: { id: string }) => p.id)).toContain(projectId);

      expect((await setStatus('ACTIVE').expect(200)).body).toMatchObject({ status: 'ACTIVE', deletedAt: null });
    });

    it('validates the status and the owner', async () => {
      await setStatus('GONE').expect(400);
      await as(carol).patch(`/api/projects/${projectId}/status`).send({}).expect(400);
      await setStatus('DELETED', dave).expect(404);
    });
  });

  describe('duplicate', () => {
    let source: { id: string; slug: string };
    const canvas = {
      elements: [
        {
          id: 'logo',
          type: 'logo',
          panelId: 'front',
          x: 5,
          y: 5,
          width: 30,
          height: 30,
          rotation: 0,
          content: '/branding/wrapfit-logo.png',
        },
      ],
    };

    beforeAll(async () => {
      source = (
        await as(carol)
          .post('/api/projects')
          .send(
            newProject({
              templateId: 'lid-base',
              title: 'Hộp gốc',
              materialSpec: { type: 'duplex', gsm: 350, caliper: 0.45, finish: 'glossy' },
              canvasState: canvas,
              collectionId: carolCollection,
              tags: ['goc'],
            }),
          )
          .expect(201)
      ).body;
      // Uploaded first: supertest starts the request's server when the request is created.
      const thumbnailUrl = await uploadPng(app, carol.cookie, 'THUMBNAIL', source.id);
      await as(carol).patch(`/api/projects/${source.id}`).send({ thumbnailUrl }).expect(200);
    });

    it('creates an independent copy with a new id and slug', async () => {
      const res = await as(carol).post(`/api/projects/${source.id}/duplicate`).expect(201);

      expect(res.body.id).not.toBe(source.id);
      expect(res.body.slug).not.toBe(source.slug);
      expect(res.body).toMatchObject({
        title: '[Bản sao] Hộp gốc',
        status: 'ACTIVE',
        visibility: 'PRIVATE',
        template: { id: 'lid-base' },
        collection: { id: carolCollection },
        dimensions: { length: 120, width: 80, height: 60, paperThickness: 0.45 },
        materialSpec: { type: 'duplex', gsm: 350, caliper: 0.45, finish: 'glossy' },
        canvasState: canvas,
        tags: ['goc'],
        thumbnailUrl: null,
        forkedFromId: null,
      });

      // Editing the copy leaves the source untouched.
      await as(carol).patch(`/api/projects/${res.body.id}`).send({ canvasState: { elements: [] } }).expect(200);
      expect((await as(carol).get(`/api/projects/${source.id}`).expect(200)).body.canvasState).toEqual(canvas);
    });

    it('refuses projects of other users and projects in the trash', async () => {
      await as(dave).post(`/api/projects/${source.id}/duplicate`).expect(404);

      await as(carol).patch(`/api/projects/${source.id}/status`).send({ status: 'DELETED' }).expect(200);
      await as(carol).post(`/api/projects/${source.id}/duplicate`).expect(409);
      await as(carol).patch(`/api/projects/${source.id}/status`).send({ status: 'ACTIVE' }).expect(200);
    });
  });

  describe('snapshots', () => {
    let projectId: string;
    let firstSnapshot: string;
    const text = (content: string) => ({
      elements: [{ id: 't', type: 'text', panelId: 'front', x: 4, y: 4, width: 40, height: 10, rotation: 0, content }],
    });
    const url = (path = '') => `/api/projects/${projectId}/snapshots${path}`;

    beforeAll(async () => {
      projectId = (
        await as(carol)
          .post('/api/projects')
          .send(newProject({ title: 'Hộp có lịch sử', canvasState: text('v1') }))
          .expect(201)
      ).body.id;
    });

    it('saves the current design as a named version', async () => {
      const res = await as(carol).post(url()).send({ name: '  Mốc 1: chữ v1  ' }).expect(201);
      expect(res.body).toEqual({
        id: expect.any(String),
        name: 'Mốc 1: chữ v1',
        previewUrl: null,
        dimensions: { length: 120, width: 80, height: 60, paperThickness: 0.42 },
        formulaVersion: CURRENT_FORMULA_VERSION,
        createdAt: expect.any(String),
      });
      firstSnapshot = res.body.id;

      await as(carol).post(url()).send({ name: '' }).expect(400);
      await as(carol).post(url()).send({ name: 'x', canvasState: text('v2') }).expect(400);
    });

    it('restores a version and keeps the replaced state as an undo point', async () => {
      await as(carol)
        .patch(`/api/projects/${projectId}`)
        .send({ canvasState: text('v2'), dimensions: { length: 200, width: 100, height: 80 } })
        .expect(200);

      const res = await as(carol).post(url(`/${firstSnapshot}/restore`)).expect(200);
      expect(res.body.project).toMatchObject({
        id: projectId,
        canvasState: text('v1'),
        dimensions: { length: 120, width: 80, height: 60, paperThickness: 0.42 },
      });
      expect(res.body.backup).toMatchObject({
        name: 'Trước khi khôi phục: Mốc 1: chữ v1',
        dimensions: { length: 200, width: 100, height: 80, paperThickness: 0.42 },
      });

      const history = (await as(carol).get(url()).expect(200)).body;
      expect(history.map((s: { name: string }) => s.name)).toEqual([
        'Trước khi khôi phục: Mốc 1: chữ v1',
        'Mốc 1: chữ v1',
      ]);
      expect(history[0].canvasState).toBeUndefined();

      // Undo the restore with the backup.
      const undo = await as(carol).post(url(`/${res.body.backup.id}/restore`)).expect(200);
      expect(undo.body.project.canvasState).toEqual(text('v2'));

      // An editor still showing the design from before the restores cannot save over them.
      expect(undo.body.project.version).toBe(res.body.project.version + 1);
      await as(carol)
        .patch(`/api/projects/${projectId}`)
        .send({ version: res.body.project.version, canvasState: text('stale') })
        .expect(409);
    });

    it('deletes a version', async () => {
      await as(carol).delete(url(`/${firstSnapshot}`)).expect(204);
      await as(carol).delete(url(`/${firstSnapshot}`)).expect(404);
      await as(carol).post(url(`/${firstSnapshot}/restore`)).expect(404);
      await as(carol).delete(url('/not-a-uuid')).expect(400);
    });

    it('limits manual versions to 50; automatic ones (restore backups, exports) do not count', async () => {
      // The restore test above left two automatic backups.
      expect(await prisma.projectSnapshot.count({ where: { projectId, isAutomatic: true } })).toBe(2);

      const fill = (count: number, isAutomatic: boolean) =>
        prisma.projectSnapshot.createMany({
          data: Array.from({ length: count }, (_, i) => ({
            projectId,
            name: `fill ${i}`,
            canvasState: { elements: [] },
            dimensions: {},
            isAutomatic,
          })),
        });
      await fill(60, true);
      const manual = await prisma.projectSnapshot.count({ where: { projectId, isAutomatic: false } });
      await fill(MAX_SNAPSHOTS_PER_PROJECT - manual - 1, false);

      await as(carol).post(url()).send({ name: 'last manual' }).expect(201);
      await as(carol).post(url()).send({ name: 'one too many' }).expect(409);
    });

    it('hides the history from other users and freezes it in the trash', async () => {
      await as(dave).get(url()).expect(404);
      await as(dave).post(url()).send({ name: 'x' }).expect(404);

      await as(carol).patch(`/api/projects/${projectId}/status`).send({ status: 'DELETED' }).expect(200);
      await as(carol).post(url()).send({ name: 'x' }).expect(409);
      await as(carol).get(url()).expect(200);
    });
  });

  describe('formula upgrade (docs/12 Phase 8, 8.10)', () => {
    let projectId: string;
    const url = () => `/api/projects/${projectId}/formula-upgrade`;
    // A text close to the right side of the front panel: 2.8 mm left in version 1, 3.22 mm with the paper thickness.
    const canvas = {
      elements: [{ id: 't', type: 'text', panelId: 'panel_front', x: 3, y: 10, width: 114.2, height: 10, rotation: 0, content: 'x' }],
    };

    beforeAll(async () => {
      projectId = (
        await as(carol)
          .post('/api/projects')
          .send(newProject({ title: 'Hộp công thức cũ', canvasState: canvas }))
          .expect(201)
      ).body.id;
      // As if it was created before the current formulas.
      await prisma.packagingProject.update({ where: { id: projectId }, data: { formulaVersion: 1 } });
    });

    it('tells the editor that newer formulas exist', async () => {
      const project = (await as(carol).get(`/api/projects/${projectId}`).expect(200)).body;
      expect(project).toMatchObject({ formulaVersion: 1, latestFormulaVersion: CURRENT_FORMULA_VERSION });
    });

    it('upgrades with a backup that undoes it, guarded by the version like a save', async () => {
      const before = (await as(carol).get(`/api/projects/${projectId}`).expect(200)).body;
      const stale = await as(carol).post(url()).send({ version: before.version + 1 }).expect(409);
      expect(stale.body).toMatchObject({ code: 'PROJECT_VERSION_CONFLICT', currentVersion: before.version });
      await as(carol).post(url()).send({}).expect(400);

      const res = await as(carol).post(url()).send({ version: before.version }).expect(200);
      expect(res.body.project).toMatchObject({
        formulaVersion: CURRENT_FORMULA_VERSION,
        version: before.version + 1,
        fitcheckScore: 100,
        canvasState: canvas,
      });
      expect(res.body.backup).toMatchObject({
        name: `Trước khi cập nhật công thức (bản 1 → ${CURRENT_FORMULA_VERSION})`,
        formulaVersion: 1,
      });
      // Already current: nothing to do.
      const again = await as(carol).post(url()).send({ version: res.body.project.version }).expect(200);
      expect(again.body).toMatchObject({ project: { version: res.body.project.version }, backup: null });

      // Undo: restoring the backup puts version 1 back, and its FitCheck (text 2.8 mm from the fold).
      const undo = await as(carol)
        .post(`/api/projects/${projectId}/snapshots/${res.body.backup.id}/restore`)
        .expect(200);
      expect(undo.body.project).toMatchObject({ formulaVersion: 1, fitcheckScore: 90 });
    });

    it('is for the owner only, and not in the trash', async () => {
      const { version } = (await as(carol).get(`/api/projects/${projectId}`).expect(200)).body;
      await as(dave).post(url()).send({ version }).expect(404);
      await as(carol).patch(`/api/projects/${projectId}/status`).send({ status: 'DELETED' }).expect(200);
      await as(carol).post(url()).send({ version: version + 1 }).expect(409);
      await as(carol).patch(`/api/projects/${projectId}/status`).send({ status: 'ACTIVE' }).expect(200);
    });

    it('db:upgrade-formulas moves projects never exported, and keeps exported ones', async () => {
      const exported = (
        await as(carol).post('/api/projects').send(newProject({ title: 'Đã in' })).expect(201)
      ).body.id;
      await prisma.packagingProject.updateMany({ where: { id: { in: [projectId, exported] } }, data: { formulaVersion: 1 } });
      await prisma.exportJob.create({ data: { projectId: exported, fileType: 'PDF_CMYK', status: 'COMPLETED' } });

      const script = (id: string, ...flags: string[]) =>
        execFileSync(process.execPath, [require.resolve('ts-node/dist/bin'), 'prisma/scripts/upgrade-formulas.ts', `--project=${id}`, ...flags], {
          cwd: `${__dirname}/../..`,
          encoding: 'utf8',
        });
      const versionOf = async (id: string) =>
        (await prisma.packagingProject.findUniqueOrThrow({ where: { id } })).formulaVersion;

      expect(script(projectId, '--dry-run')).toContain('--dry-run');
      expect(await versionOf(projectId)).toBe(1);

      const output = script(projectId);
      expect(output).toContain(`1 → ${CURRENT_FORMULA_VERSION}`);
      expect(await versionOf(projectId)).toBe(CURRENT_FORMULA_VERSION);
      const backup = await prisma.projectSnapshot.findFirst({
        where: { projectId, name: `Trước khi cập nhật công thức (bản 1 → ${CURRENT_FORMULA_VERSION})`, isAutomatic: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(backup?.formulaVersion).toBe(1);
      // Running it again changes nothing.
      expect(script(projectId)).toContain('0 cần cập nhật');

      script(exported);
      expect(await versionOf(exported)).toBe(1);
    }, 60_000);
  });

  it('scores projects saved before FitCheck scores existed, without reordering the dashboard', async () => {
    const { id } = (await as(carol).post('/api/projects').send(newProject({ title: 'Hộp cũ chưa chấm' })).expect(201)).body;
    await prisma.packagingProject.update({ where: { id }, data: { fitcheckScore: null, fitcheckState: Prisma.DbNull } });
    const before = await prisma.packagingProject.findUniqueOrThrow({ where: { id } });

    await app.get(FitCheckBackfillTask).onApplicationBootstrap();

    const after = await prisma.packagingProject.findUniqueOrThrow({ where: { id } });
    expect(after).toMatchObject({ fitcheckScore: 100, fitcheckState: expect.objectContaining({ score: 100 }) });
    expect(after.updatedAt).toEqual(before.updatedAt);
  });

  describe('trash purge (cron)', () => {
    it('is scheduled every day at 02:00', () => {
      const job = app.get(SchedulerRegistry).getCronJob('trash-purge');
      expect(job.cronTime.source).toBe('0 2 * * *');
    });

    it('permanently deletes projects that stayed in the trash for more than 30 days', async () => {
      const create = async (title: string) =>
        (await as(carol).post('/api/projects').send(newProject({ title })).expect(201)).body.id as string;
      const expired = await create('Hết hạn');
      const recent = await create('Mới vào thùng rác');
      const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      for (const id of [expired, recent]) {
        await as(carol).patch(`/api/projects/${id}/status`).send({ status: 'DELETED' }).expect(200);
      }
      await as(carol).post(`/api/projects/${expired}/snapshots`).send({ name: 'x' }).expect(409); // trash is read-only
      await prisma.projectSnapshot.create({
        data: { projectId: expired, name: 'old', canvasState: { elements: [] }, dimensions: {} },
      });
      // Simulate the passage of time.
      await prisma.packagingProject.update({ where: { id: expired }, data: { deletedAt: daysAgo(31) } });
      await prisma.packagingProject.update({ where: { id: recent }, data: { deletedAt: daysAgo(29) } });

      await app.get(TrashPurgeTask).run();

      expect(await prisma.packagingProject.findUnique({ where: { id: expired } })).toBeNull();
      expect(await prisma.projectSnapshot.count({ where: { projectId: expired } })).toBe(0);
      expect(await prisma.packagingProject.findUnique({ where: { id: recent } })).not.toBeNull();
    });
  });

  it('keeps the newest automatic snapshots only, never touching manual ones', async () => {
    const id = (await as(carol).post('/api/projects').send(newProject({ title: 'Nhiều lần xuất' })).expect(201)).body.id;
    const manual = (await as(carol).post(`/api/projects/${id}/snapshots`).send({ name: 'Thủ công' }).expect(201)).body;
    // Every restore saves the current state first as an automatic snapshot.
    for (let i = 0; i < MAX_AUTOMATIC_SNAPSHOTS + 3; i++) {
      await as(carol).post(`/api/projects/${id}/snapshots/${manual.id}/restore`).expect(200);
    }
    expect(await prisma.projectSnapshot.count({ where: { projectId: id, isAutomatic: true } })).toBe(MAX_AUTOMATIC_SNAPSHOTS);
    expect(await prisma.projectSnapshot.count({ where: { projectId: id, isAutomatic: false } })).toBe(1);
  });
});
