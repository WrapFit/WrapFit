import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { PrismaService } from '../../src/shared/prisma';
import { signUp } from './helpers/accounts';

/**
 * Sample print orders stored in PostgreSQL (docs/17, S4): they survive an API restart, only their owner reads them,
 * and the status follows the lifecycle (ADMIN, or PRINT_SHOP of the order's shop). Users use the `@e2e.test` domain
 * and are removed afterwards, with their orders.
 */
describe('Orders API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const run = Date.now();
  type Account = { id: string; cookie: string };
  let owner: Account;
  let stranger: Account;
  let admin: Account;
  let saigonStaff: Account;
  let hanoiStaff: Account;
  let projectId: string;

  const start = async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    await app.init();
    prisma = app.get(PrismaService);
  };

  const api = () => request(app.getHttpServer());
  const as = (user: Account) => ({
    get: (url: string) => api().get(url).set('Cookie', user.cookie),
    post: (url: string) => api().post(url).set('Cookie', user.cookie),
    patch: (url: string) => api().patch(url).set('Cookie', user.cookie),
    delete: (url: string) => api().delete(url).set('Cookie', user.cookie),
  });

  const register = async (name: string, role?: Role, printShopId?: string) => {
    const account = await signUp(app, `${name}-${run}@e2e.test`);
    if (role) await prisma.user.update({ where: { id: account.id }, data: { role } });
    if (printShopId) await prisma.printShopMember.create({ data: { userId: account.id, printShopId } });
    return { id: account.id, cookie: account.cookie };
  };

  const order = (projectId: string) => ({
    projectId,
    quantity: 2,
    recipientName: 'Nguyễn Mai Anh',
    phone: '0901234567',
    shippingAddress: '12 Lý Tự Trọng, Q.1, TP.HCM',
    paperStock: 'Ivory 300gsm',
    printShopId: 'ps-sg-01',
  });

  beforeAll(async () => {
    await start();
    owner = await register('olivia');
    stranger = await register('sam');
    admin = await register('ada', Role.ADMIN);
    saigonStaff = await register('xuong-sg', Role.PRINT_SHOP, 'ps-sg-01');
    hanoiStaff = await register('xuong-hn', Role.PRINT_SHOP, 'ps-hn-02');

    projectId = (
      await as(owner)
        .post('/api/projects')
        .send({ templateId: 'tuck-top', title: 'Hộp nến 80×80×95', dimensions: { length: 80, width: 80, height: 95 } })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@e2e.test' } } });
    await app.close();
  });

  it('requires authentication', async () => {
    await api().get('/api/orders/my-orders').expect(401);
    await api().post('/api/orders/sample').send(order(projectId)).expect(401);
  });

  let orderId: string;

  it('stores the order, waiting for payment, and keeps it after the API restarts', async () => {
    const created = await as(owner).post('/api/orders/sample').send(order(projectId)).expect(201);
    expect(created.body).toMatchObject({
      orderCode: expect.stringMatching(/^WF-\d{4}-\d{4}$/),
      userId: owner.id,
      projectId,
      projectTitle: 'Hộp nến 80×80×95',
      structure: 'tuck-top',
      quantity: 2,
      paperStock: 'Ivory 300gsm',
      status: 'pending_payment',
      orderStatus: 'PENDING_PAYMENT',
      sampleFeeVnd: 74_000,
      totalVnd: 74_000,
      printShopId: 'ps-sg-01',
      printShopName: 'In Bao Bì Sài Gòn Xanh',
      paymentId: null,
    });
    orderId = created.body.id;

    // A new application instance has nothing in memory: the order must come from PostgreSQL.
    await app.close();
    await start();

    const mine = await as(owner).get('/api/orders/my-orders').expect(200);
    expect(mine.body.map((o: { id: string }) => o.id)).toEqual([orderId]);
    const one = await as(owner).get(`/api/orders/${orderId}`).expect(200);
    expect(one.body).toMatchObject({ id: orderId, orderCode: created.body.orderCode, totalVnd: 74_000 });

    const history = await prisma.orderStatusHistory.findMany({ where: { orderId } });
    expect(history).toEqual([expect.objectContaining({ fromStatus: null, toStatus: 'PENDING_PAYMENT', changedById: owner.id })]);
  });

  it("answers 404 to anyone else reading the order, and lists none of it", async () => {
    await as(stranger).get(`/api/orders/${orderId}`).expect(404);
    await as(stranger).get('/api/orders/00000000-0000-7000-8000-000000000000').expect(404);
    await as(owner).get('/api/orders/not-a-uuid').expect(400);
    expect((await as(stranger).get('/api/orders/my-orders').expect(200)).body).toEqual([]);
  });

  it("refuses an order on someone else's project, and a shop that does not take orders", async () => {
    await as(stranger).post('/api/orders/sample').send(order(projectId)).expect(404);
    await as(owner).post('/api/orders/sample').send({ ...order(projectId), printShopId: 'ps-ct-04' }).expect(400);
    await as(owner).post('/api/orders/sample').send({ ...order(projectId), phone: undefined }).expect(400);
  });

  it('lets only ADMIN and PRINT_SHOP change the status', async () => {
    await as(owner).patch(`/api/orders/${orderId}/status`).send({ status: 'PAID' }).expect(403);
    await as(owner).get('/api/orders').expect(403);
    await as(admin).patch(`/api/orders/${orderId}/status`).send({ status: 'PAYED' }).expect(400);
  });

  it('answers 409 to a step outside the lifecycle', async () => {
    const res = await as(admin).patch(`/api/orders/${orderId}/status`).send({ status: 'SHIPPED' }).expect(409);
    expect(res.body.message).toContain('PENDING_PAYMENT');
  });

  it('walks the order from payment to delivery', async () => {
    // Payment (S5 does it from the VietQR flow; an admin can confirm it by hand). A print shop cannot.
    await as(saigonStaff).patch(`/api/orders/${orderId}/status`).send({ status: 'PAID' }).expect(403);
    const paid = await as(admin).patch(`/api/orders/${orderId}/status`).send({ status: 'PAID' }).expect(200);
    expect(paid.body).toMatchObject({ orderStatus: 'PAID', status: 'paid', paidAt: expect.any(String) });

    // Another shop's account does not see the order at all.
    await as(hanoiStaff).patch(`/api/orders/${orderId}/status`).send({ status: 'IN_PRODUCTION' }).expect(404);
    expect((await as(hanoiStaff).get('/api/orders').expect(200)).body).toEqual([]);

    const queue = await as(saigonStaff).get('/api/orders?status=PAID').expect(200);
    expect(queue.body.map((o: { id: string }) => o.id)).toContain(orderId);

    await as(saigonStaff).patch(`/api/orders/${orderId}/status`).send({ status: 'IN_PRODUCTION' }).expect(200);
    await as(saigonStaff).patch(`/api/orders/${orderId}/status`).send({ status: 'IN_PRODUCTION' }).expect(409);
    await as(admin).patch(`/api/orders/${orderId}/status`).send({ status: 'CANCELLED' }).expect(409);
    await as(saigonStaff)
      .patch(`/api/orders/${orderId}/status`)
      .send({ status: 'SHIPPED', note: 'GHN 123456789' })
      .expect(200);
    const delivered = await as(saigonStaff).patch(`/api/orders/${orderId}/status`).send({ status: 'DELIVERED' }).expect(200);
    expect(delivered.body).toMatchObject({ orderStatus: 'DELIVERED', shippedAt: expect.any(String), deliveredAt: expect.any(String) });

    // The owner sees the new status; the history keeps every step and who took it.
    expect((await as(owner).get(`/api/orders/${orderId}`).expect(200)).body.orderStatus).toBe('DELIVERED');
    const history = await prisma.orderStatusHistory.findMany({ where: { orderId }, orderBy: { createdAt: 'asc' } });
    expect(history.map((h) => [h.fromStatus, h.toStatus, h.changedById])).toEqual([
      [null, 'PENDING_PAYMENT', owner.id],
      ['PENDING_PAYMENT', 'PAID', admin.id],
      ['PAID', 'IN_PRODUCTION', saigonStaff.id],
      ['IN_PRODUCTION', 'SHIPPED', saigonStaff.id],
      ['SHIPPED', 'DELIVERED', saigonStaff.id],
    ]);
    expect(history[3].note).toBe('GHN 123456789');
  });

  it('keeps the order when the project is deleted for good', async () => {
    await as(owner).patch(`/api/projects/${projectId}/status`).send({ status: 'DELETED' }).expect(200);
    await as(owner).delete(`/api/projects/${projectId}`).expect(204);

    const kept = await as(owner).get(`/api/orders/${orderId}`).expect(200);
    expect(kept.body).toMatchObject({ projectId: null, projectTitle: 'Hộp nến 80×80×95', structure: 'tuck-top' });
  });
});
