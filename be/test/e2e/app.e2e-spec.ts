import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'net';
import { io, Socket } from 'socket.io-client';
import request, { Response } from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { PrismaService } from '../../src/shared/prisma';
import { setupSwagger } from '../../src/swagger';
import { uploadPng } from './helpers/accounts';

/**
 * Needs a running PostgreSQL with the migrations applied (see README: "Chạy test").
 * All users created here use the `@e2e.test` domain and are removed afterwards.
 * Google OAuth runs with fake credentials from `e2e-env.ts`; nothing here calls Google.
 */
describe('API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let baseUrl: string;

  const run = Date.now();
  const credentials = (name: string) => ({
    email: `${name}-${run}@e2e.test`,
    password: 'Passw0rd123',
  });
  const alice = credentials('alice');
  const bob = credentials('bob');

  const api = () => request(app.getHttpServer());

  /** Full `Set-Cookie` line for one cookie, e.g. `wf_access=...; Path=/api; HttpOnly; SameSite=Lax`. */
  const setCookie = (res: Response, name: string): string | undefined => {
    const header = res.headers['set-cookie'] as unknown as string[] | string | undefined;
    const lines = Array.isArray(header) ? header : header ? [header] : [];
    return lines.find((line) => line.startsWith(`${name}=`));
  };
  const cookieValue = (res: Response, name: string) => setCookie(res, name)?.split(';')[0].slice(name.length + 1);
  const isCleared = (res: Response, name: string) => /Expires=Thu, 01 Jan 1970/.test(setCookie(res, name) ?? '');
  const cookies = (pairs: Record<string, string | undefined>) =>
    Object.entries(pairs)
      .filter(([, value]) => value)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');

  /** Logs in and returns the cookie values the browser would keep. */
  const login = async (user: { email: string; password: string }) => {
    const res = await api().post('/api/auth/login').send(user).expect(200);
    return { access: cookieValue(res, 'wf_access')!, refresh: cookieValue(res, 'wf_refresh')! };
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    setupSwagger(app);
    await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@e2e.test' } } });
    await app.close();
  });

  it('documents every operation in Swagger, with the common error body', async () => {
    const doc = (await api().get('/api/docs-json').expect(200)).body;
    expect(doc.components.schemas.ErrorResponseDto.required).toEqual(
      expect.arrayContaining(['statusCode', 'error', 'message', 'path', 'timestamp']),
    );
    const operations = Object.values(doc.paths).flatMap((item) => Object.values(item as Record<string, unknown>));
    expect(operations.length).toBeGreaterThan(40);
    for (const operation of operations as { responses: Record<string, unknown> }[]) {
      expect(operation.responses.default).toEqual(
        expect.objectContaining({ content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponseDto' } } } }),
      );
    }
    expect(doc.paths['/api/users/me/brand-kit'].patch).toBeDefined();
  });

  it('GET /api/health reports the database as up', async () => {
    const res = await api().get('/api/health').expect(200);
    // Reported for monitoring only: an export worker may or may not be running next to the tests.
    expect(res.body).toEqual({ status: 'ok', database: 'up', redis: 'up', worker: expect.stringMatching(/^(up|down)$/) });
    // Queue sizes and uptime are for admins only.
    await api().get('/api/health/details').expect(401);
  });

  it('refuses state-changing requests sent by a page of another origin (CSRF)', async () => {
    const res = await api().post('/api/auth/logout').set('Origin', 'https://cdn.evil.example').expect(403);
    expect(res.body).toMatchObject({ statusCode: 403, code: 'ORIGIN_NOT_ALLOWED' });
    // A browser that sends no Origin still tells where the request comes from.
    await api().post('/api/auth/logout').set('Sec-Fetch-Site', 'same-site').expect(403);

    await api().post('/api/auth/logout').set('Origin', 'http://localhost:3000').expect(204); // CORS_ORIGINS
    await api().post('/api/auth/logout').set('Origin', 'http://frontend.e2e').expect(204); // FRONTEND_URL
    await api().post('/api/auth/logout').expect(204); // not a browser
    await api().get('/api/health').set('Origin', 'https://cdn.evil.example').expect(200); // reads stay open
  });

  it('rejects unauthenticated access to protected routes', async () => {
    await api().get('/api/users').expect(401);
    const res = await api().get('/api/users/me').expect(401);
    // Error format from docs 07, section 4.3.
    expect(res.body).toMatchObject({ statusCode: 401, error: 'Unauthorized', path: '/api/users/me' });
    // The error carries the request id of the response header, to find the matching log lines.
    expect(res.body.requestId).toEqual(expect.any(String));
    expect(res.headers['x-request-id']).toBe(res.body.requestId);
  });

  describe('auth (HttpOnly cookies)', () => {
    it('registers a user without opening a session until the email is verified', async () => {
      const res = await api().post('/api/auth/register').send(alice).expect(201);

      expect(res.body).toEqual({ email: alice.email, emailVerificationRequired: true });
      expect(setCookie(res, 'wf_access')).toBeUndefined();
      expect(await prisma.user.findUnique({ where: { email: alice.email } })).toMatchObject({
        emailVerifiedAt: null,
        role: 'MAKER',
        subscriptionTier: 'FREE',
        isActive: true,
      });

      const refused = await api().post('/api/auth/login').send(alice).expect(403);
      expect(refused.body.code).toBe('EMAIL_NOT_VERIFIED');
      expect(setCookie(refused, 'wf_access')).toBeUndefined();

      // The emailed link is covered by auth.e2e-spec.ts.
      await prisma.user.update({ where: { email: alice.email }, data: { emailVerifiedAt: new Date() } });
    });

    it('signs in with HttpOnly cookies, never exposing tokens to scripts', async () => {
      const res = await api().post('/api/auth/login').send(alice).expect(200);
      expect(res.body).toEqual({ user: expect.objectContaining({ email: alice.email }), expiresIn: 900 });
      expect(setCookie(res, 'wf_access')).toMatch(/; Path=\/api; .*HttpOnly; SameSite=Lax/);
      expect(setCookie(res, 'wf_refresh')).toMatch(/; Path=\/api\/auth; .*HttpOnly; SameSite=Lax/);
    });

    it('answers a duplicate email like a new one (no account enumeration) and rejects invalid payloads', async () => {
      const again = await api().post('/api/auth/register').send(alice).expect(201);
      expect(again.body).toEqual({ email: alice.email, emailVerificationRequired: true });
      await api()
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: 'short' })
        .expect(400);
      await api()
        .post('/api/auth/register')
        .send({ ...bob, role: 'ADMIN' }) // unknown property -> forbidNonWhitelisted
        .expect(400);
    });

    it('logs in with correct credentials only', async () => {
      const wrong = await api().post('/api/auth/login').send({ ...alice, password: 'wrong-Pass1' }).expect(401);
      expect(setCookie(wrong, 'wf_access')).toBeUndefined();

      const { access } = await login(alice);
      const me = await api().get('/api/users/me').set('Cookie', cookies({ wf_access: access })).expect(200);
      expect(me.body.email).toBe(alice.email);
      const authMe = await api().get('/api/auth/me').set('Cookie', cookies({ wf_access: access })).expect(200);
      expect(authMe.body).toEqual(me.body);
      expect(authMe.body.passwordHash).toBeUndefined();
      await api().get('/api/auth/me').expect(401);
    });

    it('still accepts the access token as a Bearer header for non-browser clients', async () => {
      const { access } = await login(alice);
      await api().get('/api/users/me').set('Authorization', `Bearer ${access}`).expect(200);
    });

    it('rotates the refresh cookie, tolerates a concurrent tab, and revokes every session on a late reuse', async () => {
      const first = (await login(alice)).refresh;

      const rotated = await api().post('/api/auth/refresh').set('Cookie', cookies({ wf_refresh: first })).expect(200);
      const second = cookieValue(rotated, 'wf_refresh');
      expect(second).toEqual(expect.any(String));
      expect(second).not.toBe(first);
      expect(cookieValue(rotated, 'wf_access')).toEqual(expect.any(String));

      // Right after the rotation, the same token is another tab refreshing at the same moment: it gets its own session.
      const otherTab = await api().post('/api/auth/refresh').set('Cookie', cookies({ wf_refresh: first })).expect(200);
      expect(cookieValue(otherTab, 'wf_refresh')).not.toBe(second);

      // Later, replaying the already-used token is treated as theft: 401 and the browser cookies are cleared...
      const jti = (JSON.parse(Buffer.from(first!.split('.')[1], 'base64url').toString()) as { jti: string }).jti;
      await prisma.refreshToken.update({ where: { id: jti }, data: { revokedAt: new Date(Date.now() - 60_000) } });
      const replay = await api().post('/api/auth/refresh').set('Cookie', cookies({ wf_refresh: first })).expect(401);
      expect(isCleared(replay, 'wf_access')).toBe(true);
      expect(isCleared(replay, 'wf_refresh')).toBe(true);
      // ...and the tokens that replaced it are dead as well.
      await api().post('/api/auth/refresh').set('Cookie', cookies({ wf_refresh: second })).expect(401);
      await api()
        .post('/api/auth/refresh')
        .set('Cookie', cookies({ wf_refresh: cookieValue(otherTab, 'wf_refresh') }))
        .expect(401);
    });

    it('refuses to refresh without a refresh cookie', async () => {
      await api().post('/api/auth/refresh').expect(401);
    });

    it('logs out: revokes the session and clears the cookies', async () => {
      const { refresh } = await login(alice);

      const res = await api().post('/api/auth/logout').set('Cookie', cookies({ wf_refresh: refresh })).expect(204);
      expect(isCleared(res, 'wf_access')).toBe(true);
      expect(isCleared(res, 'wf_refresh')).toBe(true);

      await api().post('/api/auth/refresh').set('Cookie', cookies({ wf_refresh: refresh })).expect(401);
    });
  });

  describe('Google OAuth', () => {
    it('redirects to Google with a state that is also stored in an HttpOnly cookie', async () => {
      const res = await api().get('/api/auth/google?redirect=/p/8f92a1').expect(302);

      const location = new URL(res.headers.location);
      expect(location.origin).toBe('https://accounts.google.com');
      expect(location.searchParams.get('client_id')).toBe('e2e-client-id.apps.googleusercontent.com');
      expect(location.searchParams.get('redirect_uri')).toBe('http://localhost:8080/api/auth/google/callback');
      expect(location.searchParams.get('scope')).toBe('email profile');
      expect(location.searchParams.get('prompt')).toBe('select_account');

      const stateCookie = setCookie(res, 'wf_oauth_state');
      expect(stateCookie).toMatch(/; Path=\/api\/auth\/google; .*HttpOnly; SameSite=Lax/);
      const saved = JSON.parse(decodeURIComponent(cookieValue(res, 'wf_oauth_state')!));
      expect(saved).toEqual({ state: location.searchParams.get('state'), redirect: '/p/8f92a1' });
    });

    it('rejects a callback whose state does not match the cookie (CSRF)', async () => {
      const start = await api().get('/api/auth/google').expect(302);
      const stateCookie = cookieValue(start, 'wf_oauth_state');
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

      const res = await api()
        .get('/api/auth/google/callback?code=fake-code&state=forged-state')
        .set('Cookie', cookies({ wf_oauth_state: stateCookie }))
        .expect(302);

      expect(res.headers.location).toBe('http://frontend.e2e/login?error=google_auth_failed');
      expect(isCleared(res, 'wf_oauth_state')).toBe(true);
      expect(setCookie(res, 'wf_access')).toBeUndefined();
      // Rejected by the state check itself — the fake code was never exchanged with Google.
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Invalid OAuth state'));
      warn.mockRestore();
    });

    it('sends the user back to the frontend when they cancel the Google consent', async () => {
      const res = await api().get('/api/auth/google/callback?error=access_denied').expect(302);
      expect(res.headers.location).toBe('http://frontend.e2e/login?error=google_auth_failed');
    });
  });

  describe('users, RBAC and real-time events', () => {
    let aliceAccess: string;
    let bobAccess: string;

    beforeAll(async () => {
      aliceAccess = (await login(alice)).access;
      await api().post('/api/auth/register').send(bob).expect(201);
      await prisma.user.update({ where: { email: bob.email }, data: { emailVerifiedAt: new Date() } });
      bobAccess = (await login(bob)).access;
    });

    it('forbids regular users from admin routes', async () => {
      await api().get('/api/users').set('Cookie', cookies({ wf_access: aliceAccess })).expect(403);
      await api().get('/api/health/details').set('Cookie', cookies({ wf_access: aliceAccess })).expect(403);
    });

    it('shows admins the export queue and the uptime in the health details', async () => {
      // The role is read from the database on every request.
      await prisma.user.update({ where: { email: alice.email }, data: { role: 'ADMIN' } });
      try {
        const res = await api().get('/api/health/details').set('Cookie', cookies({ wf_access: aliceAccess })).expect(200);
        expect(res.body).toMatchObject({ status: 'ok', uptime: expect.any(Number) });
        expect(res.body.exportQueue).toEqual(
          expect.objectContaining({ waiting: expect.any(Number), failed: expect.any(Number) }),
        );
      } finally {
        await prisma.user.update({ where: { email: alice.email }, data: { role: 'MAKER' } });
      }
    });

    it('updates the profile but rejects fields that are not editable', async () => {
      const res = await api()
        .patch('/api/users/me')
        .set('Cookie', cookies({ wf_access: aliceAccess }))
        .send({ fullName: 'Alice Nguyen', shopName: 'Alice Handmade' })
        .expect(200);
      expect(res.body).toMatchObject({ fullName: 'Alice Nguyen', shopName: 'Alice Handmade' });

      await api()
        .patch('/api/users/me')
        .set('Cookie', cookies({ wf_access: aliceAccess }))
        .send({ role: 'ADMIN' })
        .expect(400);
    });

    it('saves the brand kit as a whole (UC-02)', async () => {
      const save = (body: Record<string, unknown>) =>
        api().patch('/api/users/me/brand-kit').set('Cookie', cookies({ wf_access: aliceAccess })).send(body);

      const logoUrl = await uploadPng(app, cookies({ wf_access: aliceAccess }), 'LOGO');
      const res = await save({
        logoUrl,
        colors: ['#2D5A27', '#D4AF37', '#FAEDCD'],
        fonts: ['Playfair Display', 'DM Sans'],
        slogan: '  Gói trọn yêu thương  ',
      }).expect(200);
      expect(res.body.brandKit).toEqual({
        logoUrl,
        colors: ['#2D5A27', '#D4AF37', '#FAEDCD'],
        fonts: ['Playfair Display', 'DM Sans'],
        slogan: 'Gói trọn yêu thương',
      });

      // Omitted optional fields are cleared: the request is the whole kit.
      const replaced = await save({ colors: ['#111111', '#222222', '#333333', '#444444'] }).expect(200);
      expect(replaced.body.brandKit).toEqual({
        logoUrl: null,
        colors: ['#111111', '#222222', '#333333', '#444444'],
        fonts: [],
        slogan: null,
      });

      await save({ colors: ['#111111', '#222222'] }).expect(400); // 3 to 5 colors
      await save({ colors: ['#111111', '#222222', 'red'] }).expect(400);
      // The logo must be an upload of the user, not an image of another site.
      await save({ colors: ['#111111', '#222222', '#333333'], logoUrl: 'https://insecure.example/logo.png' }).expect(400);
      await save({ colors: ['#111111', '#222222', '#333333'], fonts: ['a', 'b', 'c', 'd'] }).expect(400);
      await api().patch('/api/users/me/brand-kit').send({ colors: ['#111111', '#222222', '#333333'] }).expect(401);
    });

    const connect = (options: Parameters<typeof io>[1]) =>
      io(`${baseUrl}/events`, { path: '/api/socket.io', reconnection: false, ...options });

    it('rejects WebSocket connections without a valid token', async () => {
      const socket = connect({ extraHeaders: { cookie: 'wf_access=invalid' } });
      const error = await new Promise<Error>((resolve) => socket.once('connect_error', resolve));
      expect(error.message).toBe('Unauthorized');
      socket.close();
    });

    it('accepts WebSocket clients authenticated by the access cookie', async () => {
      const socket: Socket = connect({ extraHeaders: { cookie: cookies({ wf_access: bobAccess }) } });
      await new Promise<void>((resolve, reject) => {
        socket.once('connect', resolve);
        socket.once('connect_error', reject);
      });

      // The gateway answers `ping` by emitting a separate `pong` event (not an acknowledgement).
      const pong = new Promise<{ timestamp: string }>((resolve) => socket.once('pong', resolve));
      socket.emit('ping', {});
      expect(await pong).toEqual({ timestamp: expect.any(String) });
      socket.close();
    });

    it('rejects WebSocket handshakes sent by a page of another origin, even with a valid cookie', async () => {
      const socket = connect({
        extraHeaders: { cookie: cookies({ wf_access: bobAccess }), origin: 'https://evil.example' },
      });
      await new Promise<Error>((resolve) => socket.once('connect_error', resolve));
      expect(socket.connected).toBe(false);
      socket.close();
    });

    it('closes the WebSocket connections of a user who signs out everywhere', async () => {
      const socket: Socket = connect({ extraHeaders: { cookie: cookies({ wf_access: bobAccess }) } });
      await new Promise<void>((resolve, reject) => {
        socket.once('connect', resolve);
        socket.once('connect_error', reject);
      });
      const closed = new Promise<string>((resolve) => socket.once('disconnect', resolve));

      await api().post('/api/auth/logout-all').set('Cookie', cookies({ wf_access: bobAccess })).expect(204);
      expect(await closed).toBe('io server disconnect');
      socket.close();
      // The access token stops working at once, not when it expires.
      await api().get('/api/auth/me').set('Cookie', cookies({ wf_access: bobAccess })).expect(401);
    });
  });
});
