import { Injectable } from '@nestjs/common';
import { randomBytes, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { readCookie } from '../../common';
import { OAUTH_STATE_COOKIE, safeRedirectPath } from '../auth.constants';
import { AuthCookieService } from '../auth-cookie.service';

export interface SavedOAuthState {
  state: string;
  redirect: string;
}

/** Reads the state cookie written by `OAuthStateStore.store` (also used by the callback to find `redirect`). */
export function readOAuthState(req: Request): SavedOAuthState | null {
  const raw = readCookie(req.cookies, OAUTH_STATE_COOKIE);
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedOAuthState>;
    if (typeof parsed.state !== 'string') return null;
    return { state: parsed.state, redirect: safeRedirectPath(parsed.redirect) };
  } catch {
    return null;
  }
}

/**
 * passport-oauth2 state store backed by a short-lived HttpOnly cookie instead of a server session
 * (the API is stateless). Method arity matters: passport calls `store(req, meta, cb)` and `verify(req, state, cb)`.
 */
@Injectable()
export class OAuthStateStore {
  constructor(private readonly cookies: AuthCookieService) {}

  store(req: Request, _meta: unknown, callback: (err: Error | null, state?: string) => void): void {
    const state = randomBytes(24).toString('base64url');
    const saved: SavedOAuthState = { state, redirect: safeRedirectPath(req.query.redirect) };
    this.cookies.setOAuthState(req.res!, JSON.stringify(saved));
    callback(null, state);
  }

  verify(
    req: Request,
    providedState: string,
    callback: (err: Error | null, ok: boolean, info?: { message: string }) => void,
  ): void {
    const saved = readOAuthState(req);
    const expected = Buffer.from(saved?.state ?? '');
    const actual = Buffer.from(typeof providedState === 'string' ? providedState : '');
    const valid = expected.length > 0 && expected.length === actual.length && timingSafeEqual(expected, actual);
    callback(null, valid, valid ? undefined : { message: 'Invalid OAuth state' });
  }
}
