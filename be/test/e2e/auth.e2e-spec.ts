import { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { AccountRecoveryService } from '../../src/auth/account-recovery.service';
import { rawAuthToken } from '../../src/common';
import { AuthMaintenanceTask, UNVERIFIED_ACCOUNT_TTL_MS } from '../../src/auth/auth-maintenance.task';
import { AuthService } from '../../src/auth/auth.service';
import { ACCOUNT_EXISTS_WINDOW_MS, MAIL_QUEUE } from '../../src/mail/mail.constants';
import { PrismaService } from '../../src/shared/prisma';
import { accessCookie, TEST_PASSWORD } from './helpers/accounts';

/**
 * Email verification, password reset and the Google link rule (docs/10_DB_HARDENING_DESIGN.md). Instead of reading a
 * mailbox, the link is derived from the queued AuthToken exactly like the mail worker does (no worker runs here).
 */
describe('Account emails (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mailQueue: Queue;
  const run = Date.now();
  const email = (name: string) => `${name}-${run}@e2e.test`;
  const api = () => request(app.getHttpServer());

  /** Token of the newest usable link of this purpose, as the worker would put it in the email. */
  const linkToken = async (address: string, purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'COMPLETE_SIGNUP') => {
    const token = await prisma.authToken.findFirstOrThrow({
      where: { user: { email: address }, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    expect(await mailQueue.getJob(token.id)).toBeDefined(); // one email job per token
    return rawAuthToken((process.env.AUTH_TOKEN_SECRET || process.env.JWT_REFRESH_SECRET)!, token.id);
  };
  const register = (address: string) =>
    api().post('/api/auth/register').send({ email: address, password: TEST_PASSWORD }).expect(201);
  const login = (address: string, password = TEST_PASSWORD) =>
    api().post('/api/auth/login').send({ email: address, password });
  /** Lets the per-account "one email per minute" limit pass for the next request. */
  const ageTokens = (address: string) =>
    prisma.authToken.updateMany({
      where: { user: { email: address } },
      data: { createdAt: new Date(Date.now() - 2 * 60_000) },
    });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    await app.init();
    prisma = app.get(PrismaService);
    mailQueue = app.get<Queue>(getQueueToken(MAIL_QUEUE));
  });

  afterAll(async () => {
    const tokens = await prisma.authToken.findMany({ where: { user: { email: { endsWith: '@e2e.test' } } } });
    await Promise.all(tokens.map((token) => mailQueue.remove(token.id)));
    await prisma.user.deleteMany({ where: { email: { endsWith: '@e2e.test' } } });
    await app.close();
  });

  describe('email verification', () => {
    const address = email('vy');

    it('emails a link at registration; the account signs in only after opening it', async () => {
      await register(address);
      const stored = await prisma.authToken.findFirstOrThrow({ where: { user: { email: address } } });
      const token = await linkToken(address, 'VERIFY_EMAIL');
      expect(stored.tokenHash).not.toContain(token); // only the SHA-256 is stored

      expect((await login(address).expect(403)).body.code).toBe('EMAIL_NOT_VERIFIED');
      await api().post('/api/auth/verify-email').send({ token }).expect(200, { verified: true });
      // Opening the link twice is fine.
      await api().post('/api/auth/verify-email').send({ token }).expect(200);

      const res = await login(address).expect(200);
      expect(res.body.user.emailVerifiedAt).toEqual(expect.any(String));
    });

    it('rejects unknown, expired and replaced links with stable codes', async () => {
      const other = email('khoa');
      await register(other);
      const first = await linkToken(other, 'VERIFY_EMAIL');

      const unknown = await api().post('/api/auth/verify-email').send({ token: 'x'.repeat(43) }).expect(400);
      expect(unknown.body.code).toBe('AUTH_TOKEN_INVALID');

      // A resend replaces the first link.
      await ageTokens(other);
      await api().post('/api/auth/verify-email/resend').send({ email: other }).expect(202);
      const replaced = await api().post('/api/auth/verify-email').send({ token: first }).expect(400);
      expect(replaced.body.code).toBe('AUTH_TOKEN_INVALID');

      const second = await linkToken(other, 'VERIFY_EMAIL');
      await prisma.authToken.updateMany({
        where: { user: { email: other }, consumedAt: null },
        data: { expiresAt: new Date(Date.now() - 1000), createdAt: new Date(Date.now() - 2000) },
      });
      const expired = await api().post('/api/auth/verify-email').send({ token: second }).expect(400);
      expect(expired.body.code).toBe('AUTH_TOKEN_EXPIRED');
    });

    it('answers a resend the same way for every address, and sends at most one email a minute', async () => {
      const other = email('lan');
      await register(other);
      const count = () => prisma.authToken.count({ where: { user: { email: other } } });
      expect(await count()).toBe(1);

      await api().post('/api/auth/verify-email/resend').send({ email: other }).expect(202, {});
      expect(await count()).toBe(1); // within a minute of the registration email: skipped silently

      await ageTokens(other);
      await api().post('/api/auth/verify-email/resend').send({ email: other }).expect(202, {});
      expect(await count()).toBe(2);

      await api().post('/api/auth/verify-email/resend').send({ email: email('nobody') }).expect(202, {});
      await api().post('/api/auth/verify-email/resend').send({ email: address }).expect(202, {}); // already verified
    });

    it('keeps one usable link per purpose even when two are issued at the same moment', async () => {
      const other = email('minh');
      await register(other);
      await ageTokens(other);
      // Through the service: the per-IP rate limit of the route would refuse the second request first.
      const recovery = app.get(AccountRecoveryService);
      await Promise.all([recovery.resendVerification(other), recovery.resendVerification(other)]);
      expect(await prisma.authToken.count({ where: { user: { email: other }, consumedAt: null } })).toBe(1);
    });
  });

  describe('registering an address that already has an account', () => {
    // Through the services where possible: the per-IP limit of the auth routes (10 / minute) is shared by this file.
    const signUpAs = (address: string, password: string) =>
      app.get(AuthService).register({ email: address, password });
    const signIn = (address: string, password: string) => app.get(AuthService).login({ email: address, password });

    it('answers exactly like for a new address', async () => {
      const taken = email('taken');
      await signUpAs(taken, TEST_PASSWORD);
      const fresh = await api().post('/api/auth/register').send({ email: email('fresh'), password: TEST_PASSWORD }).expect(201);
      const again = await api().post('/api/auth/register').send({ email: taken, password: TEST_PASSWORD }).expect(201);
      expect(Object.keys(again.body)).toEqual(Object.keys(fresh.body));
      expect(again.body).toEqual({ email: taken, emailVerificationRequired: true });
    });

    it('lets the owner of the mailbox choose the password of an address someone registered first', async () => {
      const victim = email('chi');
      await signUpAs(victim, 'Squatter0Pass'); // registered by someone who does not own the mailbox
      const squatterLink = await linkToken(victim, 'VERIFY_EMAIL');
      await ageTokens(victim);

      await signUpAs(victim, 'Owner0Pass1'); // the owner registers: no error, a link to choose the password
      const completeLink = await linkToken(victim, 'COMPLETE_SIGNUP');
      // The password sent with a repeated registration is never stored; the first link stops working.
      await expect(signIn(victim, 'Owner0Pass1')).rejects.toThrow('Invalid credentials');
      const replaced = await api().post('/api/auth/verify-email').send({ token: squatterLink }).expect(400);
      expect(replaced.body.code).toBe('AUTH_TOKEN_INVALID');

      await api().post('/api/auth/password/reset').send({ token: completeLink, password: 'Owner0Pass2' }).expect(200);
      await expect(signIn(victim, 'Squatter0Pass')).rejects.toThrow('Invalid credentials');
      await expect(signIn(victim, 'Owner0Pass2')).resolves.toMatchObject({ user: { emailVerifiedAt: expect.any(Date) } });
    });

    it('tells the owner of a verified account, at most once an hour, and changes nothing', async () => {
      const owner = email('dung');
      await signUpAs(owner, TEST_PASSWORD);
      const user = await prisma.user.update({ where: { email: owner }, data: { emailVerifiedAt: new Date() } });
      const tokensBefore = await prisma.authToken.count({ where: { userId: user.id } });

      await signUpAs(owner, 'Other0Pass1');
      await signUpAs(owner, 'Other0Pass2');

      expect(await prisma.authToken.count({ where: { userId: user.id } })).toBe(tokensBefore);
      const hour = Math.floor(Date.now() / ACCOUNT_EXISTS_WINDOW_MS);
      const notice = await mailQueue.getJob(`account-exists-${user.id}-${hour}`);
      expect(notice?.data).toMatchObject({ userId: user.id });
      expect((await mailQueue.getJobs(['waiting', 'delayed'])).filter((j) => j.data.userId === user.id)).toHaveLength(1);
      await notice?.remove();
      await expect(signIn(owner, TEST_PASSWORD)).resolves.toBeDefined();
    });

    it('deletes accounts that stayed unverified and empty for a week', async () => {
      const [stale, recent, busy] = [email('stale'), email('recent'), email('busy')];
      for (const address of [stale, recent, busy]) await signUpAs(address, TEST_PASSWORD);
      const old = new Date(Date.now() - UNVERIFIED_ACCOUNT_TTL_MS - 60_000);
      await prisma.user.updateMany({ where: { email: { in: [stale, busy] } }, data: { createdAt: old } });
      const busyUser = await prisma.user.findUniqueOrThrow({ where: { email: busy } });
      await prisma.packagingProject.create({
        data: {
          userId: busyUser.id,
          templateId: 'tuck-top',
          formulaVersion: 1,
          title: 'Đang làm dở',
          dimensions: { length: 120, width: 80, height: 60, paperThickness: 0.35 },
          materialSpec: { type: 'ivory', gsm: 300, caliper: 0.35, finish: 'matte' },
          canvasState: { elements: [] },
        },
      });

      await app.get(AuthMaintenanceTask).cleanup();

      expect(await prisma.user.findUnique({ where: { email: stale } })).toBeNull();
      expect(await prisma.user.findUnique({ where: { email: recent } })).not.toBeNull();
      expect(await prisma.user.findUnique({ where: { email: busy } })).not.toBeNull();
    });

    it('refuses accounts without a way to sign in, and unverified Google accounts (CHECK constraints)', async () => {
      await expect(prisma.user.create({ data: { email: email('nobody') } })).rejects.toThrow();
      await expect(prisma.user.create({ data: { email: email('gg'), googleId: `gg-${run}` } })).rejects.toThrow();
    });
  });

  describe('password reset', () => {
    const address = email('quan');

    beforeAll(async () => {
      await register(address);
      await api()
        .post('/api/auth/verify-email')
        .send({ token: await linkToken(address, 'VERIFY_EMAIL') })
        .expect(200);
    });

    it('sets a new password once, signs the account out everywhere, and needs a new sign-in', async () => {
      const session = await login(address).expect(200);
      const setCookie = session.headers['set-cookie'] as unknown as string[];
      const refresh = setCookie.find((line) => line.startsWith('wf_refresh='))!.split(';')[0];
      const access = accessCookie(setCookie);
      await api().get('/api/auth/me').set('Cookie', access).expect(200);

      await api().post('/api/auth/password/forgot').send({ email: address }).expect(202, {});
      const token = await linkToken(address, 'RESET_PASSWORD');

      const weak = await api().post('/api/auth/password/reset').send({ token, password: 'short' }).expect(400);
      expect(weak.body.code).toBeUndefined(); // password policy, the link is still usable
      await api().post('/api/auth/password/reset').send({ token, password: 'NewPassw0rd9' }).expect(200, {});

      const replay = await api().post('/api/auth/password/reset').send({ token, password: 'Other0Pass1' }).expect(400);
      expect(replay.body.code).toBe('AUTH_TOKEN_CONSUMED');

      await api().post('/api/auth/refresh').set('Cookie', refresh).expect(401); // old session revoked
      await api().get('/api/auth/me').set('Cookie', access).expect(401); // its access token too, before it expires
      await login(address).expect(401);
      await login(address, 'NewPassw0rd9').expect(200);
    });

    it('answers forgot-password the same way for unknown addresses and sends nothing', async () => {
      const before = await prisma.authToken.count();
      await api().post('/api/auth/password/forgot').send({ email: email('ghost') }).expect(202, {});
      expect(await prisma.authToken.count()).toBe(before);
    });

    it('verifies the email of an account that resets its password from the emailed link', async () => {
      const other = email('thu');
      await register(other);
      await ageTokens(other);
      await api().post('/api/auth/password/forgot').send({ email: other }).expect(202);
      await api()
        .post('/api/auth/password/reset')
        .send({ token: await linkToken(other, 'RESET_PASSWORD'), password: 'NewPassw0rd9' })
        .expect(200);
      await login(other, 'NewPassw0rd9').expect(200);
    });
  });

  describe('failed logins per address (Redis)', () => {
    // Through the services: the per-IP limits of the routes (10 / minute) would answer 429 first.
    const signIn = (address: string, password: string) => app.get(AuthService).login({ email: address, password });
    const recovery = () => app.get(AccountRecoveryService);
    const failTenTimes = async (address: string) => {
      for (let i = 0; i < 10; i++) await expect(signIn(address, 'Wrong0pass1')).rejects.toMatchObject({ status: 401 });
    };
    const locked = { status: 429, response: expect.objectContaining({ code: 'LOGIN_RATE_LIMITED' }) };

    it('locks password logins of an address after 10 failures, whatever the IP, until the owner resets the password', async () => {
      const address = email('lam');
      await app.get(AuthService).register({ email: address, password: TEST_PASSWORD });
      await recovery().verifyEmail(await linkToken(address, 'VERIFY_EMAIL'));

      await failTenTimes(address);
      await expect(signIn(address, TEST_PASSWORD)).rejects.toMatchObject(locked); // even the right password

      await ageTokens(address);
      await recovery().forgotPassword(address);
      await recovery().resetPassword(await linkToken(address, 'RESET_PASSWORD'), 'NewPassw0rd9');
      await expect(signIn(address, 'NewPassw0rd9')).resolves.toMatchObject({ user: { email: address } });
    });

    it('counts an address without an account the same way, so the lock tells nothing', async () => {
      const ghost = email('ghost-login');
      await failTenTimes(ghost);
      await expect(signIn(ghost, TEST_PASSWORD)).rejects.toMatchObject(locked);
    });
  });

  describe('Google sign-in on an address registered by someone else first (pre-account takeover)', () => {
    it("removes the unproven password and the squatter's sessions; the Google owner keeps the account", async () => {
      const victim = email('victim');
      await register(victim); // the attacker registers the victim's address with a password of their own
      // The attacker cannot sign in (unverified)... but even an old session would not survive:
      const user = await prisma.user.findUniqueOrThrow({ where: { email: victim } });
      await prisma.refreshToken.create({
        data: { id: '0192a4c0-0000-7000-8000-000000000001', userId: user.id, expiresAt: new Date(Date.now() + 3600_000) },
      });

      const result = await app.get(AuthService).loginWithGoogle({
        googleId: `google-${run}`,
        email: victim,
        emailVerified: true,
        fullName: 'Victim',
      });

      expect(result.user.emailVerifiedAt).toEqual(expect.any(Date));
      const after = await prisma.user.findUniqueOrThrow({ where: { email: victim } });
      expect(after.passwordHash).toBeNull();
      expect(after.googleId).toBe(`google-${run}`);
      expect(
        await prisma.refreshToken.findUniqueOrThrow({ where: { id: '0192a4c0-0000-7000-8000-000000000001' } }),
      ).toMatchObject({ revokedAt: expect.any(Date) });
      await login(victim).expect(401); // the attacker's password is gone
    });

    it('keeps the password of a verified account that links Google', async () => {
      const owner = email('owner');
      await register(owner);
      await api()
        .post('/api/auth/verify-email')
        .send({ token: await linkToken(owner, 'VERIFY_EMAIL') })
        .expect(200);

      await app.get(AuthService).loginWithGoogle({ googleId: `google-owner-${run}`, email: owner, emailVerified: true });
      const res = await login(owner).expect(200);
      expect(accessCookie(res.headers['set-cookie'] as unknown as string[])).toMatch(/^wf_access=/);
    });
  });

  it('AuthMaintenanceTask deletes expired refresh tokens and old email tokens only', async () => {
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: email('quan') } });
    const hour = 3600_000;
    await prisma.refreshToken.createMany({
      data: [
        {
          id: '0192a4c0-0000-7000-8000-0000000000e1',
          userId: owner.id,
          createdAt: new Date(Date.now() - 3 * hour),
          expiresAt: new Date(Date.now() - hour),
        },
        // Revoked but not expired: kept, a replay of it must still be detected.
        {
          id: '0192a4c0-0000-7000-8000-0000000000e2',
          userId: owner.id,
          expiresAt: new Date(Date.now() + hour),
          revokedAt: new Date(),
        },
      ],
    });
    await prisma.authToken.create({
      data: {
        userId: owner.id,
        purpose: 'RESET_PASSWORD',
        tokenHash: `old-${run}`,
        consumedAt: new Date(),
        createdAt: new Date(Date.now() - 9 * 24 * hour),
        expiresAt: new Date(Date.now() - 8 * 24 * hour),
      },
    });

    const result = await app.get(AuthMaintenanceTask).cleanup();

    expect(result.refreshTokens).toBeGreaterThanOrEqual(1);
    expect(result.authTokens).toBeGreaterThanOrEqual(1);
    expect(await prisma.refreshToken.findUnique({ where: { id: '0192a4c0-0000-7000-8000-0000000000e1' } })).toBeNull();
    expect(await prisma.refreshToken.findUnique({ where: { id: '0192a4c0-0000-7000-8000-0000000000e2' } })).not.toBeNull();
    expect(await prisma.authToken.findUnique({ where: { tokenHash: `old-${run}` } })).toBeNull();
    // Links that still work are untouched.
    expect(await prisma.authToken.count({ where: { userId: owner.id, consumedAt: null } })).toBe(0);
  });
});
