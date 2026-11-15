import { Injectable } from '@nestjs/common';
import type { CookieOptions, Response } from 'express';
import { ACCESS_COOKIE, ConfigService, REFRESH_COOKIE, REFRESH_COOKIE_PATH, SECURE_COOKIE_PREFIX } from '../common';
import { OAUTH_STATE_COOKIE, OAUTH_STATE_COOKIE_PATH, OAUTH_STATE_TTL_MS } from './auth.constants';

export interface CookieTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

/**
 * Auth tokens live only in HttpOnly cookies, so page scripts (and XSS) cannot read them.
 * `SameSite=Lax` keeps cookies off cross-site POST/PATCH/DELETE requests, which is the CSRF
 * protection for every state-changing route — GET routes must therefore never change state
 * (the only exception is the anonymous view counter of the public project page).
 *
 * With `Secure` cookies (production) every name carries the `__Secure-` prefix (`__Secure-wf_access`...); without
 * (http on localhost) the plain names stay. Readers go through `readCookie`, which accepts both.
 */
@Injectable()
export class AuthCookieService {
  private readonly secure: boolean;
  private readonly prefix: string;

  constructor(config: ConfigService) {
    // COOKIE_SECURE, or on by default in production (src/config/envs/production.ts).
    this.secure = config.get('auth.cookieSecure');
    // A `__Secure-` cookie without `Secure` is refused by the browser, so the prefix follows the flag.
    this.prefix = this.secure ? SECURE_COOKIE_PREFIX : '';
  }

  setAuthCookies(res: Response, tokens: CookieTokens): void {
    res.cookie(this.prefix + ACCESS_COOKIE, tokens.accessToken, {
      ...this.base('/api'),
      maxAge: tokens.expiresIn * 1000,
    });
    res.cookie(this.prefix + REFRESH_COOKIE, tokens.refreshToken, {
      ...this.base(REFRESH_COOKIE_PATH),
      maxAge: tokens.refreshExpiresIn * 1000,
    });
    // shortcut: for one release, a session moved to the prefixed names drops its cookies of the plain names.
    if (this.prefix) this.clearNames(res, '');
  }

  /** Clears the auth cookies under both names (the plain one of sessions opened before the prefix). */
  clearAuthCookies(res: Response): void {
    this.clearNames(res, this.prefix);
    if (this.prefix) this.clearNames(res, '');
  }

  /**
   * On logout, on top of `clearAuthCookies`: asks the browser to drop every cookie of the site. Not `"storage"`: the
   * frontend keeps unsaved design drafts in the browser.
   */
  clearSiteCookies(res: Response): void {
    res.setHeader('Clear-Site-Data', '"cookies"');
  }

  setOAuthState(res: Response, value: string): void {
    res.cookie(this.prefix + OAUTH_STATE_COOKIE, value, { ...this.base(OAUTH_STATE_COOKIE_PATH), maxAge: OAUTH_STATE_TTL_MS });
  }

  clearOAuthState(res: Response): void {
    res.clearCookie(this.prefix + OAUTH_STATE_COOKIE, this.base(OAUTH_STATE_COOKIE_PATH));
    if (this.prefix) res.clearCookie(OAUTH_STATE_COOKIE, this.base(OAUTH_STATE_COOKIE_PATH));
  }

  private clearNames(res: Response, prefix: string): void {
    res.clearCookie(prefix + ACCESS_COOKIE, this.base('/api'));
    res.clearCookie(prefix + REFRESH_COOKIE, this.base(REFRESH_COOKIE_PATH));
  }

  private base(path: string): CookieOptions {
    return { httpOnly: true, secure: this.secure, sameSite: 'lax', path };
  }
}
