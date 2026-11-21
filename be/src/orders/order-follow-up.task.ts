import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { OrderStatus } from '@prisma/client';
import { AUTO_DELIVER_AFTER_DAYS } from '@wrapfit/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../shared/prisma';
import { OrdersService } from './orders.service';

const BATCH = 50;

/**
 * Follows paid orders once a minute (docs/19 G.5), after their transactions committed:
 * 1. tells the shop about a newly paid order (ORDER_NEW), once;
 * 2. tells the admins and the customer when no shop took the order by its deadline (BR-A8), once;
 * 3. marks a shipped order delivered after AUTO_DELIVER_AFTER_DAYS without news (BR-G24), which books its money.
 * Each step claims its rows with a conditional update, so two API instances never notify twice.
 */
@Injectable()
export class OrderFollowUpTask {
  private readonly logger = new Logger(OrderFollowUpTask.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly notifications: NotificationsService,
  ) {}

  @Interval('order-follow-up', 60 * 1000)
  async run(now = new Date()): Promise<{ notified: number; alerted: number; delivered: number }> {
    if (this.running) return { notified: 0, alerted: 0, delivered: 0 };
    this.running = true;
    try {
      return {
        notified: await this.notifyNewOrders(now),
        alerted: await this.alertOverdue(now),
        delivered: await this.autoDeliver(now),
      };
    } catch (error) {
      this.logger.error('Order follow-up failed', error instanceof Error ? error.stack : String(error));
      return { notified: 0, alerted: 0, delivered: 0 };
    } finally {
      this.running = false;
    }
  }

  private async notifyNewOrders(now: Date): Promise<number> {
    const rows = await this.prisma.order.findMany({
      where: { status: OrderStatus.PAID, shopNotifiedAt: null },
      select: { id: true, printShopId: true },
      take: BATCH,
    });
    let done = 0;
    for (const row of rows) {
      const { count } = await this.prisma.order.updateMany({ where: { id: row.id, shopNotifiedAt: null }, data: { shopNotifiedAt: now } });
      if (!count) continue;
      await this.orders.notifyShop(row.printShopId, row.id, 'ORDER_NEW', 'paid', null);
      done++;
    }
    return done;
  }

  private async alertOverdue(now: Date): Promise<number> {
    const rows = await this.prisma.order.findMany({
      where: { status: OrderStatus.PAID, acceptedAt: null, rejectedAt: null, adminAlertedAt: null, acceptDeadline: { lt: now } },
      select: { id: true, userId: true },
      take: BATCH,
    });
    let done = 0;
    for (const row of rows) {
      const { count } = await this.prisma.order.updateMany({ where: { id: row.id, adminAlertedAt: null }, data: { adminAlertedAt: now } });
      if (!count) continue;
      await this.notifications.notifyOrder({
        type: 'ORDER_ALERT',
        orderId: row.id,
        userIds: await this.notifications.adminAccounts(),
        payload: { event: 'overdue' },
      });
      await this.orders.notifyCustomer(row, 'reassigning', null);
      done++;
    }
    return done;
  }

  private async autoDeliver(now: Date): Promise<number> {
    const before = new Date(now.getTime() - AUTO_DELIVER_AFTER_DAYS * 86_400_000);
    const rows = await this.prisma.order.findMany({
      where: { status: OrderStatus.SHIPPED, shippedAt: { lt: before } },
      select: { id: true },
      take: BATCH,
    });
    let done = 0;
    for (const row of rows) {
      try {
        const order = await this.orders.transition(
          row.id,
          OrderStatus.SHIPPED,
          OrderStatus.DELIVERED,
          null,
          `Tự động: ${AUTO_DELIVER_AFTER_DAYS} ngày sau khi gửi hàng không có khiếu nại`,
        );
        await this.orders.notifyCustomer(order, 'delivered', null);
        done++;
      } catch {
        // Moved by someone else meanwhile (409): nothing to do.
      }
    }
    return done;
  }
}
