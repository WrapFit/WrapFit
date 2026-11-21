import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { OrderMessageAuthor, OrderStatus } from '@prisma/client';
import { messageNeedsWarning } from '@wrapfit/shared';
import { AuthUser } from '../common';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../shared/prisma';
import { OrdersService, type OrderSide } from './orders.service';

/** Days after delivery or cancellation during which the conversation stays open (docs/19 G.4: claims). */
export const MESSAGES_OPEN_DAYS_AFTER_CLOSE = 30;

export interface OrderMessageView {
  id: string;
  authorRole: OrderMessageAuthor;
  /** Shown above the message: the customer's name, the shop's name, "WrapFit". */
  authorName: string;
  /** Written by the viewer. */
  mine: boolean;
  body: string;
  /** Contains a phone or account number sent before the shop took the order (docs/19 BR-G19). */
  flagged: boolean;
  createdAt: string;
}

const AUTHOR_OF: Record<OrderSide, OrderMessageAuthor> = {
  CUSTOMER: OrderMessageAuthor.CUSTOMER,
  SHOP: OrderMessageAuthor.SHOP,
  ADMIN: OrderMessageAuthor.ADMIN,
};

/**
 * The conversation of an order (docs/19 G.4, BR-G17): the official channel between the customer, the shop and WrapFit,
 * kept as evidence. Reading marks the viewer's side as read; writing notifies the other side.
 */
@Injectable()
export class OrderMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(orderId: string, actor: AuthUser): Promise<OrderMessageView[]> {
    const { order, side } = await this.orders.access(orderId, actor);
    const rows = await this.prisma.orderMessage.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
      take: 500,
      select: {
        id: true,
        authorId: true,
        authorRole: true,
        body: true,
        flagged: true,
        createdAt: true,
        author: { select: { fullName: true, shopName: true, anonymizedAt: true } },
      },
    });
    await this.markRead(orderId, side);
    return rows.map((row) => ({
      id: row.id,
      authorRole: row.authorRole,
      authorName:
        row.authorRole === OrderMessageAuthor.SHOP
          ? order.printShop.name
          : row.authorRole === OrderMessageAuthor.CUSTOMER
            ? (!row.author?.anonymizedAt && (row.author?.fullName?.trim() || row.author?.shopName?.trim())) || 'Khách hàng'
            : 'WrapFit',
      mine: row.authorRole === AUTHOR_OF[side] && (side !== 'CUSTOMER' || row.authorId === actor.id || row.authorId === null),
      body: row.body,
      // The flag is for WrapFit and the shop; the customer sees their own text as written.
      flagged: side === 'CUSTOMER' ? false : row.flagged,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async post(orderId: string, actor: AuthUser, text: string): Promise<{ message: OrderMessageView; warning: boolean }> {
    const { order, side } = await this.orders.access(orderId, actor);
    const body = text.trim();
    if (!body) throw new BadRequestException('Tin nhắn trống');
    const closedAt = order.deliveredAt ?? order.cancelledAt;
    if (closedAt && Date.now() - closedAt.getTime() > MESSAGES_OPEN_DAYS_AFTER_CLOSE * 86_400_000 && side !== 'ADMIN') {
      throw new ForbiddenException('Đơn đã đóng quá 30 ngày: liên hệ WrapFit để được hỗ trợ');
    }
    if (order.status === OrderStatus.PENDING_PAYMENT && side === 'SHOP') {
      throw new ForbiddenException('Đơn chưa thanh toán');
    }
    const flagged = side !== 'ADMIN' && !order.acceptedAt && messageNeedsWarning(body);
    const row = await this.prisma.orderMessage.create({
      data: { orderId, authorId: actor.id, authorRole: AUTHOR_OF[side], body, flagged },
      select: { id: true, authorRole: true, body: true, flagged: true, createdAt: true },
    });
    await this.markRead(orderId, side);

    const recipients =
      side === 'CUSTOMER'
        ? await this.notifications.shopAccounts(order.printShopId)
        : side === 'SHOP'
          ? [order.userId]
          : [order.userId, ...(await this.notifications.shopAccounts(order.printShopId))];
    await this.notifications.notifyOrder({ type: 'ORDER_MESSAGE', orderId, userIds: recipients, actorId: actor.id, payload: { event: 'message' } });

    return {
      message: {
        id: row.id,
        authorRole: row.authorRole,
        authorName: side === 'SHOP' ? order.printShop.name : side === 'ADMIN' ? 'WrapFit' : order.recipientName,
        mine: true,
        body: row.body,
        flagged: side === 'CUSTOMER' ? false : row.flagged,
        createdAt: row.createdAt.toISOString(),
      },
      warning: flagged,
    };
  }

  private async markRead(orderId: string, side: OrderSide): Promise<void> {
    if (side === 'ADMIN') return;
    await this.prisma.order.update({
      where: { id: orderId },
      data: side === 'CUSTOMER' ? { customerReadAt: new Date() } : { shopReadAt: new Date() },
    });
  }
}
