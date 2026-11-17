import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../../src/shared/prisma';

/**
 * Deletes test accounts at the end of a suite. Payments, orders, credit lots and subscriptions block a hard delete of
 * their user (ON DELETE RESTRICT, docs/25 item 3), as does a bank transaction the user resolved, so they go first.
 * Everything else cascades from the user row as before.
 */
export async function deleteUsers(prisma: PrismaService, where: Prisma.UserWhereInput): Promise<void> {
  const ids = (await prisma.user.findMany({ where, select: { id: true } })).map((user) => user.id);
  if (!ids.length) return;
  const userId = { in: ids };
  await prisma.bankTransaction.updateMany({ where: { resolvedBy: userId }, data: { resolvedBy: null } });
  await prisma.subscription.deleteMany({ where: { userId } });
  await prisma.order.deleteMany({ where: { userId } });
  await prisma.creditLot.deleteMany({ where: { userId } });
  await prisma.payment.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}
