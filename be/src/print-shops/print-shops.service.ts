import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, PrintShop, PrintShopStatus } from '@prisma/client';
import {
  type BoxDimensions,
  type MatchableShop,
  type MatchResult,
  generateDielinePieces,
  matchPrintShops,
  provinceOf,
} from '@wrapfit/shared';
import { PrismaService } from '../shared/prisma';
import { CreatePrintShopDto, UpdatePrintShopDto } from './dto/admin-print-shop.dto';

/**
 * What a customer sees of a shop (docs/19 G.4): no phone or email before the shop has taken the order. Keeps the field
 * names of the former in-memory partners (`sheet`, `sheetSize`, `leadTime`, `state` / `status` in lower case) so the
 * web app reads both.
 */
export interface PublicPrintShop {
  id: string;
  name: string;
  city: string;
  provinceCode: string;
  address: string;
  sheet: string;
  sheetSize: string;
  maxSheetMm: { width: number; height: number };
  services: string[];
  methods: string[];
  papers: string[];
  finishes: string[];
  windowPatching: boolean;
  leadTime: string;
  leadTimeDays: number;
  sampleLeadTimeDays: number;
  minQuantity: number;
  maxQuantity: number;
  state: Lowercase<PrintShopStatus>;
  status: Lowercase<PrintShopStatus>;
  pausedUntil: string | null;
  rating: number;
  completedOrders: number;
}

/** Everything, for ADMIN. */
export interface AdminPrintShop extends PublicPrintShop {
  legalName: string | null;
  taxCode: string | null;
  latitude: number;
  longitude: number;
  dailyCapacity: number;
  serviceProvinces: string[];
  probationUntil: string | null;
  contactEmail: string;
  phone: string;
  zalo: string | null;
  platformFeeBps: number;
  activeOrders: number;
  createdAt: string;
  updatedAt: string;
}

/** A shop of the matching, with what the customer sees of it. */
export interface PrintShopOffer {
  shop: PublicPrintShop;
  priceVnd: number;
  productionDays: number;
  shippingDays: number;
  estimatedDelivery: string;
  distanceKm: number | null;
  score: number;
  reasons: string[];
}

export interface PrintShopMatchResponse {
  provinceCode: string | null;
  recommendedId: string | null;
  offers: PrintShopOffer[];
  excluded: { shop: PublicPrintShop; reasons: string[] }[];
}

/** Statuses of an order the shop still has to print or ship: its queue (docs/19 G.3, capacity). */
export const ORDER_STATUSES_IN_QUEUE: readonly OrderStatus[] = [OrderStatus.PAID, OrderStatus.IN_PRODUCTION];

/** Line of an order to match: the flat size comes from the project's dieline. */
export interface MatchLine {
  structure: string;
  dimensions: BoxDimensions;
  formulaVersion?: number;
  quantity: number;
}

const iso = (date: Date | null) => date?.toISOString() ?? null;

export function toPublicShop(row: PrintShop): PublicPrintShop {
  const status = row.status.toLowerCase() as Lowercase<PrintShopStatus>;
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    provinceCode: row.provinceCode,
    address: row.address,
    sheet: row.sheetLabel,
    sheetSize: row.sheetLabel,
    maxSheetMm: { width: row.maxSheetWidthMm, height: row.maxSheetHeightMm },
    services: row.services,
    methods: row.methods,
    papers: row.papers,
    finishes: row.finishes,
    windowPatching: row.windowPatching,
    leadTime: row.leadTimeLabel,
    leadTimeDays: row.leadTimeDays,
    sampleLeadTimeDays: row.sampleLeadTimeDays,
    minQuantity: row.minQuantity,
    maxQuantity: row.maxQuantity,
    state: status,
    status,
    pausedUntil: iso(row.pausedUntil),
    rating: row.rating,
    completedOrders: row.completedOrders,
  };
}

export function toMatchableShop(row: PrintShop): MatchableShop {
  return {
    id: row.id,
    provinceCode: row.provinceCode,
    lat: row.latitude,
    lng: row.longitude,
    status: row.status,
    pausedUntil: iso(row.pausedUntil),
    probationUntil: iso(row.probationUntil),
    maxSheetMm: { width: row.maxSheetWidthMm, height: row.maxSheetHeightMm },
    minQuantity: row.minQuantity,
    maxQuantity: row.maxQuantity,
    leadTimeDays: row.leadTimeDays,
    sampleLeadTimeDays: row.sampleLeadTimeDays,
    dailyCapacity: row.dailyCapacity,
    serviceProvinces: row.serviceProvinces,
    rating: row.rating,
    completedOrders: row.completedOrders,
  };
}

/** Flat size of the largest piece of a box (the one that must fit the press sheet). */
export function flatSizeOf(line: Pick<MatchLine, 'structure' | 'dimensions' | 'formulaVersion'>): { width: number; height: number } {
  try {
    const pieces = generateDielinePieces(line.structure, line.dimensions, line.formulaVersion);
    let width = 0;
    let height = 0;
    for (const { geometry } of pieces) {
      const { width: w, height: h } = geometry.totalBoundingBox;
      if (Math.max(w, h) > Math.max(width, height)) [width, height] = [w, h];
    }
    return { width, height };
  } catch {
    // A structure the engine no longer knows: no size constraint rather than no shop at all.
    return { width: 0, height: 0 };
  }
}

/**
 * Partner print shops (docs/19 B, G): public list and detail, the matching of an order, and the admin settings. Shops
 * live in `print_shops`; the four partners of the former in-memory list keep their ids.
 */
@Injectable()
export class PrintShopsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Shops a customer may see: taking orders or paused for a while. Shops under review or suspended are hidden. */
  async list(filterCity?: string): Promise<PublicPrintShop[]> {
    const rows = await this.prisma.printShop.findMany({
      where: {
        status: { in: [PrintShopStatus.ACTIVE, PrintShopStatus.PAUSED] },
        ...(filterCity ? { city: { contains: filterCity, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ status: 'asc' }, { rating: 'desc' }, { id: 'asc' }],
    });
    return rows.map(toPublicShop);
  }

  async get(id: string): Promise<PublicPrintShop> {
    const row = await this.prisma.printShop.findUnique({ where: { id } });
    if (!row || row.status === PrintShopStatus.REVIEW || row.status === PrintShopStatus.SUSPENDED) {
      throw new NotFoundException('Print shop partner not found');
    }
    return toPublicShop(row);
  }

  /** The row, or null (orders read the name and the fee rate of any shop, also a paused one). */
  findRow(id: string, tx: Prisma.TransactionClient = this.prisma): Promise<PrintShop | null> {
    return tx.printShop.findUnique({ where: { id } });
  }

  /** Paid orders not yet shipped, per shop: the queue that delays a new order. */
  async queueSizes(tx: Prisma.TransactionClient = this.prisma): Promise<Record<string, number>> {
    const groups = await tx.order.groupBy({
      by: ['printShopId'],
      where: { status: { in: [...ORDER_STATUSES_IN_QUEUE] } },
      _count: { _all: true },
    });
    return Object.fromEntries(groups.map((g) => [g.printShopId, g._count._all]));
  }

  /**
   * Ranks the shops for an order (docs/19 G.3). Every shop not hidden takes part, so the customer also sees why a
   * shop was left out. `returningShopIds`: shops this customer already ordered from.
   */
  async match(
    lines: MatchLine[],
    options: { provinceCode: string | null; kind: 'sample' | 'production'; returningShopIds?: string[]; priceVnd?: number; now?: Date },
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<PrintShopMatchResponse> {
    if (options.provinceCode && !provinceOf(options.provinceCode)) {
      throw new BadRequestException('Tỉnh / thành không hợp lệ');
    }
    const rows = await tx.printShop.findMany({
      where: { status: { not: PrintShopStatus.REVIEW } },
      orderBy: { id: 'asc' },
    });
    const queue = await this.queueSizes(tx);
    const result: MatchResult = matchPrintShops(rows.map(toMatchableShop), queue, {
      kind: options.kind,
      provinceCode: options.provinceCode,
      items: lines.map((line) => {
        const flat = flatSizeOf(line);
        return { flatWidthMm: flat.width, flatHeightMm: flat.height, quantity: line.quantity };
      }),
      now: options.now ?? new Date(),
      returningShopIds: options.returningShopIds,
      priceOf: options.priceVnd !== undefined ? () => options.priceVnd! : undefined,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return {
      provinceCode: options.provinceCode,
      recommendedId: result.recommendedId,
      offers: result.matches.map(({ shopId, ...offer }) => ({ shop: toPublicShop(byId.get(shopId)!), ...offer })),
      // A suspended shop is not shown to customers at all, not even as excluded.
      excluded: result.excluded
        .filter(({ shopId }) => byId.get(shopId)!.status !== PrintShopStatus.SUSPENDED)
        .map(({ shopId, reasons }) => ({ shop: toPublicShop(byId.get(shopId)!), reasons })),
    };
  }

  // ------------------------------------------------------------------ admin

  async listForAdmin(): Promise<AdminPrintShop[]> {
    const [rows, queue] = await Promise.all([this.prisma.printShop.findMany({ orderBy: { id: 'asc' } }), this.queueSizes()]);
    return rows.map((row) => this.toAdmin(row, queue[row.id] ?? 0));
  }

  async create(dto: CreatePrintShopDto): Promise<AdminPrintShop> {
    if (!provinceOf(dto.provinceCode)) throw new BadRequestException('Tỉnh / thành không hợp lệ');
    const taken = await this.prisma.printShop.findUnique({ where: { id: dto.id }, select: { id: true } });
    if (taken) throw new BadRequestException('Mã xưởng đã có');
    const row = await this.prisma.printShop.create({ data: this.dataOf(dto) as Prisma.PrintShopCreateInput });
    return this.toAdmin(row, 0);
  }

  async update(id: string, dto: UpdatePrintShopDto): Promise<AdminPrintShop> {
    const current = await this.findRow(id);
    if (!current) throw new NotFoundException('Print shop partner not found');
    if (dto.provinceCode && !provinceOf(dto.provinceCode)) throw new BadRequestException('Tỉnh / thành không hợp lệ');
    const min = dto.minQuantity ?? current.minQuantity;
    const max = dto.maxQuantity ?? current.maxQuantity;
    if (max < min) throw new BadRequestException('Số lượng tối đa phải từ số lượng tối thiểu trở lên');
    const row = await this.prisma.printShop.update({ where: { id }, data: this.dataOf(dto) });
    return this.toAdmin(row, (await this.queueSizes())[id] ?? 0);
  }

  private dataOf(dto: UpdatePrintShopDto & { id?: string }): Prisma.PrintShopUpdateInput & { id?: string } {
    const { maxSheetMm, pausedUntil, probationUntil, sheet, leadTime, ...rest } = dto;
    return {
      ...rest,
      ...(maxSheetMm ? { maxSheetWidthMm: maxSheetMm.width, maxSheetHeightMm: maxSheetMm.height } : {}),
      ...(sheet !== undefined ? { sheetLabel: sheet } : {}),
      ...(leadTime !== undefined ? { leadTimeLabel: leadTime } : {}),
      ...(pausedUntil !== undefined ? { pausedUntil: pausedUntil ? new Date(pausedUntil) : null } : {}),
      ...(probationUntil !== undefined ? { probationUntil: probationUntil ? new Date(probationUntil) : null } : {}),
    };
  }

  private toAdmin(row: PrintShop, activeOrders: number): AdminPrintShop {
    return {
      ...toPublicShop(row),
      legalName: row.legalName,
      taxCode: row.taxCode,
      latitude: row.latitude,
      longitude: row.longitude,
      dailyCapacity: row.dailyCapacity,
      serviceProvinces: row.serviceProvinces,
      probationUntil: iso(row.probationUntil),
      contactEmail: row.contactEmail,
      phone: row.phone,
      zalo: row.zalo,
      platformFeeBps: row.platformFeeBps,
      activeOrders,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
