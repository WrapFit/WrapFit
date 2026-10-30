import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, ProjectStatus, Role } from '@prisma/client';
import { randomInt } from 'crypto';
import { AuthUser } from '../common';
import { PrismaService } from '../shared/prisma';
import { PrintShopsService } from '../print-shops';
import { CreateSampleOrderDto } from './dto/create-sample-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { STATUS_TIMESTAMP, canTransition, roleMaySet } from './order-status';

/** Sample print fee: 49.000đ for the first box of a design, 25.000đ for each extra box. */
export const SAMPLE_FIRST_BOX_VND = 49_000;
export const SAMPLE_EXTRA_BOX_VND = 25_000;
export const sampleFeeVnd = (quantity: number) => SAMPLE_FIRST_BOX_VND + Math.max(0, quantity - 1) * SAMPLE_EXTRA_BOX_VND;

const DEFAULT_PAPER_STOCK = 'Kraft 350g cán màng mờ';
const ORDER_CODE_ATTEMPTS = 8;

const ORDER_INCLUDE = { items: { orderBy: { id: 'asc' } } } satisfies Prisma.OrderInclude;
type OrderRow = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

/**
 * API shape of an order. It keeps the fields of the former in-memory orders (`status` in lower case, `orderStatus`,
 * `sampleFeeVnd`, `phone` / `recipientPhone`, `partnerShop`) so the web app reads both; a sample order has one item,
 * whose fields are repeated at the top level.
 */
export interface SampleOrderResponse {
  id: string;
  orderCode: string;
  userId: string;
  projectId: string | null;
  projectTitle: string;
  projectVersion: number;
  structure: string;
  dimensions: Prisma.JsonValue;
  quantity: number;
  paperStock: string;
  recipientName: string;
  phone: string;
  recipientPhone: string;
  shippingAddress: string;
  notes: string | null;
  status: Lowercase<OrderStatus>;
  orderStatus: OrderStatus;
  sampleFeeVnd: number;
  subtotalVnd: number;
  shippingVnd: number;
  totalVnd: number;
  printShopId: string;
  printShopName: string;
  partnerShop: { id: string; name: string; city: string; contactPhone: string };
  estimatedDeliveryDays: string;
  paymentId: string | null;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly printShops: PrintShopsService,
  ) {}

  async createSampleOrder(userId: string, dto: CreateSampleOrderDto): Promise<SampleOrderResponse> {
    const phone = (dto.phone || dto.recipientPhone)?.trim();
    if (!phone) {
      throw new BadRequestException('Vui lòng cung cấp số điện thoại người nhận');
    }

    // Only the owner can order prints of a design, and not from the trash.
    const project = await this.prisma.packagingProject.findFirst({
      where: { id: dto.projectId, userId, status: { not: ProjectStatus.DELETED } },
      select: { id: true, title: true, templateId: true, dimensions: true, version: true },
    });
    if (!project) {
      throw new NotFoundException('Dự án hộp không tồn tại');
    }

    let partner = this.printShops.getDefaultPartner();
    if (dto.printShopId) {
      const chosen = this.printShops.get(dto.printShopId);
      if (!chosen || chosen.status !== 'active') {
        throw new BadRequestException('Xưởng in này chưa nhận đơn');
      }
      partner = chosen;
    }

    const quantity = dto.quantity ?? 1;
    const subtotal = sampleFeeVnd(quantity);
    const data = (orderCode: string): Prisma.OrderCreateInput => ({
      orderCode,
      user: { connect: { id: userId } },
      printShopId: partner.id,
      recipientName: dto.recipientName.trim(),
      recipientPhone: phone,
      shippingAddress: dto.shippingAddress.trim(),
      notes: dto.notes?.trim() || null,
      subtotalVnd: subtotal,
      shippingVnd: 0,
      totalVnd: subtotal,
      items: {
        create: {
          project: { connect: { id: project.id } },
          projectVersion: project.version,
          projectTitle: project.title,
          structure: project.templateId,
          dimensions: project.dimensions as Prisma.InputJsonValue,
          paperStock: dto.paperStock?.trim() || DEFAULT_PAPER_STOCK,
          quantity,
          unitPriceVnd: SAMPLE_FIRST_BOX_VND,
          lineTotalVnd: subtotal,
        },
      },
      history: { create: { toStatus: OrderStatus.PENDING_PAYMENT, changedById: userId } },
    });

    // WF-<year>-<4 digits>: short enough to read over the phone. A taken code is retried with a new number.
    for (let attempt = 1; ; attempt++) {
      try {
        const order = await this.prisma.order.create({ data: data(newOrderCode()), include: ORDER_INCLUDE });
        return this.toResponse(order);
      } catch (error) {
        if (attempt < ORDER_CODE_ATTEMPTS && isOrderCodeTaken(error)) continue;
        throw error;
      }
    }
  }

  async listUserOrders(userId: string): Promise<SampleOrderResponse[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: ORDER_INCLUDE,
    });
    return orders.map((order) => this.toResponse(order));
  }

  /** One order of its owner. Someone else's order answers 404, like a missing one. */
  async getOrder(id: string, userId: string): Promise<SampleOrderResponse> {
    const order = await this.prisma.order.findFirst({ where: { id, userId }, include: ORDER_INCLUDE });
    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }
    return this.toResponse(order);
  }

  /** Orders to handle: every shop for ADMIN, the account's own shop for PRINT_SHOP. */
  async listForStaff(actor: AuthUser, query: ListOrdersQueryDto): Promise<SampleOrderResponse[]> {
    const printShopId = actor.role === Role.ADMIN ? query.printShopId : await this.shopOf(actor.id);
    const orders = await this.prisma.order.findMany({
      where: { printShopId, status: query.status },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      include: ORDER_INCLUDE,
    });
    return orders.map((order) => this.toResponse(order));
  }

  /**
   * Moves an order one step (ADMIN, or PRINT_SHOP for its own shop's production steps). A print shop asking for an
   * order of another shop gets 404; a step outside the lifecycle, or an order changed meanwhile, gets 409.
   */
  async changeStatus(id: string, actor: AuthUser, dto: UpdateOrderStatusDto): Promise<SampleOrderResponse> {
    const shopId = actor.role === Role.PRINT_SHOP ? await this.shopOf(actor.id) : undefined;
    const order = await this.prisma.order.findFirst({ where: { id, printShopId: shopId }, select: { status: true } });
    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }
    if (!roleMaySet(actor.role, dto.status)) {
      throw new ForbiddenException('Tài khoản xưởng in chỉ cập nhật các bước in, giao và đã giao');
    }
    return this.transition(id, order.status, dto.status, actor.id, dto.note);
  }

  /**
   * Applies one checked step in a transaction: the update only matches while the order is still in `from`, so two
   * concurrent changes cannot both win.
   */
  async transition(
    id: string,
    from: OrderStatus,
    to: OrderStatus,
    changedById: string | null,
    note?: string,
  ): Promise<SampleOrderResponse> {
    return this.prisma.$transaction((tx) => this.transitionIn(tx, id, from, to, { changedById, note }));
  }

  /**
   * A payment paid the order (S5): PENDING_PAYMENT → PAID with the payment linked, inside the payment's transaction so
   * the order and the payment change together. 409 when the order is no longer waiting for payment.
   */
  async markPaid(id: string, paymentId: string, tx: Prisma.TransactionClient): Promise<SampleOrderResponse> {
    return this.transitionIn(tx, id, OrderStatus.PENDING_PAYMENT, OrderStatus.PAID, { changedById: null, paymentId });
  }

  private async transitionIn(
    tx: Prisma.TransactionClient,
    id: string,
    from: OrderStatus,
    to: OrderStatus,
    { changedById, note, paymentId }: { changedById: string | null; note?: string; paymentId?: string },
  ): Promise<SampleOrderResponse> {
    if (!canTransition(from, to)) {
      throw new ConflictException(`Không thể chuyển đơn từ ${from} sang ${to}`);
    }
    const stamp = STATUS_TIMESTAMP[to];
    const { count } = await tx.order.updateMany({
      where: { id, status: from },
      data: { status: to, ...(stamp ? { [stamp]: new Date() } : {}), ...(paymentId ? { paymentId } : {}) },
    });
    if (count === 0) {
      throw new ConflictException('Đơn hàng vừa được cập nhật, hãy tải lại');
    }
    await tx.orderStatusHistory.create({
      data: { orderId: id, fromStatus: from, toStatus: to, changedById, note: note?.trim() || null },
    });
    return this.toResponse(await tx.order.findUniqueOrThrow({ where: { id }, include: ORDER_INCLUDE }));
  }

  /** Shop of a PRINT_SHOP account. An account not linked to a shop has no orders to see. */
  private async shopOf(userId: string): Promise<string> {
    const member = await this.prisma.printShopMember.findUnique({ where: { userId }, select: { printShopId: true } });
    if (!member) {
      throw new ForbiddenException('Tài khoản chưa được gán cho xưởng in nào');
    }
    return member.printShopId;
  }

  private toResponse(order: OrderRow): SampleOrderResponse {
    const item = order.items[0];
    const shop = this.printShops.get(order.printShopId);
    const iso = (date: Date | null) => date?.toISOString() ?? null;
    return {
      id: order.id,
      orderCode: order.orderCode,
      userId: order.userId,
      projectId: item?.projectId ?? null,
      projectTitle: item?.projectTitle ?? '',
      projectVersion: item?.projectVersion ?? 1,
      structure: item?.structure ?? '',
      dimensions: item?.dimensions ?? null,
      quantity: order.items.reduce((sum, line) => sum + line.quantity, 0),
      paperStock: item?.paperStock ?? DEFAULT_PAPER_STOCK,
      recipientName: order.recipientName,
      phone: order.recipientPhone,
      recipientPhone: order.recipientPhone,
      shippingAddress: order.shippingAddress,
      notes: order.notes,
      status: order.status.toLowerCase() as Lowercase<OrderStatus>,
      orderStatus: order.status,
      sampleFeeVnd: order.subtotalVnd,
      subtotalVnd: order.subtotalVnd,
      shippingVnd: order.shippingVnd,
      totalVnd: order.totalVnd,
      printShopId: order.printShopId,
      printShopName: shop?.name ?? order.printShopId,
      partnerShop: {
        id: order.printShopId,
        name: shop?.name ?? order.printShopId,
        city: shop?.city ?? '',
        contactPhone: shop?.phone ?? '',
      },
      estimatedDeliveryDays: shop?.leadTime ?? '',
      paymentId: order.paymentId,
      paidAt: iso(order.paidAt),
      shippedAt: iso(order.shippedAt),
      deliveredAt: iso(order.deliveredAt),
      cancelledAt: iso(order.cancelledAt),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}

/** `WF-<year in Vietnam>-<4 digits>`. */
function newOrderCode(now = new Date()): string {
  const year = new Date(now.getTime() + 7 * 3_600_000).getUTCFullYear();
  return `WF-${year}-${String(randomInt(0, 10_000)).padStart(4, '0')}`;
}

function isOrderCodeTaken(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false;
  const target = error.meta?.target;
  return Array.isArray(target) ? target.includes('order_code') : String(target ?? '').includes('order_code');
}
