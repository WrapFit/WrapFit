import { Body, Controller, Get, HttpCode, Logger, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  ACCESS_COOKIE,
  ConfigService,
  CurrentUser,
  GoogleProfile,
  Public,
  REFRESH_COOKIE,
  SessionMeta,
  ThrottlePerSession,
} from '../common';
import { SafeUser, UsersService } from '../users';
import { AccountRecoveryService } from './account-recovery.service';
import { AuthCookieService } from './auth-cookie.service';
import { DEFAULT_LOGIN_REDIRECT } from './auth.constants';
import { AuthResult, AuthService } from './auth.service';
import { EmailOnlyDto, ResetPasswordDto, VerifyEmailDto } from './dto/account-recovery.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { readOAuthState } from './strategies/oauth-state.store';

// Stricter limit than the global default to slow down brute force / credential stuffing.
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };
// Routes that send an email: per IP on top of the per-account limits of AuthTokensService.canSend.
const AUTH_EMAIL_THROTTLE = { default: { limit: 5, ttl: 60_000 } };
// Refresh: per session, not per IP (see ThrottlePerSession). A browser refreshes about once per access token (15 min)
// per tab; guests (no cookie) try once per page load.
const REFRESH_THROTTLE = { cookie: REFRESH_COOKIE, limit: 30, anonymousLimit: 300, ttl: 60_000 };

/**
 * Registration opens no session (the account signs in once its email is verified), and its answer is the same for a
 * new and an existing address: show "check your inbox".
 */
export interface RegisterResponse {
  email: string;
  emailVerificationRequired: true;
}

/** Tokens are never returned in the body: they are set as HttpOnly cookies (`wf_access`, `wf_refresh`). */
export interface AuthSessionResponse {
  user: SafeUser;
  /** Access token lifetime in seconds — refresh shortly before it expires. */
  expiresIn: number;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly authService: AuthService,
    private readonly recovery: AccountRecoveryService,
    private readonly cookies: AuthCookieService,
    private readonly usersService: UsersService,
    config: ConfigService,
  ) {
    this.frontendUrl = config.get('app.frontendUrl').replace(/\/+$/, '');
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('register')
  @ApiOperation({
    summary:
      'Create an account and email its verification link (no session until verified). Same 201 answer when the address already has an account: that mailbox gets a different email',
  })
  async register(@Body() dto: RegisterDto): Promise<RegisterResponse> {
    await this.authService.register(dto);
    return { email: dto.email, emailVerificationRequired: true };
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  @Post('verify-email')
  @ApiOperation({
    summary: 'Verify the email with the token of the link (idempotent); then sign in. 400 code AUTH_TOKEN_INVALID | AUTH_TOKEN_EXPIRED',
  })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ verified: true }> {
    await this.recovery.verifyEmail(dto.token);
    return { verified: true };
  }

  @Public()
  @Throttle(AUTH_EMAIL_THROTTLE)
  @HttpCode(202)
  @Post('verify-email/resend')
  @ApiOperation({ summary: 'Email a new verification link (same answer whether the address has an account or not)' })
  async resendVerification(@Body() dto: EmailOnlyDto): Promise<Record<string, never>> {
    await this.recovery.resendVerification(dto.email);
    return {};
  }

  @Public()
  @Throttle(AUTH_EMAIL_THROTTLE)
  @HttpCode(202)
  @Post('password/forgot')
  @ApiOperation({ summary: 'Email a password reset link (same answer whether the address has an account or not)' })
  async forgotPassword(@Body() dto: EmailOnlyDto): Promise<Record<string, never>> {
    await this.recovery.forgotPassword(dto.email);
    return {};
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  @Post('password/reset')
  @ApiOperation({
    summary:
      'Set a new password with the token of the link; every session is revoked, then sign in. 400 code AUTH_TOKEN_INVALID | AUTH_TOKEN_EXPIRED | AUTH_TOKEN_CONSUMED',
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Record<string, never>> {
    await this.recovery.resetPassword(dto.token, dto.password);
    this.cookies.clearAuthCookies(res);
    return {};
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password (sets the auth cookies); 403 code EMAIL_NOT_VERIFIED' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponse> {
    return this.startSession(res, await this.authService.login(dto, sessionMeta(req)));
  }

  @Public()
  @ThrottlePerSession(REFRESH_THROTTLE)
  @HttpCode(200)
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate the refresh token cookie and issue a new access token cookie' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<AuthSessionResponse> {
    try {
      const result = await this.authService.refresh(req.cookies?.[REFRESH_COOKIE] ?? '', sessionMeta(req));
      return this.startSession(res, result);
    } catch (error) {
      // A dead session must not linger in the browser.
      this.cookies.clearAuthCookies(res);
      throw error;
    }
  }

  @Public()
  @HttpCode(204)
  @Post('logout')
  @ApiOperation({ summary: 'Revoke the current session and clear the auth cookies' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (refreshToken) await this.authService.logout(refreshToken);
    this.cookies.clearAuthCookies(res);
  }

  @ApiCookieAuth(ACCESS_COOKIE)
  @Get('me')
  @ApiOperation({ summary: 'Current user (same as GET /api/users/me); 401 means: call /api/auth/refresh' })
  me(@CurrentUser('id') userId: string): Promise<SafeUser> {
    return this.usersService.findOne(userId);
  }

  @ApiCookieAuth(ACCESS_COOKIE)
  @HttpCode(204)
  @Post('logout-all')
  @ApiOperation({ summary: 'Revoke every session of the current user (all devices)' })
  async logoutAll(@CurrentUser('id') userId: string, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.authService.revokeAllForUser(userId);
    this.cookies.clearAuthCookies(res);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @UseGuards(GoogleOAuthGuard)
  @Get('google')
  @ApiOperation({ summary: 'Start "Sign in with Google" (browser redirect, not callable from fetch/XHR)' })
  @ApiQuery({
    name: 'redirect',
    required: false,
    description: 'Frontend path to open after login, e.g. `/p/8f92a1` (default `/dashboard`)',
  })
  googleLogin(): void {
    // GoogleOAuthGuard redirects to Google's consent screen before this runs.
  }

  @Public()
  @UseGuards(GoogleOAuthGuard)
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback: sets the auth cookies and redirects to the frontend' })
  async googleCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const redirect = readOAuthState(req)?.redirect;
    this.cookies.clearOAuthState(res);

    const profile = req.user as GoogleProfile | null | undefined;
    if (!profile) return res.redirect(`${this.frontendUrl}/login?error=google_auth_failed`);

    try {
      this.startSession(res, await this.authService.loginWithGoogle(profile, sessionMeta(req)));
    } catch (error) {
      this.logger.warn(`Google login refused (google id ${profile.googleId}): ${(error as Error).message}`);
      return res.redirect(`${this.frontendUrl}/login?error=google_account_rejected`);
    }
    res.redirect(`${this.frontendUrl}${redirect ?? DEFAULT_LOGIN_REDIRECT}`);
  }

  private startSession(res: Response, result: AuthResult): AuthSessionResponse {
    this.cookies.setAuthCookies(res, result);
    return { user: result.user, expiresIn: result.expiresIn };
  }
}

function sessionMeta(req: Request): SessionMeta {
  return { userAgent: req.get('user-agent')?.slice(0, 512), ipAddress: req.ip };
}
