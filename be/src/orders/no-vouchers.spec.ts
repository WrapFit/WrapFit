import { BadRequestException, HttpException, ValidationPipe } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import type { PrismaService } from '../shared/prisma';
import { PrintShopsService } from '../print-shops';
import { CreateSampleBundleDto } from './dto/create-sample-bundle.dto';
import { CreateSampleOrderDto } from './dto/create-sample-order.dto';
import { ORDER_NOT_PAYABLE, OrdersService, sampleFeeVnd } from './orders.service';

/**
 * Vouchers were removed (docs-old/25 item 1): no code lowers the price of an order, no order is created PAID, and an order
 * becomes PAID only through a payment that finds it still PENDING_PAYMENT under a row lock.
 */
describe('sample orders without vouchers', () => {
  const projects = [1, 2].map((n) => ({
    id: `0192f0a0-0000-7000-8000-00000000000${n}`,
    title: `Hộp ${n}`,
    templateId: 'tuck-top',
    dimensions: { length: 80, width: 80, height: 95 },
    version: 1,
  }));
  const recipient = { recipientName: 'Chị Linh', phone: '0912345678', shippingAddress: '123 Nguyễn Huệ, Q.1' };

  const setup = () => {
    const create = jest.fn(async ({ data }: { data: Prisma.OrderCreateInput }) => ({
      ...data,
      id: 'order-1',
      userId: 'user-1',
      status: data.status ?? OrderStatus.PENDING_PAYMENT,
      discountVnd: data.discountVnd ?? 0,
      promoCode: data.promoCode ?? null,
      paymentId: null,
      paidAt: data.paidAt ?? null,
      shippedAt: null,
      deliveredAt: null,
      cancelledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
    }));
    const prisma = {
      packagingProject: { findMany: jest.fn().mockResolvedValue(projects) },
      order: { create },
    } as unknown as PrismaService;
    return { create, service: new OrdersService(prisma, new PrintShopsService()) };
  };

  it.each([
    ['one box', [{ projectId: projects[0].id, quantity: 1 }], sampleFeeVnd(1)],
    ['two designs', [{ projectId: projects[0].id, quantity: 3 }, { projectId: projects[1].id }], sampleFeeVnd(3) + sampleFeeVnd(1)],
  ])('charges the full fee for %s and waits for payment', async (_name, items, fee) => {
    const { create, service } = setup();

    const order = await service.createSampleBundle('user-1', { ...recipient, items });

    const data = create.mock.calls[0][0].data as Prisma.OrderCreateInput;
    expect(data).toMatchObject({ subtotalVnd: fee, totalVnd: fee, history: { create: { toStatus: OrderStatus.PENDING_PAYMENT } } });
    expect(data.status).toBeUndefined();
    expect(data.paidAt).toBeUndefined();
    expect(data.discountVnd).toBeUndefined();
    expect(data.promoCode).toBeUndefined();
    expect(order).toMatchObject({ orderStatus: 'PENDING_PAYMENT', totalVnd: fee, discountVnd: 0, promoCode: null, paidAt: null });
    expect(order.totalVnd).toBeGreaterThan(0);
  });

  describe('a body that still sends promoCode', () => {
    // Same options as the global pipe in app.middleware.ts.
    const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
    const validate = (metatype: new () => object, value: object) => pipe.transform(value, { type: 'body', metatype });

    it.each(['WORKSHOPTET', 'WRAPFIT10', 'ANYTHING'])('gets 400 for %s, on the single and the bundle route', async (code) => {
      const single = { ...recipient, projectId: projects[0].id, promoCode: code };
      const bundle = { ...recipient, items: [{ projectId: projects[0].id }], promoCode: code };

      for (const [metatype, value] of [
        [CreateSampleOrderDto, single],
        [CreateSampleBundleDto, bundle],
      ] as const) {
        const error = await validate(metatype, value).catch((e: unknown) => e);
        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).getResponse()).toMatchObject({
          message: ['property promoCode should not exist'],
        });
      }
    });

    it('passes without it', async () => {
      await expect(validate(CreateSampleOrderDto, { ...recipient, projectId: projects[0].id })).resolves.toBeInstanceOf(
        CreateSampleOrderDto,
      );
    });
  });

  describe('lockPayable', () => {
    const lockWith = (rows: { status: OrderStatus }[]) => {
      const tx = { $queryRaw: jest.fn().mockResolvedValue(rows) };
      return { tx, run: () => setup().service.lockPayable('order-1', tx as unknown as Prisma.TransactionClient) };
    };

    it('locks the order row and passes while it waits for payment', async () => {
      const { tx, run } = lockWith([{ status: OrderStatus.PENDING_PAYMENT }]);
      await expect(run()).resolves.toBeUndefined();
      const sql = (tx.$queryRaw.mock.calls[0][0] as string[]).join('');
      expect(sql).toContain('FROM orders');
      expect(sql).toContain('FOR UPDATE');
    });

    it.each([[OrderStatus.CANCELLED], [OrderStatus.PAID], [OrderStatus.IN_PRODUCTION]])(
      'answers 409 ORDER_NOT_PAYABLE for a %s order',
      async (status) => {
        const error = await lockWith([{ status }])
          .run()
          .catch((e: unknown) => e);
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(409);
        expect((error as HttpException).getResponse()).toMatchObject({ code: ORDER_NOT_PAYABLE });
      },
    );

    it('answers 409 ORDER_NOT_PAYABLE for a missing order', async () => {
      await expect(lockWith([]).run()).rejects.toMatchObject({ response: { code: ORDER_NOT_PAYABLE } });
    });
  });
});
