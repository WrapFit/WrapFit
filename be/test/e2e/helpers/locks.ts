import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../../src/shared/prisma';

/**
 * Runs `work` in a transaction and keeps it open until `release()`: a checkout, a second tab or a worker caught
 * between its writes and its commit. `started` resolves once `work` is done; `done` settles with the commit.
 */
export function holdTransaction<T>(prisma: PrismaService, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  let written!: () => void;
  const started = new Promise<void>((resolve) => (written = resolve));
  const done = prisma.$transaction(
    async (tx): Promise<T> => {
      const result = await work(tx);
      written();
      await gate;
      return result;
    },
    { timeout: 30_000 },
  );
  return { started, release, done };
}

/** Resolves once `count` sessions of this database wait for a lock (statements blocked by another transaction). */
export async function untilLockWaiters(prisma: PrismaService, count: number): Promise<void> {
  for (let i = 0; i < 200; i++) {
    const [{ n }] = await prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'`;
    if (n >= count) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`fewer than ${count} sessions wait for a lock`);
}
