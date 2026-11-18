import type { Response } from 'express';
import { readCookie, type ConfigService } from '../common';
import { AuthCookieService } from './auth-cookie.service';

describe('AuthCookieService', () => {
  const tokens = { accessToken: 'a', refreshToken: 'r', expiresIn: 900, refreshExpiresIn: 86_400 };
  const service = (secure: boolean) =>
    new AuthCookieService({ get: (key: string) => (key === 'auth.cookieSecure' ? secure : undefined) } as unknown as ConfigService);
  const response = () => {
    const res = { cookie: jest.fn(), clearCookie: jest.fn(), setHeader: jest.fn() };
    return res as typeof res & Response;
  };
  const names = (mock: jest.Mock) => mock.mock.calls.map(([name]) => name as string);

  it('uses `__Secure-` names with Secure cookies (production) and drops the plain names', () => {
    const res = response();
    service(true).setAuthCookies(res, tokens);
    expect(names(res.cookie)).toEqual(['__Secure-wf_access', '__Secure-wf_refresh']);
    expect(res.cookie.mock.calls[0][2]).toMatchObject({ secure: true, httpOnly: true, sameSite: 'lax', path: '/api' });
    expect(names(res.clearCookie)).toEqual(['wf_access', 'wf_refresh']);
  });

  it('keeps the plain names without Secure (http on localhost)', () => {
    const res = response();
    service(false).setAuthCookies(res, tokens);
    expect(names(res.cookie)).toEqual(['wf_access', 'wf_refresh']);
    expect(res.clearCookie).not.toHaveBeenCalled();
  });

  it('clears both names in production, and sends Clear-Site-Data "cookies" (never "storage") on logout', () => {
    const res = response();
    const cookies = service(true);
    cookies.clearAuthCookies(res);
    cookies.clearSiteCookies(res);
    expect(names(res.clearCookie)).toEqual(['__Secure-wf_access', '__Secure-wf_refresh', 'wf_access', 'wf_refresh']);
    expect(res.setHeader).toHaveBeenCalledWith('Clear-Site-Data', '"cookies"');
  });

  it('prefixes the OAuth state cookie too and clears both of its names', () => {
    const res = response();
    service(true).setOAuthState(res, '{}');
    service(true).clearOAuthState(res);
    expect(names(res.cookie)).toEqual(['__Secure-wf_oauth_state']);
    expect(names(res.clearCookie)).toEqual(['__Secure-wf_oauth_state', 'wf_oauth_state']);
  });
});

describe('readCookie', () => {
  it('prefers the `__Secure-` name, falls back to the plain one, and ignores empty values', () => {
    expect(readCookie({ '__Secure-wf_access': 'new', wf_access: 'old' }, 'wf_access')).toBe('new');
    expect(readCookie({ wf_access: 'old' }, 'wf_access')).toBe('old');
    expect(readCookie({ '__Secure-wf_access': '', wf_access: 'old' }, 'wf_access')).toBe('old');
    expect(readCookie(undefined, 'wf_access')).toBeUndefined();
    expect(readCookie({ wf_access: ['x'] }, 'wf_access')).toBeUndefined();
  });
});
