import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ExportFileType,
  ExportStatus,
  OrderMessageAuthor,
  OrderStatus,
  Prisma,
  PrintShopMemberRole,
  PrintShopStatus,
  ProjectStatus,
  Role,
} from '@prisma/client';
import {
  acceptDeadlineFrom,
  carrierOf,
  isOrderLate,
  platformFeeSplit,
  shipmentProblem,
  trackingLinkOf,
  type BoxDimensions,
} from '@wrapfit/shared';
import { randomInt } from 'crypto';
import { AuthUser } from '../common';
import { NotificationsService, type OrderNotification } from '../notifications/notifications.service';
import { PrismaService } from '../shared/prisma';
import { StorageService } from '../storage/storage.service';
import { PrintShopsService, type MatchLine, type PrintShopMatchResponse } from '../print-shops';
import { CreateSampleBundleDto } from './dto/create-sample-bundle.dto';
import { CreateSampleOrderDto } from './dto/create-sample-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { MatchSampleShopsDto } from './dto/match-sample-shops.dto';
import { ReassignOrderDto } from './dto/order-flow.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { postOrderDelivered, postOrderPaid } from './ledger';
import { STATUS_TIMESTAMP, canTransition, roleMaySet } from './order-status';

/** Sample print fee: 49.000đ for the first box of a design, 25.000đ for each extra box. */
export const SAMPLE_FIRST_BOX_VND = 49_000;
export const SAMPLE_EXTRA_BOX_VND = 25_000;
export const sampleFeeVnd = (quantity: number) => SAMPLE_FIRST_BOX_VND + Math.max(0, quantity - 1) * SAMPLE_EXTRA_BOX_VND;

const DEFAULT_PAPER_STOCK = 'Kraft 350g cán màng mờ';
const ORDER_CODE_ATTEMPTS = 8;
/** Print file links a shop receives last this long. */
const PRINT_FILE_URL_TTL_SECONDS = 15 * 60;

/**
 * 409 for a payment whose sample order no longer waits for it (cancelled, or already paid by another payment). Thrown
 * before anything is written, so a caller may catch it and keep using its transaction.
 */
export const ORDER_NOT_PAYABLE = 'ORDER_NOT_PAYABLE';
const orderNotPayable = (status: OrderStatus | undefined) =>
  new HttpException(
    {
      code: ORDER_NOT_PAYABLE,
      message: status === OrderStatus.CANCELLED ? 'Đơn hàng đã bị hủy, không thể thanh toán' : 'Đơn hàng không còn chờ thanh toán',
    },
    HttpStatus.CONFLICT,
  );

/** 400 when no partner shop can print the order (docs/19 AF-G1); the body lists why each shop was left out. */
export const NO_PRINT_SHOP = 'NO_PRINT_SHOP';
/** 400 when the shop the customer chose can no longer take the order (docs/19 BR-G16, EF-G1). */
export const PRINT_SHOP_UNAVAILABLE = 'PRINT_SHOP_UNAVAILABLE';

const ORDER_INCLUDE = {
  items: { orderBy: { id: 'asc' } },
  printShop: { select: { name: true, city: true, phone: true, zalo: true, leadTimeLabel: true } },
  history: { orderBy: { createdAt: 'asc' }, select: { fromStatus: true, toStatus: true, note: true, createdAt: true } },
} satisfies Prisma.OrderInclude;
export type OrderRow = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

/** Who looks at an order (docs/19 G.4): what they see of the other side depends on it. */
export type OrderSide = 'CUSTOMER' | 'SHOP' | 'ADMIN';

export interface OrderAccess {
  order: OrderRow;
  side: OrderSide;
  /** SHOP only: the role of the account in the shop (OWNER sees money, STAFF the production). */
  shopRole: PrintShopMemberRole | null;
}

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
  /** Every design of the order (one bill): the top-level fields above describe the first one. */
  items: { projectId: string | null; projectTitle: string; quantity: number; lineTotalVnd: number; paperStock: string; projectVersion: number }[];
  recipientName: string;
  /** Empty for the shop until it has taken the order (docs/19 G.4). */
  phone: string;
  recipientPhone: string;
  shippingAddress: string;
  recipientProvince: string | null;
  notes: string | null;
  status: Lowercase<OrderStatus>;
  orderStatus: OrderStatus;
  sampleFeeVnd: number;
  subtotalVnd: number;
  shippingVnd: number;
  /**
   * shortcut: vouchers were removed on 2026-11-16 (docs-old/25 item 1), so these are always 0 and null. The columns
   * orders.discount_vnd and orders.promo_code and these fields stay for a later voucher feature, without a migration.
   */
  discountVnd: number;
  promoCode: string | null;
  totalVnd: number;
  printShopId: string;
  printShopName: string;
  /** `contactPhone` / `zalo` are empty until the shop has taken the order (docs/19 G.4). */
  partnerShop: { id: string; name: string; city: string; contactPhone: string; zalo: string | null };
  estimatedDeliveryDays: string;
  /** Date the customer should receive the boxes, YYYY-MM-DD; null on orders placed before it was kept. */
  estimatedDelivery: string | null;
  /** Not delivered by `estimatedDelivery`. */
  isLate: boolean;
  /** The shop's answer to a paid order (docs/19 BR-A8). */
  acceptDeadline: string | null;
  acceptedAt: string | null;
  /** Set while the order waits to be moved to another shop. */
  rejectedAt: string | null;
  /** Staff only. */
  rejectReason?: string | null;
  carrier: string | null;
  carrierName: string | null;
  trackingCode: string | null;
  /** Public tracking page of the carrier, when known. */
  trackingUrl: string | null;
  /** Every status the order went through, oldest first. */
  timeline: { status: OrderStatus; at: string; note: string | null }[];
  /** Messages from the other side not read yet by the viewer. */
  unreadMessages: number;
  paymentId: string | null;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** ADMIN and the shop's OWNER: WrapFit's platform fee and the shop's share, as fixed when ordered. */
  platformFeeBps?: number;
  platformFeeVnd?: number;
  shopPayableVnd?: number;
}

/** A print file of an order line, for the shop (docs/19 G.5). */
export interface OrderPrintFile {
  projectTitle: string;
  projectVersion: number;
  fileType: ExportFileType;
  fileName: string;
  url: string;
  expiresIn: number;
}

const EXTENSION: Record<ExportFileType, string> = {
  PDF_CMYK: 'pdf',
  PDF_A4_PRINT: 'pdf',
  SVG: 'svg',
  DXF: 'dxf',
  PRINT_PACKAGE: 'zip',
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly printShops: PrintShopsService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  async createSampleOrder(userId: string, dto: CreateSampleOrderDto): Promise<SampleOrderResponse> {
    const { projectId, quantity, paperStock, ...common } = dto;
    return this.createSampleBundle(userId, { ...common, items: [{ projectId, quantity, paperStock }] });
  }

  /**
   * Shops that can print these designs, ranked for the customer (docs/19 G.3): the cart shows them before payment, and
   * an order placed without a shop goes to the first one.
   */
  async matchSampleShops(userId: string, dto: MatchSampleShopsDto): Promise<PrintShopMatchResponse> {
    const projects = await this.ownedProjects(userId, dto.items.map((item) => item.projectId));
    return this.printShops.match(this.matchLines(projects, dto.items), {
      kind: 'sample',
      provinceCode: dto.provinceCode ?? null,
      returningShopIds: await this.returningShops(userId),
    });
  }

  /**
   * Several designs in one order: one bill, one payment. Each design is a line; the fee covers the bill. There is no
   * voucher: every order is created PENDING_PAYMENT with a total of at least one first-box fee, and only a confirmed
   * payment (PaymentsService.confirmPaid) or an admin by hand moves it to PAID.
   */
  async createSampleBundle(userId: string, dto: CreateSampleBundleDto): Promise<SampleOrderResponse> {
    const phone = (dto.phone || dto.recipientPhone)?.trim();
    if (!phone) {
      throw new BadRequestException('Vui lòng cung cấp số điện thoại người nhận');
    }

    const projects = await this.ownedProjects(userId, dto.items.map((item) => item.projectId));
    const lines = dto.items.map((item) => {
      const project = projects.find((p) => p.id === item.projectId)!;
      const quantity = item.quantity ?? 1;
      return { project, quantity, paperStock: item.paperStock, fee: sampleFeeVnd(quantity) };
    });

    // The shop is checked again now, not only when the cart showed it (docs/19 BR-G16).
    const match = await this.printShops.match(this.matchLines(projects, dto.items), {
      kind: 'sample',
      provinceCode: dto.recipientProvince ?? null,
      returningShopIds: await this.returningShops(userId),
    });
    const shopId = dto.printShopId ?? match.recommendedId;
    if (!shopId) {
      throw new BadRequestException({
        code: NO_PRINT_SHOP,
        message: 'Chưa có xưởng đối tác nào in được đơn này',
        excluded: match.excluded.map(({ shop, reasons }) => ({ id: shop.id, name: shop.name, reasons })),
      });
    }
    const offer = match.offers.find((candidate) => candidate.shop.id === shopId);
    if (!offer) {
      const left = match.excluded.find(({ shop }) => shop.id === shopId);
      throw new BadRequestException({
        code: PRINT_SHOP_UNAVAILABLE,
        message: 'Xưởng in này chưa nhận đơn',
        reasons: left?.reasons ?? ['not_active'],
        recommendedId: match.recommendedId,
      });
    }
    const partner = await this.printShops.findRow(shopId);
    if (!partner || partner.status !== PrintShopStatus.ACTIVE) {
      throw new BadRequestException('Xưởng in này chưa nhận đơn');
    }

    // Every line has at least one box, so the total is never 0.
    const subtotal = lines.reduce((sum, line) => sum + line.fee, 0);
    const fee = platformFeeSplit({ subtotalVnd: subtotal, totalVnd: subtotal }, partner.platformFeeBps);
    const data = (orderCode: string): Prisma.OrderCreateInput => ({
      orderCode,
      user: { connect: { id: userId } },
      printShop: { connect: { id: partner.id } },
      recipientName: dto.recipientName.trim(),
      recipientPhone: phone,
      shippingAddress: dto.shippingAddress.trim(),
      recipientProvince: dto.recipientProvince ?? null,
      notes: dto.notes?.trim() || null,
      subtotalVnd: subtotal,
      shippingVnd: 0,
      totalVnd: subtotal,
      platformFeeBps: fee.platformFeeBps,
      platformFeeVnd: fee.platformFeeVnd,
      shopPayableVnd: fee.shopPayableVnd,
      estimatedDelivery: offer.estimatedDelivery,
      items: {
        create: lines.map(({ project, quantity, paperStock, fee: lineFee }) => ({
          project: { connect: { id: project.id } },
          projectVersion: project.version,
          projectTitle: project.title,
          structure: project.templateId,
          dimensions: project.dimensions as Prisma.InputJsonValue,
          paperStock: paperStock?.trim() || DEFAULT_PAPER_STOCK,
          quantity,
          unitPriceVnd: SAMPLE_FIRST_BOX_VND,
          lineTotalVnd: lineFee,
        })),
      },
      history: { create: { toStatus: OrderStatus.PENDING_PAYMENT, changedById: userId } },
    });

    // WF-<year>-<6 digits>: short enough to read over the phone. The unique index on order_code catches a taken code
    // (also between two requests at once), which is retried with a new number.
    for (let attempt = 1; ; attempt++) {
      try {
        const order = await this.prisma.order.create({ data: data(newOrderCode()), include: ORDER_INCLUDE });
        return this.toResponse(order, 'CUSTOMER');
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
    const unread = await this.unreadCounts(orders.map((order) => order.id), 'CUSTOMER');
    return orders.map((order) => this.toResponse(order, 'CUSTOMER', { unread: unread[order.id] }));
  }

  /**
   * One order, as its viewer may see it: the owner, an account of its shop or an admin. Anyone else gets 404, like a
   * missing order.
   */
  async getOrder(id: string, actor: AuthUser): Promise<SampleOrderResponse> {
    const { order, side, shopRole } = await this.access(id, actor);
    const unread = await this.unreadCounts([order.id], side);
    return this.toResponse(order, side, { shopRole, unread: unread[order.id] });
  }

  /** Orders to handle: every shop for ADMIN, the account's own shop for PRINT_SHOP. */
  async listForStaff(actor: AuthUser, query: ListOrdersQueryDto): Promise<SampleOrderResponse[]> {
    const member = actor.role === Role.ADMIN ? null : await this.memberOf(actor.id);
    const printShopId = member ? member.printShopId : query.printShopId;
    const orders = await this.prisma.order.findMany({
      where: { printShopId, status: query.status },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      include: ORDER_INCLUDE,
    });
    const side: OrderSide = member ? 'SHOP' : 'ADMIN';
    const unread = await this.unreadCounts(orders.map((order) => order.id), side);
    return orders.map((order) => this.toResponse(order, side, { shopRole: member?.role ?? null, unread: unread[order.id] }));
  }

  /**
   * Moves an order one step (ADMIN, or PRINT_SHOP for its own shop's production steps). A print shop asking for an
   * order of another shop gets 404; a step outside the lifecycle, or an order changed meanwhile, gets 409.
   * docs/19 G.5: a shop starts printing only an order it took; SHIPPED needs the carrier and its code (BR-G25); a shop
   * saying DELIVERED writes its proof in the note (BR-G23).
   */
  async changeStatus(id: string, actor: AuthUser, dto: UpdateOrderStatusDto): Promise<SampleOrderResponse> {
    const { order, side, shopRole } = await this.access(id, actor);
    if (side === 'CUSTOMER') throw new NotFoundException('Đơn hàng không tồn tại');
    if (!roleMaySet(actor.role, dto.status)) {
      throw new ForbiddenException('Tài khoản xưởng in chỉ cập nhật các bước in, giao và đã giao');
    }
    const extra: Prisma.OrderUpdateManyMutationInput = {};
    if (dto.status === OrderStatus.IN_PRODUCTION && !order.acceptedAt) {
      if (side === 'SHOP') throw new ConflictException('Hãy nhận đơn trước khi bắt đầu in');
      extra.acceptedAt = new Date();
    }
    if (dto.status === OrderStatus.SHIPPED) {
      const problem = shipmentProblem(dto.carrier, dto.trackingCode);
      if (problem) throw new BadRequestException(problem);
      extra.carrier = dto.carrier!;
      extra.trackingCode = carrierOf(dto.carrier)!.needsCode ? dto.trackingCode!.trim() : null;
    }
    if (dto.status === OrderStatus.DELIVERED && side === 'SHOP' && (dto.note?.trim().length ?? 0) < 5) {
      throw new BadRequestException('Ghi bằng chứng đã giao (hãng báo đã giao, người nhận ký…) vào ghi chú');
    }
    const updated = await this.prisma.$transaction((tx) =>
      this.transitionIn(tx, id, order.status, dto.status, { changedById: actor.id, note: dto.note, extra }),
    );
    if (dto.status === OrderStatus.SHIPPED) {
      const carrier = carrierOf(dto.carrier)!;
      await this.systemMessage(id, `Đã gửi hàng qua ${carrier.name}${updated.trackingCode ? `, mã vận đơn ${updated.trackingCode}` : ''}.`);
    }
    await this.notifyCustomer(updated, `${dto.status.toLowerCase()}`, actor.id);
    if (side === 'ADMIN' && dto.status === OrderStatus.CANCELLED) {
      await this.notifyShop(updated.printShopId, updated.id, 'ORDER_UPDATE', 'cancelled', actor.id);
    }
    return this.toResponse(updated, side, { shopRole });
  }

  /** The shop takes a paid order (docs/19 BR-A8): its phone shows to the customer from now on. */
  async accept(id: string, actor: AuthUser): Promise<SampleOrderResponse> {
    const { order, side, shopRole } = await this.access(id, actor);
    if (side === 'CUSTOMER') throw new NotFoundException('Đơn hàng không tồn tại');
    const { count } = await this.prisma.order.updateMany({
      where: { id, printShopId: order.printShopId, status: OrderStatus.PAID, acceptedAt: null, rejectedAt: null },
      data: { acceptedAt: new Date() },
    });
    if (count === 0) throw new ConflictException('Đơn không còn chờ xưởng nhận');
    await this.systemMessage(id, `${order.printShop.name} đã nhận đơn.`);
    const updated = await this.load(id);
    await this.notifyCustomer(updated, 'accepted', actor.id);
    return this.toResponse(updated, side, { shopRole });
  }

  /** The shop refuses a paid order it has not taken; the admin moves it to another shop (docs/19 AF-A2). */
  async reject(id: string, actor: AuthUser, reason: string): Promise<SampleOrderResponse> {
    const { order, side, shopRole } = await this.access(id, actor);
    if (side !== 'SHOP') throw new ForbiddenException('Chỉ xưởng của đơn được từ chối đơn');
    const { count } = await this.prisma.order.updateMany({
      where: { id, printShopId: order.printShopId, status: OrderStatus.PAID, acceptedAt: null, rejectedAt: null },
      data: { rejectedAt: new Date(), rejectReason: reason.trim() },
    });
    if (count === 0) throw new ConflictException('Đơn không còn chờ xưởng nhận');
    await this.systemMessage(id, 'Xưởng không nhận được đơn này. WrapFit đang chuyển đơn sang xưởng khác.');
    const updated = await this.load(id);
    await this.notifications.notifyOrder({
      type: 'ORDER_ALERT',
      orderId: id,
      userIds: await this.notifications.adminAccounts(),
      actorId: actor.id,
      payload: { event: 'rejected', reason: reason.trim() },
    });
    await this.notifyCustomer(updated, 'reassigning', actor.id);
    return this.toResponse(updated, side, { shopRole });
  }

  /**
   * ADMIN moves a paid order no shop has taken (refused, late, or the shop paused) to a shop that can print it. The
   * platform fee follows the new shop's contract; the new shop gets a fresh deadline and a "new order" notification.
   */
  async reassign(id: string, actor: AuthUser, dto: ReassignOrderDto): Promise<SampleOrderResponse> {
    const order = await this.load(id);
    if (order.status !== OrderStatus.PAID || order.acceptedAt) {
      throw new ConflictException('Chỉ chuyển được đơn đã thanh toán mà chưa xưởng nào nhận');
    }
    if (dto.printShopId === order.printShopId && !order.rejectedAt) {
      throw new BadRequestException('Đơn đang ở xưởng này');
    }
    const match = await this.printShops.match(
      order.items.map((item) => ({ structure: item.structure, dimensions: item.dimensions as unknown as BoxDimensions, quantity: item.quantity })),
      { kind: 'sample', provinceCode: order.recipientProvince },
    );
    const offer = match.offers.find((candidate) => candidate.shop.id === dto.printShopId);
    const shop = await this.printShops.findRow(dto.printShopId);
    if (!offer || !shop) {
      const left = match.excluded.find((excluded) => excluded.shop.id === dto.printShopId);
      throw new BadRequestException({ code: PRINT_SHOP_UNAVAILABLE, message: 'Xưởng này không nhận được đơn', reasons: left?.reasons ?? ['not_active'] });
    }
    const fee = platformFeeSplit(order, shop.platformFeeBps);
    const now = new Date();
    const { count } = await this.prisma.order.updateMany({
      where: { id, status: OrderStatus.PAID, acceptedAt: null, printShopId: order.printShopId },
      data: {
        printShopId: shop.id,
        ...fee,
        rejectedAt: null,
        rejectReason: null,
        acceptDeadline: acceptDeadlineFrom(now),
        adminAlertedAt: null,
        shopNotifiedAt: null,
        estimatedDelivery: offer.estimatedDelivery,
      },
    });
    if (count === 0) throw new ConflictException('Đơn hàng vừa được cập nhật, hãy tải lại');
    await this.prisma.orderStatusHistory.create({
      data: { orderId: id, fromStatus: OrderStatus.PAID, toStatus: OrderStatus.PAID, changedById: actor.id, note: `Chuyển sang ${shop.name}${dto.note?.trim() ? `: ${dto.note.trim()}` : ''}` },
    });
    await this.systemMessage(id, `Đơn được chuyển sang ${shop.name}.`);
    const updated = await this.load(id);
    await this.notifyCustomer(updated, 'reassigned', actor.id);
    return this.toResponse(updated, 'ADMIN');
  }

  /** The customer received the boxes (docs/19 BR-G23): the order is delivered and the money is booked. */
  async confirmReceived(id: string, actor: AuthUser): Promise<SampleOrderResponse> {
    const { order, side } = await this.access(id, actor);
    if (side !== 'CUSTOMER') throw new ForbiddenException('Chỉ người đặt đơn xác nhận đã nhận hàng');
    const updated = await this.prisma.$transaction((tx) =>
      this.transitionIn(tx, id, order.status, OrderStatus.DELIVERED, { changedById: actor.id, note: 'Khách xác nhận đã nhận hàng' }),
    );
    await this.notifyShop(updated.printShopId, id, 'ORDER_UPDATE', 'received', actor.id);
    return this.toResponse(updated, 'CUSTOMER');
  }

  /** The latest finished print files of each line's ordered version, as short-lived links (docs/19 G.5). */
  async printFiles(id: string, actor: AuthUser): Promise<OrderPrintFile[]> {
    const { order } = await this.access(id, actor);
    const files: OrderPrintFile[] = [];
    for (const [index, item] of order.items.entries()) {
      if (!item.projectId) continue;
      const jobs = await this.prisma.exportJob.findMany({
        where: { projectId: item.projectId, projectVersion: item.projectVersion, status: ExportStatus.COMPLETED, storageKey: { not: null } },
        orderBy: { completedAt: 'desc' },
        select: { fileType: true, storageKey: true },
      });
      const seen = new Set<ExportFileType>();
      for (const job of jobs) {
        if (seen.has(job.fileType)) continue;
        seen.add(job.fileType);
        const fileName = `${order.orderCode}-${index + 1}-${job.fileType.toLowerCase()}.${EXTENSION[job.fileType]}`;
        files.push({
          projectTitle: item.projectTitle,
          projectVersion: item.projectVersion,
          fileType: job.fileType,
          fileName,
          url: await this.storage.presignDownload(job.storageKey!, fileName, PRINT_FILE_URL_TTL_SECONDS),
          expiresIn: PRINT_FILE_URL_TTL_SECONDS,
        });
      }
    }
    return files;
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
  ): Promise<OrderRow> {
    return this.prisma.$transaction((tx) => this.transitionIn(tx, id, from, to, { changedById, note }));
  }

  /**
   * Locks the order row inside a payment's transaction and throws 409 ORDER_NOT_PAYABLE unless it is still
   * PENDING_PAYMENT. Called before the payment is written. The lock holds until that transaction ends: a cancel that
   * arrives meanwhile waits on the row and then matches nothing (its update requires PENDING_PAYMENT), and a cancel that
   * committed first is seen here.
   */
  async lockPayable(id: string, tx: Prisma.TransactionClient): Promise<void> {
    const rows = await tx.$queryRaw<{ status: OrderStatus }[]>`
      SELECT status FROM orders WHERE id = ${id}::uuid FOR UPDATE`;
    const status = rows[0]?.status;
    if (status !== OrderStatus.PENDING_PAYMENT) throw orderNotPayable(status);
  }

  /**
   * A payment paid the order (S5): PENDING_PAYMENT → PAID with the payment linked, inside the payment's transaction so
   * the order and the payment change together. 409 when the order is no longer waiting for payment. The shop's
   * deadline starts now; OrderFollowUpTask tells the shop after the commit.
   */
  async markPaid(id: string, paymentId: string, tx: Prisma.TransactionClient): Promise<SampleOrderResponse> {
    const order = await this.transitionIn(tx, id, OrderStatus.PENDING_PAYMENT, OrderStatus.PAID, {
      changedById: null,
      paymentId,
      extra: { acceptDeadline: acceptDeadlineFrom(new Date()) },
    });
    return this.toResponse(order, 'CUSTOMER');
  }

  async transitionIn(
    tx: Prisma.TransactionClient,
    id: string,
    from: OrderStatus,
    to: OrderStatus,
    {
      changedById,
      note,
      paymentId,
      extra,
    }: { changedById: string | null; note?: string; paymentId?: string; extra?: Prisma.OrderUpdateManyMutationInput },
  ): Promise<OrderRow> {
    if (!canTransition(from, to)) {
      throw new ConflictException(`Không thể chuyển đơn từ ${from} sang ${to}`);
    }
    const stamp = STATUS_TIMESTAMP[to];
    const { count } = await tx.order.updateMany({
      where: { id, status: from },
      data: { status: to, ...(stamp ? { [stamp]: new Date() } : {}), ...(paymentId ? { paymentId } : {}), ...extra },
    });
    if (count === 0) {
      throw new ConflictException('Đơn hàng vừa được cập nhật, hãy tải lại');
    }
    await tx.orderStatusHistory.create({
      data: { orderId: id, fromStatus: from, toStatus: to, changedById, note: note?.trim() || null },
    });
    const order = await tx.order.findUniqueOrThrow({ where: { id }, include: ORDER_INCLUDE });
    // The ledger moves with the order, in the same transaction (docs/19 A.8).
    if (to === OrderStatus.PAID && order.paymentId) await postOrderPaid(tx, order, order.paymentId);
    if (to === OrderStatus.DELIVERED) await postOrderDelivered(tx, order);
    return order;
  }

  /**
   * The order and who is asking: its owner (CUSTOMER), an account of its shop (SHOP) or an admin. Anyone else gets 404,
   * so an order id tells nothing about orders of others.
   */
  async access(id: string, actor: AuthUser): Promise<OrderAccess> {
    const order = await this.prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (actor.role === Role.ADMIN) return { order, side: 'ADMIN', shopRole: null };
    if (order.userId === actor.id) return { order, side: 'CUSTOMER', shopRole: null };
    if (actor.role === Role.PRINT_SHOP) {
      const member = await this.prisma.printShopMember.findUnique({ where: { userId: actor.id }, select: { printShopId: true, role: true } });
      if (member?.printShopId === order.printShopId) return { order, side: 'SHOP', shopRole: member.role };
    }
    throw new NotFoundException('Đơn hàng không tồn tại');
  }

  /** Account of a PRINT_SHOP user in its shop. An account not linked to a shop has nothing to see. */
  async memberOf(userId: string): Promise<{ printShopId: string; role: PrintShopMemberRole }> {
    const member = await this.prisma.printShopMember.findUnique({ where: { userId }, select: { printShopId: true, role: true } });
    if (!member) {
      throw new ForbiddenException('Tài khoản chưa được gán cho xưởng in nào');
    }
    return member;
  }

  /** Messages from the other side newer than the viewer's last read, per order. */
  async unreadCounts(orderIds: string[], side: OrderSide): Promise<Record<string, number>> {
    if (!orderIds.length || side === 'ADMIN') return {};
    const readColumn = side === 'CUSTOMER' ? Prisma.sql`o.customer_read_at` : Prisma.sql`o.shop_read_at`;
    const rows = await this.prisma.$queryRaw<{ order_id: string; n: number }[]>`
      SELECT m.order_id, count(*)::int AS n
      FROM order_messages m JOIN orders o ON o.id = m.order_id
      WHERE m.order_id = ANY(${orderIds}::uuid[])
        AND m.author_role::text <> ${side}
        AND m.created_at > COALESCE(${readColumn}, 'epoch'::timestamptz)
      GROUP BY m.order_id`;
    return Object.fromEntries(rows.map((row) => [row.order_id, row.n]));
  }

  /** A line of the order's conversation written by WrapFit (accepted, refused, moved, shipped). */
  async systemMessage(orderId: string, body: string): Promise<void> {
    await this.prisma.orderMessage.create({ data: { orderId, authorRole: OrderMessageAuthor.SYSTEM, body } });
  }

  async load(id: string): Promise<OrderRow> {
    return this.prisma.order.findUniqueOrThrow({ where: { id }, include: ORDER_INCLUDE });
  }

  async notifyCustomer(order: Pick<OrderRow, 'id' | 'userId'>, event: string, actorId: string | null): Promise<void> {
    await this.notifications.notifyOrder({ type: 'ORDER_UPDATE', orderId: order.id, userIds: [order.userId], actorId, payload: { event } });
  }

  async notifyShop(printShopId: string, orderId: string, type: OrderNotification['type'], event: string, actorId: string | null): Promise<void> {
    await this.notifications.notifyOrder({ type, orderId, userIds: await this.notifications.shopAccounts(printShopId), actorId, payload: { event } });
  }

  /** The caller's projects among `ids`, not in the trash; 404 when one is missing or someone else's. */
  private async ownedProjects(userId: string, ids: string[]) {
    // Only the owner can order prints of a design, and not from the trash.
    const projects = await this.prisma.packagingProject.findMany({
      where: { id: { in: ids }, userId, status: { not: ProjectStatus.DELETED } },
      select: { id: true, title: true, templateId: true, dimensions: true, version: true, formulaVersion: true },
    });
    if (ids.some((id) => !projects.some((p) => p.id === id))) {
      throw new NotFoundException('Dự án hộp không tồn tại');
    }
    return projects;
  }

  private matchLines(
    projects: { id: string; templateId: string; dimensions: Prisma.JsonValue; formulaVersion: number }[],
    items: { projectId: string; quantity?: number }[],
  ): MatchLine[] {
    return items.map((item) => {
      const project = projects.find((p) => p.id === item.projectId)!;
      return {
        structure: project.templateId,
        dimensions: project.dimensions as unknown as BoxDimensions,
        formulaVersion: project.formulaVersion,
        quantity: item.quantity ?? 1,
      };
    });
  }

  /** Shops that already delivered an order of this customer (docs/19 AF-G4). */
  private async returningShops(userId: string): Promise<string[]> {
    const rows = await this.prisma.order.findMany({
      where: { userId, status: OrderStatus.DELIVERED },
      distinct: ['printShopId'],
      select: { printShopId: true },
    });
    return rows.map((row) => row.printShopId);
  }

  /**
   * The order as `side` may see it (docs/19 G.4): the customer sees the shop's phone once the shop took the order; the
   * shop sees the recipient's phone and address only then; money split for ADMIN and the shop's OWNER.
   */
  toResponse(
    order: OrderRow,
    side: OrderSide,
    { shopRole = null, unread = 0 }: { shopRole?: PrintShopMemberRole | null; unread?: number } = {},
  ): SampleOrderResponse {
    const item = order.items[0];
    const shop = order.printShop;
    const accepted = !!order.acceptedAt;
    const shopContact = side !== 'CUSTOMER' || accepted;
    const recipientHidden = side === 'SHOP' && !accepted;
    const money = side === 'ADMIN' || shopRole === PrintShopMemberRole.OWNER;
    const iso = (date: Date | null) => date?.toISOString() ?? null;
    const phone = recipientHidden ? '' : order.recipientPhone;
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
      items: order.items.map((line) => ({
        projectId: line.projectId,
        projectTitle: line.projectTitle,
        quantity: line.quantity,
        lineTotalVnd: line.lineTotalVnd,
        paperStock: line.paperStock,
        projectVersion: line.projectVersion,
      })),
      recipientName: order.recipientName,
      phone,
      recipientPhone: phone,
      shippingAddress: recipientHidden ? '' : order.shippingAddress,
      recipientProvince: order.recipientProvince,
      notes: order.notes,
      status: order.status.toLowerCase() as Lowercase<OrderStatus>,
      orderStatus: order.status,
      sampleFeeVnd: order.subtotalVnd,
      subtotalVnd: order.subtotalVnd,
      shippingVnd: order.shippingVnd,
      discountVnd: order.discountVnd,
      promoCode: order.promoCode,
      totalVnd: order.totalVnd,
      printShopId: order.printShopId,
      printShopName: shop?.name ?? order.printShopId,
      partnerShop: {
        id: order.printShopId,
        name: shop?.name ?? order.printShopId,
        city: shop?.city ?? '',
        contactPhone: shopContact ? (shop?.phone ?? '') : '',
        zalo: shopContact ? (shop?.zalo ?? null) : null,
      },
      estimatedDeliveryDays: shop?.leadTimeLabel ?? '',
      estimatedDelivery: order.estimatedDelivery,
      isLate: isOrderLate(order.estimatedDelivery, order.status),
      acceptDeadline: iso(order.acceptDeadline),
      acceptedAt: iso(order.acceptedAt),
      rejectedAt: iso(order.rejectedAt),
      ...(side !== 'CUSTOMER' ? { rejectReason: order.rejectReason } : {}),
      carrier: order.carrier,
      carrierName: carrierOf(order.carrier)?.name ?? null,
      trackingCode: order.trackingCode,
      trackingUrl: trackingLinkOf(order.carrier, order.trackingCode),
      timeline: (order.history ?? []).map((row) => ({ status: row.toStatus, at: row.createdAt.toISOString(), note: row.note })),
      unreadMessages: unread,
      paymentId: order.paymentId,
      paidAt: iso(order.paidAt),
      shippedAt: iso(order.shippedAt),
      deliveredAt: iso(order.deliveredAt),
      cancelledAt: iso(order.cancelledAt),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      ...(money ? { platformFeeBps: order.platformFeeBps, platformFeeVnd: order.platformFeeVnd, shopPayableVnd: order.shopPayableVnd } : {}),
    };
  }
}

/**
 * `WF-<year in Vietnam>-<6 digits>`: a million codes a year. Orders made before 2026-11-16 keep their 4 digits; the CHECK
 * chk_orders_order_code accepts both, and nothing parses the code (it is only shown and searched as text).
 */
export function newOrderCode(now = new Date()): string {
  const year = new Date(now.getTime() + 7 * 3_600_000).getUTCFullYear();
  return `WF-${year}-${String(randomInt(0, 1_000_000)).padStart(6, '0')}`;
}

function isOrderCodeTaken(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false;
  const target = error.meta?.target;
  return Array.isArray(target) ? target.includes('order_code') : String(target ?? '').includes('order_code');
}
