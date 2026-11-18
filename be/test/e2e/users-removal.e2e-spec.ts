import { PAYMENT_TERMS_VERSION } from '@wrapfit/shared';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { AuthMaintenanceTask } from '../../src/auth/auth-maintenance.task';
import { PrismaService } from '../../src/shared/prisma';
import { scrubExpiredInvoiceData } from '../../src/users/invoice-retention';
import { signUp, TEST_PASSWORD, uploadPng } from './helpers/accounts';
import { deleteUsers } from './helpers/cleanup';
import { createPaidOrder, placeSampleOrder } from './helpers/orders';

/**
 * Admin deletion of a user (docs/25 item 3) against a real PostgreSQL and SeaweedFS: a user without financial history
 * is deleted with their projects and files; a user with payments or orders is anonymized, so the money records, the
 * order in production and its design stay, and the person can never sign in again while their address registers anew.
 * Needs `docker compose up -d postgres redis seaweedfs storage-init`.
 */
describe('Admin deletes a user (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const run = Date.now();
  type Account = { id: string; cookie: string; setCookie: string[] };
  let admin: Account;

  const api = () => request(app.getHttpServer());
  const as = (user: { cookie: string }) => ({
    get: (url: string) => api().get(url).set('Cookie', user.cookie),
    post: (url: string) => api().post(url).set('Cookie', user.cookie),
    patch: (url: string) => api().patch(url).set('Cookie', user.cookie),
    delete: (url: string) => api().delete(url).set('Cookie', user.cookie),
  });
  const email = (name: string) => `del-${name}-${run}@e2e.test`;
  const pay = async (user: Account, body: Record<string, unknown>) =>
    (await as(user).post('/api/payments').send({ termsVersion: PAYMENT_TERMS_VERSION, ...body }).expect(201)).body;
  /** Pays a VietQR payment with the simulate button, which only a demo account may press (docs/25 item 6). */
  const simulatePaid = async (user: Account, paymentId: string) => {
    await prisma.user.update({ where: { id: user.id }, data: { isDemo: true } });
    await as(user).post(`/api/payments/${paymentId}/simulate-confirm`).expect(200);
    await prisma.user.update({ where: { id: user.id }, data: { isDemo: false } });
  };
  const newProject = async (user: Account, title: string) =>
    (
      await as(user)
        .post('/api/projects')
        .send({ templateId: 'tuck-top', title, dimensions: { length: 80, width: 80, height: 95 }, canvasState: { elements: [] } })
        .expect(201)
    ).body.id as string;
  const image = (id: string, content: string) => ({ id, type: 'image', panelId: 'front', x: 1, y: 1, width: 5, height: 5, rotation: 0, content });
  const alive = async (url: string) => (await fetch(url)).status === 200;
  const refreshCookie = (setCookie: string[]) => setCookie.find((line) => line.startsWith('wf_refresh='))!.split(';')[0];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    await app.init();
    prisma = app.get(PrismaService);

    admin = await signUp(app, email('admin'));
    await prisma.user.update({ where: { id: admin.id }, data: { role: 'ADMIN' } });
  });

  afterAll(async () => {
    await deleteUsers(prisma, { email: { endsWith: `-${run}@e2e.test` } });
    // Anonymized accounts of this run no longer carry their e2e address.
    await deleteUsers(prisma, { anonymizedAt: { not: null }, createdAt: { gte: new Date(run) } });
    await app.close();
  });

  it('hard-deletes a user without financial history, with their projects and files', async () => {
    const plain = await signUp(app, email('plain'), 'Nguyễn Văn Trắng');
    const projectId = await newProject(plain, 'Hộp trắng');
    const upload = await uploadPng(app, plain.cookie, 'IMAGE');
    await as(plain).patch(`/api/projects/${projectId}`).send({ canvasState: { elements: [image('a', upload)] } }).expect(200);
    // Opening the wallet grants the free xu of the period: a credit lot, but not a purchased one.
    await as(plain).get('/api/billing/me').expect(200);
    expect(await prisma.creditLot.count({ where: { userId: plain.id, source: 'PLAN_ALLOWANCE' } })).toBe(1);
    expect(await alive(upload)).toBe(true);

    const res = await as(admin).delete(`/api/users/${plain.id}`).expect(200);
    expect(res.body).toEqual({ id: plain.id, result: 'DELETED' });

    expect(await prisma.user.findUnique({ where: { id: plain.id } })).toBeNull();
    expect(await prisma.packagingProject.count({ where: { userId: plain.id } })).toBe(0);
    expect(await prisma.creditLot.count({ where: { userId: plain.id } })).toBe(0);
    expect(await prisma.storedFile.count({ where: { userId: plain.id } })).toBe(0);
    expect(await alive(upload)).toBe(false);
    await as(admin).delete(`/api/users/${plain.id}`).expect(404);
  });

  describe('a user with payments and an order in production', () => {
    let maker: Account;
    let oldEmail: string;
    let orderId: string;
    let keptProjectId: string;
    let droppedProjectId: string;
    let paidXuId: string;
    let pendingPaymentId: string;
    let unpaidOrderId: string;
    let keptImage: string;
    let droppedImage: string;
    let avatar: string;

    beforeAll(async () => {
      oldEmail = email('maker');
      maker = await signUp(app, oldEmail, 'Trần Thị Mộc');
      await as(maker).patch('/api/users/me').send({ shopName: 'Nến thơm Mộc An' }).expect(200);
      avatar = await uploadPng(app, maker.cookie, 'AVATAR');
      await as(maker).patch('/api/users/me').send({ avatarUrl: avatar }).expect(200);
      await prisma.user.update({
        where: { id: maker.id },
        data: { billingDetails: { company: 'Mộc An', taxCode: '0312345678', email: oldEmail }, referralCode: `MOC${run}` },
      });

      // A design ordered and printed, with an uploaded image, a review link, a comment and an unboxing page.
      const order = await placeSampleOrder(app, maker.cookie);
      orderId = order.id;
      keptProjectId = (await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } })).items[0].projectId!;
      keptImage = await uploadPng(app, maker.cookie, 'IMAGE');
      await prisma.packagingProject.update({ where: { id: keptProjectId }, data: { visibility: 'PUBLIC' } });
      const orderPayment = await pay(maker, { purpose: 'SAMPLE_ORDER', orderId });
      await simulatePaid(maker, orderPayment.id);
      await as(admin).patch(`/api/orders/${orderId}/status`).send({ status: 'IN_PRODUCTION' }).expect(200);
      // Saved after the order: the image is shown by the kept design (its print file needs it).
      await prisma.projectFileRef.create({
        data: { projectId: keptProjectId, storedFileId: (await prisma.storedFile.findFirstOrThrow({ where: { key: { endsWith: keptImage.split('/').pop()! } } })).id },
      });
      await prisma.projectReview.create({ data: { projectId: keptProjectId, token: `tok-${run}` } });
      await prisma.designComment.create({
        data: { projectId: keptProjectId, authorUserId: maker.id, authorName: 'Trần Thị Mộc', body: 'Chữ to hơn' },
      });
      await prisma.unboxingExperience.create({ data: { projectId: keptProjectId, recipientName: 'Chị Hoa', giftNote: 'Cảm ơn' } });

      // A paid xu pack (purchased credit lot), a payment still pending, an order never paid, another design.
      paidXuId = (await pay(maker, { purpose: 'XU_500' })).id;
      await simulatePaid(maker, paidXuId);
      pendingPaymentId = (await pay(maker, { purpose: 'XU_500' })).id;
      unpaidOrderId = (await placeSampleOrder(app, maker.cookie)).id;
      droppedProjectId = await newProject(maker, 'Hộp nháp');
      droppedImage = await uploadPng(app, maker.cookie, 'IMAGE');
      await as(maker).patch(`/api/projects/${droppedProjectId}`).send({ canvasState: { elements: [image('d', droppedImage)] } }).expect(200);
      await prisma.projectCollection.create({ data: { userId: maker.id, title: 'Bộ Tết' } });
      await as(maker).post('/api/auth/password/forgot').send({ email: oldEmail }).expect(202);
      expect(await prisma.authToken.count({ where: { userId: maker.id, consumedAt: null } })).toBeGreaterThan(0);
    });

    it('anonymizes instead of deleting: money records stay, the person is scrubbed', async () => {
      const res = await as(admin).delete(`/api/users/${maker.id}`).expect(200);
      expect(res.body).toEqual({ id: maker.id, result: 'ANONYMIZED' });

      const row = await prisma.user.findUniqueOrThrow({ where: { id: maker.id } });
      expect(row).toMatchObject({
        email: `deleted-${maker.id}@deleted.invalid`,
        passwordHash: null,
        googleId: null,
        emailVerifiedAt: null,
        fullName: null,
        shopName: null,
        avatarUrl: null,
        avatarKey: null,
        brandKit: null,
        billingDetails: null,
        referralCode: null,
        isActive: false,
      });
      expect(row.anonymizedAt).toBeInstanceOf(Date);

      // Payments, orders, credits stay; nothing can be paid any more.
      const payments = await prisma.payment.findMany({ where: { userId: maker.id } });
      expect(payments.find((p) => p.id === paidXuId)).toMatchObject({ status: 'PAID' });
      expect(payments.find((p) => p.id === pendingPaymentId)).toMatchObject({ status: 'CANCELLED' });
      expect(await prisma.creditLot.count({ where: { userId: maker.id, source: 'PURCHASE' } })).toBe(1);
      expect(await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).toMatchObject({
        status: 'IN_PRODUCTION',
        recipientName: 'Nguyễn Mai Anh',
        recipientPhone: '0901234567',
      });
      expect(await prisma.order.findUniqueOrThrow({ where: { id: unpaidOrderId } })).toMatchObject({ status: 'CANCELLED' });
      const history = await prisma.orderStatusHistory.findFirstOrThrow({ where: { orderId: unpaidOrderId, toStatus: 'CANCELLED' } });
      expect(history).toMatchObject({ changedById: admin.id, note: 'Tài khoản bị xóa' });

      // The design the order prints stays, private, with its image; the rest goes.
      expect(await prisma.packagingProject.findUniqueOrThrow({ where: { id: keptProjectId } })).toMatchObject({
        visibility: 'PRIVATE',
        allowFork: false,
      });
      expect(await alive(keptImage)).toBe(true);
      expect(await prisma.projectReview.findUniqueOrThrow({ where: { projectId: keptProjectId } })).toMatchObject({ token: null });
      expect((await prisma.designComment.findFirstOrThrow({ where: { projectId: keptProjectId } })).authorName).toBe('Tài khoản đã xóa');
      expect(await prisma.unboxingExperience.count({ where: { projectId: keptProjectId } })).toBe(1);
      expect(await prisma.packagingProject.findUnique({ where: { id: droppedProjectId } })).toBeNull();
      expect(await alive(droppedImage)).toBe(false);
      expect(await alive(avatar)).toBe(false);
      expect(await prisma.projectCollection.count({ where: { userId: maker.id } })).toBe(0);
      expect(await prisma.refreshToken.count({ where: { userId: maker.id } })).toBe(0);
      expect(await prisma.authToken.count({ where: { userId: maker.id } })).toBe(0);
    });

    it('keeps the order in production readable by the admin, with its design and recipient', async () => {
      const list = (await as(admin).get('/api/orders?status=IN_PRODUCTION&limit=100').expect(200)).body;
      const items = (Array.isArray(list) ? list : list.items) as { id: string; projectId: string; recipientName: string; phone: string; shippingAddress: string }[];
      expect(items.find((order) => order.id === orderId)).toMatchObject({
        projectId: keptProjectId,
        recipientName: 'Nguyễn Mai Anh',
        phone: '0901234567',
        shippingAddress: '12 Lý Tự Trọng, Q.1',
      });
      const design = await prisma.packagingProject.findUniqueOrThrow({ where: { id: keptProjectId }, include: { files: true } });
      expect(design.canvasState).toBeTruthy();
      // The public pages no longer show it: private, and the review link is off.
      await api().get(`/api/public/projects/${design.slug}`).expect(404);
      await api().get(`/api/review/tok-${run}`).expect(404);
    });

    it('shows the account as anonymized to the admin, and refuses to change it', async () => {
      const detail = (await as(admin).get(`/api/users/${maker.id}`).expect(200)).body;
      expect(detail).toMatchObject({ email: `deleted-${maker.id}@deleted.invalid`, fullName: null, isActive: false });
      expect(detail.anonymizedAt).toEqual(expect.any(String));
      const page = (await as(admin).get('/api/users?limit=100').expect(200)).body;
      expect(page.items.some((user: { id: string }) => user.id === maker.id)).toBe(true);

      for (const body of [{ isActive: true }, { role: 'PRO_ARTISAN' }, { isDemo: true }]) {
        expect((await as(admin).patch(`/api/users/${maker.id}`).send(body).expect(409)).body).toMatchObject({ code: 'USER_ANONYMIZED' });
      }
      const grant = await as(admin).post(`/api/admin/users/${maker.id}/credits`).send({ kind: 'XU', quantity: 10 }).expect(409);
      expect(grant.body).toMatchObject({ code: 'USER_ANONYMIZED' });
      expect((await prisma.user.findUniqueOrThrow({ where: { id: maker.id } })).isActive).toBe(false);
    });

    it('lets the person neither sign in, refresh, nor reset the password', async () => {
      await api().post('/api/auth/login').send({ email: oldEmail, password: TEST_PASSWORD }).expect(401);
      await api().post('/api/auth/refresh').set('Cookie', refreshCookie(maker.setCookie)).expect(401);
      await as(maker).get('/api/users/me').expect(401);
      await api().post('/api/auth/password/forgot').send({ email: `deleted-${maker.id}@deleted.invalid` }).expect(202);
      expect(await prisma.authToken.count({ where: { userId: maker.id } })).toBe(0);
    });

    it('does nothing when the anonymized user is deleted again', async () => {
      const before = await prisma.user.findUniqueOrThrow({ where: { id: maker.id } });
      const counts = async () => ({
        payments: await prisma.payment.count({ where: { userId: maker.id } }),
        orders: await prisma.order.count({ where: { userId: maker.id } }),
        projects: await prisma.packagingProject.count({ where: { userId: maker.id } }),
        files: await prisma.storedFile.count({ where: { userId: maker.id } }),
      });
      const countsBefore = await counts();

      expect((await as(admin).delete(`/api/users/${maker.id}`).expect(200)).body).toEqual({ id: maker.id, result: 'ANONYMIZED' });
      expect(await prisma.user.findUniqueOrThrow({ where: { id: maker.id } })).toEqual(before);
      expect(await counts()).toEqual(countsBefore);
    });

    it('refuses a stray hard delete in the database (ON DELETE RESTRICT)', async () => {
      const error = await prisma.user.delete({ where: { id: maker.id } }).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      expect((error as Prisma.PrismaClientKnownRequestError).code).toBe('P2003');
      await expect(prisma.$executeRaw`DELETE FROM users WHERE id = ${maker.id}::uuid`).rejects.toThrow(/foreign key/i);
      expect(await prisma.payment.count({ where: { userId: maker.id } })).toBeGreaterThan(0);
    });

    it('lets the same address register again as a new account that sees nothing of the old one', async () => {
      const again = await signUp(app, oldEmail, 'Người mới');
      expect(again.id).not.toBe(maker.id);
      const me = (await as(again).get('/api/users/me').expect(200)).body;
      expect(me).toMatchObject({ id: again.id, email: oldEmail, fullName: 'Người mới', shopName: null, anonymizedAt: null });
      expect((await as(again).get('/api/payments').expect(200)).body.entries).toEqual([]);
      expect((await as(again).get('/api/orders/my-orders').expect(200)).body).toHaveLength(0);
      const projects = (await as(again).get('/api/projects').expect(200)).body;
      expect(projects.items ?? projects).toHaveLength(0);
      await as(again).get(`/api/orders/${orderId}`).expect(404);
      const billing = (await as(again).get('/api/billing/me').expect(200)).body;
      // Only the xu of the Free plan for this month: nothing bought by the old account (export credits are gone, docs/25 item 7).
      expect(billing).toMatchObject({ tier: 'FREE', xu: { balance: 50 } });
      expect(billing).not.toHaveProperty('exportCredits');
      expect(await prisma.creditLot.count({ where: { userId: again.id, source: 'PURCHASE' } })).toBe(0);
    });

    it('keeps the invoice data 10 years after the end of its year, then removes its personal part (docs/28 Q4)', async () => {
      // The VAT invoice details of the moment travel with each payment, so anonymizing the account kept them.
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: paidXuId } })).metadata).toMatchObject({
        billingDetails: { company: 'Mộc An', taxCode: '0312345678' },
      });
      const vietnamYear = new Date(Date.now() + 7 * 3600_000).getUTCFullYear();
      const lastChangedIn = async (year: number) => {
        const at = new Date(Date.UTC(year, 5, 1)).toISOString();
        await prisma.$executeRaw`UPDATE orders SET updated_at = ${at}::timestamptz WHERE id = ${orderId}::uuid`;
        await prisma.$executeRaw`UPDATE payments SET updated_at = ${at}::timestamptz WHERE id = ${paidXuId}::uuid`;
      };

      // A record of 10 years ago is in the last year of its retention: kept.
      await lastChangedIn(vietnamYear - 10);
      await scrubExpiredInvoiceData(prisma);
      expect(await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).toMatchObject({ recipientName: 'Nguyễn Mai Anh' });
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: paidXuId } })).metadata).toHaveProperty('billingDetails');

      // One year older: past retention. The person goes, the accounting record stays.
      await lastChangedIn(vietnamYear - 11);
      const scrubbed = await scrubExpiredInvoiceData(prisma);
      expect(scrubbed.orders).toBeGreaterThanOrEqual(1);
      expect(scrubbed.payments).toBeGreaterThanOrEqual(1);
      expect(await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).toMatchObject({
        status: 'IN_PRODUCTION',
        recipientName: 'Tài khoản đã xóa',
        recipientPhone: '',
        shippingAddress: '',
        notes: null,
      });
      const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paidXuId } });
      expect(payment).toMatchObject({ status: 'PAID', amountVnd: 50_000 });
      expect(payment.metadata).not.toHaveProperty('billingDetails');
      expect(payment.metadata).toHaveProperty('termsVersion');
      // A second run changes nothing.
      const again = await scrubExpiredInvoiceData(prisma);
      expect(await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).toMatchObject({ recipientName: 'Tài khoản đã xóa' });
      expect(again.orders).toBe(0);
    });
  });

  describe('notifications (docs/25 S8)', () => {
    /** A PUBLIC design of `author`, remixed by `remixer`; resolves once the author's notification is stored. */
    const remixed = async (author: Account, remixer: Account, title: string) => {
      const project = (
        await as(author)
          .post('/api/projects')
          .send({ templateId: 'tuck-top', title, dimensions: { length: 80, width: 80, height: 95 }, canvasState: { elements: [] } })
          .expect(201)
      ).body as { id: string; slug: string };
      await as(author).patch(`/api/projects/${project.id}/visibility`).send({ visibility: 'PUBLIC', allowFork: true }).expect(200);
      await as(remixer).post(`/api/public/projects/${project.slug}/fork`).expect(201);
      for (let i = 0; i < 100; i++) {
        if (await prisma.notification.count({ where: { userId: author.id, projectId: project.id } })) return project.id;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      throw new Error('The remix notification was not stored');
    };

    it.each(['DELETED', 'ANONYMIZED'] as const)(
      'removes the inbox of a %s user and leaves nothing naming them in other inboxes',
      async (result) => {
        const keeper = await signUp(app, email(`keeper-${result.toLowerCase()}`), 'Người Ở Lại');
        const leaver = await signUp(app, email(`leaver-${result.toLowerCase()}`), 'Phạm Rời Đi');
        await as(leaver).patch('/api/users/me').send({ shopName: 'Tiệm Rời Đi' }).expect(200);
        if (result === 'ANONYMIZED') {
          // A paid order: the account is anonymized, not deleted.
          await createPaidOrder(prisma, leaver.id, await newProject(leaver, 'Hộp đã đặt in'), run);
        }
        await remixed(leaver, keeper, 'Hộp của người rời đi'); // a notification in the leaver's inbox
        const keeperProject = await remixed(keeper, leaver, 'Hộp của người ở lại'); // one naming the leaver
        const before = (await as(keeper).get('/api/notifications').expect(200)).body.items;
        expect(before.find((item: { project: { id: string } }) => item.project.id === keeperProject)).toMatchObject({
          actorName: 'Phạm Rời Đi',
        });

        expect((await as(admin).delete(`/api/users/${leaver.id}`).expect(200)).body.result).toBe(result);

        expect(await prisma.notification.count({ where: { userId: leaver.id } })).toBe(0);
        expect(await prisma.notification.count({ where: { actorId: leaver.id } })).toBe(0);
        const after = (await as(keeper).get('/api/notifications').expect(200)).body;
        expect(after.items.find((item: { project: { id: string } }) => item.project.id === keeperProject)).toMatchObject({
          type: 'PROJECT_REMIXED',
          actorName: null,
        });
        expect(JSON.stringify(after)).not.toMatch(/Rời Đi/);
      },
    );
  });

  it('leaves unverified accounts with payments to the cleanup task untouched instead of failing it', async () => {
    const ghost = await signUp(app, email('ghost'));
    await pay(ghost, { purpose: 'XU_500' });
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await prisma.user.update({ where: { id: ghost.id }, data: { emailVerifiedAt: null, createdAt: old } });

    await expect(app.get(AuthMaintenanceTask).cleanup()).resolves.toMatchObject({ unverifiedAccounts: expect.any(Number) });
    expect(await prisma.user.findUnique({ where: { id: ghost.id } })).not.toBeNull();
  });

  it('refuses to delete yourself', async () => {
    await as(admin).delete(`/api/users/${admin.id}`).expect(400);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).toMatchObject({ anonymizedAt: null });
  });
});
