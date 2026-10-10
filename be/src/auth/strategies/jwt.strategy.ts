import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ACCESS_COOKIE, AuthUser, ConfigService, JwtPayload } from '../../common';
import { PrismaService } from '../../shared/prisma';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      // Browsers send the HttpOnly cookie; the Bearer header stays available for non-browser clients and tools.
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.[ACCESS_COOKIE] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get('auth.jwt.accessSecret'),
    });
  }

  /**
   * Re-checks the user on every request so deactivation, role changes and "sign out everywhere" (a newer session
   * version) apply immediately.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true, sessionVersion: true },
    });
    if (!user || !user.isActive || user.sessionVersion !== (payload.sv ?? 0)) throw new UnauthorizedException();
    return { id: user.id, email: user.email, role: user.role };
  }
}
