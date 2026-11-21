import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import type { Redis } from 'ioredis';
import { encodePageCursor, olderThan } from '../common/utils/page-cursor.util';
import type { ExportCompletedEvent, ProjectForkedEvent } from '../common';
import { PrismaService } from '../shared/prisma';
import { REDIS } from '../shared/redis';
import { NOTIFICATIONS_CHANNEL } from './notifications.constants';

const notificationSelect = {
  id: true,
  type: true,
  count: true,
  payload: true,
  readAt: true,
  createdAt: true,
  project: { select: { id: true, title: true } },
  order: { select: { id: true, orderCode: true } },
  actor: { select: { fullName: true, shopName: true, anonymizedAt: true } },
} satisfies Prisma.NotificationSelect;

/** An order event for the bell (docs/19 G.5). `event` names what happened, for the wording of the frontend. */
export interface OrderNotification {
  type: Extract<NotificationType, 'ORDER_UPDATE' | 'ORDER_MESSAGE' | 'ORDER_NEW' | 'ORDER_ALERT'>;
  orderId: string;
  userIds: string[];
  /** Who caused it; never notified about their own action. */
  actorId?: string | null;
  payload?: { event: string; [key: string]: unknown };
}

type NotificationRow = Prisma.NotificationGetPayload<{ select: typeof notificationSelect }>;

export interface NotificationView {
  id: string;
  type: NotificationType;
  createdAt: string;
  readAt: string | null;
  /** PROJECT_REMIXED: the recipient's own design (never the remixer's copy). EXPORT_COMPLETED: the exported design. Null for order notifications. */
  project: { id: string; title: string } | null;
  /** ORDER_*: the order. */
  order: { id: string; orderCode: string } | null;
  /** ORDER_*: what happened (accepted, shipped, delivered, rejected, overdue, reassigned, paid, cancelled). */
  event: string | null;
  /** PROJECT_REMIXED: remixes collapsed into this row since it was last read; 1 otherwise. */
  count: number;
  /**
   * PROJECT_REMIXED: name of the latest remixer (full name, else shop name), read now. null when that account has no
   * name, was deleted or was anonymized: the frontend then says "Một người dùng WrapFit". Always null for exports.
   */
  actorName: string | null;
  /** EXPORT_COMPLETED only. */
  export: { jobId: string; fileType: string } | null;
}

export interface NotificationPage {
  items: NotificationView[];
  /** Cursor of the next page (`before`), null on the last one. */
  nextBefore: string | null;
}

/**
 * Stored notification inbox (docs-old/25 S8). Rows are created from internal events in whichever process emits them (the
 * API for remixes, the worker for exports); each creation then publishes the recipient's id on Redis, so the API
 * process can tell that user's open browsers (NotificationsPushBridge). That push is best effort: the row is written
 * first, and the frontend also polls the unread count.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /**
   * "Someone remixed your design", for the author of the original. Nothing for a user remixing their own design.
   * Burst rule: while the author has an unread remix notification of the same design, a new remix updates that row
   * (count + 1, latest remixer, moved to the top) instead of adding one, so a popular design fills one line, not
   * hundreds. Two remixes at the very same moment may still add two rows; the next one folds into both.
   */
  async notifyRemix(event: ProjectForkedEvent): Promise<void> {
    if (event.sourceOwnerId === event.forkedById) return;
    const now = new Date();
    const { count } = await this.prisma.notification.updateMany({
      where: { userId: event.sourceOwnerId, type: 'PROJECT_REMIXED', projectId: event.sourceProjectId, readAt: null },
      data: { actorId: event.forkedById, count: { increment: 1 }, createdAt: now },
    });
    if (count === 0) {
      await this.prisma.notification.create({
        data: {
          userId: event.sourceOwnerId,
          type: 'PROJECT_REMIXED',
          projectId: event.sourceProjectId,
          actorId: event.forkedById,
          createdAt: now,
        },
      });
    }
    await this.push(event.sourceOwnerId);
  }

  /**
   * "Your print file is ready", for the owner of the exported design: one row per finished export job. Written by the
   * worker in the transaction that completes the job (docs-old/30 item 6), so a worker that stops right after the commit
   * cannot lose it and a job run twice cannot add a second one. The live push follows the commit (`push`).
   */
  async recordExportCompleted(tx: Prisma.TransactionClient, event: ExportCompletedEvent): Promise<void> {
    await tx.notification.create({
      data: {
        userId: event.userId,
        type: 'EXPORT_COMPLETED',
        projectId: event.projectId,
        payload: { exportJobId: event.exportJobId, fileType: event.fileType },
      },
    });
  }

  async list(userId: string, limit: number, before?: string): Promise<NotificationPage> {
    const rows = await this.prisma.notification.findMany({
      where: { userId, ...olderThan(before) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: notificationSelect,
    });
    const page = rows.slice(0, limit);
    return {
      items: page.map(present),
      nextBefore: rows.length > limit ? encodePageCursor(page[page.length - 1]) : null,
    };
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    return { count: await this.prisma.notification.count({ where: { userId, readAt: null } }) };
  }

  /** Idempotent; 404 for an id that is not one of the caller's notifications. */
  async markRead(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (count === 0 && !(await this.prisma.notification.findFirst({ where: { id, userId }, select: { id: true } }))) {
      throw new NotFoundException('Notification not found');
    }
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: count };
  }

  /**
   * Order notifications (docs/19 G.5) for several recipients: the customer, the shop's accounts or the admins. A new
   * message folds into the recipient's unread ORDER_MESSAGE row of the same order (count + 1, latest sender), like
   * remixes; other events add a row each. Best effort after the order change is committed: a failure is logged.
   */
  async notifyOrder(event: OrderNotification): Promise<void> {
    const recipients = [...new Set(event.userIds)].filter((id) => id && id !== event.actorId);
    try {
      const now = new Date();
      for (const userId of recipients) {
        if (event.type === 'ORDER_MESSAGE') {
          const { count } = await this.prisma.notification.updateMany({
            where: { userId, type: 'ORDER_MESSAGE', orderId: event.orderId, readAt: null },
            data: { actorId: event.actorId ?? null, count: { increment: 1 }, createdAt: now },
          });
          if (count > 0) continue;
        }
        await this.prisma.notification.create({
          data: {
            userId,
            type: event.type,
            orderId: event.orderId,
            actorId: event.actorId ?? null,
            payload: (event.payload ?? {}) as Prisma.InputJsonValue,
            createdAt: now,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Order notification (${event.type} ${event.orderId}) not stored`, error instanceof Error ? error.stack : String(error));
      return;
    }
    await Promise.all(recipients.map((userId) => this.push(userId)));
  }

  /** Accounts of a print shop, and the administrators: recipients of shop and alert notifications. */
  async shopAccounts(printShopId: string): Promise<string[]> {
    const rows = await this.prisma.printShopMember.findMany({ where: { printShopId, user: { isActive: true } }, select: { userId: true } });
    return rows.map((row) => row.userId);
  }

  async adminAccounts(): Promise<string[]> {
    const rows = await this.prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
    return rows.map((row) => row.id);
  }

  /** Never throws: Redis down only means the browser learns at its next poll. */
  /** Tells the user's open browsers that the inbox changed. Best effort: a Redis error is logged, never thrown. */
  async push(userId: string): Promise<void> {
    try {
      await this.redis.publish(NOTIFICATIONS_CHANNEL, userId);
    } catch (error) {
      this.logger.warn(`Live push skipped (Redis): ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

const ORDER_TYPES: readonly NotificationType[] = ['ORDER_UPDATE', 'ORDER_MESSAGE', 'ORDER_NEW', 'ORDER_ALERT'];

function present(row: NotificationRow): NotificationView {
  const payload = (row.payload ?? {}) as Partial<{ exportJobId: string; fileType: string; event: string }>;
  const actor = row.actor && !row.actor.anonymizedAt ? row.actor : null;
  const named = row.type === 'PROJECT_REMIXED' || row.type === 'ORDER_MESSAGE';
  return {
    id: row.id,
    type: row.type,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
    project: row.project,
    order: row.order,
    event: ORDER_TYPES.includes(row.type) ? (payload.event ?? null) : null,
    count: row.count,
    actorName: named ? actor?.fullName?.trim() || actor?.shopName?.trim() || null : null,
    export:
      row.type === 'EXPORT_COMPLETED' && payload.exportJobId
        ? { jobId: payload.exportJobId, fileType: payload.fileType ?? '' }
        : null,
  };
}
