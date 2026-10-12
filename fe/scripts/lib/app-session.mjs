/**
 * Signed-in calls to the app API through the Next.js proxy, for the screenshot and fixture scripts.
 * Every request carries the frontend Origin (the backend OriginGuard rejects state changes without it).
 */
import fs from 'node:fs';
import path from 'node:path';
import { FE_ROOT } from '../stitch/lib/paths.mjs';

export const SHOTS_DIR = path.join(FE_ROOT, '.page-shots');
export const FIXTURES_FILE = path.join(SHOTS_DIR, 'fixtures.json');

/** A variable of `be/.env` (values may end in `\r` on Windows), or undefined. */
export function backendEnv(name) {
  const envFile = path.join(FE_ROOT, '..', 'be', '.env');
  const env = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
  return env.match(new RegExp(`^${name}=(.*)$`, 'm'))?.[1].trim().replace(/^"|"$/g, '');
}

/** `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` of `be/.env`. */
export function seedAdmin() {
  return {
    email: backendEnv('SEED_ADMIN_EMAIL') ?? 'admin@wrapfit.vn',
    password: process.env.SHOT_PASSWORD ?? backendEnv('SEED_ADMIN_PASSWORD'),
  };
}

/** Accounts and records made by `ui-fixtures.mjs`, or null when it has not run. */
export function readFixtures() {
  return fs.existsSync(FIXTURES_FILE) ? JSON.parse(fs.readFileSync(FIXTURES_FILE, 'utf8')) : null;
}

export class AppSession {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    /** name → { value, path } */
    this.jar = new Map();
  }

  /** `path` is relative to `/api`. Throws with the API error code on a non-2xx answer. */
  async request(apiPath, { method = 'GET', json, query } = {}) {
    const url = new URL(`${this.baseUrl}/api${apiPath}`);
    for (const [key, value] of Object.entries(query ?? {})) if (value !== undefined) url.searchParams.set(key, value);
    const res = await fetch(url, {
      method,
      headers: {
        Origin: this.baseUrl,
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(this.jar.size ? { Cookie: [...this.jar].map(([name, c]) => `${name}=${c.value}`).join('; ') } : {}),
      },
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
    for (const header of res.headers.getSetCookie()) {
      const [pair, ...attributes] = header.split(';').map((part) => part.trim());
      const [name, ...value] = pair.split('=');
      const cookiePath = attributes.find((a) => a.toLowerCase().startsWith('path='))?.slice(5) ?? '/';
      if (value.join('=')) this.jar.set(name, { value: value.join('='), path: cookiePath });
      else this.jar.delete(name);
    }
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { message: text.slice(0, 120) }; // a proxy error page while the backend restarts
    }
    if (!res.ok) {
      const error = new Error(`${method} ${apiPath}: HTTP ${res.status} ${body?.code ?? ''} ${body?.message ?? ''}`.trim());
      error.status = res.status;
      error.code = body?.code;
      throw error;
    }
    return body;
  }

  /** Retries a few times on a 5xx: the dev backend restarts now and then. */
  async signIn(email, password) {
    if (!password) throw new Error(`No password for ${email}`);
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.request('/auth/login', { method: 'POST', json: { email, password } });
      } catch (error) {
        if (attempt >= 4 || !(error.status >= 500)) throw error;
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }

  /** Cookies in the shape of CDP `Network.setCookie`. */
  cookies() {
    return [...this.jar].map(([name, c]) => ({ name, value: c.value, url: this.baseUrl, path: c.path, httpOnly: true }));
  }
}
