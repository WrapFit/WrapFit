/** Auth, profile, brand kit and uploads of the offline demo. */

import type { SafeUser, StorageUsage, UploadPurpose } from "@/types/api";
import { ENTITLEMENTS } from "@wrapfit/shared";
import { badRequest, currentUser, MockHttpError, type Handler } from "../http";
import { db, newId, nowIso, save, setSessionUserId, type MockUser } from "../store";

/** What the API returns of a user: never the password or the demo flag. */
export function publicUser(user: MockUser): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, isDemo, ...safe } = user;
  return safe;
}

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const findByEmail = (email: string) => db().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

const login: Handler = ({ body }) => {
  const email = String(body.email ?? "");
  const password = String(body.password ?? "");
  const user = findByEmail(email);
  // Seeded demo accounts take any password; accounts made in this browser keep theirs.
  if (!user || (user.password !== undefined && user.password !== password)) {
    throw new MockHttpError(401, "Email hoặc mật khẩu không đúng.");
  }
  if (!user.isActive) throw new MockHttpError(403, "Tài khoản đã bị khoá.");
  setSessionUserId(user.id);
  save();
  return { user: publicUser(user), expiresIn: 900 };
};

/**
 * No email can be sent without a backend: the account is verified at once, and the "check your inbox" page lets the
 * visitor sign in straight away with the address and password they chose.
 */
const register: Handler = ({ body }) => {
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const errors: string[] = [];
  if (!EMAIL_RULE.test(email)) errors.push("Email không hợp lệ.");
  if (!PASSWORD_RULE.test(password)) errors.push("Mật khẩu cần 8–72 ký tự, có cả chữ và số.");
  if (errors.length) throw badRequest(errors);
  if (!findByEmail(email)) {
    const now = nowIso();
    db().users.push({
      id: newId(),
      email,
      password,
      emailVerifiedAt: now,
      fullName: typeof body.fullName === "string" && body.fullName.trim() ? body.fullName.trim() : null,
      avatarUrl: null,
      shopName: null,
      role: "MAKER",
      subscriptionTier: "FREE",
      brandKit: null,
      referralCode: null,
      isActive: true,
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    });
    save();
  }
  return { email, emailVerificationRequired: true };
};

const me: Handler = () => publicUser(currentUser());

const logout: Handler = () => {
  setSessionUserId(null);
  save();
};

const updateProfile: Handler = ({ body }) => {
  const user = currentUser();
  if (typeof body.fullName === "string") user.fullName = body.fullName.trim() || null;
  if (typeof body.shopName === "string") user.shopName = body.shopName.trim() || null;
  if (body.avatarUrl !== undefined) user.avatarUrl = (body.avatarUrl as string | null) ?? null;
  user.updatedAt = nowIso();
  save();
  return publicUser(user);
};

const updateBrandKit: Handler = ({ body }) => {
  const user = currentUser();
  const colors = Array.isArray(body.colors) ? (body.colors as string[]) : [];
  if (colors.length < 3 || colors.length > 5) throw badRequest("Bộ nhận diện cần 3–5 màu.");
  user.brandKit = {
    logoUrl: (body.logoUrl as string | null | undefined) ?? null,
    colors,
    fonts: Array.isArray(body.fonts) ? (body.fonts as string[]).slice(0, 3) : [],
    slogan: (body.slogan as string | null | undefined) ?? null,
  } as SafeUser["brandKit"];
  user.updatedAt = nowIso();
  save();
  return publicUser(user);
};

const storageUsage: Handler = (): StorageUsage => {
  const user = currentUser();
  const used = db().storage[user.id] ?? { usedBytes: 0, fileCount: 0 };
  return { tier: user.subscriptionTier, usedBytes: used.usedBytes, quotaBytes: ENTITLEMENTS[user.subscriptionTier].storage.bytes, fileCount: used.fileCount };
};

/** Counts an upload kept in the browser against the plan's storage (`uploadFileToStorage` stores the file itself). */
export function recordUpload(size: number, purpose: UploadPurpose): void {
  void purpose;
  const user = currentUser();
  const used = (db().storage[user.id] ??= { usedBytes: 0, fileCount: 0 });
  used.usedBytes += size;
  used.fileCount += 1;
  save();
}

/** Nothing to email: the link "works" and the visitor is sent on. */
const accepted: Handler = () => ({});

export const accountRoutes: [string, string, Handler][] = [
  ["POST", "/auth/login", login],
  ["POST", "/auth/register", register],
  ["GET", "/auth/me", me],
  ["POST", "/auth/logout", logout],
  ["POST", "/auth/logout-all", logout],
  ["POST", "/auth/verify-email", () => ({ verified: true })],
  ["POST", "/auth/verify-email/resend", accepted],
  ["POST", "/auth/password/forgot", accepted],
  ["POST", "/auth/password/reset", accepted],
  ["GET", "/users/me", me],
  ["PATCH", "/users/me", updateProfile],
  ["PATCH", "/users/me/brand-kit", updateBrandKit],
  ["GET", "/storage/usage", storageUsage],
];
