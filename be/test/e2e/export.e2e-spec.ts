import { INestApplication, INestApplicationContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import QRCode from 'qrcode';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { CreditsService } from '../../src/billing';
import { PrismaService } from '../../src/shared/prisma';
import { signUp } from './helpers/accounts';
import { createPaidOrder } from './helpers/orders';
import { WorkerModule } from '../../src/worker';

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
    await prisma.user.deleteMany({ where: { email: { endsWith: '@e2e.test' } } });
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
    // Fold lines are not printed: the print file has the cut contour and no crease layer.
    expect(svgText).toContain('<g id="cut"');
    expect(svgText).not.toContain('<g id="crease"');
    // The text is outlined: a filled path in the artwork layer, never a <text> with a font.
    expect(svgText).not.toContain('An khang thịnh vượng');
    expect(svgText).not.toContain('<text');
    expect(svgText).toMatch(/<g id="artwork"[^>]*><path d="M /);

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
    const exportOf = (body: Record<string, unknown>, user = rae) =>
      as(user).post(`/api/projects/${design}/exports`).send(body);
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
      await credits.grant(rae.id, { quantity: 2, source: 'ADMIN', expiresAt: null });
      await exportOf({ fileType: 'SVG', useCredit: true }).expect(402);
      expect(await credits.balance(rae.id)).toBe(2);
      await prisma.user.update({ where: { id: rae.id }, data: { subscriptionTier: 'STARTER' } });
      await exportOf({ fileType: 'SVG' }).expect(402);
      await prisma.user.update({ where: { id: rae.id }, data: { subscriptionTier: 'FREE' } });
      expect(await prisma.exportJob.count({ where: { projectId: design } })).toBe(0);
    });

    it('a paid order of this version unlocks clean files in every format, nothing charged', async () => {
      await payOrderFor(rae.id, design);
      expect((await as(rae).get(`/api/projects/${design}/exports/access`).expect(200)).body).toMatchObject({ unlocked: true });
      const started = (await exportOf({ fileType: 'SVG' }).expect(202)).body;
      expect(started).toMatchObject({ watermarked: false, charged: false });
      expect(await waitFor(started.jobId, rae)).toMatchObject({ status: 'COMPLETED', watermarked: false });
      for (const fileType of ['DXF', 'PDF_A4_PRINT']) {
        expect((await exportOf({ fileType }).expect(202)).body).toMatchObject({ watermarked: false, charged: false });
      }
      expect(await credits.balance(rae.id)).toBe(2);
    });

    it('needs a new paid order after an edit', async () => {
      const text = { id: 't', type: 'text', panelId: 'panel_front', x: 10, y: 10, width: 40, height: 10, rotation: 0, content: 'Rae' };
      await as(rae).patch(`/api/projects/${design}`).send({ canvasState: { elements: [text] } }).expect(200);
      expect((await exportOf({ fileType: 'SVG' }).expect(402)).body).toMatchObject({ code: 'ORDER_PAYMENT_REQUIRED' });
      await payOrderFor(rae.id, design);
      await exportOf({ fileType: 'SVG' }).expect(202);
    });

    it('lets only the owner export or read the access: 404 for others', async () => {
      // docs/17 asked for 403; ProjectOwnerGuard answers 404 so other users cannot tell the project exists.
      await exportOf({ fileType: 'SVG' }, quinn).expect(404);
      await as(quinn).get(`/api/projects/${design}/exports/access`).expect(404);
      await api().post(`/api/projects/${design}/exports`).send({ fileType: 'SVG' }).expect(401);
      await exportOf({ fileType: 'SVG', useCredit: 'yes' }).expect(400);
    });
  });

  it('deletes the exported files with the project', async () => {
    const [latest] = (await as(pia).get(`/api/projects/${projectId}/exports`).expect(200)).body;
    // Read through the signed link: the private bucket has no public URL.
    expect((await fetch(latest.downloadUrl)).status).toBe(200);

    await as(pia).patch(`/api/projects/${projectId}/status`).send({ status: 'DELETED' }).expect(200);
    await as(pia).delete(`/api/projects/${projectId}`).expect(204);
    expect((await fetch(latest.downloadUrl)).status).toBe(404);
  });
});
