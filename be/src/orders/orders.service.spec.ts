import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../shared/prisma';
import { PrintShopsService } from '../print-shops';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let prisma: { packagingProject: { findUnique: jest.Mock } };
  let printShops: PrintShopsService;
  let service: OrdersService;

  beforeEach(() => {
    prisma = {
      packagingProject: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'proj-123',
          title: 'Hộp Quà Cao Cấp',
          userId: 'user-1',
        }),
      },
    };
    printShops = new PrintShopsService();
    service = new OrdersService(prisma as unknown as PrismaService, printShops);
  });

  it('creates a sample box order with phone and calculates fee correctly', async () => {
    const order = await service.createSampleOrder('user-1', {
      projectId: 'proj-123',
      recipientName: 'Chị Linh',
      phone: '0912345678',
      shippingAddress: '123 Nguyễn Huệ, Q.1, TP.HCM',
      quantity: 1,
    });

    expect(order).toBeDefined();
    expect(order.orderCode).toMatch(/^WF-SMP-/);
    expect(order.recipientName).toBe('Chị Linh');
    expect(order.phone).toBe('0912345678');
    expect(order.recipientPhone).toBe('0912345678');
    expect(order.sampleFeeVnd).toBe(49_000);
    expect(order.totalVnd).toBe(49_000);
    expect(order.status).toBe('confirmed');
    expect(order.printShopName).toBe('In Bao Bì Sài Gòn Xanh');
  });

  it('supports recipientPhone alias from frontend', async () => {
    const order = await service.createSampleOrder('user-1', {
      projectId: 'proj-123',
      recipientName: 'Chị Linh',
      recipientPhone: '0987654321',
      shippingAddress: '456 Lê Lợi, Đà Nẵng',
      printShopId: 'ps-dn-03',
      quantity: 3,
    });

    expect(order.phone).toBe('0987654321');
    expect(order.recipientPhone).toBe('0987654321');
    // 49.000 + 2 * 25.000 = 99.000
    expect(order.sampleFeeVnd).toBe(99_000);
    expect(order.totalVnd).toBe(99_000);
    expect(order.printShopId).toBe('ps-dn-03');
    expect(order.printShopName).toBe('Kraft Đà Nẵng CNC');
  });

  it('throws BadRequestException if neither phone nor recipientPhone is provided', async () => {
    await expect(
      service.createSampleOrder('user-1', {
        projectId: 'proj-123',
        recipientName: 'Chị Linh',
        shippingAddress: '123 Phố Huế, Hà Nội',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException if project does not exist', async () => {
    prisma.packagingProject.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.createSampleOrder('user-1', {
        projectId: 'proj-missing',
        recipientName: 'Chị Linh',
        phone: '0912345678',
        shippingAddress: '123 Phố Huế, Hà Nội',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('lists orders by user and allows retrieving specific order', async () => {
    const created = await service.createSampleOrder('user-2', {
      projectId: 'proj-123',
      recipientName: 'Nguyễn Văn B',
      phone: '0900000000',
      shippingAddress: '789 Trần Hưng Đạo, Cần Thơ',
    });

    const list = service.listUserOrders('user-2');
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].id).toBe(created.id);

    const detail = service.getOrder(created.id, 'user-2');
    expect(detail.id).toBe(created.id);

    // Another user cannot access it
    expect(() => service.getOrder(created.id, 'user-3')).toThrow(NotFoundException);
  });
});
