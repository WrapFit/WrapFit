import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthTokenPurpose } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { ConfigService, SESSIONS_REVOKED, SessionsRevokedEvent } from '../common';
import { PrismaService } from '../shared/prisma';
import { MailService } from '../mail';
import { revokeUserSessions } from '../users';
import { AuthTokensService } from './auth-tokens.service';
import { LoginAttemptsService } from './login-attempts.service';

/** Stable error codes of the one-time links, read by the frontend to pick its message. */
export type AuthTokenErrorCode = 'AUTH_TOKEN_INVALID' | 'AUTH_TOKEN_EXPIRED' | 'AUTH_TOKEN_CONSUMED';

const TOKEN_ERRORS: Record<AuthTokenErrorCode, string> = {
  AUTH_TOKEN_INVALID: 'This link is not valid (it may have been replaced by a newer email)',
  AUTH_TOKEN_EXPIRED: 'This link has expired; ask for a new email',
  AUTH_TOKEN_CONSUMED: 'This link was already used; ask for a new email if needed',
};

const tokenError = (code: AuthTokenErrorCode) => new BadRequestException({ code, message: TOKEN_ERRORS[code] });

/**
 * Email verification and password reset. The public "send me an email" routes answer the same way whether the
 * address has an account or not (no account enumeration); rate limits skip silently for the same reason.
 */
@Injectable()
export class AccountRecoveryService {
  private readonly logger = new Logger(AccountRecoveryService.name);
  private readonly bcryptRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: AuthTokensService,
    private readonly mail: MailService,
    private readonly loginAttempts: LoginAttemptsService,
    private readonly events: EventEmitter2,
    config: ConfigService,
  ) {
    this.bcryptRounds = config.get('auth.bcryptRounds');
  }

  /** Marks the email as verified. Opening the same link again succeeds as long as the account is verified. */
  async verifyEmail(rawToken: string): Promise<void> {
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const outcome = await this.tokens.consume(tx, rawToken, ['VERIFY_EMAIL'], now);
      if (outcome.status === 'ok') {
        await tx.user.updateMany({ where: { id: outcome.userId, emailVerifiedAt: null }, data: { emailVerifiedAt: now } });
      }
      return outcome;
    });

    if (result.status === 'ok') {
      this.logger.log(`auth.verify_email.ok userId=${result.userId}`);
      return;
    }
    if (result.status === 'consumed') {
      const user = await this.prisma.user.findUnique({ where: { id: result.userId }, select: { emailVerifiedAt: true } });
      if (user?.emailVerifiedAt) return; // second click on the link
      throw tokenError('AUTH_TOKEN_INVALID'); // replaced by a newer link before it was used
    }
    throw tokenError(result.status === 'expired' ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_TOKEN_INVALID');
  }

  /** Sends a new verification link to an unverified account. Silent for unknown or already verified addresses. */
  async resendVerification(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, isActive: true, emailVerifiedAt: true },
    });
    if (!user || !user.isActive || user.emailVerifiedAt) return;
    await this.sendLink(user.id, 'VERIFY_EMAIL');
  }

  /**
   * Sends a password reset link. Also works for an account created with Google only: the email proves ownership, so
   * it may add a password.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true, isActive: true } });
    if (!user || !user.isActive) return;
    await this.sendLink(user.id, 'RESET_PASSWORD');
  }

  /**
   * Sets a new password and signs the account out everywhere (whoever knew the old password loses access). The link
   * came from the mailbox, so the email counts as verified too. The user then signs in with the new password.
   */
  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, this.bcryptRounds);
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      // The link of a repeated registration (COMPLETE_SIGNUP) sets the password the same way.
      const outcome = await this.tokens.consume(tx, rawToken, ['RESET_PASSWORD', 'COMPLETE_SIGNUP'], now);
      if (outcome.status !== 'ok') return { outcome, sessionsRevoked: 0, email: null };
      const { email } = await tx.user.update({
        where: { id: outcome.userId },
        data: { passwordHash },
        select: { email: true },
      });
      await tx.user.updateMany({ where: { id: outcome.userId, emailVerifiedAt: null }, data: { emailVerifiedAt: now } });
      const count = await revokeUserSessions(tx, outcome.userId, now);
      return { outcome, sessionsRevoked: count, email };
    });

    const { outcome } = result;
    if (outcome.status === 'ok') {
      this.logger.log(`auth.password_reset.ok userId=${outcome.userId} sessionsRevoked=${result.sessionsRevoked}`);
      const event: SessionsRevokedEvent = { userId: outcome.userId };
      this.events.emit(SESSIONS_REVOKED, event);
      // The owner of the mailbox proved who they are: failed logins of whoever guessed before no longer count.
      if (result.email) await this.loginAttempts.reset(result.email);
      return;
    }
    throw tokenError(
      outcome.status === 'consumed'
        ? 'AUTH_TOKEN_CONSUMED'
        : outcome.status === 'expired'
          ? 'AUTH_TOKEN_EXPIRED'
          : 'AUTH_TOKEN_INVALID',
    );
  }

  /**
   * Someone registered an address that already has an account. The answer to the request is the same as for a new
   * account; only the mailbox learns the difference:
   * - not verified yet: a link to choose the password. The stored password is kept until then (it may belong to
   *   whoever registered the address first), and the earlier verification links stop working, so only the owner of
   *   the mailbox decides the password the account will use;
   * - verified: a notice that the account exists, with the way to sign in or reset the password.
   */
  async handleRepeatedSignup(user: { id: string; isActive: boolean; emailVerifiedAt: Date | null }): Promise<void> {
    if (!user.isActive) return;
    if (user.emailVerifiedAt) {
      await this.mail.sendAccountExistsNotice(user.id);
      this.logger.log(`auth.signup_existing_account userId=${user.id}`);
      return;
    }
    await this.sendLink(user.id, 'COMPLETE_SIGNUP', ['VERIFY_EMAIL']);
    this.logger.log(`auth.signup_unverified_account userId=${user.id}`);
  }

  /** `replaces`: other kinds of links of the user that stop working when this one is issued. */
  private async sendLink(userId: string, purpose: AuthTokenPurpose, replaces: AuthTokenPurpose[] = []): Promise<void> {
    if (!(await this.tokens.canSend(userId, purpose))) {
      this.logger.log(`auth.email_rate_limited purpose=${purpose} userId=${userId}`);
      return;
    }
    const tokenId = await this.prisma.$transaction(async (tx) => {
      if (replaces.length) await this.tokens.revoke(tx, userId, replaces);
      return this.tokens.issue(tx, userId, purpose);
    });
    if (tokenId) await this.mail.sendAuthEmail(tokenId);
  }
}
