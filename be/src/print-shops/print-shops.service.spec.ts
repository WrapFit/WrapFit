import { NotFoundException } from '@nestjs/common';
import { PrintShop, PrintShopStatus } from '@prisma/client';
import type { PrismaService } from '../shared/prisma';
import { PrintShopsService, flatSizeOf, toPublicShop } from './print-shops.service';

const NOW = new Date('2026-11-20T03:00:00Z');

const row = (over: Partial<PrintShop> & Pick<PrintShop, 'id' | 'provinceCode' | 'latitude' | 'longitude'>): PrintShop => ({
  name: over.id,
  legalName: null,
  taxCode: null,
  city: over.provinceCode,
  address: 'x',
  sheetLabel: 'B1 · 1020 × 720 mm',
  maxSheetWidthMm: 1020,
  maxSheetHeightMm: 720,
  services: ['Offset 4 màu'],
  methods: ['offset'],
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
});

const SG = row({ id: 'ps-sg-01', provinceCode: 'ho-chi-minh', latitude: 10.807, longitude: 106.618 });
const HN = row({ id: 'ps-hn-02', provinceCode: 'ha-noi', latitude: 21.0, longitude: 105.873 });
const CT = row({ id: 'ps-ct-04', provinceCode: 'can-tho', latitude: 10.09, longitude: 105.72, status: PrintShopStatus.REVIEW });
const SUSPENDED = row({ id: 'ps-x-09', provinceCode: 'ha-noi', latitude: 21.0, longitude: 105.8, status: PrintShopStatus.SUSPENDED });

describe('PrintShopsService', () => {
  let prisma: {
    printShop: { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock; create: jest.Mock };
    order: { groupBy: jest.Mock };
  };
  let service: PrintShopsService;

  beforeEach(() => {
    prisma = {
      printShop: {
        findMany: jest.fn().mockResolvedValue([SG, HN, SUSPENDED]),
        findUnique: jest.fn(async ({ where }: { where: { id: string } }) => [SG, HN, CT, SUSPENDED].find((s) => s.id === where.id) ?? null),
        update: jest.fn(async ({ data }: { data: Partial<PrintShop> }) => ({ ...HN, ...data })),
        create: jest.fn(),
      },
      order: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    service = new PrintShopsService(prisma as unknown as PrismaService);
  });

  it('lists the shops a customer may see, without contact details', async () => {
    const list = await service.list();
    expect(prisma.printShop.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: { in: ['ACTIVE', 'PAUSED'] } } }),
    );
    expect(list[0]).not.toHaveProperty('phone');
    expect(list[0]).not.toHaveProperty('contactEmail');
    expect(list[0]).not.toHaveProperty('platformFeeBps');
    // Field names of the former in-memory partners, read by the web app.
    expect(list[0]).toMatchObject({ id: 'ps-sg-01', sheet: 'B1 · 1020 × 720 mm', sheetSize: 'B1 · 1020 × 720 mm', leadTime: '3–5 ngày', status: 'active', state: 'active' });
  });

  it('hides a shop under review or suspended from the detail', async () => {
    await expect(service.get('ps-ct-04')).rejects.toThrow(NotFoundException);
    await expect(service.get('ps-x-09')).rejects.toThrow(NotFoundException);
    await expect(service.get('ps-unknown')).rejects.toThrow(NotFoundException);
    await expect(service.get('ps-hn-02')).resolves.toMatchObject({ id: 'ps-hn-02', provinceCode: 'ha-noi' });
  });

  it('ranks the nearest shop first and never shows a suspended one, even as excluded', async () => {
    const result = await service.match(
      [{ structure: 'tuck-top', dimensions: { length: 80, width: 80, height: 95, paperThickness: 0.4 }, quantity: 1 }],
      { kind: 'sample', provinceCode: 'ha-noi', now: NOW },
    );
    expect(result.recommendedId).toBe('ps-hn-02');
    expect(result.offers.map((o) => o.shop.id)).toEqual(['ps-hn-02', 'ps-sg-01']);
    expect(result.offers[0]).toMatchObject({ shippingDays: 1, reasons: expect.arrayContaining(['recommended', 'nearest']) });
    expect(result.excluded).toEqual([]);
    // Shops under review do not even take part.
    expect(prisma.printShop.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: { not: 'REVIEW' } } }));
  });

  it('delays a shop with a full queue', async () => {
    prisma.order.groupBy.mockResolvedValueOnce([{ printShopId: 'ps-hn-02', _count: { _all: 30 } }]);
    const result = await service.match(
      [{ structure: 'tuck-top', dimensions: { length: 80, width: 80, height: 95, paperThickness: 0.4 }, quantity: 1 }],
      { kind: 'sample', provinceCode: 'ha-noi', now: NOW },
    );
    // 30 orders ahead at 10 a day: three more working days before printing starts.
    expect(result.offers.find((o) => o.shop.id === 'ps-hn-02')!.productionDays).toBe(5);
  });

  it('rejects an unknown province', async () => {
    await expect(service.match([], { kind: 'sample', provinceCode: 'atlantis' })).rejects.toThrow('Tỉnh / thành không hợp lệ');
  });

  it('keeps max ≥ min when an admin changes quantities', async () => {
    await expect(service.update('ps-hn-02', { maxQuantity: 0 + 1, minQuantity: 5 })).rejects.toThrow('Số lượng tối đa');
    await service.update('ps-hn-02', { platformFeeBps: 1200, maxSheetMm: { width: 720, height: 520 }, pausedUntil: null });
    expect(prisma.printShop.update).toHaveBeenCalledWith({
      where: { id: 'ps-hn-02' },
      data: { platformFeeBps: 1200, maxSheetWidthMm: 720, maxSheetHeightMm: 520, pausedUntil: null },
    });
  });

  it('measures the largest flat piece of a box', () => {
    const flat = flatSizeOf({ structure: 'tuck-top', dimensions: { length: 80, width: 80, height: 95, paperThickness: 0.4 } });
    expect(flat.width).toBeGreaterThan(300);
    expect(flat.height).toBeGreaterThan(200);
    // An unknown structure does not block the order.
    expect(flatSizeOf({ structure: 'nope', dimensions: { length: 1, width: 1, height: 1, paperThickness: 0.4 } })).toEqual({ width: 0, height: 0 });
  });

  it('maps a row to the public shape', () => {
    expect(toPublicShop(CT)).toMatchObject({ status: 'review', maxSheetMm: { width: 1020, height: 720 } });
  });
});
