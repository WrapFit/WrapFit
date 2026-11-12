import { Prisma, User } from '@prisma/client';
import { assetUrl, toClientBrandKit } from '../storage';

/** Fields that are safe to return to clients (never includes `passwordHash` or `googleId`). */
export const userSelect = {
  id: true,
  email: true,
  emailVerifiedAt: true,
  fullName: true,
  avatarUrl: true,
  avatarKey: true,
  shopName: true,
  role: true,
  subscriptionTier: true,
  brandKit: true,
  referralCode: true,
  isActive: true,
  isDemo: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>;

/** A user as the API returns it: the avatar and the brand kit logo are URLs. */
export type SafeUser = Omit<UserRow, 'avatarKey'>;

/** The uploaded avatar wins over an external one (Google). */
const avatarOf = (row: { avatarUrl: string | null; avatarKey: string | null }) => assetUrl(row.avatarKey) ?? row.avatarUrl;

/** Row selected with `userSelect` -> API shape. */
export function presentUser({ avatarKey, ...row }: UserRow): SafeUser {
  return {
    ...row,
    avatarUrl: avatarOf({ avatarUrl: row.avatarUrl, avatarKey }),
    brandKit: toClientBrandKit(row.brandKit) as Prisma.JsonValue,
  };
}

/** Strips a full `User` row down to the fields listed in `userSelect`. */
export function toSafeUser(user: User): SafeUser {
  const entries = Object.keys(userSelect).map((key) => [key, user[key as keyof User]]);
  return presentUser(Object.fromEntries(entries) as UserRow);
}

/** The author shown on public pages (showcase, template hub, unboxing). */
export const authorSelect = { fullName: true, shopName: true, avatarUrl: true, avatarKey: true } satisfies Prisma.UserSelect;

export const presentAuthor = (row: Prisma.UserGetPayload<{ select: typeof authorSelect }>) => ({
  fullName: row.fullName,
  shopName: row.shopName,
  avatarUrl: avatarOf(row),
});
