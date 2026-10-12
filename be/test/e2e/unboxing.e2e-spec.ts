import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { qrSvg } from '../../src/unboxing/qr-code';
import { PrismaService } from '../../src/shared/prisma';
import { signUp } from './helpers/accounts';

// The 1200 px PNG QR code (qrcode + pngjs) takes about 3.5 s to render inside Jest's sandbox, against 60 ms in plain
// Node: the tests that create or download it need more than Jest's default 5 s on CI runners.
jest.setTimeout(30_000);

/** 3D unboxing & QR code (IT3-10). QR files go to the local SeaweedFS (see e2e-env.ts). */
describe('Unboxing (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const run = Date.now();
  let nora: { cookie: string };
  let owen: { cookie: string };
  let projectId: string;
  let slug: string;
  let qr: { png: string; svg: string };

  const api = () => request(app.getHttpServer());
  const as = (user: { cookie: string }) => ({
    get: (url: string) => api().get(url).set('Cookie', user.cookie),
    post: (url: string) => api().post(url).set('Cookie', user.cookie),
    patch: (url: string) => api().patch(url).set('Cookie', user.cookie),
    delete: (url: string) => api().delete(url).set('Cookie', user.cookie),
  });
  const register = async (name: string, fullName: string) => {
    const { id, cookie } = await signUp(app, `${name}-${run}@e2e.test`, fullName);
    return { id, cookie };
  };
  const url = (path = '') => `/api/projects/${projectId}/unboxing${path}`;
  const note = { recipientName: 'Mẹ yêu', giftNote: 'Chúc mẹ năm mới an lành!', particleEffect: 'petals' };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    await app.init();
    prisma = app.get(PrismaService);

    nora = await register('nora', 'Nora Gifts');
    owen = await register('owen', 'Owen');
    projectId = (
      await as(nora)
        .post('/api/projects')
        .send({ templateId: 'tuck-top', title: 'Hộp quà cho mẹ', dimensions: { length: 120, width: 80, height: 60 } })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@e2e.test' } } });
    await app.close();
  });

  it('starts without an experience', async () => {
    await as(nora).get(url()).expect(404);
  });

  it('creates the experience and stores its QR code as PNG and SVG', async () => {
    const res = await as(nora).post(url()).send(note).expect(201);
    expect(res.body).toMatchObject({
      ...note,
      audioTrackUrl: null,
      viewsCount: 0,
      slug: expect.stringMatching(/^[\w-]{12}$/),
    });
    slug = res.body.slug;
    expect(res.body.unboxUrl).toBe(`http://frontend.e2e/unbox/${slug}`);
    qr = { png: res.body.qrCodeUrl, svg: res.body.qrCodeSvgUrl };
    expect(qr.png).toBe(`${process.env.STORAGE_PUBLIC_URL}/projects/${projectId}/unboxing/qr-${slug}.png`);
    expect(qr.svg).toBe(qr.png.replace(/\.png$/, '.svg'));

    const png = await fetch(qr.png);
    expect(png.status).toBe(200);
    expect(png.headers.get('content-type')).toBe('image/png');
    expect(Buffer.from(await png.arrayBuffer()).subarray(1, 4).toString()).toBe('PNG');

    // The SVG encodes exactly the unboxing URL.
    const svg = await fetch(qr.svg);
    expect(await svg.text()).toBe(await qrSvg(`http://frontend.e2e/unbox/${slug}`));
  });

  it('replaces the configuration but keeps the slug (the QR code may already be printed)', async () => {
    const res = await as(nora)
      .post(url())
      .send({ ...note, giftNote: 'Lời chúc mới', audioTrackUrl: '/audio/xuan.mp3' })
      .expect(200);
    expect(res.body).toMatchObject({
      slug,
      giftNote: 'Lời chúc mới',
      audioTrackUrl: '/audio/xuan.mp3',
    });
    expect((await as(nora).get(url()).expect(200)).body.giftNote).toBe('Lời chúc mới');
  });

  it('validates the configuration', async () => {
    await as(nora).post(url()).send({ ...note, recipientName: '' }).expect(400);
    await as(nora).post(url()).send({ ...note, particleEffect: 'lasers' }).expect(400);
    // The recipient's browser plays the track: no file of another site.
    for (const audioTrackUrl of ['https://tracker.example/a.mp3', '//tracker.example/a.mp3', 'data:audio/mp3;base64,AA==']) {
      const res = await as(nora).post(url()).send({ ...note, audioTrackUrl }).expect(400);
      expect(res.body.code).toBe('FILE_URL_NOT_ALLOWED');
    }
    await as(nora).post(url()).send({ ...note, slug: 'chosen-slug' }).expect(400);
  });

  it('lets the owner download the QR code in both formats', async () => {
    const svg = await as(nora).get(url('/qr?format=svg')).expect(200);
    expect(svg.headers['content-type']).toMatch(/^image\/svg\+xml/);
    expect(svg.headers['content-disposition']).toBe(`attachment; filename="wrapfit-qr-${slug}.svg"`);

    const png = await as(nora).get(url('/qr')).buffer(true).expect(200);
    expect(png.headers['content-type']).toBe('image/png');
    expect((png.body as Buffer).subarray(1, 4).toString()).toBe('PNG');

    await as(nora).get(url('/qr?format=gif')).expect(400);
  });

  it('hides the configuration from other users', async () => {
    await as(owen).get(url()).expect(404);
    await as(owen).post(url()).send(note).expect(404);
    await as(owen).get(url('/qr')).expect(404);
    await as(owen).delete(url()).expect(404);
  });

  describe('public page (QR scan)', () => {
    const page = (s = slug) => `/api/public/unboxing/${s}`;

    it('shows the gift to anyone with the link, even for a PRIVATE design', async () => {
      const res = await api().get(page()).expect(200);
      expect(res.body).toMatchObject({
        recipientName: 'Mẹ yêu',
        giftNote: 'Lời chúc mới',
        particleEffect: 'petals',
        viewsCount: 1,
        sender: { fullName: 'Nora Gifts', shopName: null, avatarUrl: null },
        box: {
          title: 'Hộp quà cho mẹ',
          template: { id: 'tuck-top' },
          dimensions: { length: 120, width: 80, height: 60 },
          canvasState: { elements: [] },
        },
      });
      // No account data and no internal ids (only the public box structure id, e.g. "tuck-top").
      const json = JSON.stringify(res.body);
      expect(json).not.toMatch(/@e2e\.test|userId|projectId|slug/);
      expect(json).not.toContain(projectId);
      // Reopening the page counts once per viewer; another browser counts again.
      expect((await api().get(page()).expect(200)).body.viewsCount).toBe(1);
      expect((await api().get(page()).set('User-Agent', 'another-browser').expect(200)).body.viewsCount).toBe(2);
    });

    it('answers 404 for unknown slugs and projects in the trash', async () => {
      await api().get(page('doesNotExist')).expect(404);
      await api().get(page('bad%20slug!')).expect(404);

      await as(nora).patch(`/api/projects/${projectId}/status`).send({ status: 'DELETED' }).expect(200);
      await api().get(page()).expect(404);
      await as(nora).post(url()).send(note).expect(409);
      await as(nora).patch(`/api/projects/${projectId}/status`).send({ status: 'ACTIVE' }).expect(200);
      await api().get(page()).expect(200);
    });
  });

  it('removes the experience together with its QR files', async () => {
    await as(nora).delete(url()).expect(204);
    await as(nora).get(url()).expect(404);
    await api().get(`/api/public/unboxing/${slug}`).expect(404);
    expect((await fetch(qr.png)).status).toBe(404);
    expect((await fetch(qr.svg)).status).toBe(404);
  });

  it('deletes the QR files when the project is deleted permanently', async () => {
    const created = (await as(nora).post(url()).send(note).expect(201)).body;
    expect((await fetch(created.qrCodeUrl)).status).toBe(200);

    await as(nora).patch(`/api/projects/${projectId}/status`).send({ status: 'DELETED' }).expect(200);
    await as(nora).delete(`/api/projects/${projectId}`).expect(204);
    expect((await fetch(created.qrCodeUrl)).status).toBe(404);
    expect((await fetch(created.qrCodeSvgUrl)).status).toBe(404);
  });
});
