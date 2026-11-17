import { ConflictException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import type { StorageService } from '../storage';

/** What `DELETE /users/:id` did: the row is gone, or it stays without anything that identifies the person. */
export type UserRemovalResult = 'DELETED' | 'ANONYMIZED';

/** Name shown instead of the person on what stays (their comments on a design an order still needs). */
export const ANONYMIZED_NAME = 'Tài khoản đã xóa';

/**
 * Email of an anonymized account: unique (the id), never deliverable (`.invalid` is reserved, RFC 2606) and never a
 * login (no password, no Google id, inactive). The person's real address is free to register again.
 */
export const anonymizedEmail = (userId: string) => `deleted-${userId}@deleted.invalid`;

export const userAnonymized = () =>
  new ConflictException({ code: 'USER_ANONYMIZED', message: 'This account was deleted and anonymized' });

/**
 * Financial history (docs/25 item 3): any payment in any status, any order in any status, a purchased credit lot, a
 * subscription (only created by a payment), or a bank transaction the user resolved as an admin. A user with it is
 * anonymized, never hard-deleted: the foreign keys of these tables are ON DELETE RESTRICT, so a hard delete fails.
 */
export async function hasFinancialHistory(tx: Prisma.TransactionClient, userId: string): Promise<boolean> {
  const [row] = await tx.$queryRaw<{ found: boolean }[]>`
    SELECT EXISTS (SELECT 1 FROM payments WHERE user_id = ${userId}::uuid)
        OR EXISTS (SELECT 1 FROM orders WHERE user_id = ${userId}::uuid)
        OR EXISTS (SELECT 1 FROM credit_lots WHERE user_id = ${userId}::uuid AND source = 'PURCHASE')
        OR EXISTS (SELECT 1 FROM subscriptions WHERE user_id = ${userId}::uuid)
        OR EXISTS (SELECT 1 FROM bank_transactions WHERE resolved_by = ${userId}::uuid) AS found`;
  return row.found;
}

/**
 * Hard delete of a user without financial history, inside the caller's transaction. Returns the keys of the objects
 * to delete from the bucket after the commit. Their free credit lots (ADMIN, PLAN_ALLOWANCE, with their debits) go
 * first: credit_lots.user_id is ON DELETE RESTRICT. The rest cascades from the user row, as before: their own
 * notifications go with it, and remix notifications they caused in other inboxes lose their actor (ON DELETE SET NULL),
 * so those show "Một người dùng WrapFit".
 */
export async function hardDeleteUser(tx: Prisma.TransactionClient, storage: StorageService, userId: string) {
  const keys = await storage.releaseUserFiles(userId, tx);
  await tx.creditLot.deleteMany({ where: { userId } });
  await tx.user.delete({ where: { id: userId } });
  return keys;
}

/**
 * Anonymizes a user with financial history, inside the caller's transaction (the user row is locked). Returns the
 * keys of the objects to delete from the bucket after the commit.
 *
 * Kept: payments, orders and their lines and history, credit lots and debits, export unlocks, subscriptions, bank
 * transactions, AI usage rows (without their prompts), and the designs an order that is not cancelled prints, with
 * their files, snapshots, export jobs and unboxing page (QR codes may be printed on boxes already). Those designs
 * turn PRIVATE, cannot be remixed, leave the trash (the purge would delete them) and lose their review link.
 *
 * Deleted: every other design with its files, as a hard delete does (uploads shown by remixes of other users are
 * handed over to them), uploads no kept design shows (avatar, logo, AI images, fonts), collections, likes (counts
 * corrected), refresh and email tokens, the print shop membership, the user's own notifications.
 *
 * Scrubbed: the user row (email, names, shop, avatar, brand kit, billing details, password, Google id, referral
 * code), the author name of the user's comments on kept designs, the user id of analytics events, the actor of the
 * remix notifications they caused in other inboxes (those never stored a name; they now show "Một người dùng WrapFit").
 *
 * Nothing can be paid any more: PENDING payments become CANCELLED (a late transfer lands UNMATCHED for an admin to
 * refund) and PENDING_PAYMENT orders become CANCELLED, with a history row by the admin.
 */
export async function anonymizeUser(
  tx: Prisma.TransactionClient,
  storage: StorageService,
  userId: string,
  actorId: string,
  now = new Date(),
): Promise<string[]> {
  await tx.payment.updateMany({ where: { userId, status: 'PENDING' }, data: { status: 'CANCELLED' } });
  const unpaid = await tx.order.findMany({
    where: { userId, status: OrderStatus.PENDING_PAYMENT },
    select: { id: true },
  });
  if (unpaid.length) {
    const ids = unpaid.map((order) => order.id);
    await tx.order.updateMany({
      where: { id: { in: ids }, status: OrderStatus.PENDING_PAYMENT },
      data: { status: OrderStatus.CANCELLED, cancelledAt: now },
    });
    await tx.orderStatusHistory.createMany({
      data: ids.map((orderId) => ({
        orderId,
        fromStatus: OrderStatus.PENDING_PAYMENT,
        toStatus: OrderStatus.CANCELLED,
        changedById: actorId,
        note: 'Tài khoản bị xóa',
      })),
    });
  }

  const kept = (
    await tx.$queryRaw<{ id: string }[]>`
      SELECT DISTINCT p.id FROM packaging_projects p
      JOIN order_items i ON i.project_id = p.id
      JOIN orders o ON o.id = i.order_id
      WHERE p.user_id = ${userId}::uuid AND o.status <> 'CANCELLED'`
  ).map((row) => row.id);
  const dropped = (
    await tx.packagingProject.findMany({ where: { userId, id: { notIn: kept } }, select: { id: true } })
  ).map((project) => project.id);

  const files = await storage.releaseFilesForAnonymization(tx, userId, kept, dropped);
  await tx.$executeRaw`
    UPDATE packaging_projects p SET likes_count = GREATEST(p.likes_count - 1, 0)
    FROM project_likes l WHERE l.project_id = p.id AND l.user_id = ${userId}::uuid`;
  await tx.projectLike.deleteMany({ where: { userId } });
  if (dropped.length) await tx.packagingProject.deleteMany({ where: { id: { in: dropped } } });
  if (files.unattachedIds.length) await tx.storedFile.deleteMany({ where: { id: { in: files.unattachedIds } } });

  if (kept.length) {
    await tx.packagingProject.updateMany({
      where: { id: { in: kept } },
      data: { visibility: 'PRIVATE', allowFork: false },
    });
    await tx.packagingProject.updateMany({
      where: { id: { in: kept }, status: 'DELETED' },
      data: { status: 'ARCHIVED', deletedAt: null },
    });
    await tx.projectReview.updateMany({ where: { projectId: { in: kept } }, data: { token: null } });
  }
  await tx.designComment.updateMany({ where: { authorUserId: userId }, data: { authorName: ANONYMIZED_NAME } });

  await tx.projectCollection.deleteMany({ where: { userId } });
  await tx.refreshToken.deleteMany({ where: { userId } });
  await tx.authToken.deleteMany({ where: { userId } });
  await tx.printShopMember.deleteMany({ where: { userId } });
  await tx.notification.deleteMany({ where: { userId } });
  await tx.notification.updateMany({ where: { actorId: userId }, data: { actorId: null } });
  await tx.productEvent.updateMany({ where: { userId }, data: { userId: null } });
  await tx.aiGeneration.updateMany({ where: { userId }, data: { theme: '' } });
  await tx.aiImageJob.updateMany({ where: { userId }, data: { prompt: null, promptEn: null } });

  await tx.user.update({
    where: { id: userId },
    data: {
      email: anonymizedEmail(userId),
      passwordHash: null,
      googleId: null,
      emailVerifiedAt: null,
      fullName: null,
      avatarUrl: null,
      avatarKey: null,
      shopName: null,
      brandKit: Prisma.DbNull,
      billingDetails: Prisma.DbNull,
      referralCode: null,
      isActive: false,
      // Access tokens already handed out stop working at once (JwtStrategy compares it).
      sessionVersion: { increment: 1 },
      anonymizedAt: now,
    },
  });
  return files.keys;
}
