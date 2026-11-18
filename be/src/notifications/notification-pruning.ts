import type { PrismaClient } from '@prisma/client';
import { MAX_NOTIFICATIONS_PER_USER, READ_NOTIFICATION_RETENTION_DAYS } from './notifications.constants';

/** Rows deleted per statement, so one run never holds long locks on the table. */
const PRUNE_BATCH = 5000;

/**
 * Bounds the notifications table (run daily by AuthMaintenanceTask): deletes read notifications older than
 * READ_NOTIFICATION_RETENTION_DAYS, then every row past the MAX_NOTIFICATIONS_PER_USER newest of its user, read or not.
 * Running it twice, or on several instances at once, is harmless.
 */
export async function pruneNotifications(
  prisma: Pick<PrismaClient, '$executeRaw'>,
  now = new Date(),
): Promise<{ read: number; overCap: number }> {
  const cutoff = new Date(now.getTime() - READ_NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const read = await inBatches(
    (limit) => prisma.$executeRaw`
      DELETE FROM notifications WHERE id IN (
        SELECT id FROM notifications
        WHERE read_at IS NOT NULL AND created_at < ${cutoff}::timestamptz
        LIMIT ${limit} FOR UPDATE SKIP LOCKED)`,
  );
  // Only users over the cap are ranked; the (user_id, created_at DESC, id DESC) index serves the window.
  const overCap = await inBatches(
    (limit) => prisma.$executeRaw`
      DELETE FROM notifications WHERE id IN (
        SELECT id FROM (
          SELECT n.id, row_number() OVER (PARTITION BY n.user_id ORDER BY n.created_at DESC, n.id DESC) AS rank
          FROM notifications n
          WHERE n.user_id IN (
            SELECT user_id FROM notifications GROUP BY user_id HAVING count(*) > ${MAX_NOTIFICATIONS_PER_USER})
        ) ranked
        WHERE ranked.rank > ${MAX_NOTIFICATIONS_PER_USER}
        LIMIT ${limit})`,
  );
  return { read, overCap };
}

async function inBatches(deleteBatch: (limit: number) => Promise<number>): Promise<number> {
  let total = 0;
  for (;;) {
    const deleted = await deleteBatch(PRUNE_BATCH);
    total += deleted;
    if (deleted < PRUNE_BATCH) return total;
  }
}
