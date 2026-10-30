import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, Role } from '@prisma/client';
import type { PrismaService } from '../shared/prisma';
import { PrintShopsService } from '../print-shops';
import { canTransition, roleMaySet } from './order-status';
import { OrdersService } from './orders.service';

const PROJECT = {
  id: 'proj-123',
  title: 'Hộp Quà Cao Cấp',
  templateId: 'tuck-top',
  dimensions: { length: 80, width: 80, height: 95, paperThickness: 0.4 },
  version: 3,
};

/** The row Prisma would return for `order.create({ data, include: { items } })`. */
function rowFrom(data: Prisma.OrderCreateInput) {
  const item = data.items!.create as Prisma.OrderItemCreateWithoutOrderInput;
  const now = new Date('2026-10-30T03:00:00Z');
  return {
    id: '0192f0a0-0000-7000-8000-000000000001',
    orderCode: data.orderCode,
    userId: (data.user.connect as { id: string }).id,
    printShopId: data.printShopId,
    recipientName: data.recipientName,
    recipientPhone: data.recipientPhone,
    shippingAddress: data.shippingAddress,
    notes: data.notes ?? null,
    subtotalVnd: data.subtotalVnd,
    shippingVnd: data.shippingVnd ?? 0,
    totalVnd: data.totalVnd,
    status: OrderStatus.PENDING_PAYMENT,
    paymentId: null,
    paidAt: null,
    shippedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
    items: [
      {
        id: 'item-1',
        orderId: '0192f0a0-0000-7000-8000-000000000001',
        projectId: (item.project!.connect as { id: string }).id,
        projectVersion: item.projectVersion,
        projectTitle: item.projectTitle,
        structure: item.structure,
        dimensions: item.dimensions,
        paperStock: item.paperStock,
        quantity: item.quantity,
        unitPriceVnd: item.unitPriceVnd,
        lineTotalVnd: item.lineTotalVnd,
      },
    ],
  };
}

describe('OrdersService', () => {
  let prisma: {
    packagingProject: { findFirst: jest.Mock };
    order: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock; updateMany: jest.Mock; findUniqueOrThrow: jest.Mock };
    orderStatusHistory: { create: jest.Mock };
    printShopMember: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: OrdersService;

  const admin = { id: 'admin-1', email: 'admin@wrapfit.vn', role: Role.ADMIN };
  const shopStaff = { id: 'staff-1', email: 'xuong@sgx.vn', role: Role.PRINT_SHOP };
  const base = { projectId: 'proj-123', recipientName: 'Chị Linh', shippingAddress: '123 Nguyễn Huệ, Q.1, TP.HCM' };

  beforeEach(() => {
    prisma = {
      packagingProject: { findFirst: jest.fn().mockResolvedValue(PROJECT) },
      order: {
        create: jest.fn(async ({ data }: { data: Prisma.OrderCreateInput }) => rowFrom(data)),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn(),
      },
      orderStatusHistory: { create: jest.fn() },
      printShopMember: { findUnique: jest.fn().mockResolvedValue({ printShopId: 'ps-sg-01' }) },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((run: (tx: typeof prisma) => unknown) => run(prisma));
    service = new OrdersService(prisma as unknown as PrismaService, new PrintShopsService());
  });

  describe('createSampleOrder', () => {
    it('stores the order with its item, first history row and price, waiting for payment', async () => {
      const order = await service.createSampleOrder('user-1', { ...base, phone: '0912345678' });

      expect(order.orderCode).toMatch(/^WF-\d{4}-\d{4}$/);
      expect(order).toMatchObject({
        recipientName: 'Chị Linh',
        phone: '0912345678',
        recipientPhone: '0912345678',
        sampleFeeVnd: 49_000,
        totalVnd: 49_000,
        status: 'pending_payment',
        orderStatus: 'PENDING_PAYMENT',
        printShopId: 'ps-sg-01',
        printShopName: 'In Bao Bì Sài Gòn Xanh',
        projectTitle: 'Hộp Quà Cao Cấp',
        projectVersion: 3,
        structure: 'tuck-top',
        quantity: 1,
      });

      // Owner-only lookup that skips the trash.
      expect(prisma.packagingProject.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'proj-123', userId: 'user-1', status: { not: 'DELETED' } } }),
      );
      const { data } = prisma.order.create.mock.calls[0][0];
      expect(data.history).toEqual({ create: { toStatus: 'PENDING_PAYMENT', changedById: 'user-1' } });
      expect(data.items.create).toMatchObject({ dimensions: PROJECT.dimensions, unitPriceVnd: 49_000, lineTotalVnd: 49_000 });
    });

    it('accepts the recipientPhone alias and prices extra boxes at 25.000đ', async () => {
      const order = await service.createSampleOrder('user-1', {
        ...base,
        recipientPhone: '0987654321',
        printShopId: 'ps-dn-03',
        quantity: 3,
      });

      expect(order.phone).toBe('0987654321');
      // 49.000 + 2 * 25.000 = 99.000
      expect(order.sampleFeeVnd).toBe(99_000);
      expect(order.totalVnd).toBe(99_000);
      expect(order.printShopName).toBe('Kraft Đà Nẵng CNC');
    });

    it('requires a phone number', async () => {
      await expect(service.createSampleOrder('user-1', base)).rejects.toThrow(BadRequestException);
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('answers 404 for a project that is missing or belongs to someone else', async () => {
      prisma.packagingProject.findFirst.mockResolvedValueOnce(null);
      await expect(service.createSampleOrder('user-2', { ...base, phone: '0912345678' })).rejects.toThrow(NotFoundException);
    });

    it('rejects a shop that does not take orders', async () => {
      await expect(
        service.createSampleOrder('user-1', { ...base, phone: '0912345678', printShopId: 'ps-ct-04' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createSampleOrder('user-1', { ...base, phone: '0912345678', printShopId: 'ps-unknown' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('draws a new order code when the first one is taken', async () => {
      const taken = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['order_code'] },
      });
      prisma.order.create.mockRejectedValueOnce(taken);

      const order = await service.createSampleOrder('user-1', { ...base, phone: '0912345678' });
      expect(prisma.order.create).toHaveBeenCalledTimes(2);
      expect(order.orderCode).toMatch(/^WF-\d{4}-\d{4}$/);
    });
  });

  describe('reading', () => {
    it('lists only the orders of the user, newest first', async () => {
      await service.listUserOrders('user-2');
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-2' }, orderBy: { createdAt: 'desc' } }),
      );
    });

    it("answers 404 for someone else's order", async () => {
      prisma.order.findFirst.mockResolvedValueOnce(null);
      await expect(service.getOrder('order-1', 'user-3')).rejects.toThrow(NotFoundException);
      expect(prisma.order.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'order-1', userId: 'user-3' } }));
    });

    it('limits a print shop account to its own shop, whatever filter it sends', async () => {
      await service.listForStaff(shopStaff, { printShopId: 'ps-hn-02', limit: 50 });
      expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { printShopId: 'ps-sg-01', status: undefined } }));

      await service.listForStaff(admin, { printShopId: 'ps-hn-02', status: OrderStatus.PAID, limit: 10 });
      expect(prisma.order.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { printShopId: 'ps-hn-02', status: 'PAID' }, take: 10 }),
      );
    });

    it('refuses a print shop account linked to no shop', async () => {
      prisma.printShopMember.findUnique.mockResolvedValueOnce(null);
      await expect(service.listForStaff(shopStaff, { limit: 50 })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('changeStatus', () => {
    beforeEach(() => {
      prisma.order.findUniqueOrThrow.mockImplementation(async () => ({
        ...rowFrom({
          orderCode: 'WF-2026-0001',
          user: { connect: { id: 'user-1' } },
          printShopId: 'ps-sg-01',
          recipientName: 'Chị Linh',
          recipientPhone: '0912345678',
          shippingAddress: 'x',
          subtotalVnd: 49_000,
          totalVnd: 49_000,
          items: { create: { project: { connect: { id: 'proj-123' } }, projectVersion: 1, projectTitle: 't', structure: 'tuck-top', dimensions: {}, paperStock: 'p', quantity: 1, unitPriceVnd: 49_000, lineTotalVnd: 49_000 } },
        }),
        status: OrderStatus.IN_PRODUCTION,
      }));
    });

    it('moves a paid order into production and logs who did it', async () => {
      prisma.order.findFirst.mockResolvedValueOnce({ status: OrderStatus.PAID });

      const order = await service.changeStatus('order-1', shopStaff, { status: OrderStatus.IN_PRODUCTION, note: ' Đã nhận file ' });

      expect(order.orderStatus).toBe('IN_PRODUCTION');
      expect(prisma.order.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'order-1', printShopId: 'ps-sg-01' } }));
      expect(prisma.order.updateMany).toHaveBeenCalledWith({ where: { id: 'order-1', status: 'PAID' }, data: { status: 'IN_PRODUCTION' } });
      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: { orderId: 'order-1', fromStatus: 'PAID', toStatus: 'IN_PRODUCTION', changedById: 'staff-1', note: 'Đã nhận file' },
      });
    });

    it('stamps the time the order enters a status (here: paid)', async () => {
      prisma.order.findFirst.mockResolvedValueOnce({ status: OrderStatus.PENDING_PAYMENT });
      await service.changeStatus('order-1', admin, { status: OrderStatus.PAID });
      expect(prisma.order.updateMany.mock.calls[0][0].data).toEqual({ status: 'PAID', paidAt: expect.any(Date) });
    });

    it('answers 409 for a step outside the lifecycle', async () => {
      prisma.order.findFirst.mockResolvedValueOnce({ status: OrderStatus.PENDING_PAYMENT });
      await expect(service.changeStatus('order-1', admin, { status: OrderStatus.SHIPPED })).rejects.toThrow(ConflictException);
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('answers 409 when the order changed in the meantime', async () => {
      prisma.order.findFirst.mockResolvedValueOnce({ status: OrderStatus.PAID });
      prisma.order.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.changeStatus('order-1', admin, { status: OrderStatus.CANCELLED })).rejects.toThrow(ConflictException);
      expect(prisma.orderStatusHistory.create).not.toHaveBeenCalled();
    });

    it("hides another shop's order from a print shop account", async () => {
      prisma.order.findFirst.mockResolvedValueOnce(null);
      await expect(service.changeStatus('order-1', shopStaff, { status: OrderStatus.SHIPPED })).rejects.toThrow(NotFoundException);
    });

    it('keeps payment and cancelling away from print shop accounts', async () => {
      prisma.order.findFirst.mockResolvedValueOnce({ status: OrderStatus.PENDING_PAYMENT });
      await expect(service.changeStatus('order-1', shopStaff, { status: OrderStatus.PAID })).rejects.toThrow(ForbiddenException);
    });
  });
});

describe('order lifecycle', () => {
  it('only allows forward steps, and cancelling before printing', () => {
    expect(canTransition('PENDING_PAYMENT', 'PAID')).toBe(true);
    expect(canTransition('PAID', 'IN_PRODUCTION')).toBe(true);
    expect(canTransition('IN_PRODUCTION', 'SHIPPED')).toBe(true);
    expect(canTransition('SHIPPED', 'DELIVERED')).toBe(true);
    expect(canTransition('PAID', 'CANCELLED')).toBe(true);

    expect(canTransition('PENDING_PAYMENT', 'IN_PRODUCTION')).toBe(false);
    expect(canTransition('IN_PRODUCTION', 'CANCELLED')).toBe(false);
    expect(canTransition('DELIVERED', 'SHIPPED')).toBe(false);
    expect(canTransition('CANCELLED', 'PAID')).toBe(false);
    expect(canTransition('PAID', 'PAID')).toBe(false);
  });

  it('gives print shops the production steps only', () => {
    expect(roleMaySet('PRINT_SHOP', 'IN_PRODUCTION')).toBe(true);
    expect(roleMaySet('PRINT_SHOP', 'DELIVERED')).toBe(true);
    expect(roleMaySet('PRINT_SHOP', 'PAID')).toBe(false);
    expect(roleMaySet('PRINT_SHOP', 'CANCELLED')).toBe(false);
    expect(roleMaySet('ADMIN', 'CANCELLED')).toBe(true);
    expect(roleMaySet('MAKER', 'IN_PRODUCTION')).toBe(false);
  });
});
