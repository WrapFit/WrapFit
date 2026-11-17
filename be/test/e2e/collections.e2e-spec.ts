import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { PrismaService } from '../../src/shared/prisma';
import { signUp } from './helpers/accounts';
import { deleteUsers } from './helpers/cleanup';

/** Collections CRUD (IT3-05). Users use the `@e2e.test` domain and are removed afterwards. */
describe('Collections API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const run = Date.now();
  let erin: { cookie: string };
  let frank: { cookie: string };

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

  const createProject = async (collectionId: string, title: string) =>
    (
      await as(erin)
        .post('/api/projects')
        .send({ templateId: 'tuck-top', title, dimensions: { length: 120, width: 80, height: 60 }, collectionId })
        .expect(201)
    ).body.id as string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    await app.init();
    prisma = app.get(PrismaService);

    erin = await register('erin');
    frank = await register('frank');
  });

  afterAll(async () => {
    await deleteUsers(prisma, { email: { endsWith: '@e2e.test' } });
    await app.close();
  });

  it('requires authentication', async () => {
    await api().get('/api/collections').expect(401);
    await api().post('/api/collections').send({ title: 'x' }).expect(401);
  });

  it('creates a collection with the default kraft color', async () => {
    const res = await as(erin).post('/api/collections').send({ title: '  Hộp nến mùa thu  ' }).expect(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      title: 'Hộp nến mùa thu',
      description: null,
      colorTag: '#D4A373',
      projectCount: 0,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('validates the payload', async () => {
    await as(erin).post('/api/collections').send({}).expect(400);
    await as(erin).post('/api/collections').send({ title: '   ' }).expect(400);
    const color = await as(erin).post('/api/collections').send({ title: 'x', colorTag: 'red' }).expect(400);
    expect(color.body.message).toEqual(['colorTag must be a hex color like #D4A373']);
    await as(erin).post('/api/collections').send({ title: 'x', userId: 'someone' }).expect(400);
  });

  it('counts the projects of each collection, without the trash', async () => {
    const tet = (
      await as(erin)
        .post('/api/collections')
        .send({ title: 'Tết Bính Ngọ 2026', description: 'Giao trước 25 tháng Chạp', colorTag: '#C0392B' })
        .expect(201)
    ).body.id;
    await createProject(tet, 'Hộp mứt');
    await createProject(tet, 'Hộp trà');
    const trashed = await createProject(tet, 'Hộp bỏ');
    await as(erin).patch(`/api/projects/${trashed}/status`).send({ status: 'DELETED' }).expect(200);

    const one = await as(erin).get(`/api/collections/${tet}`).expect(200);
    expect(one.body).toMatchObject({ title: 'Tết Bính Ngọ 2026', colorTag: '#C0392B', projectCount: 2 });

    const list = await as(erin).get('/api/collections').expect(200);
    expect(list.body.map((c: { title: string }) => c.title)).toEqual(['Tết Bính Ngọ 2026', 'Hộp nến mùa thu']);
    expect(list.body[0].projectCount).toBe(2);

    // The projects list filters by the same collection.
    const projects = await as(erin).get(`/api/projects?collectionId=${tet}`).expect(200);
    expect(projects.body.meta.total).toBe(2);
  });

  it('updates a collection; null clears the description', async () => {
    const id = (await as(erin).post('/api/collections').send({ title: 'Cũ', description: 'ghi chú' }).expect(201)).body.id;

    const res = await as(erin)
      .patch(`/api/collections/${id}`)
      .send({ title: 'Mới', colorTag: '#2D5A27', description: null })
      .expect(200);
    expect(res.body).toMatchObject({ title: 'Mới', colorTag: '#2D5A27', description: null });

    await as(erin).patch(`/api/collections/${id}`).send({ title: '' }).expect(400);
    await as(erin).patch(`/api/collections/${id}`).send({ title: null }).expect(400);
  });

  it('deletes the collection but keeps its projects', async () => {
    const id = (await as(erin).post('/api/collections').send({ title: 'Tạm' }).expect(201)).body.id;
    const projectId = await createProject(id, 'Hộp giữ lại');

    await as(erin).delete(`/api/collections/${id}`).expect(204);
    await as(erin).get(`/api/collections/${id}`).expect(404);
    await as(erin).delete(`/api/collections/${id}`).expect(404);

    const project = await as(erin).get(`/api/projects/${projectId}`).expect(200);
    expect(project.body.collection).toBeNull();
  });

  it('isolates the collections of each user', async () => {
    const id = (await as(erin).post('/api/collections').send({ title: 'Riêng của Erin' }).expect(201)).body.id;

    expect((await as(frank).get('/api/collections').expect(200)).body).toEqual([]);
    await as(frank).get(`/api/collections/${id}`).expect(404);
    await as(frank).patch(`/api/collections/${id}`).send({ title: 'hijack' }).expect(404);
    await as(frank).delete(`/api/collections/${id}`).expect(404);
    await as(erin).get(`/api/collections/${id}`).expect(200);

    await as(erin).get('/api/collections/not-a-uuid').expect(400);
  });
});
