import type { Prisma } from '@prisma/client';

/**
 * Namespaces (first key) of the transaction advisory locks. Each one serializes one kind of work per user; keeping
 * them in one place stops two features from sharing a number by accident. An advisory lock only waits for itself,
 * unlike a row lock on `users`, which UsersService.remove holds while it waits for the payment locks.
 */
export const ADVISORY_LOCK = {
  /** StorageService.reserveUpload: the quota check and the pending row of an upload. */
  STORAGE_QUOTA: 4801,
  /** PaymentsService (Pro payment): reading and extending the subscription of a user (docs-old/30 item 3). */
  SUBSCRIPTION: 4802,
} as const;

/** Waits for the lock of `key` in `namespace`; PostgreSQL releases it when the transaction ends. */
export async function lockForTransaction(
  tx: Prisma.TransactionClient,
  namespace: (typeof ADVISORY_LOCK)[keyof typeof ADVISORY_LOCK],
  key: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${namespace}::int, hashtext(${key}))`;
}
