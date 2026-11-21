import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, PrintShop, PrintShopMemberRole, PrintShopStatus, Role } from '@prisma/client';
import type { NotificationsService } from '../notifications/notifications.service';
import type { PrismaService } from '../shared/prisma';
import type { StorageService } from '../storage/storage.service';
import { PrintShopsService } from '../print-shops';
import { OrderFollowUpTask } from './order-follow-up.task';
import { OrderMessagesService } from './order-messages.service';
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
const ORDER_ID = '0192f0a0-0000-7000-8000-000000000001';

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

/** The row Prisma would return for `order.create({ data, include })`. */
function rowFrom(data: Prisma.OrderCreateInput) {
  const lines = [data.items!.create].flat() as Prisma.OrderItemCreateWithoutOrderInput[];
  const shopId = (data.printShop.connect as { id: string }).id;
  return {
    id: ORDER_ID,
    orderCode: data.orderCode,
    userId: (data.user.connect as { id: string }).id,
    printShopId: shopId,
    printShop: SHOPS.find((s) => s.id === shopId) ?? null,
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
    status: OrderStatus.PENDING_PAYMENT as OrderStatus,
    paymentId: null as string | null,
    paidAt: null,
    shippedAt: null as Date | null,
    deliveredAt: null as Date | null,
    cancelledAt: null as Date | null,
    acceptDeadline: null as Date | null,
    acceptedAt: null as Date | null,
    rejectedAt: null as Date | null,
    rejectReason: null as string | null,
    adminAlertedAt: null,
    shopNotifiedAt: null,
    estimatedDelivery: (data.estimatedDelivery as string | undefined) ?? null,
    carrier: null as string | null,
    trackingCode: null as string | null,
    customerReadAt: null,
    shopReadAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    history: [] as { fromStatus: OrderStatus | null; toStatus: OrderStatus; note: string | null; createdAt: Date }[],
    items: lines.map((item, index) => ({
      id: `item-${index + 1}`,
      orderId: ORDER_ID,
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

type Row = ReturnType<typeof rowFrom>;

/** A stored order of user-1 at Sài Gòn Xanh, 49.000đ. */
const stored = (over: Partial<Row> = {}): Row => ({
  ...rowFrom({
    orderCode: 'WF-2026-000001',
    user: { connect: { id: 'user-1' } },
    printShop: { connect: { id: 'ps-sg-01' } },
    recipientName: 'Chị Linh',
    recipientPhone: '0912345678',
    shippingAddress: '12 Phố Huế',
    recipientProvince: 'ha-noi',
    subtotalVnd: 49_000,
    totalVnd: 49_000,
    platformFeeVnd: 7_400,
    shopPayableVnd: 41_600,
    items: { create: { project: { connect: { id: 'proj-123' } }, projectVersion: 3, projectTitle: 'Hộp', structure: 'tuck-top', dimensions: PROJECT.dimensions, paperStock: 'p', quantity: 1, unitPriceVnd: 49_000, lineTotalVnd: 49_000 } },
  }),
  ...over,
});

const customer = { id: 'user-1', email: 'linh@example.vn', role: Role.MAKER };
const stranger = { id: 'user-3', email: 'x@example.vn', role: Role.MAKER };
const admin = { id: 'admin-1', email: 'admin@wrapfit.vn', role: Role.ADMIN };
const shopStaff = { id: 'staff-1', email: 'xuong@sgx.vn', role: Role.PRINT_SHOP };

function setup() {
  let current: Row = stored();
  const prisma = {
    packagingProject: { findMany: jest.fn().mockResolvedValue([PROJECT]) },
    order: {
      create: jest.fn(async ({ data }: { data: Prisma.OrderCreateInput }) => rowFrom(data)),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(async () => current),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      findUniqueOrThrow: jest.fn(async () => current),
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
    orderMessage: { create: jest.fn(async ({ data }: { data: object }) => ({ id: 'msg-1', createdAt: NOW, ...data })), findMany: jest.fn().mockResolvedValue([]) },
    exportJob: { findMany: jest.fn().mockResolvedValue([]) },
    printShopMember: { findUnique: jest.fn().mockResolvedValue({ printShopId: 'ps-sg-01', role: PrintShopMemberRole.OWNER }) },
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((run: (tx: typeof prisma) => unknown) => run(prisma));
  const notifications = {
    notifyOrder: jest.fn(),
    shopAccounts: jest.fn().mockResolvedValue(['staff-1']),
    adminAccounts: jest.fn().mockResolvedValue(['admin-1']),
  };
  const storage = { presignDownload: jest.fn(async (key: string) => `https://files.test/${key}`) };
  const service = new OrdersService(
    prisma as unknown as PrismaService,
    new PrintShopsService(prisma as unknown as PrismaService),
    notifications as unknown as NotificationsService,
    storage as unknown as StorageService,
  );
  return {
    prisma,
    notifications,
    storage,
    service,
    /** What the order looks like on the next read. */
    set: (over: Partial<Row>) => (current = stored(over)),
  };
}

describe('OrdersService', () => {
  let t: ReturnType<typeof setup>;
  const base = { projectId: 'proj-123', recipientName: 'Chị Linh', shippingAddress: '123 Nguyễn Huệ, Q.1, TP.HCM' };

  beforeEach(() => {
    t = setup();
  });

  describe('createSampleOrder', () => {
    it('stores the order with its item, first history row, price and delivery date, waiting for payment', async () => {
      const order = await t.service.createSampleOrder('user-1', { ...base, phone: '0912345678' });

      expect(order.orderCode).toMatch(/^WF-\d{4}-\d{6}$/);
      expect(order).toMatchObject({
        recipientName: 'Chị Linh',
        phone: '0912345678',
        sampleFeeVnd: 49_000,
        totalVnd: 49_000,
        orderStatus: 'PENDING_PAYMENT',
        printShopId: 'ps-sg-01',
        printShopName: 'In Bao Bì Sài Gòn Xanh',
        projectVersion: 3,
        quantity: 1,
        acceptedAt: null,
        unreadMessages: 0,
      });
      expect(order.estimatedDelivery).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(t.prisma.packagingProject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ['proj-123'] }, userId: 'user-1', status: { not: 'DELETED' } } }),
      );
      const { data } = t.prisma.order.create.mock.calls[0][0];
      expect(data.history).toEqual({ create: { toStatus: 'PENDING_PAYMENT', changedById: 'user-1' } });
    });

    it('puts several designs in one order with one bill', async () => {
      t.prisma.packagingProject.findMany.mockResolvedValueOnce([PROJECT, { ...PROJECT, id: 'proj-456', version: 2 }]);
      const order = await t.service.createSampleBundle('user-1', {
        ...base,
        phone: '0912345678',
        items: [{ projectId: 'proj-123' }, { projectId: 'proj-456', quantity: 2 }],
      });
      expect(order.totalVnd).toBe(123_000);
      expect(order.quantity).toBe(3);
    });

    it('requires a phone number', async () => {
      await expect(t.service.createSampleOrder('user-1', base)).rejects.toThrow(BadRequestException);
    });

    it('answers 404 for a project that is missing or belongs to someone else', async () => {
      t.prisma.packagingProject.findMany.mockResolvedValueOnce([]);
      await expect(t.service.createSampleOrder('user-2', { ...base, phone: '0912345678' })).rejects.toThrow(NotFoundException);
    });

    it('sends an order without a chosen shop to the recommended one near the recipient', async () => {
      const order = await t.service.createSampleOrder('user-1', { ...base, phone: '0912345678', recipientProvince: 'ha-noi' });
      expect(order.printShopId).toBe('ps-hn-02');
    });

    it("fixes the platform fee at the shop's contract rate when ordered (docs/19 BR-A3)", async () => {
      await t.service.createSampleOrder('user-1', { ...base, phone: '0912345678', quantity: 2 });
      expect(t.prisma.order.create.mock.calls[0][0].data).toMatchObject({ totalVnd: 74_000, platformFeeBps: 1500, platformFeeVnd: 11_100, shopPayableVnd: 62_900 });
      await t.service.createSampleOrder('user-1', { ...base, phone: '0912345678', printShopId: 'ps-hn-02' });
      expect(t.prisma.order.create.mock.calls[1][0].data).toMatchObject({ platformFeeBps: 1000, platformFeeVnd: 4_900, shopPayableVnd: 44_100 });
    });

    it('keeps the platform fee and the shop phone out of the customer view', async () => {
      const order = await t.service.createSampleOrder('user-1', { ...base, phone: '0912345678' });
      expect(order).not.toHaveProperty('platformFeeVnd');
      expect(order.partnerShop.contactPhone).toBe('');
    });

    it('rejects a shop under review, unknown, or whose sheet is too small', async () => {
      await expect(t.service.createSampleOrder('user-1', { ...base, phone: '0912345678', printShopId: 'ps-ct-04' })).rejects.toThrow(BadRequestException);
      await expect(t.service.createSampleOrder('user-1', { ...base, phone: '0912345678', printShopId: 'ps-unknown' })).rejects.toThrow(BadRequestException);
      t.prisma.packagingProject.findMany.mockResolvedValue([{ ...PROJECT, dimensions: { length: 300, width: 200, height: 150, paperThickness: 0.4 } }]);
      await expect(t.service.createSampleOrder('user-1', { ...base, phone: '0912345678', printShopId: 'ps-dn-03' })).rejects.toMatchObject({
        response: { code: 'PRINT_SHOP_UNAVAILABLE', reasons: ['sheet_size'] },
      });
    });

    it('answers NO_PRINT_SHOP with the reasons when no shop can print the order', async () => {
      t.prisma.printShop.findMany.mockResolvedValueOnce(SHOPS.map((s) => ({ ...s, status: PrintShopStatus.PAUSED })));
      await expect(t.service.createSampleOrder('user-1', { ...base, phone: '0912345678' })).rejects.toMatchObject({ response: { code: 'NO_PRINT_SHOP' } });
    });

    it('draws a new order code when the first one is taken', async () => {
      t.prisma.order.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test', meta: { target: ['order_code'] } }),
      );
      await t.service.createSampleOrder('user-1', { ...base, phone: '0912345678' });
      expect(t.prisma.order.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('who sees what (docs/19 G.4)', () => {
    it('answers 404 to anyone but the owner, the shop of the order and admins', async () => {
      await expect(t.service.getOrder(ORDER_ID, stranger)).rejects.toThrow(NotFoundException);
      t.prisma.printShopMember.findUnique.mockResolvedValueOnce({ printShopId: 'ps-hn-02', role: 'OWNER' });
      await expect(t.service.getOrder(ORDER_ID, shopStaff)).rejects.toThrow(NotFoundException);
      await expect(t.service.getOrder(ORDER_ID, customer)).resolves.toMatchObject({ id: ORDER_ID });
      await expect(t.service.getOrder(ORDER_ID, admin)).resolves.toMatchObject({ platformFeeVnd: 7_400 });
    });

    it("hides the recipient's phone and address from the shop until it takes the order", async () => {
      t.set({ status: OrderStatus.PAID });
      expect(await t.service.getOrder(ORDER_ID, shopStaff)).toMatchObject({ recipientPhone: '', shippingAddress: '', recipientProvince: 'ha-noi' });
      t.set({ status: OrderStatus.PAID, acceptedAt: NOW });
      expect(await t.service.getOrder(ORDER_ID, shopStaff)).toMatchObject({ recipientPhone: '0912345678', shippingAddress: '12 Phố Huế' });
    });

    it("shows the shop's phone to the customer once the shop took the order", async () => {
      t.set({ status: OrderStatus.PAID });
      expect((await t.service.getOrder(ORDER_ID, customer)).partnerShop.contactPhone).toBe('');
      t.set({ status: OrderStatus.PAID, acceptedAt: NOW });
      expect((await t.service.getOrder(ORDER_ID, customer)).partnerShop.contactPhone).toBe('028 0000 0000');
    });

    it('shows the money split to the shop owner, not to its staff, and the refusal reason to staff only', async () => {
      t.set({ status: OrderStatus.PAID, rejectedAt: NOW, rejectReason: 'Hết giấy kraft' });
      expect(await t.service.getOrder(ORDER_ID, shopStaff)).toMatchObject({ platformFeeVnd: 7_400, rejectReason: 'Hết giấy kraft' });
      expect(await t.service.getOrder(ORDER_ID, customer)).not.toHaveProperty('rejectReason');
      t.prisma.printShopMember.findUnique.mockResolvedValueOnce({ printShopId: 'ps-sg-01', role: 'STAFF' });
      expect(await t.service.getOrder(ORDER_ID, shopStaff)).not.toHaveProperty('platformFeeVnd');
    });

    it('limits a print shop account to its own shop, whatever filter it sends', async () => {
      await t.service.listForStaff(shopStaff, { printShopId: 'ps-hn-02', limit: 50 });
      expect(t.prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { printShopId: 'ps-sg-01', status: undefined } }));
      t.prisma.printShopMember.findUnique.mockResolvedValueOnce(null);
      await expect(t.service.listForStaff(shopStaff, { limit: 50 })).rejects.toThrow(ForbiddenException);
    });

    it('counts unread messages of the other side', async () => {
      t.prisma.order.findMany.mockResolvedValueOnce([stored()]);
      t.prisma.$queryRaw.mockResolvedValueOnce([{ order_id: ORDER_ID, n: 2 }]);
      const [order] = await t.service.listUserOrders('user-1');
      expect(order.unreadMessages).toBe(2);
    });
  });

  describe('the shop takes, refuses, prints and ships (docs/19 G.5)', () => {
    it('takes a paid order and tells the customer', async () => {
      t.set({ status: OrderStatus.PAID });
      await t.service.accept(ORDER_ID, shopStaff);
      expect(t.prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: ORDER_ID, printShopId: 'ps-sg-01', status: 'PAID', acceptedAt: null, rejectedAt: null },
        data: { acceptedAt: expect.any(Date) },
      });
      expect(t.prisma.orderMessage.create).toHaveBeenCalledWith({ data: expect.objectContaining({ authorRole: 'SYSTEM' }) });
      expect(t.notifications.notifyOrder).toHaveBeenCalledWith(expect.objectContaining({ type: 'ORDER_UPDATE', userIds: ['user-1'], payload: { event: 'accepted' } }));
    });

    it('answers 409 when the order no longer waits for the shop', async () => {
      t.prisma.order.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(t.service.accept(ORDER_ID, shopStaff)).rejects.toThrow(ConflictException);
    });

    it('refuses with a reason: admins are alerted, the customer told the order moves', async () => {
      t.set({ status: OrderStatus.PAID });
      await t.service.reject(ORDER_ID, shopStaff, ' Hết giấy kraft ');
      expect(t.prisma.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { rejectedAt: expect.any(Date), rejectReason: 'Hết giấy kraft' } }));
      expect(t.notifications.notifyOrder).toHaveBeenCalledWith(expect.objectContaining({ type: 'ORDER_ALERT', userIds: ['admin-1'], payload: { event: 'rejected', reason: 'Hết giấy kraft' } }));
      expect(t.notifications.notifyOrder).toHaveBeenCalledWith(expect.objectContaining({ type: 'ORDER_UPDATE', payload: { event: 'reassigning' } }));
      await expect(t.service.reject(ORDER_ID, customer, 'không thích')).rejects.toThrow(ForbiddenException);
    });

    it('starts printing only an order the shop took; an admin takes it on the way', async () => {
      t.set({ status: OrderStatus.PAID });
      await expect(t.service.changeStatus(ORDER_ID, shopStaff, { status: OrderStatus.IN_PRODUCTION })).rejects.toThrow(ConflictException);
      await t.service.changeStatus(ORDER_ID, admin, { status: OrderStatus.IN_PRODUCTION });
      expect(t.prisma.order.updateMany).toHaveBeenLastCalledWith({ where: { id: ORDER_ID, status: 'PAID' }, data: { status: 'IN_PRODUCTION', acceptedAt: expect.any(Date) } });
      t.set({ status: OrderStatus.PAID, acceptedAt: NOW });
      await t.service.changeStatus(ORDER_ID, shopStaff, { status: OrderStatus.IN_PRODUCTION, note: ' Đã nhận file ' });
      expect(t.prisma.orderStatusHistory.create).toHaveBeenLastCalledWith({
        data: { orderId: ORDER_ID, fromStatus: 'PAID', toStatus: 'IN_PRODUCTION', changedById: 'staff-1', note: 'Đã nhận file' },
      });
    });

    it('ships only with a carrier and its tracking code (BR-G25)', async () => {
      t.set({ status: OrderStatus.IN_PRODUCTION, acceptedAt: NOW });
      await expect(t.service.changeStatus(ORDER_ID, shopStaff, { status: OrderStatus.SHIPPED })).rejects.toThrow('Chọn hãng vận chuyển');
      await expect(t.service.changeStatus(ORDER_ID, shopStaff, { status: OrderStatus.SHIPPED, carrier: 'GHN' })).rejects.toThrow('mã vận đơn');
      await t.service.changeStatus(ORDER_ID, shopStaff, { status: OrderStatus.SHIPPED, carrier: 'GHN', trackingCode: ' GHN12345678 ' });
      expect(t.prisma.order.updateMany).toHaveBeenLastCalledWith({
        where: { id: ORDER_ID, status: 'IN_PRODUCTION' },
        data: { status: 'SHIPPED', shippedAt: expect.any(Date), carrier: 'GHN', trackingCode: 'GHN12345678' },
      });
      expect(t.notifications.notifyOrder).toHaveBeenCalledWith(expect.objectContaining({ payload: { event: 'shipped' } }));
      // A shop that delivers itself has no code.
      t.set({ status: OrderStatus.IN_PRODUCTION, acceptedAt: NOW });
      await t.service.changeStatus(ORDER_ID, shopStaff, { status: OrderStatus.SHIPPED, carrier: 'SHOP_DELIVERY' });
      expect(t.prisma.order.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ carrier: 'SHOP_DELIVERY', trackingCode: null }) }));
    });

    it('lets the shop say delivered only with its proof, and books the money', async () => {
      t.set({ status: OrderStatus.SHIPPED, acceptedAt: NOW });
      await expect(t.service.changeStatus(ORDER_ID, shopStaff, { status: OrderStatus.DELIVERED })).rejects.toThrow('bằng chứng');
      t.set({ status: OrderStatus.DELIVERED, acceptedAt: NOW });
      t.prisma.order.findUnique.mockResolvedValueOnce(stored({ status: OrderStatus.SHIPPED, acceptedAt: NOW }));
      await t.service.changeStatus(ORDER_ID, shopStaff, { status: OrderStatus.DELIVERED, note: 'GHN báo đã giao 21/11' });
      expect(t.prisma.ledgerEntry.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ type: 'PLATFORM_FEE', amountVnd: 7_400 }), expect.objectContaining({ type: 'SHOP_PAYABLE', amountVnd: 41_600 })],
        skipDuplicates: true,
      });
    });

    it('keeps payment and cancelling away from shops, and orders away from customers', async () => {
      t.set({ status: OrderStatus.PENDING_PAYMENT });
      await expect(t.service.changeStatus(ORDER_ID, shopStaff, { status: OrderStatus.PAID })).rejects.toThrow(ForbiddenException);
      await expect(t.service.changeStatus(ORDER_ID, customer, { status: OrderStatus.CANCELLED })).rejects.toThrow(NotFoundException);
    });

    it('answers 409 for a step outside the lifecycle or an order changed meanwhile', async () => {
      t.set({ status: OrderStatus.PENDING_PAYMENT });
      await expect(t.service.changeStatus(ORDER_ID, admin, { status: OrderStatus.SHIPPED, carrier: 'PICKUP' })).rejects.toThrow(ConflictException);
      t.set({ status: OrderStatus.PAID });
      t.prisma.order.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(t.service.changeStatus(ORDER_ID, admin, { status: OrderStatus.CANCELLED })).rejects.toThrow(ConflictException);
    });

    it('lets the customer confirm the boxes arrived', async () => {
      t.set({ status: OrderStatus.SHIPPED, acceptedAt: NOW });
      await t.service.confirmReceived(ORDER_ID, customer);
      expect(t.prisma.order.updateMany).toHaveBeenLastCalledWith({ where: { id: ORDER_ID, status: 'SHIPPED' }, data: { status: 'DELIVERED', deliveredAt: expect.any(Date) } });
      expect(t.notifications.notifyOrder).toHaveBeenCalledWith(expect.objectContaining({ userIds: ['staff-1'], payload: { event: 'received' } }));
      await expect(t.service.confirmReceived(ORDER_ID, shopStaff)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reassign (docs/19 AF-A2)', () => {
    it("moves a refused order to another shop at that shop's fee, with a fresh deadline", async () => {
      t.set({ status: OrderStatus.PAID, rejectedAt: NOW, rejectReason: 'Hết giấy' });
      await t.service.reassign(ORDER_ID, admin, { printShopId: 'ps-hn-02' });
      expect(t.prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: ORDER_ID, status: 'PAID', acceptedAt: null, printShopId: 'ps-sg-01' },
        data: expect.objectContaining({
          printShopId: 'ps-hn-02',
          platformFeeBps: 1000,
          platformFeeVnd: 4_900,
          shopPayableVnd: 44_100,
          rejectedAt: null,
          acceptDeadline: expect.any(Date),
          shopNotifiedAt: null,
          estimatedDelivery: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      });
      expect(t.notifications.notifyOrder).toHaveBeenCalledWith(expect.objectContaining({ payload: { event: 'reassigned' } }));
    });

    it('refuses a taken order and a shop that cannot print it', async () => {
      t.set({ status: OrderStatus.PAID, acceptedAt: NOW });
      await expect(t.service.reassign(ORDER_ID, admin, { printShopId: 'ps-hn-02' })).rejects.toThrow(ConflictException);
      t.set({ status: OrderStatus.PAID });
      await expect(t.service.reassign(ORDER_ID, admin, { printShopId: 'ps-ct-04' })).rejects.toMatchObject({ response: { code: 'PRINT_SHOP_UNAVAILABLE' } });
    });
  });

  describe('payment', () => {
    it('starts the shop deadline and posts the payment to the ledger', async () => {
      t.set({ status: OrderStatus.PAID, paymentId: 'pay-1' });
      await t.service.markPaid(ORDER_ID, 'pay-1', t.prisma as unknown as Prisma.TransactionClient);
      expect(t.prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: ORDER_ID, status: 'PENDING_PAYMENT' },
        data: { status: 'PAID', paidAt: expect.any(Date), paymentId: 'pay-1', acceptDeadline: expect.any(Date) },
      });
      expect(t.prisma.ledgerEntry.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ type: 'CUSTOMER_PAYMENT', amountVnd: 49_000, paymentId: 'pay-1' })],
        skipDuplicates: true,
      });
    });
  });

  describe('print files', () => {
    it('links the latest finished file of each type for the ordered version', async () => {
      t.prisma.exportJob.findMany.mockResolvedValueOnce([
        { fileType: 'PDF_CMYK', storageKey: 'exports/new.pdf' },
        { fileType: 'PDF_CMYK', storageKey: 'exports/old.pdf' },
        { fileType: 'DXF', storageKey: 'exports/a.dxf' },
      ]);
      const files = await t.service.printFiles(ORDER_ID, shopStaff);
      expect(t.prisma.exportJob.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ projectId: 'proj-123', projectVersion: 3, status: 'COMPLETED' }) }));
      expect(files.map((file) => [file.fileType, file.url])).toEqual([
        ['PDF_CMYK', 'https://files.test/exports/new.pdf'],
        ['DXF', 'https://files.test/exports/a.dxf'],
      ]);
      expect(files[0].fileName).toBe('WF-2026-000001-1-pdf_cmyk.pdf');
      await expect(t.service.printFiles(ORDER_ID, stranger)).rejects.toThrow(NotFoundException);
    });
  });
});

describe('OrderMessagesService', () => {
  const build = () => {
    const t = setup();
    return { ...t, messages: new OrderMessagesService(t.prisma as unknown as PrismaService, t.service, t.notifications as unknown as NotificationsService) };
  };

  it('flags a phone number sent before the shop took the order, and tells the shop', async () => {
    const { messages, prisma, notifications, set } = build();
    set({ status: OrderStatus.PAID });
    const { warning } = await messages.post(ORDER_ID, customer, 'Gọi em 0912 345 678 nhé');
    expect(warning).toBe(true);
    expect(prisma.orderMessage.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ authorRole: 'CUSTOMER', flagged: true }) }));
    expect(notifications.notifyOrder).toHaveBeenCalledWith(expect.objectContaining({ type: 'ORDER_MESSAGE', userIds: ['staff-1'] }));
    expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: ORDER_ID }, data: { customerReadAt: expect.any(Date) } });
  });

  it('does not flag once the shop took the order; the shop writes to the customer', async () => {
    const { messages, notifications, set } = build();
    set({ status: OrderStatus.IN_PRODUCTION, acceptedAt: NOW });
    const { warning } = await messages.post(ORDER_ID, shopStaff, 'Gọi chị 0912345678 để hẹn giao');
    expect(warning).toBe(false);
    expect(notifications.notifyOrder).toHaveBeenCalledWith(expect.objectContaining({ userIds: ['user-1'] }));
  });

  it('closes the conversation 30 days after delivery, except for admins', async () => {
    const { messages, set } = build();
    set({ status: OrderStatus.DELIVERED, deliveredAt: new Date(Date.now() - 31 * 86_400_000) });
    await expect(messages.post(ORDER_ID, customer, 'Còn hỏi được không?')).rejects.toThrow(ForbiddenException);
    await expect(messages.post(ORDER_ID, admin, 'WrapFit hỗ trợ')).resolves.toBeTruthy();
  });

  it('names authors and marks the viewer side as read', async () => {
    const { messages, prisma } = build();
    prisma.orderMessage.findMany.mockResolvedValueOnce([
      { id: 'a', authorId: 'user-1', authorRole: 'CUSTOMER', body: 'Chào xưởng', flagged: true, createdAt: NOW, author: { fullName: 'Linh', shopName: null, anonymizedAt: null } },
      { id: 'b', authorId: 'staff-1', authorRole: 'SHOP', body: 'Chào chị', flagged: false, createdAt: NOW, author: null },
      { id: 'c', authorId: null, authorRole: 'SYSTEM', body: 'Đã nhận đơn', flagged: false, createdAt: NOW, author: null },
    ]);
    const list = await messages.list(ORDER_ID, shopStaff);
    expect(list.map((m) => [m.authorName, m.mine, m.flagged])).toEqual([
      ['Linh', false, true],
      ['In Bao Bì Sài Gòn Xanh', true, false],
      ['WrapFit', false, false],
    ]);
    expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: ORDER_ID }, data: { shopReadAt: expect.any(Date) } });
  });
});

describe('OrderFollowUpTask', () => {
  it('tells the shop about a new paid order once, alerts late answers, delivers old shipments', async () => {
    const t = setup();
    const task = new OrderFollowUpTask(t.prisma as unknown as PrismaService, t.service, t.notifications as unknown as NotificationsService);
    t.prisma.order.findMany
      .mockResolvedValueOnce([{ id: 'o-new', printShopId: 'ps-sg-01' }])
      .mockResolvedValueOnce([{ id: 'o-late', userId: 'user-1' }])
      .mockResolvedValueOnce([{ id: ORDER_ID }]);
    t.set({ status: OrderStatus.SHIPPED, acceptedAt: NOW });
    const result = await task.run(new Date('2026-11-20T03:00:00Z'));
    expect(result).toEqual({ notified: 1, alerted: 1, delivered: 1 });
    expect(t.notifications.notifyOrder).toHaveBeenCalledWith(expect.objectContaining({ type: 'ORDER_NEW', orderId: 'o-new', userIds: ['staff-1'] }));
    expect(t.notifications.notifyOrder).toHaveBeenCalledWith(expect.objectContaining({ type: 'ORDER_ALERT', orderId: 'o-late', payload: { event: 'overdue' } }));
    expect(t.prisma.orderStatusHistory.create).toHaveBeenCalledWith({ data: expect.objectContaining({ toStatus: 'DELIVERED', changedById: null }) });
  });

  it('skips a row another instance claimed first', async () => {
    const t = setup();
    const task = new OrderFollowUpTask(t.prisma as unknown as PrismaService, t.service, t.notifications as unknown as NotificationsService);
    t.prisma.order.findMany.mockResolvedValueOnce([{ id: 'o-new', printShopId: 'ps-sg-01' }]).mockResolvedValue([]);
    t.prisma.order.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await task.run()).toEqual({ notified: 0, alerted: 0, delivered: 0 });
    expect(t.notifications.notifyOrder).not.toHaveBeenCalled();
  });
});

describe('order lifecycle', () => {
  it('only allows forward steps, and cancelling before printing', () => {
    expect(canTransition('PENDING_PAYMENT', 'PAID')).toBe(true);
    expect(canTransition('PAID', 'IN_PRODUCTION')).toBe(true);
    expect(canTransition('IN_PRODUCTION', 'SHIPPED')).toBe(true);
    expect(canTransition('SHIPPED', 'DELIVERED')).toBe(true);
    expect(canTransition('PAID', 'CANCELLED')).toBe(true);
    expect(canTransition('IN_PRODUCTION', 'CANCELLED')).toBe(false);
    expect(canTransition('DELIVERED', 'SHIPPED')).toBe(false);
  });

  it('gives print shops the production steps only', () => {
    expect(roleMaySet('PRINT_SHOP', 'IN_PRODUCTION')).toBe(true);
    expect(roleMaySet('PRINT_SHOP', 'PAID')).toBe(false);
    expect(roleMaySet('PRINT_SHOP', 'CANCELLED')).toBe(false);
    expect(roleMaySet('ADMIN', 'CANCELLED')).toBe(true);
  });
});

describe('newOrderCode', () => {
  it('is WF-<year in Vietnam>-<6 digits>, zero-padded', () => {
    for (let i = 0; i < 50; i++) expect(newOrderCode(new Date('2026-12-31T18:00:00Z'))).toMatch(/^WF-2027-\d{6}$/);
  });
});
