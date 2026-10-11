import { createHash } from 'node:crypto';
import type { ExecutionContext } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

export interface PerSessionThrottle {
  /** Name of the session cookie the route acts on (e.g. `wf_refresh`). */
  cookie: string;
  /** Requests per window for one session (one value of the cookie). */
  limit: number;
  /** Requests per window for one IP sending no cookie: they can only be refused. */
  anonymousLimit: number;
  ttl: number;
}

function cookieOf(req: Request, cookie: string): string | undefined {
  const value: unknown = req.cookies?.[cookie];
  return typeof value === 'string' && value ? value : undefined;
}

/** Throttler key: a hash of the session cookie (never the token itself), or the IP when the cookie is missing. */
export function perSessionTracker(req: Request, cookie: string): string {
  const value = cookieOf(req, cookie);
  if (!value) return `anonymous:${req.ip ?? 'unknown'}`;
  return `session:${createHash('sha256').update(value).digest('base64url').slice(0, 32)}`;
}

/**
 * Rate limit of a route that acts on a session cookie (`/auth/refresh`), counted per session instead of per IP.
 *
 * A per-IP limit is shared by everyone behind one public address (office NAT, school, mobile carrier). Their sessions
 * expire independently, so one busy minute answered 429 to a refresh and the client signed the user out. Counting per
 * session keeps the limit meaningful for one browser without a shared budget. A request without the cookie (a guest:
 * every page load asks `/auth/me` then tries a refresh) does no work but answer 401, so it gets a much higher per-IP
 * limit instead of being skipped. A made-up cookie value per request does get its own budget, but it costs one JWT
 * signature check that fails before any database read.
 */
export const ThrottlePerSession = ({ cookie, limit, anonymousLimit, ttl }: PerSessionThrottle) =>
  Throttle({
    default: {
      ttl,
      limit: (context: ExecutionContext) =>
        cookieOf(context.switchToHttp().getRequest<Request>(), cookie) ? limit : anonymousLimit,
      getTracker: (req) => perSessionTracker(req as Request, cookie),
    },
  });
