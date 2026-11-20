import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../../src/shared/prisma';

/**
 * Deletes test accounts at the end of a suite. Payments, orders, credit lots and subscriptions block a hard delete of
 * their user (ON DELETE RESTRICT, docs-old/25 item 3), as does a bank transaction the user resolved, so they go first.
 * Everything else cascades from the user row as before.
 */
export async function deleteUsers(prisma: PrismaService, where: Prisma.UserWhereInput): Promise<void> {
  const ids = (await prisma.user.findMany({ where, select: { id: true } })).map((user) => user.id);
  if (!ids.length) return;
  const userId = { in: ids };
  await prisma.bankTransaction.updateMany({ where: { resolvedBy: userId }, data: { resolvedBy: null } });
  await prisma.subscription.deleteMany({ where: { userId } });
  await purgeLedger(prisma, { order: { userId } });
  await prisma.order.deleteMany({ where: { userId } });
  await prisma.creditLot.deleteMany({ where: { userId } });
  await prisma.payment.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

/**
 * Removes ledger entries of test orders. The ledger is append-only (trigger of 20261120000100_print_partners); only a
 * transaction that sets `wrapfit.allow_ledger_purge` may delete, and only tests do.
 */
export async function purgeLedger(prisma: PrismaService, where: Prisma.LedgerEntryWhereInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('wrapfit.allow_ledger_purge', 'on', true)`;
    await tx.ledgerEntry.deleteMany({ where });
  });
}
