import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { PrismaService } from '../../src/shared/prisma';
import { signUp, uploadPng } from './helpers/accounts';

/**
 * Avatar and brand kit logo files (`/users/me`, `/users/me/brand-kit`): a replaced or removed one is deleted with its
 * object, so it stops counting against the quota. Needs the local SeaweedFS (see test/e2e-env.ts).
 */
describe('Profile files (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const run = Date.now();

  const api = () => request(app.getHttpServer());
  const as = (user: { cookie: string }) => ({
    get: (url: string) => api().get(url).set('Cookie', user.cookie),
    post: (url: string) => api().post(url).set('Cookie', user.cookie),
    patch: (url: string) => api().patch(url).set('Cookie', user.cookie),
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
