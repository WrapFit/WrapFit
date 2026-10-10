import { ConflictException, ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import {
  ConfigService,
  GoogleProfile,
  JwtPayload,
  RefreshPayload,
  SESSIONS_REVOKED,
  SessionMeta,
  SessionsRevokedEvent,
} from '../common';
import { PrismaService } from '../shared/prisma';
import { MailService } from '../mail';
import { presentUser, revokeUserSessions, SafeUser, toSafeUser, userSelect, UsersService } from '../users';
import { AccountRecoveryService } from './account-recovery.service';
import { AuthTokensService } from './auth-tokens.service';
import { REFRESH_REUSE_GRACE_MS } from './auth.constants';
import { LoginAttemptsService } from './login-attempts.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** Access token lifetime in seconds. */
  expiresIn: number;
  /** Refresh token lifetime in seconds. */
  refreshExpiresIn: number;
}

export interface AuthResult extends TokenPair {
  user: SafeUser;
}

// Compared against when the email is unknown, so response time does not reveal whether an account exists.
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.4o0n0o1Yb1Uq8wq1jU1ZpU3dQ6vK';

/** 403 with a stable code: the frontend offers to resend the verification email. */
export const emailNotVerified = () =>
  new ForbiddenException({
    code: 'EMAIL_NOT_VERIFIED',
    message: 'Verify your email address before signing in: open the link we emailed you, or ask for a new one',
  });

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly authTokens: AuthTokensService,
    private readonly mail: MailService,
    private readonly recovery: AccountRecoveryService,
    private readonly config: ConfigService,
    private readonly loginAttempts: LoginAttemptsService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Registration answers the same way whether the address is new or not, so it never tells who has an account; only
   * the email sent differs (see AccountRecoveryService.handleRepeatedSignup for an existing address). A new account
   * gets its verification link; no session is opened until the email is verified. A failure to queue the email does
   * not fail the registration (the user can ask for a resend).
   */
  async register(dto: RegisterDto): Promise<void> {
    // Hashed in every case: the time to answer does not tell an existing address either.
    const passwordHash = await bcrypt.hash(dto.password, this.config.get('auth.bcryptRounds'));
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) return this.recovery.handleRepeatedSignup(existing);

    let tokenId: string | null = null;
    try {
      await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: { email: dto.email, passwordHash, fullName: dto.fullName },
          select: { id: true },
        });
        tokenId = await this.authTokens.issue(tx, created.id, 'VERIFY_EMAIL');
      });
    } catch (error) {
      // Two registrations of the same address at the same moment: the second one is a repeated registration.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const winner = await this.usersService.findByEmail(dto.email);
        if (winner) return this.recovery.handleRepeatedSignup(winner);
      }
      throw error;
    }
    if (tokenId) await this.mail.sendAuthEmail(tokenId);
  }

  async login(dto: LoginDto, meta: SessionMeta = {}): Promise<AuthResult> {
    await this.loginAttempts.assertAllowed(dto.email);
    const user = await this.usersService.findByEmail(dto.email);
    // Google-only accounts have no password hash: they are compared against the dummy hash and always fail.
    const passwordValid = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !user.passwordHash || !passwordValid || !user.isActive) {
      await this.loginAttempts.recordFailure(dto.email);
      throw new UnauthorizedException('Invalid credentials');
    }
    // Only told after the password matched: the answer reveals nothing to someone who does not know it.
    if (!user.emailVerifiedAt) throw emailNotVerified();

    await this.loginAttempts.reset(dto.email);
    return { user: toSafeUser(user), ...(await this.issueTokens(user, meta)) };
  }

  /**
   * Signs in with a Google identity: finds the account by Google id, otherwise links the Google identity to the
   * account with the same (Google-verified) email, otherwise creates a new password-less account.
   */
  async loginWithGoogle(profile: GoogleProfile, meta: SessionMeta = {}): Promise<AuthResult> {
    if (!profile.emailVerified) throw new UnauthorizedException('Google account email is not verified');

    let user = await this.usersService.findByGoogleId(profile.googleId);
    if (!user) {
      const existing = await this.usersService.findByEmail(profile.email);
      if (existing?.googleId) {
        throw new ConflictException('This email is already linked to another Google account');
      }
      user = existing
        ? await this.usersService.linkGoogleAccount(existing, profile)
        : await this.usersService.createFromGoogle(profile);
    }
    if (!user.isActive) throw new UnauthorizedException('Account is disabled');

    return { user: toSafeUser(user), ...(await this.issueTokens(user, meta)) };
  }

  /**
   * Rotates the refresh token: the presented one is revoked and a new pair is issued. Replaying a revoked token logs
   * the user out everywhere (it may have been stolen), except right after a rotation: tabs share the cookie and
   * refresh at the same moment, so the slower one gets its own new session (REFRESH_REUSE_GRACE_MS).
   */
  async refresh(refreshToken: string, meta: SessionMeta = {}): Promise<AuthResult> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const sessionVersion = payload.sv ?? 0;

    const record = await this.prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    if (!record || record.userId !== payload.sub) throw new UnauthorizedException('Invalid refresh token');
    if (record.expiresAt <= new Date()) throw new UnauthorizedException('Refresh token expired');

    // Atomic claim: only one concurrent request can revoke the token and take its place.
    const replacementId = randomUUID();
    const claimed = await this.prisma.refreshToken.updateMany({
      where: { id: record.id, revokedAt: null },
      data: { revokedAt: new Date(), replacedById: replacementId },
    });
    if (claimed.count === 1) return this.startSession(record.userId, meta, sessionVersion, replacementId);

    // Already revoked, possibly a moment ago by the request that won the claim above.
    const current = await this.prisma.refreshToken.findUnique({
      where: { id: record.id },
      select: { revokedAt: true, replacedById: true },
    });
    const justRotated =
      current?.replacedById && current.revokedAt && Date.now() - current.revokedAt.getTime() < REFRESH_REUSE_GRACE_MS;
    if (justRotated) return this.startSession(record.userId, meta, sessionVersion);

    // A revoked token being replayed means it may have been stolen: kill every session of this user.
    await this.revokeAllForUser(record.userId);
    throw new UnauthorizedException('Refresh token reuse detected');
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = await this.verifyRefreshToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { id: payload.jti, userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Logging out with an invalid/expired token is a no-op.
    }
  }

  /** Signs the user out of every device at once, access tokens included (see revokeUserSessions). */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.$transaction((tx) => revokeUserSessions(tx, userId));
    const event: SessionsRevokedEvent = { userId };
    this.events.emit(SESSIONS_REVOKED, event);
  }

  private async verifyRefreshToken(token: string): Promise<RefreshPayload> {
    try {
      return await this.jwtService.verifyAsync<RefreshPayload>(token, {
        secret: this.config.get('auth.jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * New token pair for an active, verified user (refresh). `sessionVersion` is the one of the presented refresh
   * token: an older number than the account's means every session was revoked since (a refresh racing the
   * revocation must not keep the session alive).
   */
  private async startSession(
    userId: string,
    meta: SessionMeta,
    sessionVersion: number,
    refreshId?: string,
  ): Promise<AuthResult> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ...userSelect, sessionVersion: true },
    });
    if (!row) throw new UnauthorizedException('Invalid refresh token');
    const { sessionVersion: current, ...user } = row;
    if (!user.isActive || !user.emailVerifiedAt || current !== sessionVersion) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return { user: presentUser(user), ...(await this.issueTokens(row, meta, refreshId)) };
  }

  private async issueTokens(
    user: Pick<User, 'id' | 'email' | 'role' | 'sessionVersion'>,
    meta: SessionMeta,
    refreshId: string = randomUUID(),
  ): Promise<TokenPair> {
    const accessTtl = this.config.get('auth.jwt.accessTtlSeconds');
    const refreshTtl = this.config.get('auth.jwt.refreshTtlSeconds');

    await this.prisma.refreshToken.create({
      data: {
        id: refreshId,
        userId: user.id,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    const sv = user.sessionVersion;
    const accessPayload: JwtPayload = { sub: user.id, email: user.email, role: user.role, sv };
    const refreshPayload: RefreshPayload = { sub: user.id, jti: refreshId, sv };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.config.get('auth.jwt.accessSecret'),
        expiresIn: accessTtl,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.config.get('auth.jwt.refreshSecret'),
        expiresIn: refreshTtl,
      }),
    ]);

    return { accessToken, refreshToken, expiresIn: accessTtl, refreshExpiresIn: refreshTtl };
  }
}
