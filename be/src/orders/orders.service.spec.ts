import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, PrintShop, PrintShopStatus, Role } from '@prisma/client';
import type { PrismaService } from '../shared/prisma';
import { PrintShopsService } from '../print-shops';
import { canTransition, roleMaySet } from './order-status';
import { OrdersService, newOrderCode } from './orders.service';

const PROJECT = {
  id: 'proj-123',
  title: 'Hộp Quà Cao Cấp',
  templateId: 'tuck-top',
  dimensions: { length: 80, width: 80, height: 95, paperThickness: 0.4 },
  version: 3,
  formulaVersion: 3,
};

const NOW = new Date('2026-10-30T03:00:00Z');

function shopRow(over: Partial<PrintShop> & Pick<PrintShop, 'id' | 'name' | 'provinceCode' | 'latitude' | 'longitude'>): PrintShop {
  return {
    legalName: null,
    taxCode: null,
    city: over.name,
    address: 'x',
    sheetLabel: 'B1 · 1020 × 720 mm',
    maxSheetWidthMm: 1020,
    maxSheetHeightMm: 720,
    services: [],
    methods: ['digital'],
    papers: ['ivory'],
    finishes: [],
    windowPatching: false,
    minQuantity: 1,
    maxQuantity: 20000,
    leadTimeLabel: '3–5 ngày',
    leadTimeDays: 3,
    sampleLeadTimeDays: 2,
    dailyCapacity: 10,
    serviceProvinces: [],
    status: PrintShopStatus.ACTIVE,
    pausedUntil: null,
    probationUntil: null,
    rating: 4.8,
    completedOrders: 500,
    contactEmail: 'shop@example.vn',
    phone: '028 0000 0000',
    zalo: null,
    platformFeeBps: 1500,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  };
}

/** Like the partners the migration seeds (20261120000100_print_partners); Hà Thành on a 10 % contract. */
const SHOPS: PrintShop[] = [
  shopRow({ id: 'ps-sg-01', name: 'In Bao Bì Sài Gòn Xanh', provinceCode: 'ho-chi-minh', latitude: 10.807, longitude: 106.618, rating: 4.9, completedOrders: 1420, sampleLeadTimeDays: 1 }),
  shopRow({ id: 'ps-hn-02', name: 'Hộp Giấy Hà Thành', provinceCode: 'ha-noi', latitude: 21.0, longitude: 105.873, platformFeeBps: 1000 }),
  shopRow({ id: 'ps-dn-03', name: 'Kraft Đà Nẵng CNC', provinceCode: 'da-nang', latitude: 16.073, longitude: 108.15, maxSheetWidthMm: 720, maxSheetHeightMm: 520, maxQuantity: 1000, rating: 4.7, completedOrders: 560 }),
  shopRow({ id: 'ps-ct-04', name: 'Xưởng In Mộc Cần Thơ', provinceCode: 'can-tho', latitude: 10.09, longitude: 105.72, status: PrintShopStatus.REVIEW }),
];

/** The row Prisma would return for `order.create({ data, include: { items } })`. */
function rowFrom(data: Prisma.OrderCreateInput) {
  const lines = [data.items!.create].flat() as Prisma.OrderItemCreateWithoutOrderInput[];
  const now = new Date('2026-10-30T03:00:00Z');
  return {
    id: '0192f0a0-0000-7000-8000-000000000001',
    orderCode: data.orderCode,
    userId: (data.user.connect as { id: string }).id,
    printShopId: (data.printShop.connect as { id: string }).id,
    printShop: SHOPS.find((s) => s.id === (data.printShop.connect as { id: string }).id) ?? null,
    recipientProvince: data.recipientProvince ?? null,
    platformFeeBps: data.platformFeeBps ?? 1500,
    platformFeeVnd: data.platformFeeVnd ?? 0,
    shopPayableVnd: data.shopPayableVnd ?? 0,
    discountVnd: 0,
    promoCode: null,
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
    items: lines.map((item, index) => ({
      id: `item-${index + 1}`,
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
    })),
  };
}

describe('OrdersService', () => {
  let prisma: {
    packagingProject: { findMany: jest.Mock };
    order: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock; updateMany: jest.Mock; findUniqueOrThrow: jest.Mock; groupBy: jest.Mock };
    printShop: { findMany: jest.Mock; findUnique: jest.Mock };
    ledgerEntry: { createMany: jest.Mock };
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
      packagingProject: { findMany: jest.fn().mockResolvedValue([PROJECT]) },
      order: {
        create: jest.fn(async ({ data }: { data: Prisma.OrderCreateInput }) => rowFrom(data)),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      printShop: {
        findMany: jest.fn(async ({ where }: { where?: { status?: { not?: PrintShopStatus } } } = {}) =>
          SHOPS.filter((s) => !where?.status?.not || s.status !== where.status.not),
        ),
        findUnique: jest.fn(async ({ where }: { where: { id: string } }) => SHOPS.find((s) => s.id === where.id) ?? null),
      },
      ledgerEntry: { createMany: jest.fn() },
      orderStatusHistory: { create: jest.fn() },
      printShopMember: { findUnique: jest.fn().mockResolvedValue({ printShopId: 'ps-sg-01' }) },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((run: (tx: typeof prisma) => unknown) => run(prisma));
    service = new OrdersService(prisma as unknown as PrismaService, new PrintShopsService(prisma as unknown as PrismaService));
  });

  describe('createSampleOrder', () => {
    it('stores the order with its item, first history row and price, waiting for payment', async () => {
      const order = await service.createSampleOrder('user-1', { ...base, phone: '0912345678' });

      expect(order.orderCode).toMatch(/^WF-\d{4}-\d{6}$/);
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
      expect(prisma.packagingProject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ['proj-123'] }, userId: 'user-1', status: { not: 'DELETED' } } }),
      );
      const { data } = prisma.order.create.mock.calls[0][0];
      expect(data.history).toEqual({ create: { toStatus: 'PENDING_PAYMENT', changedById: 'user-1' } });
      expect([data.items.create].flat()[0]).toMatchObject({ dimensions: PROJECT.dimensions, unitPriceVnd: 49_000, lineTotalVnd: 49_000 });
    });

    it('puts several designs in one order with one bill', async () => {
      const second = { ...PROJECT, id: 'proj-456', title: 'Hộp Thứ Hai', version: 2 };
      prisma.packagingProject.findMany.mockResolvedValueOnce([PROJECT, second]);

      const order = await service.createSampleBundle('user-1', {
        ...base,
        phone: '0912345678',
        items: [{ projectId: 'proj-123' }, { projectId: 'proj-456', quantity: 2 }],
      });

      expect(prisma.order.create).toHaveBeenCalledTimes(1);
      const { data } = prisma.order.create.mock.calls[0][0];
      expect(data.items.create).toHaveLength(2);
      // 49.000 + (49.000 + 25.000) = 123.000, one total for the whole bill
      expect(order.sampleFeeVnd).toBe(123_000);
      expect(order.totalVnd).toBe(123_000);
      expect(order.quantity).toBe(3);
      expect(order.items.map((line) => line.projectId)).toEqual(['proj-123', 'proj-456']);
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
      prisma.packagingProject.findMany.mockResolvedValueOnce([]);
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

    it('sends an order without a chosen shop to the recommended one near the recipient', async () => {
      const order = await service.createSampleOrder('user-1', { ...base, phone: '0912345678', recipientProvince: 'ha-noi' });
      expect(order.printShopId).toBe('ps-hn-02');
      expect(order.recipientProvince).toBe('ha-noi');
    });

    it("fixes the platform fee at the shop's contract rate when ordered (docs/19 BR-A3)", async () => {
      await service.createSampleOrder('user-1', { ...base, phone: '0912345678', quantity: 2 });
      // Sài Gòn Xanh, 15 % of 74.000 = 11.100
      expect(prisma.order.create.mock.calls[0][0].data).toMatchObject({
        totalVnd: 74_000,
        platformFeeBps: 1500,
        platformFeeVnd: 11_100,
        shopPayableVnd: 62_900,
      });

      await service.createSampleOrder('user-1', { ...base, phone: '0912345678', printShopId: 'ps-hn-02' });
      // Hà Thành, 10 % of 49.000 = 4.900
      expect(prisma.order.create.mock.calls[1][0].data).toMatchObject({ platformFeeBps: 1000, platformFeeVnd: 4_900, shopPayableVnd: 44_100 });
    });

    it('keeps the platform fee out of the customer view', async () => {
      const order = await service.createSampleOrder('user-1', { ...base, phone: '0912345678' });
      expect(order).not.toHaveProperty('platformFeeVnd');
      expect(order).not.toHaveProperty('shopPayableVnd');
    });

    it('hides the shop phone until the shop has taken the order (docs/19 G.4)', async () => {
      const order = await service.createSampleOrder('user-1', { ...base, phone: '0912345678' });
      expect(order.partnerShop.contactPhone).toBe('');
    });

    it('rejects a shop whose sheet is too small for the dieline', async () => {
      prisma.packagingProject.findMany.mockResolvedValue([{ ...PROJECT, dimensions: { length: 300, width: 200, height: 150, paperThickness: 0.4 } }]);
      await expect(
        service.createSampleOrder('user-1', { ...base, phone: '0912345678', printShopId: 'ps-dn-03' }),
      ).rejects.toMatchObject({ response: { code: 'PRINT_SHOP_UNAVAILABLE', reasons: ['sheet_size'] } });
    });

    it('answers NO_PRINT_SHOP with the reasons when no shop can print the order', async () => {
      prisma.printShop.findMany.mockResolvedValueOnce(SHOPS.map((s) => ({ ...s, status: PrintShopStatus.PAUSED })));
      await expect(service.createSampleOrder('user-1', { ...base, phone: '0912345678' })).rejects.toMatchObject({
        response: { code: 'NO_PRINT_SHOP', excluded: expect.arrayContaining([expect.objectContaining({ id: 'ps-sg-01', reasons: ['not_active'] })]) },
      });
      expect(prisma.order.create).not.toHaveBeenCalled();
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
      expect(order.orderCode).toMatch(/^WF-\d{4}-\d{6}$/);
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
          printShop: { connect: { id: 'ps-sg-01' } },
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

    it('posts the payment to the ledger when the order is paid, with a key that stops a second post', async () => {
      prisma.order.findUniqueOrThrow.mockImplementationOnce(async () => ({
        ...(await prisma.order.findUniqueOrThrow.getMockImplementation()!()),
        status: OrderStatus.PAID,
        paymentId: 'pay-1',
        platformFeeVnd: 7_400,
        shopPayableVnd: 41_600,
      }));
      await service.markPaid('order-1', 'pay-1', prisma as unknown as Prisma.TransactionClient);
      expect(prisma.ledgerEntry.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ key: expect.stringMatching(/:CUSTOMER_PAYMENT$/), type: 'CUSTOMER_PAYMENT', amountVnd: 49_000, paymentId: 'pay-1', printShopId: 'ps-sg-01' })],
        skipDuplicates: true,
      });
    });

    it('books the platform fee and the shop share on delivery', async () => {
      prisma.order.findFirst.mockResolvedValueOnce({ status: OrderStatus.SHIPPED });
      prisma.order.findUniqueOrThrow.mockImplementationOnce(async () => ({
        ...(await prisma.order.findUniqueOrThrow.getMockImplementation()!()),
        status: OrderStatus.DELIVERED,
        platformFeeVnd: 7_400,
        shopPayableVnd: 41_600,
      }));
      const order = await service.changeStatus('order-1', shopStaff, { status: OrderStatus.DELIVERED });
      expect(prisma.ledgerEntry.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ type: 'PLATFORM_FEE', amountVnd: 7_400 }),
          expect.objectContaining({ type: 'SHOP_PAYABLE', amountVnd: 41_600 }),
        ],
        skipDuplicates: true,
      });
      // Staff see the split; the shop's phone is shown once the shop works on the order.
      expect(order).toMatchObject({ platformFeeVnd: 7_400, shopPayableVnd: 41_600 });
    });

    it('posts nothing to the ledger for a step without money', async () => {
      prisma.order.findFirst.mockResolvedValueOnce({ status: OrderStatus.PAID });
      await service.changeStatus('order-1', shopStaff, { status: OrderStatus.IN_PRODUCTION });
      expect(prisma.ledgerEntry.createMany).not.toHaveBeenCalled();
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

describe('newOrderCode', () => {
  it('is WF-<year in Vietnam>-<6 digits>, zero-padded', () => {
    // 2026-12-31 18:00 UTC is already 2027 in Vietnam (UTC+7).
    for (let i = 0; i < 200; i++) expect(newOrderCode(new Date('2026-12-31T18:00:00Z'))).toMatch(/^WF-2027-\d{6}$/);
    expect(newOrderCode(new Date('2026-06-01T00:00:00Z'))).toMatch(/^WF-2026-\d{6}$/);
  });
});
