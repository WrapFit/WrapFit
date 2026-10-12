import { ConflictException, ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role, SubscriptionTier } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { ConfigService, SESSIONS_REVOKED } from '../common';
import { PrismaService } from '../shared/prisma';
import { MailService } from '../mail';
import { UsersService } from '../users';
import { AccountRecoveryService } from './account-recovery.service';
import { AuthTokensService } from './auth-tokens.service';
import { AuthService } from './auth.service';
import { LoginAttemptsService } from './login-attempts.service';

const env: Record<string, unknown> = {
  'auth.jwt.accessSecret': 'a'.repeat(32),
  'auth.jwt.refreshSecret': 'b'.repeat(32),
  'auth.jwt.accessTtlSeconds': 900,
  'auth.jwt.refreshTtlSeconds': 604800,
  'auth.bcryptRounds': 4,
};

describe('AuthService', () => {
  let service: AuthService;
  let jwt: JwtService;
  const users = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findByGoogleId: jest.fn(),
    linkGoogleAccount: jest.fn(),
    createFromGoogle: jest.fn(),
  };
  const prisma = {
    refreshToken: { create: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() },
    user: { findUnique: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
    // Interactive transaction: the callback receives the same mocks as its transaction client.
    $transaction: jest.fn(),
  };
  const authTokens = { issue: jest.fn() };
  const mail = { sendAuthEmail: jest.fn() };
  const recovery = { handleRepeatedSignup: jest.fn() };
  const loginAttempts = { assertAllowed: jest.fn(), recordFailure: jest.fn(), reset: jest.fn() };
  const events = { emit: jest.fn() };

  const safeUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'user@example.com',
    emailVerifiedAt: new Date(),
    fullName: 'User',
    avatarUrl: null,
    shopName: null,
    subscriptionTier: SubscriptionTier.FREE,
    brandKit: null,
    referralCode: null,
    role: Role.MAKER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.refreshToken.create.mockResolvedValue({});
    prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtService,
        { provide: UsersService, useValue: users },
        { provide: PrismaService, useValue: prisma },
        { provide: AuthTokensService, useValue: authTokens },
        { provide: AccountRecoveryService, useValue: recovery },
        { provide: MailService, useValue: mail },
        { provide: LoginAttemptsService, useValue: loginAttempts },
        { provide: EventEmitter2, useValue: events },
        { provide: ConfigService, useValue: { get: (key: string) => env[key] } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    jwt = moduleRef.get(JwtService);
  });

  describe('register', () => {
    it('hashes the password, emails a verification link and opens no session', async () => {
      users.findByEmail.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: safeUser.id });
      authTokens.issue.mockResolvedValue('token-1');

      await service.register({ email: safeUser.email, password: 'Passw0rd123' });

      const { passwordHash } = prisma.user.create.mock.calls[0][0].data;
      expect(passwordHash).not.toBe('Passw0rd123');
      expect(await bcrypt.compare('Passw0rd123', passwordHash)).toBe(true);
      expect(authTokens.issue).toHaveBeenCalledWith(prisma, safeUser.id, 'VERIFY_EMAIL');
      expect(mail.sendAuthEmail).toHaveBeenCalledWith('token-1');
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('does not tell an existing address: no error, the existing account gets its own email', async () => {
      const existing = { ...safeUser, passwordHash: 'someone-else', emailVerifiedAt: null };
      users.findByEmail.mockResolvedValue(existing);

      await expect(service.register({ email: safeUser.email, password: 'Passw0rd123' })).resolves.toBeUndefined();

      expect(recovery.handleRepeatedSignup).toHaveBeenCalledWith(existing);
      expect(prisma.user.create).not.toHaveBeenCalled(); // the stored password is never replaced from here
      expect(mail.sendAuthEmail).not.toHaveBeenCalled();
    });

    it('treats the loser of two simultaneous registrations as a repeated registration', async () => {
      const winner = { ...safeUser, passwordHash: 'hash', emailVerifiedAt: null };
      users.findByEmail.mockResolvedValueOnce(null).mockResolvedValueOnce(winner);
      prisma.$transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: '6' }),
      );
      await expect(service.register({ email: safeUser.email, password: 'Passw0rd123' })).resolves.toBeUndefined();
      expect(recovery.handleRepeatedSignup).toHaveBeenCalledWith(winner);
      expect(mail.sendAuthEmail).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('rejects an unknown email', async () => {
      users.findByEmail.mockResolvedValue(null);
      await expect(service.login({ email: 'x@example.com', password: 'whatever1' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a wrong password', async () => {
      users.findByEmail.mockResolvedValue({ ...safeUser, passwordHash: await bcrypt.hash('right-pass1', 4) });
      await expect(service.login({ email: safeUser.email, password: 'wrong-pass1' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(loginAttempts.recordFailure).toHaveBeenCalledWith(safeUser.email);
      expect(loginAttempts.reset).not.toHaveBeenCalled();
    });

    it('stops before checking the password once the address used up its failed attempts', async () => {
      loginAttempts.assertAllowed.mockRejectedValue(new HttpException({ code: 'LOGIN_RATE_LIMITED' }, 429));
      await expect(service.login({ email: safeUser.email, password: 'right-pass1' })).rejects.toMatchObject({ status: 429 });
      expect(users.findByEmail).not.toHaveBeenCalled();
    });

    it('rejects a deactivated user', async () => {
      users.findByEmail.mockResolvedValue({
        ...safeUser,
        isActive: false,
        passwordHash: await bcrypt.hash('right-pass1', 4),
      });
      await expect(service.login({ email: safeUser.email, password: 'right-pass1' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects password login for a Google-only account', async () => {
      users.findByEmail.mockResolvedValue({ ...safeUser, passwordHash: null, googleId: 'google-sub' });
      await expect(service.login({ email: safeUser.email, password: 'whatever1' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('refuses an account whose email is not verified yet, once the password matched', async () => {
      users.findByEmail.mockResolvedValue({
        ...safeUser,
        emailVerifiedAt: null,
        passwordHash: await bcrypt.hash('right-pass1', 4),
      });
      const error = await service.login({ email: safeUser.email, password: 'right-pass1' }).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();

      // A wrong password says nothing about the verification state.
      await expect(service.login({ email: safeUser.email, password: 'wrong-pass1' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('returns the user without secret fields and a token pair', async () => {
      users.findByEmail.mockResolvedValue({
        ...safeUser,
        passwordHash: await bcrypt.hash('right-pass1', 4),
        googleId: 'google-sub',
        referredById: null,
        sessionVersion: 3,
      });

      const result = await service.login({ email: safeUser.email, password: 'right-pass1' });

      expect(result.user).toEqual(safeUser);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('googleId');
      expect(result.user).not.toHaveProperty('sessionVersion');
      // Both tokens carry the session version: "sign out everywhere" makes them stop working at once.
      expect(jwt.decode(result.accessToken)).toMatchObject({ sub: safeUser.id, sv: 3 });
      expect(jwt.decode(result.refreshToken)).toMatchObject({ sub: safeUser.id, sv: 3 });
      expect(result.expiresIn).toBe(900);
      expect(result.refreshExpiresIn).toBe(604800);
      expect(loginAttempts.reset).toHaveBeenCalledWith(safeUser.email);
    });
  });

  describe('loginWithGoogle', () => {
    const profile = {
      googleId: 'google-sub-1',
      email: safeUser.email,
      emailVerified: true,
      fullName: 'Google Name',
      avatarUrl: 'https://lh3.googleusercontent.com/a/photo',
    };
    const row = (overrides = {}) => ({
      ...safeUser,
      passwordHash: null,
      googleId: null,
      referredById: null,
      ...overrides,
    });

    it('rejects a Google account whose email is not verified', async () => {
      await expect(service.loginWithGoogle({ ...profile, emailVerified: false })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(users.findByGoogleId).not.toHaveBeenCalled();
    });

    it('signs in a user already linked to the Google account', async () => {
      users.findByGoogleId.mockResolvedValue(row({ googleId: profile.googleId }));

      const result = await service.loginWithGoogle(profile, { userAgent: 'jest', ipAddress: '127.0.0.1' });

      expect(result.user).toEqual(safeUser);
      expect(users.createFromGoogle).not.toHaveBeenCalled();
      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: safeUser.id, userAgent: 'jest', ipAddress: '127.0.0.1' }),
      });
    });

    it('links the Google account to an existing account with the same email', async () => {
      users.findByGoogleId.mockResolvedValue(null);
      const existing = row({ passwordHash: 'hash' });
      users.findByEmail.mockResolvedValue(existing);
      users.linkGoogleAccount.mockResolvedValue({ ...existing, googleId: profile.googleId });

      const result = await service.loginWithGoogle(profile);

      expect(users.linkGoogleAccount).toHaveBeenCalledWith(existing, profile);
      expect(result.user).not.toHaveProperty('googleId');
    });

    it('refuses to link an email that already belongs to another Google account', async () => {
      users.findByGoogleId.mockResolvedValue(null);
      users.findByEmail.mockResolvedValue(row({ googleId: 'another-google-sub' }));

      await expect(service.loginWithGoogle(profile)).rejects.toBeInstanceOf(ConflictException);
      expect(users.linkGoogleAccount).not.toHaveBeenCalled();
    });

    it('creates a password-less account for a new Google user', async () => {
      users.findByGoogleId.mockResolvedValue(null);
      users.findByEmail.mockResolvedValue(null);
      users.createFromGoogle.mockResolvedValue(row({ googleId: profile.googleId, fullName: profile.fullName }));

      const result = await service.loginWithGoogle(profile);

      expect(users.createFromGoogle).toHaveBeenCalledWith(profile);
      expect(result.user.fullName).toBe(profile.fullName);
    });

    it('rejects a deactivated account', async () => {
      users.findByGoogleId.mockResolvedValue(row({ googleId: profile.googleId, isActive: false }));
      await expect(service.loginWithGoogle(profile)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    const sign = (jti: string, sv?: number) =>
      jwt.signAsync({ sub: safeUser.id, jti, sv }, { secret: env['auth.jwt.refreshSecret'] as string, expiresIn: 60 });
    /** The account as `startSession` reads it. */
    const account = (sessionVersion = 0) => ({ ...safeUser, sessionVersion });

    it('rejects a token that is not a valid JWT for the refresh secret', async () => {
      await expect(service.refresh('not-a-token')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    const record = (jti: string, revokedAt: Date | null = null) => ({
      id: jti,
      userId: safeUser.id,
      revokedAt,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const revokeAll = {
      where: { userId: safeUser.id, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    };

    it('rotates a valid token and links it to its replacement', async () => {
      const jti = '33333333-3333-4333-8333-333333333333';
      prisma.refreshToken.findUnique.mockResolvedValue(record(jti));
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findUnique.mockResolvedValue(account());

      const result = await service.refresh(await sign(jti));

      expect(result.user).toEqual(safeUser);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: jti, revokedAt: null },
        data: { revokedAt: expect.any(Date), replacedById: expect.any(String) },
      });
      // The new refresh token is the replacement recorded on the old one.
      const { replacedById } = prisma.refreshToken.updateMany.mock.calls[0][0].data;
      expect(prisma.refreshToken.create).toHaveBeenCalledWith({ data: expect.objectContaining({ id: replacedById }) });
    });

    it('gives a second tab that refreshed at the same moment its own session instead of a logout', async () => {
      const jti = '44444444-4444-4444-8444-444444444444';
      prisma.refreshToken.findUnique
        .mockResolvedValueOnce(record(jti))
        .mockResolvedValueOnce({ revokedAt: new Date(Date.now() - 2_000), replacedById: 'replacement-id' });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 }); // the other tab won the claim
      prisma.user.findUnique.mockResolvedValue(account());

      const result = await service.refresh(await sign(jti));

      expect(result.user).toEqual(safeUser);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledTimes(1); // no revoke-all
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    it('revokes every session when a token rotated long ago is replayed (possibly stolen)', async () => {
      const jti = '22222222-2222-4222-8222-222222222222';
      const rotatedAt = new Date(Date.now() - 5 * 60_000);
      prisma.refreshToken.findUnique
        .mockResolvedValueOnce(record(jti, rotatedAt))
        .mockResolvedValueOnce({ revokedAt: rotatedAt, replacedById: 'replacement-id' });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.refresh(await sign(jti))).rejects.toThrow('Refresh token reuse detected');
      expect(prisma.refreshToken.updateMany).toHaveBeenLastCalledWith(revokeAll);
      // The access tokens already handed out stop working too.
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: safeUser.id },
        data: { sessionVersion: { increment: 1 } },
      });
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
      // Its open WebSocket connections close too.
      expect(events.emit).toHaveBeenCalledWith(SESSIONS_REVOKED, { userId: safeUser.id });
    });

    it('revokes every session when a logged-out token is replayed, even right away', async () => {
      const jti = '55555555-5555-4555-8555-555555555555';
      const loggedOutAt = new Date();
      prisma.refreshToken.findUnique
        .mockResolvedValueOnce(record(jti, loggedOutAt))
        .mockResolvedValueOnce({ revokedAt: loggedOutAt, replacedById: null });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.refresh(await sign(jti))).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.refreshToken.updateMany).toHaveBeenLastCalledWith(revokeAll);
    });

    it('opens no new session for an account whose email is not verified (sessions from before verification existed)', async () => {
      const jti = '66666666-6666-4666-8666-666666666666';
      prisma.refreshToken.findUnique.mockResolvedValue(record(jti));
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findUnique.mockResolvedValue({ ...account(), emailVerifiedAt: null });

      await expect(service.refresh(await sign(jti))).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('keeps the session version of the presented token in the new pair', async () => {
      const jti = '77777777-7777-4777-8777-777777777777';
      prisma.refreshToken.findUnique.mockResolvedValue(record(jti));
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findUnique.mockResolvedValue(account(2));

      const result = await service.refresh(await sign(jti, 2));

      expect(result.user).not.toHaveProperty('sessionVersion');
      expect(jwt.decode(result.accessToken)).toMatchObject({ sv: 2 });
    });

    it('opens no new session from a token older than the last "sign out everywhere"', async () => {
      // Signed before the account's sessions were revoked (version 0 -> 1), e.g. a refresh racing a password reset.
      const jti = '88888888-8888-4888-8888-888888888888';
      prisma.refreshToken.findUnique.mockResolvedValue(record(jti));
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findUnique.mockResolvedValue(account(1));

      await expect(service.refresh(await sign(jti, 0))).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });
  });
});
