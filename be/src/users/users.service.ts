import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, Role, User } from '@prisma/client';
import {
  GoogleProfile,
  paginate,
  Paginated,
  PaginationQueryDto,
  SESSIONS_REVOKED,
  SessionsRevokedEvent,
  toSkipTake,
} from '../common';
import { PrismaService } from '../shared/prisma';
import { StorageService } from '../storage';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { UpdateBrandKitDto } from './dto/update-brand-kit.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { revokeUserSessions } from './user-sessions';
import { presentUser, SafeUser, userSelect } from './user.select';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly events: EventEmitter2,
  ) {}

  /** Internal use only (auth): returns the full row including the password hash. */
  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    fullName?: string;
    role?: Role;
  }): Promise<SafeUser> {
    const row = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        role: data.role,
      },
      select: userSelect,
    });
    return presentUser(row);
  }

  /** Internal use only (auth). */
  findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  /**
   * Attaches a Google identity to an existing account; keeps the profile fields the user already set. Google proved
   * the email, so the account becomes verified.
   *
   * An account whose password was set before anyone proved the email may belong to someone who registered this
   * address first to wait for its owner (pre-account takeover): its password is removed and its sessions revoked, so
   * only the owner of the Google account keeps access. They can set a password again with "forgot password".
   */
  async linkGoogleAccount(user: User, profile: GoogleProfile): Promise<User> {
    const unprovenPassword = user.passwordHash !== null && user.emailVerifiedAt === null;
    const linked = await this.prisma.$transaction(async (tx) => {
      if (unprovenPassword) {
        const count = await revokeUserSessions(tx, user.id);
        this.logger.warn(
          `auth.google_link_cleared_unverified_password userId=${user.id} sessionsRevoked=${count}`,
        );
      }
      return tx.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.googleId,
          fullName: user.fullName ?? profile.fullName,
          avatarUrl: user.avatarUrl ?? profile.avatarUrl,
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
          ...(unprovenPassword && { passwordHash: null }),
        },
      });
    });
    if (unprovenPassword) this.sessionsRevoked(user.id);
    return linked;
  }

  /** Creates a Google-only account (no password); Google only hands out verified emails here. */
  createFromGoogle(profile: GoogleProfile): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: profile.email,
        emailVerifiedAt: new Date(),
        googleId: profile.googleId,
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl,
      },
    });
  }

  async findAll(query: PaginationQueryDto): Promise<Paginated<SafeUser>> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        select: userSelect,
        orderBy: { createdAt: 'desc' },
        ...toSkipTake(query),
      }),
      this.prisma.user.count(),
    ]);
    return paginate(items.map(presentUser), total, query);
  }

  async findOne(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!user) throw new NotFoundException('User not found');
    return presentUser(user);
  }

  /** `avatarUrl` must be an image the user uploaded; `null` removes the avatar (the Google photo too). */
  async updateProfile(id: string, dto: UpdateProfileDto): Promise<SafeUser> {
    const avatar =
      dto.avatarUrl === undefined
        ? {}
        : {
            avatarKey: dto.avatarUrl === null ? null : await this.storage.resolveUpload(dto.avatarUrl, id, ['AVATAR', 'IMAGE']),
            avatarUrl: null,
          };
    const row = await this.prisma.user.update({
      where: { id },
      data: { fullName: dto.fullName, shopName: dto.shopName, ...avatar },
      select: userSelect,
    });
    return presentUser(row);
  }

  /** Replaces the whole brand kit; an empty slogan is stored as null. The logo must be an upload of the user. */
  async updateBrandKit(id: string, dto: UpdateBrandKitDto): Promise<SafeUser> {
    const logoKey = dto.logoUrl ? await this.storage.resolveUpload(dto.logoUrl, id, ['LOGO', 'IMAGE']) : null;
    const row = await this.prisma.user.update({
      where: { id },
      data: { brandKit: { logoKey, colors: dto.colors, fonts: dto.fonts, slogan: dto.slogan || null } },
      select: userSelect,
    });
    return presentUser(row);
  }

  async adminUpdate(id: string, dto: AdminUpdateUserDto, actorId: string): Promise<SafeUser> {
    if (id === actorId && (dto.role !== undefined || dto.isActive === false)) {
      throw new BadRequestException('You cannot change your own role or deactivate yourself');
    }

    const data: Prisma.UserUpdateInput = { role: dto.role, isActive: dto.isActive };

    if (dto.isActive === false) {
      // Deactivated users must lose all existing sessions (also the access tokens: unlocking does not revive them).
      const user = await this.prisma.$transaction(async (tx) => {
        const row = await tx.user.update({ where: { id }, data, select: userSelect });
        await revokeUserSessions(tx, id);
        return row;
      });
      this.sessionsRevoked(id);
      return presentUser(user);
    }

    return presentUser(await this.prisma.user.update({ where: { id }, data, select: userSelect }));
  }

  async remove(id: string, actorId: string): Promise<void> {
    if (id === actorId) throw new BadRequestException('You cannot delete yourself');
    const keys = await this.storage.releaseUserFiles(id);
    await this.prisma.user.delete({ where: { id } });
    this.sessionsRevoked(id);
    await this.storage.deleteObjects(keys);
  }

  /** Open WebSocket connections of the user close too (EventsGateway). */
  private sessionsRevoked(userId: string): void {
    const event: SessionsRevokedEvent = { userId };
    this.events.emit(SESSIONS_REVOKED, event);
  }
}
