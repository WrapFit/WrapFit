import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { perSessionTracker, ThrottlePerSession } from './throttle-per-session.decorator';

describe('ThrottlePerSession', () => {
  class Routes {
    @ThrottlePerSession({ cookie: 'wf_refresh', limit: 30, anonymousLimit: 300, ttl: 60_000 })
    refresh() {}
  }
  const handler = Routes.prototype.refresh;
  const limit = Reflect.getMetadata('THROTTLER:LIMITdefault', handler) as (context: ExecutionContext) => number;
  const tracker = Reflect.getMetadata('THROTTLER:TRACKERdefault', handler) as (req: Request) => string;

  const request = (cookies: Record<string, string> = {}, ip = '203.0.113.7') => ({ cookies, ip }) as unknown as Request;
  const context = (req: Request) => ({ switchToHttp: () => ({ getRequest: () => req }) }) as unknown as ExecutionContext;

  it('counts a request with the cookie per session: two sessions behind one IP do not share a budget', () => {
    const alice = request({ wf_refresh: 'token-of-alice' });
    const bob = request({ wf_refresh: 'token-of-bob' });
    expect(tracker(alice)).not.toEqual(tracker(bob));
    expect(tracker(alice)).toEqual(tracker(request({ wf_refresh: 'token-of-alice' }, '198.51.100.1')));
    expect(limit(context(alice))).toBe(30);
  });

  it('never puts the token itself in the key', () => {
    const key = perSessionTracker(request({ wf_refresh: 'secret-refresh-token' }), 'wf_refresh');
    expect(key).toMatch(/^session:[\w-]{32}$/);
    expect(key).not.toContain('secret');
  });

  it('counts a request without the cookie per IP, with the higher limit of a guest', () => {
    expect(tracker(request())).toBe('anonymous:203.0.113.7');
    expect(tracker(request({ wf_refresh: '' }))).toBe('anonymous:203.0.113.7');
    expect(limit(context(request()))).toBe(300);
  });
});
