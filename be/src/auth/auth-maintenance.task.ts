import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { pruneNotifications } from '../notifications/notification-pruning';
import { PrismaService } from '../shared/prisma';

/** Rows deleted per statement, so one run never holds long locks on the auth tables. */
const CLEANUP_BATCH = 5000;

/** One-time email tokens are kept a week after they expire (support: "my link does not work"). */
const AUTH_TOKEN_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Password accounts whose email was never verified are deleted after a week, when they hold nothing: no project, no
 * file, no payment, order or credit. Whoever registered an address without owning it cannot keep it indefinitely.
 */
export const UNVERIFIED_ACCOUNT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Every day at 03:00 (Vietnam time), deletes refresh tokens and email tokens nobody can use any more, so the auth
 * tables do not grow forever, and empty accounts that never verified their email. It also bounds the notification
 * inbox (pruneNotifications: read rows after 30 days, at most 200 rows per user). Running it twice, or on several
 * instances at once, is harmless.
 *
 * Revoked refresh tokens are kept until they expire: replaying one is how token theft is detected (AuthService.refresh).
 * Once expired, its JWT no longer verifies, so the row is useless.
 */
@Injectable()
export class AuthMaintenanceTask {
  private readonly logger = new Logger(AuthMaintenanceTask.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 3 * * *', { name: 'auth-maintenance', timeZone: 'Asia/Ho_Chi_Minh' })
  async run(): Promise<void> {
    try {
      const startedAt = Date.now();
      const { refreshTokens, authTokens, unverifiedAccounts, notifications } = await this.cleanup();
      if (refreshTokens || authTokens || unverifiedAccounts || notifications) {
        this.logger.log(
          `auth.cleanup refreshTokens=${refreshTokens} authTokens=${authTokens} unverifiedAccounts=${unverifiedAccounts} notifications=${notifications} ms=${Date.now() - startedAt}`,
        );
      }
    } catch (error) {
      // A failed run is retried by the next day's run; never let it crash the process.
      this.logger.error('auth.cleanup failed', error instanceof Error ? error.stack : String(error));
    }
  }

  async cleanup(
    now = new Date(),
  ): Promise<{ refreshTokens: number; authTokens: number; unverifiedAccounts: number; notifications: number }> {
    const refreshTokens = await this.deleteInBatches(
      (limit) => this.prisma.$executeRaw`
        DELETE FROM refresh_tokens WHERE id IN (
          SELECT id FROM refresh_tokens WHERE expires_at < ${now.toISOString()}::timestamptz
          LIMIT ${limit} FOR UPDATE SKIP LOCKED)`,
    );
    const cutoff = new Date(now.getTime() - AUTH_TOKEN_RETENTION_MS).toISOString();
    const authTokens = await this.deleteInBatches(
      (limit) => this.prisma.$executeRaw`
        DELETE FROM auth_tokens WHERE id IN (
          SELECT id FROM auth_tokens WHERE expires_at < ${cutoff}::timestamptz
          LIMIT ${limit} FOR UPDATE SKIP LOCKED)`,
    );
    // Their tokens go with them (ON DELETE CASCADE); nothing is left in the bucket (no stored file).
    const accountCutoff = new Date(now.getTime() - UNVERIFIED_ACCOUNT_TTL_MS).toISOString();
    const unverifiedAccounts = await this.deleteInBatches(
      (limit) => this.prisma.$executeRaw`
        DELETE FROM users WHERE id IN (
          SELECT u.id FROM users u
          WHERE u.email_verified_at IS NULL AND u.google_id IS NULL AND u.role <> 'ADMIN'
            AND u.created_at < ${accountCutoff}::timestamptz
            AND NOT EXISTS (SELECT 1 FROM packaging_projects p WHERE p.user_id = u.id)
            AND NOT EXISTS (SELECT 1 FROM stored_files f WHERE f.user_id = u.id)
            -- Money records block a hard delete (ON DELETE RESTRICT, docs-old/25 item 3): such an account is never
            -- empty, and an anonymized one stays for its payments and orders.
            AND u.anonymized_at IS NULL
            AND NOT EXISTS (SELECT 1 FROM payments pay WHERE pay.user_id = u.id)
            AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id)
            AND NOT EXISTS (SELECT 1 FROM credit_lots l WHERE l.user_id = u.id)
            AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id)
            AND NOT EXISTS (SELECT 1 FROM bank_transactions b WHERE b.resolved_by = u.id)
          LIMIT ${limit} FOR UPDATE SKIP LOCKED)`,
    );
    const pruned = await pruneNotifications(this.prisma, now);
    return { refreshTokens, authTokens, unverifiedAccounts, notifications: pruned.read + pruned.overCap };
  }

  private async deleteInBatches(deleteBatch: (limit: number) => Promise<number>): Promise<number> {
    let total = 0;
    for (;;) {
      const deleted = await deleteBatch(CLEANUP_BATCH);
      total += deleted;
      if (deleted < CLEANUP_BATCH) return total;
    }
  }
}
