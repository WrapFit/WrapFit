import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { TrashPurgeTask } from '../../src/projects/presentation/trash-purge.task';
import { PrismaService } from '../../src/shared/prisma';
import { signUp, uploadPng } from './helpers/accounts';

/**
 * File uploads (IT3-08) against a real S3-compatible server: the local SeaweedFS of docker-compose.yml
 * (`docker compose up -d seaweedfs storage-init`), see test/e2e-env.ts.
 */
describe('Storage (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const run = Date.now();
  const MB = 1024 * 1024;
  let kim: { cookie: string };
  let leo: { cookie: string };

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
  const presign = (user: { cookie: string }, body: Record<string, unknown>) =>
    as(user).post('/api/storage/presigned-upload').send(body);
  // Cast: the DOM `BodyInit` typing does not accept Node's typed arrays, although fetch does.
  const png = (bytes: number) => new Uint8Array(bytes).fill(7) as unknown as RequestInit['body'] & Uint8Array;
  /** Uploads like the browser would: PUT to the pre-signed URL with the returned headers. */
  const upload = (ticket: { uploadUrl: string; headers: Record<string, string> }, body: RequestInit['body'], headers = ticket.headers) =>
    fetch(ticket.uploadUrl, { method: 'PUT', headers, body });
  const newProject = async (user: { cookie: string }) =>
    (
      await as(user)
        .post('/api/projects')
        .send({ templateId: 'tuck-top', title: 'Hộp có ảnh', dimensions: { length: 120, width: 80, height: 60 } })
        .expect(201)
    ).body.id as string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    await app.init();
    prisma = app.get(PrismaService);

    kim = await register('kim');
    leo = await register('leo');
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@e2e.test' } } });
    await app.close();
  });

  it('requires authentication', async () => {
    await api().post('/api/storage/presigned-upload').send({ purpose: 'LOGO', contentType: 'image/png', size: 10 }).expect(401);
    await api().get('/api/storage/usage').expect(401);
  });

  it('starts with an empty quota that depends on the subscription tier', async () => {
    const res = await as(kim).get('/api/storage/usage').expect(200);
    expect(res.body).toEqual({ tier: 'FREE', usedBytes: 0, quotaBytes: 100 * MB, fileCount: 0 });
  });

  describe('upload with a pre-signed URL', () => {
    let ticket: { uploadUrl: string; headers: Record<string, string>; fileUrl: string; key: string };

    beforeAll(async () => {
      ticket = (await presign(kim, { purpose: 'LOGO', contentType: 'image/png', size: 1000 }).expect(200)).body;
    });

    it('returns a short-lived PUT URL and the public URL of the file', () => {
      expect(ticket).toMatchObject({
        fileId: expect.any(String),
        method: 'PUT',
        headers: { 'Content-Type': 'image/png' },
        expiresIn: 300,
      });
      expect(ticket.key).toMatch(/^users\/[0-9a-f-]{36}\/logo\/[0-9a-f-]{36}\.png$/);
      expect(ticket.fileUrl).toBe(`${process.env.STORAGE_PUBLIC_URL}/${ticket.key}`);
    });

    it('refuses a file of another size or another type than signed', async () => {
      expect((await upload(ticket, png(5000))).status).toBe(403);
      expect((await upload(ticket, png(1000), { 'Content-Type': 'text/html' })).status).toBe(403);
    });

    it('stores the file, readable by anyone at its public URL', async () => {
      expect((await upload(ticket, png(1000))).status).toBe(200);

      const file = await fetch(ticket.fileUrl);
      expect(file.status).toBe(200);
      expect(file.headers.get('content-type')).toBe('image/png');
      expect(new Uint8Array(await file.arrayBuffer())).toEqual(png(1000));

      // Nobody can write to the bucket without a signature.
      expect((await fetch(ticket.fileUrl, { method: 'PUT', body: png(10) })).status).toBe(403);
    });

    it('counts the file in my usage', async () => {
      const res = await as(kim).get('/api/storage/usage').expect(200);
      expect(res.body).toMatchObject({ usedBytes: 1000, fileCount: 1 });
    });
  });

  describe('SVG and PDF logos', () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    ) as unknown as RequestInit['body'] & Uint8Array;
    let owner: { cookie: string };
    let ticket: { uploadUrl: string; headers: Record<string, string>; fileUrl: string };

    beforeAll(async () => {
      owner = await register('sam');
      ticket = (await presign(owner, { purpose: 'LOGO', contentType: 'image/svg+xml', size: svg.length }).expect(200)).body;
    });

    it('signs Content-Disposition: attachment into the upload URL', async () => {
      expect(ticket.headers).toEqual({ 'Content-Type': 'image/svg+xml', 'Content-Disposition': 'attachment' });
      // Without the header (or with another value) the signature does not match.
      expect((await upload(ticket, svg, { 'Content-Type': 'image/svg+xml' })).status).toBe(403);
      expect((await upload(ticket, svg, { ...ticket.headers, 'Content-Disposition': 'inline' })).status).toBe(403);
    });

    it('serves the file as a download, so opening its URL never runs its scripts', async () => {
      expect((await upload(ticket, svg)).status).toBe(200);
      const file = await fetch(ticket.fileUrl);
      expect(file.status).toBe(200);
      expect(file.headers.get('content-disposition')).toBe('attachment');
    });

    it('keeps raster images displayable inline', async () => {
      const raster = (await presign(owner, { purpose: 'LOGO', contentType: 'image/png', size: 10 }).expect(200)).body;
      expect(raster.headers).toEqual({ 'Content-Type': 'image/png' });
    });
  });

  describe('rules', () => {
    it('checks the format and the size for each purpose', async () => {
      const svgImage = await presign(kim, { purpose: 'IMAGE', contentType: 'image/svg+xml', size: 10 }).expect(400);
      expect(svgImage.body.message).toBe('contentType must be one of: image/png, image/jpeg, image/webp');
      await presign(kim, { purpose: 'LOGO', contentType: 'image/svg+xml', size: 10 }).expect(200);
      await presign(kim, { purpose: 'LOGO', contentType: 'application/pdf', size: 15 * MB }).expect(200);

      const big = await presign(kim, { purpose: 'THUMBNAIL', contentType: 'image/webp', size: 2 * MB + 1 }).expect(413);
      expect(big.body).toMatchObject({ error: 'Payload Too Large', message: 'A THUMBNAIL file can be at most 2 MB' });
      await presign(kim, { purpose: 'LOGO', contentType: 'image/png', size: 15 * MB + 1 }).expect(413);

      await presign(kim, { purpose: 'VIDEO', contentType: 'image/png', size: 10 }).expect(400);
      await presign(kim, { purpose: 'LOGO', contentType: 'image/png', size: 0 }).expect(400);
      await presign(kim, { purpose: 'LOGO', contentType: 'image/png', size: 10, key: 'users/x/hack.png' }).expect(400);
    });

    it('only attaches files to my own projects that are not in the trash', async () => {
      const mine = await newProject(kim);
      await presign(leo, { purpose: 'THUMBNAIL', contentType: 'image/png', size: 10, projectId: mine }).expect(404);

      await as(kim).patch(`/api/projects/${mine}/status`).send({ status: 'DELETED' }).expect(200);
      await presign(kim, { purpose: 'THUMBNAIL', contentType: 'image/png', size: 10, projectId: mine }).expect(409);
    });

    it('stops at the quota of the FREE tier (100 MB)', async () => {
      for (let i = 0; i < 6; i++) {
        await presign(leo, { purpose: 'LOGO', contentType: 'application/pdf', size: 15 * MB }).expect(200);
      }
      const res = await presign(leo, { purpose: 'LOGO', contentType: 'application/pdf', size: 15 * MB }).expect(403);
      expect(res.body.message).toBe('Storage quota exceeded: 90 MB of 100 MB used');
    });
  });

  describe('files of deleted projects', () => {
    const uploadThumbnail = async (projectId: string) => {
      const ticket = (
        await presign(kim, { purpose: 'THUMBNAIL', contentType: 'image/webp', size: 300, projectId }).expect(200)
      ).body;
      expect((await upload(ticket, png(300))).status).toBe(200);
      await as(kim).patch(`/api/projects/${projectId}`).send({ thumbnailUrl: ticket.fileUrl.replace('http:', 'https:') });
      return ticket.fileUrl as string;
    };

    it('are deleted from the bucket when the project is deleted permanently', async () => {
      const projectId = await newProject(kim);
      const fileUrl = await uploadThumbnail(projectId);
      expect((await fetch(fileUrl)).status).toBe(200);

      await as(kim).patch(`/api/projects/${projectId}/status`).send({ status: 'DELETED' }).expect(200);
      await as(kim).delete(`/api/projects/${projectId}`).expect(204);

      expect((await fetch(fileUrl)).status).toBe(404);
      expect(await prisma.storedFile.count({ where: { projectId } })).toBe(0);
    });

    it('are kept while a copy (duplicate or remix) still shows them in its canvas', async () => {
      const source = await newProject(kim);
      const ticket = (
        await presign(kim, { purpose: 'IMAGE', contentType: 'image/png', size: 300, projectId: source }).expect(200)
      ).body;
      expect((await upload(ticket, png(300))).status).toBe(200);
      const image = { id: 'img', type: 'image', panelId: 'panel_front', x: 10, y: 10, width: 30, height: 30, rotation: 0 };
      await as(kim)
        .patch(`/api/projects/${source}`)
        .send({ canvasState: { elements: [{ ...image, content: ticket.fileUrl }] } })
        .expect(200);
      const copy = (await as(kim).post(`/api/projects/${source}/duplicate`).expect(201)).body.id;
      const remove = async (projectId: string) => {
        await as(kim).patch(`/api/projects/${projectId}/status`).send({ status: 'DELETED' }).expect(200);
        await as(kim).delete(`/api/projects/${projectId}`).expect(204);
      };

      await remove(source);
      expect((await fetch(ticket.fileUrl)).status).toBe(200);
      // Still counted in the uploader's usage, now attached to the copy that shows it.
      expect(await prisma.storedFile.findUnique({ where: { key: ticket.key } })).toMatchObject({ projectId: copy });

      // Deleting the last project that shows it deletes the file (no orphan left in the bucket).
      await remove(copy);
      expect((await fetch(ticket.fileUrl)).status).toBe(404);
      expect(await prisma.storedFile.findUnique({ where: { key: ticket.key } })).toBeNull();
    });

    it('are deleted by the trash purge, but kept for projects restored in time', async () => {
      const expired = await newProject(kim);
      const restored = await newProject(kim);
      const expiredFile = await uploadThumbnail(expired);
      const restoredFile = await uploadThumbnail(restored);
      for (const id of [expired, restored]) {
        await as(kim).patch(`/api/projects/${id}/status`).send({ status: 'DELETED' }).expect(200);
      }
      await prisma.packagingProject.update({
        where: { id: expired },
        data: { deletedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) },
      });
      await as(kim).patch(`/api/projects/${restored}/status`).send({ status: 'ACTIVE' }).expect(200);

      await app.get(TrashPurgeTask).run();

      expect((await fetch(expiredFile)).status).toBe(404);
      expect((await fetch(restoredFile)).status).toBe(200);
    });
  });

  it('deletes the files of a user removed by an admin, except uploads other users still show', async () => {
    const mia = await register('mia');
    const admin = await register('ned');
    await prisma.user.update({ where: { email: `ned-${run}@e2e.test` }, data: { role: 'ADMIN' } });
    const miaId = (await as(mia).get('/api/users/me').expect(200)).body.id;

    const uploadAs = async (purpose: string, projectId?: string) => {
      const ticket = (await presign(mia, { purpose, contentType: 'image/png', size: 300, projectId }).expect(200)).body;
      expect((await upload(ticket, png(300))).status).toBe(200);
      return ticket.fileUrl as string;
    };
    const avatar = await uploadAs('AVATAR');
    const inProject = await uploadAs('IMAGE', await newProject(mia));
    const shared = await uploadAs('IMAGE');
    // Kim remixed a public design of Mia that shows one of her images.
    const miaDesign = await newProject(mia);
    const image = { id: 'img', type: 'image', panelId: 'panel_front', x: 10, y: 10, width: 30, height: 30, rotation: 0 };
    await as(mia).patch(`/api/projects/${miaDesign}`).send({ canvasState: { elements: [{ ...image, content: shared }] } }).expect(200);
    const { slug } = (await as(mia).patch(`/api/projects/${miaDesign}/visibility`).send({ visibility: 'PUBLIC' }).expect(200)).body;
    const remix = (await as(kim).post(`/api/public/projects/${slug}/fork`).expect(201)).body;
    expect(remix.canvasState.elements[0].content).toBe(shared);
    // Kim may keep saving the remix with Mia's image, but cannot add other files of Mia.
    await as(kim).patch(`/api/projects/${remix.id}`).send({ canvasState: { elements: [{ ...image, content: shared }] } }).expect(200);
    await as(kim)
      .patch(`/api/projects/${remix.id}`)
      .send({ canvasState: { elements: [{ ...image, content: shared }, { ...image, id: 'img-2', content: inProject }] } })
      .expect(400);

    await as(admin).delete(`/api/users/${miaId}`).expect(204);

    expect((await fetch(avatar)).status).toBe(404);
    expect((await fetch(inProject)).status).toBe(404);
    expect((await fetch(shared)).status).toBe(200);
    // The shared image now belongs to Kim and her remix (quota included), and goes with the remix.
    const kimId = (await as(kim).get('/api/users/me').expect(200)).body.id;
    expect(await prisma.storedFile.findFirst({ where: { key: { endsWith: shared.split('/').pop()! } } })).toMatchObject({
      userId: kimId,
      projectId: remix.id,
    });
    await as(kim).patch(`/api/projects/${remix.id}/status`).send({ status: 'DELETED' }).expect(200);
    await as(kim).delete(`/api/projects/${remix.id}`).expect(204);
    expect((await fetch(shared)).status).toBe(404);
  });

  it('tracks the uploads each project shows, through its canvas and its snapshots', async () => {
    const projectId = await newProject(kim);
    const [a, b] = [await uploadPng(app, kim.cookie, 'IMAGE'), await uploadPng(app, kim.cookie, 'LOGO')];
    const keyOf = (url: string) => url.slice(url.indexOf('users/'));
    const element = (id: string, content: string) => ({ id, type: 'image', panelId: 'front', x: 1, y: 1, width: 5, height: 5, rotation: 0, content });
    const save = (...contents: string[]) =>
      as(kim)
        .patch(`/api/projects/${projectId}`)
        .send({ canvasState: { elements: contents.map((content, i) => element(`e${i}`, content)) } })
        .expect(200);
    const shown = async () =>
      (
        await prisma.projectFileRef.findMany({ where: { projectId }, select: { storedFile: { select: { key: true } } } })
      )
        .map((ref) => ref.storedFile.key)
        .sort();

    await save(a);
    expect(await shown()).toEqual([keyOf(a)]);

    // A snapshot keeps showing A after the canvas moved on to B.
    const snapshot = (await as(kim).post(`/api/projects/${projectId}/snapshots`).send({ name: 'Có A' }).expect(201)).body;
    await save(b);
    expect(await shown()).toEqual([keyOf(a), keyOf(b)].sort());

    // A file still shown cannot be deleted: the foreign key refuses it.
    const fileA = await prisma.storedFile.findUniqueOrThrow({ where: { key: keyOf(a) } });
    await expect(prisma.storedFile.delete({ where: { id: fileA.id } })).rejects.toThrow();

    // Restoring brings A back; deleting every version that showed A releases it.
    await as(kim).post(`/api/projects/${projectId}/snapshots/${snapshot.id}/restore`).expect(200);
    expect(await shown()).toEqual([keyOf(a), keyOf(b)].sort()); // B lives on in the backup of the restore
    await save(b);
    for (const version of (await as(kim).get(`/api/projects/${projectId}/snapshots`).expect(200)).body) {
      await as(kim).delete(`/api/projects/${projectId}/snapshots/${version.id}`).expect(204);
    }
    expect(await shown()).toEqual([keyOf(b)]);
  });
});
