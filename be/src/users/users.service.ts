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
import { anonymizeUser, hardDeleteUser, hasFinancialHistory, userAnonymized, UserRemovalResult } from './user-removal';
import { revokeUserSessions } from './user-sessions';
import { presentUser, SafeUser, userSelect } from './user.select';

/** A user with many projects and files: the default 5 s of an interactive transaction is too short. */
const REMOVAL_TIMEOUT_MS = 60_000;

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

  /**
   * `avatarUrl` must be an image the user uploaded; `null` removes the avatar (the Google photo too). The avatar it
   * replaces is deleted with its file, so it stops counting against the storage quota.
   */
  async updateProfile(id: string, dto: UpdateProfileDto): Promise<SafeUser> {
    const avatarKey =
      dto.avatarUrl === undefined || dto.avatarUrl === null
        ? dto.avatarUrl
        : await this.storage.resolveUpload(dto.avatarUrl, id, ['AVATAR', 'IMAGE']);
    const { row, replaced } = await this.prisma.$transaction(async (tx) => {
      const before = avatarKey === undefined ? null : await this.lockProfileFiles(tx, id);
      const row = await tx.user.update({
        where: { id },
        data: {
          fullName: dto.fullName,
          shopName: dto.shopName,
          ...(avatarKey !== undefined && { avatarKey, avatarUrl: null }),
        },
        select: userSelect,
      });
      const old = before?.avatarKey;
      const replaced = old && old !== avatarKey ? await this.storage.forgetProfileUpload(tx, id, old, 'AVATAR') : null;
      return { row, replaced };
    });
    if (replaced) await this.storage.deleteObjects([replaced]);
    return presentUser(row);
  }

  /**
   * Replaces the whole brand kit; an empty slogan is stored as null. The logo must be an upload of the user; the logo
   * it replaces is deleted with its file unless a project still shows it.
   */
  async updateBrandKit(id: string, dto: UpdateBrandKitDto): Promise<SafeUser> {
    const logoKey = dto.logoUrl ? await this.storage.resolveUpload(dto.logoUrl, id, ['LOGO', 'IMAGE']) : null;
    const { row, replaced } = await this.prisma.$transaction(async (tx) => {
      const before = await this.lockProfileFiles(tx, id);
      const row = await tx.user.update({
        where: { id },
        data: { brandKit: { logoKey, colors: dto.colors, fonts: dto.fonts, slogan: dto.slogan || null } },
        select: userSelect,
      });
      const old = before?.logoKey;
      const replaced = old && old !== logoKey ? await this.storage.forgetProfileUpload(tx, id, old, 'LOGO') : null;
      return { row, replaced };
    });
    if (replaced) await this.storage.deleteObjects([replaced]);
    return presentUser(row);
  }

  /** Current avatar and logo keys, with the user row locked: two saves at once cannot both miss the replaced file. */
  private async lockProfileFiles(tx: Prisma.TransactionClient, id: string) {
    const [row] = await tx.$queryRaw<{ avatar_key: string | null; brand_kit: { logoKey?: string | null } | null }[]>`
      SELECT avatar_key, brand_kit FROM users WHERE id = ${id}::uuid FOR UPDATE`;
    return row ? { avatarKey: row.avatar_key, logoKey: row.brand_kit?.logoKey ?? null } : null;
  }

  async adminUpdate(id: string, dto: AdminUpdateUserDto, actorId: string): Promise<SafeUser> {
    if (id === actorId && (dto.role !== undefined || dto.isActive === false)) {
      throw new BadRequestException('You cannot change your own role or deactivate yourself');
    }
    // An anonymized account stays as it is: never unlocked, never given a role or the demo flag again (409).
    const current = await this.prisma.user.findUnique({ where: { id }, select: { anonymizedAt: true } });
    if (!current) throw new NotFoundException('User not found');
    if (current.anonymizedAt) throw userAnonymized();
    // `anonymizedAt: null` also covers an anonymization that commits between the read above and this update (404).
    const where = { id, anonymizedAt: null };

    const data: Prisma.UserUpdateInput = { role: dto.role, isActive: dto.isActive, isDemo: dto.isDemo };

    if (dto.isActive === false) {
      // Deactivated users must lose all existing sessions (also the access tokens: unlocking does not revive them).
      const user = await this.prisma.$transaction(async (tx) => {
        const row = await tx.user.update({ where, data, select: userSelect });
        await revokeUserSessions(tx, id);
        return row;
      });
      this.sessionsRevoked(id);
      return presentUser(user);
    }

    return presentUser(await this.prisma.user.update({ where, data, select: userSelect }));
  }

  /**
   * Admin deletion (docs/25 item 3). A user without financial history (`hasFinancialHistory`) is deleted with their
   * projects and files as before; a user with it is anonymized instead (`anonymizeUser`), so payments, orders and
   * credits keep their owner. One transaction either way; bucket objects go after the commit. Deleting an anonymized
   * user again changes nothing and answers ANONYMIZED.
   *
   * The row lock is FOR NO KEY UPDATE, not FOR UPDATE: a payment confirmation running at the same moment locks its
   * payment, then inserts a credit lot (a KEY SHARE lock on this row); FOR UPDATE would deadlock with it while this
   * transaction waits for that payment.
   *
   * shortcut: a payment created between the check and a hard delete makes the delete fail on the RESTRICT foreign key
   * (409 from the exception filter, nothing deleted); the admin retries and the user is anonymized. No automatic retry.
   */
  async remove(id: string, actorId: string): Promise<{ id: string; result: UserRemovalResult }> {
    if (id === actorId) throw new BadRequestException('You cannot delete yourself');
    const { result, keys, revoked } = await this.prisma.$transaction(
      async (tx) => {
        const [row] = await tx.$queryRaw<{ anonymized_at: Date | null }[]>`
          SELECT anonymized_at FROM users WHERE id = ${id}::uuid FOR NO KEY UPDATE`;
        if (!row) throw new NotFoundException('User not found');
        if (row.anonymized_at) return { result: 'ANONYMIZED' as const, keys: [], revoked: false };
        if (!(await hasFinancialHistory(tx, id))) {
          return { result: 'DELETED' as const, keys: await hardDeleteUser(tx, this.storage, id), revoked: true };
        }
        return { result: 'ANONYMIZED' as const, keys: await anonymizeUser(tx, this.storage, id, actorId), revoked: true };
      },
      { timeout: REMOVAL_TIMEOUT_MS },
    );
    if (revoked) {
      this.logger.log(`users.removed userId=${id} result=${result} files=${keys.length} by=${actorId}`);
      this.sessionsRevoked(id);
    }
    await this.storage.deleteObjects(keys);
    return { id, result };
  }

  /** Open WebSocket connections of the user close too (EventsGateway). */
  private sessionsRevoked(userId: string): void {
    const event: SessionsRevokedEvent = { userId };
    this.events.emit(SESSIONS_REVOKED, event);
  }
}
