import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { PrismaService } from '../../src/shared/prisma';
import { StorageService } from '../../src/storage';
import { signUp, uploadPng } from './helpers/accounts';

/**
 * Uploads a user no longer uses stop counting against the quota: a replaced or removed avatar / brand kit logo goes
 * at once, any other unused upload with the storage maintenance a day later. Needs the local SeaweedFS
 * (see test/e2e-env.ts).
 */
describe('Unused files (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const run = Date.now();

  const api = () => request(app.getHttpServer());
  const as = (user: { cookie: string }) => ({
    get: (url: string) => api().get(url).set('Cookie', user.cookie),
    post: (url: string) => api().post(url).set('Cookie', user.cookie),
    patch: (url: string) => api().patch(url).set('Cookie', user.cookie),
    delete: (url: string) => api().delete(url).set('Cookie', user.cookie),
  });
  const register = (name: string) => signUp(app, `${name}-${run}@e2e.test`);
  const newProject = async (user: { cookie: string }) =>
    (
      await as(user)
        .post('/api/projects')
        .send({ templateId: 'tuck-top', title: 'Hộp có logo', dimensions: { length: 120, width: 80, height: 60 } })
        .expect(201)
    ).body.id as string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  it('deletes the uploads nothing has used for a day and keeps every file still shown somewhere', async () => {
    const quy = await register('quy');
    const projectId = await newProject(quy);
    const [neverSaved, removed, onCanvas, oldThumb, thumb, preview, avatar, logo] = [
      await uploadPng(app, quy.cookie, 'LOGO'),
      await uploadPng(app, quy.cookie, 'IMAGE'),
      await uploadPng(app, quy.cookie, 'IMAGE'),
      await uploadPng(app, quy.cookie, 'THUMBNAIL', projectId),
      await uploadPng(app, quy.cookie, 'THUMBNAIL', projectId),
      await uploadPng(app, quy.cookie, 'THUMBNAIL', projectId),
      await uploadPng(app, quy.cookie, 'AVATAR'),
      await uploadPng(app, quy.cookie, 'LOGO'),
    ];
    const element = (id: string, content: string) => ({ id, type: 'image', panelId: 'front', x: 1, y: 1, width: 5, height: 5, rotation: 0, content });
    const save = (body: object) => as(quy).patch(`/api/projects/${projectId}`).send(body).expect(200);
    // The snapshot keeps the image that the canvas drops afterwards; the thumbnail is replaced once.
    await save({ canvasState: { elements: [element('a', removed), element('b', onCanvas)] } });
    await as(quy).post(`/api/projects/${projectId}/snapshots`).send({ name: 'Mốc', previewUrl: preview }).expect(201);
    await save({ canvasState: { elements: [element('b', onCanvas)] }, thumbnailUrl: oldThumb });
    await save({ thumbnailUrl: thumb });
    await as(quy).patch('/api/users/me').send({ avatarUrl: avatar }).expect(200);
    await as(quy).patch('/api/users/me/brand-kit').send({ logoUrl: logo, colors: ['#1A362B', '#D4AF37', '#FDFBF7'] }).expect(200);
    const userId = (await as(quy).get('/api/users/me').expect(200)).body.id;
    const snapshots = (await as(quy).get(`/api/projects/${projectId}/snapshots`).expect(200)).body as { id: string }[];
    expect(snapshots).toHaveLength(1);

    // Uploaded a day ago, confirmed by an earlier maintenance run.
    const dayAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await prisma.storedFile.updateMany({ where: { userId }, data: { createdAt: dayAgo, confirmedAt: dayAgo } });
    const storage = app.get(StorageService);
    await storage.dropUnusedUploads();

    const alive = async (url: string) => (await fetch(url)).status === 200;
    expect(await alive(neverSaved)).toBe(false);
    expect(await alive(oldThumb)).toBe(false);
    for (const url of [onCanvas, thumb, preview, avatar, logo]) expect(await alive(url)).toBe(true);
    // The image removed from the canvas is still shown by the snapshot taken before (project_file_refs).
    expect(await alive(removed)).toBe(true);

    // Deleting the snapshot frees its image and its preview.

    await as(quy).delete(`/api/projects/${projectId}/snapshots/${snapshots[0].id}`).expect(204);
    await storage.dropUnusedUploads();
    expect(await alive(removed)).toBe(false);
    expect(await alive(preview)).toBe(false);
    expect(await alive(onCanvas)).toBe(true);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@e2e.test' } } });
    await app.close();
  });

  it('deletes the avatar and the logo a user replaces or removes, unless a project still shows the logo', async () => {
    const pia = await register('pia');
    const used = async () => (await as(pia).get('/api/storage/usage').expect(200)).body.fileCount as number;
    const kit = (logoUrl: string | null) => ({ logoUrl, colors: ['#1A362B', '#D4AF37', '#FDFBF7'] });

    const avatarA = await uploadPng(app, pia.cookie, 'AVATAR');
    const avatarB = await uploadPng(app, pia.cookie, 'AVATAR');
    await as(pia).patch('/api/users/me').send({ avatarUrl: avatarA }).expect(200);
    await as(pia).patch('/api/users/me').send({ fullName: 'Pia' }).expect(200); // other fields keep the avatar
    expect((await fetch(avatarA)).status).toBe(200);
    await as(pia).patch('/api/users/me').send({ avatarUrl: avatarB }).expect(200);
    expect((await fetch(avatarA)).status).toBe(404);
    expect(await used()).toBe(1);
    await as(pia).patch('/api/users/me').send({ avatarUrl: null }).expect(200);
    expect((await fetch(avatarB)).status).toBe(404);
    expect(await used()).toBe(0);

    // A logo also placed on a canvas survives the brand kit change; a logo only in the kit goes.
    const [logoA, logoB] = [await uploadPng(app, pia.cookie, 'LOGO'), await uploadPng(app, pia.cookie, 'LOGO')];
    await as(pia).patch('/api/users/me/brand-kit').send(kit(logoA)).expect(200);
    const projectId = await newProject(pia);
    const element = { id: 'logo', type: 'image', panelId: 'front', x: 1, y: 1, width: 5, height: 5, rotation: 0, content: logoA };
    await as(pia).patch(`/api/projects/${projectId}`).send({ canvasState: { elements: [element] } }).expect(200);
    await as(pia).patch('/api/users/me/brand-kit').send(kit(logoB)).expect(200);
    expect((await fetch(logoA)).status).toBe(200);
    await as(pia).patch('/api/users/me/brand-kit').send(kit(logoB)).expect(200); // same logo: kept
    expect((await fetch(logoB)).status).toBe(200);
    await as(pia).patch('/api/users/me/brand-kit').send(kit(null)).expect(200);
    expect((await fetch(logoB)).status).toBe(404);
    expect(await used()).toBe(1);
  });
});
