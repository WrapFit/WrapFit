import { Role } from '@prisma/client';

/** Payload of the access token. */
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  /**
   * `users.session_version` when the token was signed: a lower number than the account's means its sessions were
   * revoked since. Absent in tokens signed before session versions existed, which count as 0.
   */
  sv?: number;
}

/** Payload of the refresh token. `jti` is the id of the RefreshToken row; `sv` as in JwtPayload. */
export interface RefreshPayload {
  sub: string;
  jti: string;
  sv?: number;
}

/** The user object attached to `request.user` / `socket.data.user`. */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

/** Identity returned by GoogleStrategy after a successful consent. */
export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  fullName?: string;
  avatarUrl?: string;
}

/** Device information stored with each refresh token (one row per session). */
export interface SessionMeta {
  userAgent?: string;
  ipAddress?: string;
}
