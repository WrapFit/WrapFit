import { Prisma } from '@prisma/client';

/**
 * Signs the user out of every device, inside the caller's transaction. The refresh tokens are revoked, and the
 * session version moves on so the access tokens already handed out stop working too (JwtStrategy compares it).
 * Returns the number of refresh tokens revoked.
 */
export async function revokeUserSessions(
  tx: Prisma.TransactionClient,
  userId: string,
  now = new Date(),
): Promise<number> {
  const { count } = await tx.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: now },
  });
  await tx.user.updateMany({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
  return count;
}
