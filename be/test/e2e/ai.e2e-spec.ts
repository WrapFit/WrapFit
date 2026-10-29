import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { PrismaService } from '../../src/shared/prisma';
import { signUp } from './helpers/accounts';

/** AI pattern endpoint (IT3-09) with AI disabled (see e2e-env.ts): the procedural generator answers. */
describe('AI pattern (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;

  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    await app.init();
    prisma = app.get(PrismaService);

    cookie = (await signUp(app, `mia-${Date.now()}@e2e.test`)).cookie;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@e2e.test' } } });
    await app.close();
  });

  it('requires authentication', async () => {
    await api().post('/api/ai/pattern').send({ theme: 'Tết' }).expect(401);
  });

  it('reports that AI is off and how much of the plan is used', async () => {
    const res = await api().get('/api/ai/usage').set('Cookie', cookie).expect(200);
    expect(res.body).toEqual({ tier: 'FREE', used: 0, limit: 10, aiEnabled: false, budgetReached: false });
  });

  it('returns a palette and a seamless SVG tile', async () => {
    const res = await api()
      .post('/api/ai/pattern')
      .set('Cookie', cookie)
      .send({ theme: '  Tết hoa đào  ', preferredColors: ['#123456'] })
      .expect(200);

    expect(res.body).toMatchObject({
      source: 'procedural',
      themeName: 'Xuân Lộc Đỏ Son',
      description: expect.any(String),
      palette: expect.arrayContaining(['#123456']),
      tile: { size: 60, svg: expect.stringMatching(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" .*<\/svg>$/) },
      usage: null,
    });
    expect(res.body.tile.svg).not.toMatch(/<script|on\w+=|href/i);
  });

  it('validates the request', async () => {
    await api().post('/api/ai/pattern').set('Cookie', cookie).send({ theme: '   ' }).expect(400);
    await api().post('/api/ai/pattern').set('Cookie', cookie).send({ theme: 'x', preferredColors: ['red'] }).expect(400);
  });

  // Before the burst test: every POST counts against the 5 per minute.
  it('keeps premium quality for paid plans', async () => {
    const res = await api()
      .post('/api/ai/pattern')
      .set('Cookie', cookie)
      .send({ theme: 'Tết', quality: 'premium' })
      .expect(403);
    expect(res.body).toMatchObject({
      code: 'PLAN_FEATURE_REQUIRED',
      feature: 'ai.premium',
      requiredPlan: 'PAY_PER_EXPORT',
    });
  });

  it('limits bursts to 5 requests per minute', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await api().post('/api/ai/pattern').set('Cookie', cookie).send({ theme: `burst ${i}` })).status);
    }
    expect(statuses).toContain(429);
  });
});
