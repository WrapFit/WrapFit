import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication, INestApplicationContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import type { Queue } from 'bullmq';
import QRCode from 'qrcode';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { CreditsService } from '../../src/billing';
import { QUEUE_ADD_TIMEOUT_MS } from '../../src/common';
import { EXPORT_QUEUE, type ExportDesign } from '../../src/export/export.constants';
import { failExport } from '../../src/export/export-failure';
import { ExportReconcileTask } from '../../src/export/export-reconcile.task';
import { ExportService } from '../../src/export/export.service';
import { buildPrintLayout } from '../../src/export/rendering/print-layout';
import { renderDxf } from '../../src/export/rendering/print-renderers';
import { PrismaService } from '../../src/shared/prisma';
import { StorageService } from '../../src/storage';
import { signUp } from './helpers/accounts';
import { holdTransaction, untilLockWaiters } from './helpers/locks';
import { createPaidOrder } from './helpers/orders';
import { WorkerModule } from '../../src/worker';
import { deleteUsers } from './helpers/cleanup';

/**
 * Print export (IT3-11): API enqueues in Redis, a real worker context renders and uploads to SeaweedFS.
 * Needs `docker compose up -d postgres redis seaweedfs storage-init`.
 */
describe('Print export (e2e)', () => {
  let app: INestApplication;
  let worker: INestApplicationContext;
  let prisma: PrismaService;

  const run = Date.now();
  let pia: { id: string; cookie: string };
  let quinn: { id: string; cookie: string };
  let credits: CreditsService;
  let projectId: string;

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

  /** Polls like the frontend does (docs 07: every 2 s; faster here). */
  /** Print orders written by the test, removed at the end. */
  const orderIds: string[] = [];
  const payOrderFor = async (userId: string, project: string) => {
    orderIds.push(await createPaidOrder(prisma, userId, project, run));
  };

  /** A real PNG uploaded like the browser does: its public URL and its storage key. */
  const uploadPngTo = async (user: { cookie: string }) => {
    const png = await QRCode.toBuffer('wrapfit', { type: 'png', width: 120 });
    const ticket = (
      await as(user).post('/api/storage/presigned-upload').send({ purpose: 'IMAGE', contentType: 'image/png', size: png.length }).expect(200)
    ).body as { uploadUrl: string; headers: Record<string, string>; fileUrl: string };
    expect((await fetch(ticket.uploadUrl, { method: 'PUT', headers: ticket.headers, body: new Uint8Array(png) })).status).toBe(200);
    return { url: ticket.fileUrl, key: ticket.fileUrl.slice(ticket.fileUrl.indexOf('users/')), png };
  };

  const waitFor = async (jobId: string, user = pia) => {
    for (let i = 0; i < 100; i++) {
      const res = await as(user).get(`/api/exports/${jobId}`).expect(200);
      if (res.body.status === 'COMPLETED' || res.body.status === 'FAILED') return res.body;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Export ${jobId} did not finish`);
  };
  const exportAs = async (fileType: string) => {
    const res = await as(pia).post(`/api/projects/${projectId}/exports`).send({ fileType }).expect(202);
    expect(res.body).toMatchObject({ jobId: expect.any(String), status: 'PENDING', fitCheck: { isValidForProduction: true } });
    return waitFor(res.body.jobId);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    await app.init();
    prisma = app.get(PrismaService);
    const workerRef = await Test.createTestingModule({ imports: [WorkerModule] }).compile();
    worker = await workerRef.createNestApplication().init();

    credits = app.get(CreditsService);
    pia = await register('pia');
    quinn = await register('quinn');
    projectId = (
      await as(pia)
        .post('/api/projects')
        .send({
          templateId: 'tuck-top',
          title: 'Hộp nến Tết',
          dimensions: { length: 120, width: 80, height: 60 },
          canvasState: {
            elements: [
              { id: 't1', type: 'text', panelId: 'panel_front', x: 10, y: 10, width: 60, height: 10, rotation: 0, content: 'An khang thịnh vượng' },
            ],
          },
        })
        .expect(201)
    ).body.id;
    // Pia paid the print order of this design in the cart: its print file is unlocked.
    await payOrderFor(pia.id, projectId);
  });

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await deleteUsers(prisma, { email: { endsWith: '@e2e.test' } });
    await worker.close(); // waits for the BullMQ worker's blocking connection: several seconds
    await app.close();
  }, 30_000);

  it('renders a CMYK PDF in the worker and returns a 15-minute download link', async () => {
    const job = await exportAs('PDF_CMYK');
    expect(job).toMatchObject({
      status: 'COMPLETED',
      fileType: 'PDF_CMYK',
      error: null,
      fileName: 'hop-nen-tet-pdf-cmyk.pdf',
      downloadExpiresIn: 900,
    });
    const url = new URL(job.downloadUrl);
    expect(url.searchParams.get('X-Amz-Expires')).toBe('900');

    const file = await fetch(job.downloadUrl);
    expect(file.status).toBe(200);
    expect(file.headers.get('content-disposition')).toBe('attachment; filename="hop-nen-tet-pdf-cmyk.pdf"');
    const pdf = Buffer.from(await file.arrayBuffer());
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    // Texts are outlined (prepress rule 2): no font in the file.
    expect(pdf.toString('latin1')).not.toMatch(/\/FontFile|\/Type \/Font/);

    // The file sits in the private bucket: only the signed link reads it, never a public URL.
    expect(url.pathname).toMatch(/^\/wrapfit-private\/private\/projects\/[0-9a-f-]{36}\/exports\/[0-9a-f-]{36}\.pdf$/);
    expect((await fetch(`${url.origin}${url.pathname}`)).status).toBe(403);
    const key = url.pathname.replace(/^\/wrapfit-private\//, '');
    expect((await fetch(`${process.env.STORAGE_PUBLIC_URL}/${key}`)).status).toBe(404);
  });

  it('renders SVG and DXF too', async () => {
    const svg = await exportAs('SVG');
    const svgText = await (await fetch(svg.downloadUrl)).text();
    // Fold lines dashed on their own layer (cutting plotters score them).
    expect(svgText).toContain('<g id="cut"');
    expect(svgText).toContain('<g id="crease"');
    // The text is outlined: a filled path in the artwork layer, never a <text> with a font.
    expect(svgText).not.toContain('An khang thịnh vượng');
    expect(svgText).not.toContain('<text');
    // Each element sits in the clip group of its face (+ bleed), `<g clip-path="url(#face1)">`.
    expect(svgText).toMatch(/<g id="artwork"[^>]*>(?:<g [^>]*>)*<path d="M /);

    const dxf = await exportAs('DXF');
    expect(await (await fetch(dxf.downloadUrl)).text()).toMatch(/^0\nSECTION\n2\nHEADER/);
  });

  it('keeps a snapshot of each export and lists the history', async () => {
    const snapshots = (await as(pia).get(`/api/projects/${projectId}/snapshots`).expect(200)).body;
    expect(snapshots.map((s: { name: string }) => s.name)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^Bản xuất in PDF_CMYK /), expect.stringMatching(/^Bản xuất in DXF /)]),
    );
    const history = (await as(pia).get(`/api/projects/${projectId}/exports`).expect(200)).body;
    expect(history.map((j: { fileType: string }) => j.fileType)).toEqual(['DXF', 'SVG', 'PDF_CMYK']);
  });

  it('embeds the uploaded images of the design in the PDF and the SVG', async () => {
    const png = await QRCode.toBuffer('wrapfit', { type: 'png', width: 120 });
    const ticket = (
      await as(pia).post('/api/storage/presigned-upload').send({ purpose: 'IMAGE', contentType: 'image/png', size: png.length }).expect(200)
    ).body;
    const uploaded = await fetch(ticket.uploadUrl, { method: 'PUT', headers: ticket.headers, body: new Uint8Array(png) });
    expect(uploaded.status).toBe(200);
    const withImage = (
      await as(pia)
        .post('/api/projects')
        .send({
          templateId: 'tuck-top',
          title: 'Hộp có logo',
          dimensions: { length: 120, width: 80, height: 60 },
          canvasState: {
            elements: [
              { id: 'img', type: 'image', panelId: 'panel_front', x: 10, y: 10, width: 30, height: 30, rotation: 0, content: ticket.fileUrl, dpi: 300 },
            ],
          },
        })
        .expect(201)
    ).body.id;
    await payOrderFor(pia.id, withImage);

    const exportOf = async (fileType: string) => {
      const res = await as(pia).post(`/api/projects/${withImage}/exports`).send({ fileType }).expect(202);
      const job = await waitFor(res.body.jobId);
      expect(job.status).toBe('COMPLETED');
      return Buffer.from(await (await fetch(job.downloadUrl)).arrayBuffer());
    };
    expect((await exportOf('PDF_CMYK')).toString('latin1')).toContain('/Subtype /Image');
    expect((await exportOf('SVG')).toString()).toContain(`href="data:image/png;base64,${png.toString('base64')}"`);
  });

  it('blocks the export when the server-side FitCheck finds errors', async () => {
    await as(pia)
      .patch(`/api/projects/${projectId}`)
      .send({
        canvasState: {
          elements: [
            // 0.5 mm from the top of the front panel, a cut line: would be cut off by the die.
            { id: 'logo', type: 'logo', panelId: 'panel_front', x: 0.5, y: 0.5, width: 20, height: 20, rotation: 0, content: '/branding/wrapfit-logo.png' },
          ],
        },
      })
      .expect(200);
    const res = await as(pia).post(`/api/projects/${projectId}/exports`).send({ fileType: 'PDF_CMYK' }).expect(422);
    expect(res.body.message).toBe('FitCheck found errors that would ruin the print; fix them before exporting');
    expect(res.body.fitCheck).toMatchObject({ isValidForProduction: false, violations: [expect.objectContaining({ code: 'CUT_OVERLAP', severity: 'error' })] });

    // The server result is saved on the project for the editor.
    const project = (await as(pia).get(`/api/projects/${projectId}`).expect(200)).body;
    expect(project.fitcheckState).toMatchObject({ isValidForProduction: false });
  });

  it('checks every element once across the pieces of a two-piece box, with short panel ids too', async () => {
    const element = (id: string, type: string, panelId: string, extra: Record<string, unknown> = {}) => ({
      id,
      type,
      panelId,
      x: 0.5,
      y: 0.5,
      width: 20,
      height: 10,
      rotation: 0,
      content: type === 'text' ? 'Chúc mừng' : '/branding/wrapfit-logo.png',
      ...extra,
    });
    const lidBase = (
      await as(pia)
        .post('/api/projects')
        .send({
          templateId: 'lid-base',
          title: 'Hộp âm dương',
          dimensions: { length: 120, width: 80, height: 60 },
          canvasState: {
            elements: [
              element('on-base', 'text', 'base_front'),
              element('on-lid', 'text', 'lid_top'),
              element('blurry', 'image', 'lid_top', { x: 10, y: 10, dpi: 200 }),
            ],
          },
        })
        .expect(201)
    ).body.id;
    const res = await as(pia).post(`/api/projects/${lidBase}/exports`).send({ fileType: 'SVG' }).expect(422);
    // 2 errors (-30 each) + 1 warning (-10), each reported once.
    expect(res.body.fitCheck.score).toBe(30);
    expect(res.body.fitCheck.violations.map((v: { id: string }) => v.id).sort()).toEqual([
      'dpi_blurry',
      'margin_on-base',
      'margin_on-lid',
    ]);

    // "front" means "panel_front", as in the print layout: the margin rule applies.
    const tuckTop = (
      await as(pia)
        .post('/api/projects')
        .send({
          templateId: 'tuck-top',
          title: 'Hộp id ngắn',
          dimensions: { length: 120, width: 80, height: 60 },
          canvasState: { elements: [element('short', 'text', 'front')] },
        })
        .expect(201)
    ).body.id;
    await as(pia).post(`/api/projects/${tuckTop}/exports`).send({ fileType: 'SVG' }).expect(422);
  });

  it('validates the request and hides exports from other users', async () => {
    await as(pia).post(`/api/projects/${projectId}/exports`).send({ fileType: 'JPG' }).expect(400);
    await as(quinn).post(`/api/projects/${projectId}/exports`).send({ fileType: 'SVG' }).expect(404);
    const [latest] = (await as(pia).get(`/api/projects/${projectId}/exports`).expect(200)).body;
    await as(quinn).get(`/api/exports/${latest.id}`).expect(404);
    await as(pia).get('/api/exports/not-a-uuid').expect(400);
    await api().get(`/api/exports/${latest.id}`).expect(401);
  });

  describe('print file sold through the print cart: no export before a paid order', () => {
    let rae: { id: string; cookie: string };
    let design: string;
    const exportOf = (body: Record<string, unknown>, user = rae, project = design) =>
      as(user).post(`/api/projects/${project}/exports`).send(body);
    // POST /exports allows 10 requests a minute per IP, and every test here comes from one: start each with a fresh budget.
    beforeEach(() => {
      // The in-memory store keeps the hits in a second map next to `storage`: reset both.
      const store = app.get(ThrottlerStorage) as unknown as { storage: Map<string, unknown>; hitExpirations: Map<string, unknown> };
      store.storage.clear();
      store.hitExpirations.clear();
    });

    beforeAll(async () => {
      rae = await register('rae');
      design = (
        await as(rae)
          .post('/api/projects')
          .send({ templateId: 'tuck-top', title: 'Hộp quà Rae', dimensions: { length: 120, width: 80, height: 60 }, canvasState: { elements: [] } })
          .expect(201)
      ).body.id;
    });

    // Several jobs here are queued without waiting for them: let the worker finish before the project is deleted.
    afterAll(async () => {
      for (let i = 0; i < 200; i++) {
        const running = await prisma.exportJob.count({ where: { projectId: design, status: { in: ['PENDING', 'PROCESSING'] } } });
        if (running === 0) return;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }, 30_000);

    it('answers 402 ORDER_PAYMENT_REQUIRED for every format until an order is paid, credits or Pro included', async () => {
      expect((await as(rae).get(`/api/projects/${design}/exports/access`).expect(200)).body).toMatchObject({ unlocked: false });
      for (const fileType of ['PDF_A4_PRINT', 'SVG', 'DXF']) {
        expect((await exportOf({ fileType }).expect(402)).body).toMatchObject({ code: 'ORDER_PAYMENT_REQUIRED' });
      }
      // Export credits left from before (docs-old/25 item 7) open nothing, and `useCredit` is no longer accepted.
      await credits.grant(rae.id, { quantity: 2, source: 'ADMIN', expiresAt: null });
      await exportOf({ fileType: 'SVG' }).expect(402);
      await exportOf({ fileType: 'SVG', useCredit: true }).expect(400);
      expect(await credits.balance(rae.id)).toBe(2);
      await prisma.user.update({ where: { id: rae.id }, data: { subscriptionTier: 'STARTER' } });
      await exportOf({ fileType: 'SVG' }).expect(402);
      await prisma.user.update({ where: { id: rae.id }, data: { subscriptionTier: 'FREE' } });
      expect(await prisma.exportJob.count({ where: { projectId: design } })).toBe(0);
    });

    it('a paid order of this version unlocks clean files in every format, no export credit read or spent', async () => {
      await payOrderFor(rae.id, design);
      expect((await as(rae).get(`/api/projects/${design}/exports/access`).expect(200)).body).toEqual({
        unlocked: true,
        unlockExpiresAt: null,
      });
      const started = (await exportOf({ fileType: 'SVG' }).expect(202)).body;
      expect(Object.keys(started).sort()).toEqual(['fitCheck', 'jobId', 'status']);
      expect(await waitFor(started.jobId, rae)).toMatchObject({ status: 'COMPLETED', watermarked: false });
      for (const fileType of ['DXF', 'PDF_A4_PRINT']) {
        expect((await exportOf({ fileType }).expect(202)).body).not.toHaveProperty('charged');
      }
      expect(await credits.balance(rae.id)).toBe(2);
      expect(await prisma.creditDebit.count({ where: { userId: rae.id } })).toBe(0);
      expect(await prisma.exportJob.count({ where: { projectId: design, OR: [{ watermarked: true }, { unlockId: { not: null } }] } })).toBe(0);
    });

    it('an unlock bought with a credit before the print cart still opens its version, without spending anything', async () => {
      const other = (
        await as(rae)
          .post('/api/projects')
          .send({ templateId: 'tuck-top', title: 'Hộp cũ Rae', dimensions: { length: 120, width: 80, height: 60 }, canvasState: { elements: [] } })
          .expect(201)
      ).body.id as string;
      await exportOf({ fileType: 'SVG' }, rae, other).expect(402);
      const { version } = await prisma.packagingProject.findUniqueOrThrow({ where: { id: other }, select: { version: true } });
      const expiresAt = new Date(Date.now() + 86_400_000);
      const unlock = await prisma.exportUnlock.create({
        data: { projectId: other, projectVersion: version, userId: rae.id, debitOperationId: '01970000-0000-7000-8000-0000000000aa', expiresAt },
      });
      expect((await as(rae).get(`/api/projects/${other}/exports/access`).expect(200)).body).toEqual({
        unlocked: true,
        unlockExpiresAt: expiresAt.toISOString(),
      });
      const started = (await exportOf({ fileType: 'PDF_A4_PRINT' }, rae, other).expect(202)).body;
      expect(await waitFor(started.jobId, rae)).toMatchObject({ status: 'COMPLETED', watermarked: false });
      expect(await prisma.exportJob.findUniqueOrThrow({ where: { id: started.jobId } })).toMatchObject({ unlockId: unlock.id });
      expect(await credits.balance(rae.id)).toBe(2);
      expect(await prisma.creditDebit.count({ where: { userId: rae.id } })).toBe(0);
    });

    it('needs a new paid order after an edit', async () => {
      const text = { id: 't', type: 'text', panelId: 'panel_front', x: 10, y: 10, width: 40, height: 10, rotation: 0, content: 'Rae' };
      await as(rae).patch(`/api/projects/${design}`).send({ canvasState: { elements: [text] } }).expect(200);
      expect((await exportOf({ fileType: 'SVG' }).expect(402)).body).toMatchObject({ code: 'ORDER_PAYMENT_REQUIRED' });
      await payOrderFor(rae.id, design);
      await exportOf({ fileType: 'SVG' }).expect(202);
    });

    it('keeps the paid files unlocked after a rename: only a design change needs a new order (Q3)', async () => {
      const paid = (await as(rae).get(`/api/projects/${design}`).expect(200)).body;
      // What the studio autosave sends for a rename: the whole, unchanged design with the new title.
      const renamed = await as(rae)
        .patch(`/api/projects/${design}`)
        .send({
          version: paid.version,
          title: 'Hộp quà Rae (bản in)',
          dimensions: paid.dimensions,
          materialSpec: paid.materialSpec,
          canvasState: paid.canvasState,
        })
        .expect(200);
      expect(renamed.body.version).toBe(paid.version);
      await as(rae).patch(`/api/projects/${design}`).send({ version: paid.version, tags: ['in-thu'] }).expect(200);

      expect((await as(rae).get(`/api/projects/${design}/exports/access`).expect(200)).body).toMatchObject({ unlocked: true });
      await exportOf({ fileType: 'SVG' }).expect(202);
    });

    it('lets only the owner export or read the access: 404 for others', async () => {
      // docs-old/17 asked for 403; ProjectOwnerGuard answers 404 so other users cannot tell the project exists.
      await exportOf({ fileType: 'SVG' }, quinn).expect(404);
      await as(quinn).get(`/api/projects/${design}/exports/access`).expect(404);
      await api().post(`/api/projects/${design}/exports`).send({ fileType: 'SVG' }).expect(401);
      await exportOf({ fileType: 'SVG', useCredit: 'yes' }).expect(400);
    });
  });

  // docs-old/30 item 1: the job keeps the design checked and paid for; the worker never reads the project as it is now.
  describe('an export prints the version it was requested for', () => {
    let sam: { id: string; cookie: string };
    const dimsA = { length: 120, width: 80, height: 60 };
    const dimsB = { length: 150, width: 100, height: 70 };
    const text = (content: string) => ({ id: 't', type: 'text', panelId: 'panel_front', x: 10, y: 10, width: 60, height: 10, rotation: 0, content });
    const create = async (elements: object[]) => {
      const id = (
        await as(sam).post('/api/projects').send({ templateId: 'tuck-top', title: 'Hộp A', dimensions: dimsA, canvasState: { elements } }).expect(201)
      ).body.id as string;
      await payOrderFor(sam.id, id);
      return id;
    };
    // While the queue is paused the worker takes nothing: the user edits the design between the request and the render.
    const whilePaused = async <T>(steps: () => Promise<T>): Promise<T> => {
      const queue = app.get<Queue>(getQueueToken(EXPORT_QUEUE));
      await queue.pause();
      try {
        return await steps();
      } finally {
        await queue.resume();
      }
    };

    beforeAll(async () => {
      sam = await register('sam');
    });

    it('renders the dimensions and the canvas of the request, not an edit saved before the worker ran', async () => {
      const id = await create([text('Bản A')]);
      const versionA = (await prisma.packagingProject.findUniqueOrThrow({ where: { id } })).version;
      const jobId = await whilePaused(async () => {
        const started = await as(sam).post(`/api/projects/${id}/exports`).send({ fileType: 'DXF' }).expect(202);
        await as(sam).patch(`/api/projects/${id}`).send({ dimensions: dimsB, canvasState: { elements: [text('Bản B')] } }).expect(200);
        return started.body.jobId as string;
      });
      const done = await waitFor(jobId, sam);
      expect(done.status).toBe('COMPLETED');

      const row = await prisma.exportJob.findUniqueOrThrow({ where: { id: jobId } });
      const design = row.design as unknown as ExportDesign;
      expect(row.projectVersion).toBe(versionA);
      expect(design.dimensions).toMatchObject(dimsA);
      const current = await prisma.packagingProject.findUniqueOrThrow({ where: { id } });
      expect(current.version).toBeGreaterThan(versionA);
      expect(current.dimensions).toMatchObject(dimsB);

      const dxfOf = (dimensions: unknown) =>
        renderDxf(buildPrintLayout({ title: 'Hộp A', structure: 'tuck-top', formulaVersion: design.formulaVersion, dimensions: dimensions as never, elements: [] }));
      const file = await (await fetch(done.downloadUrl)).text();
      expect(file).toBe(dxfOf(design.dimensions));
      expect(file).not.toBe(dxfOf(current.dimensions));

      // The automatic snapshot of the export is the exported design too.
      const snapshot = await prisma.projectSnapshot.findFirstOrThrow({ where: { projectId: id, isAutomatic: true }, orderBy: { createdAt: 'desc' } });
      expect(snapshot.dimensions).toMatchObject(dimsA);
      expect(snapshot.canvasState).toMatchObject({ elements: [expect.objectContaining({ content: 'Bản A' })] });
    });

    // docs-old/30 item 6, review round 2: the request stops waiting after 3 s, but queue.add goes on and Redis has the job.
    it('a job Redis took while the request timed out: 202, then the same job renders one file and one notification', async () => {
      const id = await create([text('Hàng đợi chậm')]);
      // The instance ExportService adds to (another module registers the same queue under its own instance).
      const queue = (app.get(ExportService) as unknown as { queue: Queue }).queue;
      const add = queue.add.bind(queue);
      const slow = jest.spyOn(queue, 'add').mockImplementationOnce(async (...args: Parameters<Queue['add']>) => {
        const job = await add(...args); // in Redis now; only the answer is late
        await new Promise((resolve) => setTimeout(resolve, QUEUE_ADD_TIMEOUT_MS + 500));
        return job;
      });
      // The worker starts after the timeout: the queue is paused until the request has answered.
      await queue.pause();
      let started: request.Response;
      try {
        started = await as(sam).post(`/api/projects/${id}/exports`).send({ fileType: 'DXF' });
      } finally {
        await queue.resume();
        slow.mockRestore();
      }
      expect(started.status).toBe(202);
      expect(started.body).toMatchObject({ jobId: expect.any(String), status: 'PENDING' });
      const { jobId } = started.body as { jobId: string };

      const done = await waitFor(jobId, sam);
      expect(done).toMatchObject({ id: jobId, status: 'COMPLETED', error: null });
      expect((await fetch(done.downloadUrl)).status).toBe(200);
      expect(await prisma.exportJob.count({ where: { projectId: id } })).toBe(1);
      const notifications = () =>
        prisma.notification.count({ where: { userId: sam.id, type: 'EXPORT_COMPLETED', payload: { path: ['exportJobId'], equals: jobId } } });
      for (let i = 0; i < 20 && (await notifications()) === 0; i++) await new Promise((resolve) => setTimeout(resolve, 100));
      expect(await notifications()).toBe(1);
    }, 30_000);

    // Review round 3: a connection that drops after the command was written may leave the job in Redis.
    it('a queue error after the job was sent (connection closed) answers 202 and the job still renders', async () => {
      const id = await create([text('Mất kết nối')]);
      const queue = (app.get(ExportService) as unknown as { queue: Queue }).queue;
      const add = queue.add.bind(queue);
      const dropped = jest.spyOn(queue, 'add').mockImplementationOnce(async (...args: Parameters<Queue['add']>) => {
        await add(...args); // Redis has the job; the answer is lost with the connection
        throw new Error('Connection is closed.');
      });
      await queue.pause();
      let started: request.Response;
      try {
        started = await as(sam).post(`/api/projects/${id}/exports`).send({ fileType: 'DXF' });
      } finally {
        await queue.resume();
        dropped.mockRestore();
      }
      expect(started.status).toBe(202);
      expect(started.body).toMatchObject({ jobId: expect.any(String), status: 'PENDING' });
      const done = await waitFor(started.body.jobId, sam);
      expect(done).toMatchObject({ id: started.body.jobId, status: 'COMPLETED' });
    });

    it('keeps an image of the requested version through the maintenance run, though the next save dropped it', async () => {
      const png = await QRCode.toBuffer('wrapfit', { type: 'png', width: 120 });
      const ticket = (
        await as(sam).post('/api/storage/presigned-upload').send({ purpose: 'IMAGE', contentType: 'image/png', size: png.length }).expect(200)
      ).body;
      expect((await fetch(ticket.uploadUrl, { method: 'PUT', headers: ticket.headers, body: new Uint8Array(png) })).status).toBe(200);
      const image = { id: 'img', type: 'image', panelId: 'panel_front', x: 10, y: 10, width: 30, height: 30, rotation: 0, content: ticket.fileUrl, dpi: 300 };
      const id = await create([image]);

      const jobId = await whilePaused(async () => {
        const started = await as(sam).post(`/api/projects/${id}/exports`).send({ fileType: 'SVG' }).expect(202);
        await as(sam).patch(`/api/projects/${id}`).send({ canvasState: { elements: [text('Không còn ảnh')] } }).expect(200);
        // Uploaded more than a day ago: only the pending job still shows the image.
        const dayAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
        await prisma.storedFile.updateMany({ where: { userId: sam.id, purpose: 'IMAGE' }, data: { createdAt: dayAgo, confirmedAt: dayAgo } });
        await app.get(StorageService).dropUnusedUploads();
        expect((await fetch(ticket.fileUrl)).status).toBe(200);
        return started.body.jobId as string;
      });
      const done = await waitFor(jobId, sam);
      expect(done).toMatchObject({ status: 'COMPLETED', error: null });
      expect(await (await fetch(done.downloadUrl)).text()).toContain(`href="data:image/png;base64,${png.toString('base64')}"`);
    });
  });

  // docs-old/30 review round 2: a failed job stops keeping alive the files only its frozen design used.
  it('a job lost by the queue is failed by the reconcile task, and the image only it kept is released', async () => {
    const tom = await register('tom');
    const image = await uploadPngTo(tom);
    const element = { id: 'img', type: 'image', panelId: 'panel_front', x: 10, y: 10, width: 30, height: 30, rotation: 0, content: image.url, dpi: 300 };
    const id = (
      await as(tom).post('/api/projects').send({ templateId: 'tuck-top', title: 'Hộp mất job', dimensions: { length: 120, width: 80, height: 60 }, canvasState: { elements: [element] } }).expect(201)
    ).body.id as string;
    await payOrderFor(tom.id, id);
    const queue = app.get<Queue>(getQueueToken(EXPORT_QUEUE));
    await queue.pause();
    try {
      const { jobId } = (await as(tom).post(`/api/projects/${id}/exports`).send({ fileType: 'SVG' }).expect(202)).body as { jobId: string };
      await as(tom).patch(`/api/projects/${id}`).send({ canvasState: { elements: [] } }).expect(200);
      const refs = () => prisma.projectFileRef.count({ where: { projectId: id, storedFile: { key: image.key } } });
      expect(await refs()).toBe(1); // only the pending job's design still shows the image

      // The job never reached Redis (or Redis lost it), and it is older than STUCK_EXPORT_AFTER_MS.
      await queue.remove(jobId);
      await prisma.exportJob.update({ where: { id: jobId }, data: { createdAt: new Date(Date.now() - 11 * 60 * 1000) } });
      await app.get(ExportReconcileTask).reconcile();

      expect(await prisma.exportJob.findUniqueOrThrow({ where: { id: jobId } })).toMatchObject({ status: 'FAILED' });
      expect(await refs()).toBe(0);
    } finally {
      await queue.resume();
    }
  });

  // Review round 3: two failed jobs of one project recompute its refs one after the other (project row locked first).
  it('two jobs failing at once both release an image only their designs kept', async () => {
    const una = await register('una');
    const image = await uploadPngTo(una);
    const element = { id: 'img', type: 'image', panelId: 'panel_front', x: 10, y: 10, width: 30, height: 30, rotation: 0, content: image.url, dpi: 300 };
    const id = (
      await as(una).post('/api/projects').send({ templateId: 'tuck-top', title: 'Hai job lỗi', dimensions: { length: 120, width: 80, height: 60 }, canvasState: { elements: [element] } }).expect(201)
    ).body.id as string;
    await payOrderFor(una.id, id);
    const queue = app.get<Queue>(getQueueToken(EXPORT_QUEUE));
    await queue.pause();
    const jobIds: string[] = [];
    try {
      for (const fileType of ['SVG', 'PDF_CMYK']) {
        jobIds.push((await as(una).post(`/api/projects/${id}/exports`).send({ fileType }).expect(202)).body.jobId);
      }
      for (const jobId of jobIds) await queue.remove(jobId);
    } finally {
      await queue.resume();
    }
    await as(una).patch(`/api/projects/${id}`).send({ canvasState: { elements: [] } }).expect(200);
    const imageRefs = () => prisma.projectFileRef.count({ where: { projectId: id, storedFile: { key: image.key } } });
    expect(await imageRefs()).toBe(1);

    // A stale ref the next recompute deletes, held by another transaction: each recompute stops on it, so both
    // failures overlap (before the fix, each then saw the other job still unfinished and kept the image).
    const stale = await uploadPngTo(una);
    const staleFile = await prisma.storedFile.findUniqueOrThrow({ where: { key: stale.key } });
    await prisma.projectFileRef.create({ data: { projectId: id, storedFileId: staleFile.id } });
    const holder = holdTransaction(prisma, (tx) =>
      tx.$queryRaw`SELECT 1 FROM project_file_refs WHERE project_id = ${id}::uuid AND stored_file_id = ${staleFile.id}::uuid FOR UPDATE`,
    );
    await holder.started;
    const failing = Promise.all(jobIds.map((jobId) => failExport(prisma, jobId, 'e2e')));
    await untilLockWaiters(prisma, 2);
    holder.release();
    await holder.done;
    expect(await failing).toEqual([true, true]);

    expect(await imageRefs()).toBe(0);
  });

  it('deletes the exported files with the project', async () => {
    const [latest] = (await as(pia).get(`/api/projects/${projectId}/exports`).expect(200)).body;
    // Read through the signed link: the private bucket has no public URL.
    expect((await fetch(latest.downloadUrl)).status).toBe(200);

    await as(pia).patch(`/api/projects/${projectId}/status`).send({ status: 'DELETED' }).expect(200);
    // A paid order still needs the design (docs-old/30 item 4): the project goes once its order is shipped.
    await as(pia).delete(`/api/projects/${projectId}`).expect(409);
    await prisma.order.updateMany({
      where: { id: { in: orderIds }, items: { some: { projectId } } },
      data: { status: 'SHIPPED', shippedAt: new Date() },
    });
    await as(pia).delete(`/api/projects/${projectId}`).expect(204);
    expect((await fetch(latest.downloadUrl)).status).toBe(404);
  });
});
