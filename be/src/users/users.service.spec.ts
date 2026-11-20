import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { PrismaService } from '../shared/prisma';
import type { StorageService } from '../storage';
import { anonymizedEmail } from './user-removal';
import { UsersService } from './users.service';

/** The database side (anonymization, the RESTRICT foreign keys) is covered by test/e2e/users-removal.e2e-spec.ts. */
describe('UsersService removal and anonymized accounts (docs-old/25 item 3)', () => {
  const build = (lockedRow: { anonymized_at: Date | null } | undefined, current: { anonymizedAt: Date | null } | null = null) => {
    const tx = { $queryRaw: jest.fn().mockResolvedValue(lockedRow ? [lockedRow] : []), user: { delete: jest.fn() } };
    const prisma = {
      $transaction: jest.fn((run: (db: typeof tx) => unknown) => run(tx)),
      user: { findUnique: jest.fn().mockResolvedValue(current), update: jest.fn() },
    };
    const storage = { deleteObjects: jest.fn(), releaseUserFiles: jest.fn() };
    const events = { emit: jest.fn() };
    const service = new UsersService(
      prisma as unknown as PrismaService,
      storage as unknown as StorageService,
      events as unknown as EventEmitter2,
    );
    return { service, prisma, tx, storage, events };
  };

  it('refuses to delete yourself before touching the database', async () => {
    const { service, prisma } = build({ anonymized_at: null });
    await expect(service.remove('admin', 'admin')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown user', async () => {
    const { service } = build(undefined);
    await expect(service.remove('ghost', 'admin')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('changes nothing when the user is already anonymized', async () => {
    const { service, tx, storage, events } = build({ anonymized_at: new Date() });

    await expect(service.remove('u1', 'admin')).resolves.toEqual({ id: 'u1', result: 'ANONYMIZED' });
    // Only the row lock ran: no history check, no delete, no session event, no file.
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.user.delete).not.toHaveBeenCalled();
    expect(storage.releaseUserFiles).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
    expect(storage.deleteObjects).toHaveBeenCalledWith([]);
  });

  it.each([{ isActive: true }, { role: 'ADMIN' as const }, { isDemo: true }])(
    'refuses to change an anonymized account: %o',
    async (dto) => {
      const { service, prisma } = build(undefined, { anonymizedAt: new Date() });
      const error = await service.adminUpdate('u1', dto, 'admin').catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({ code: 'USER_ANONYMIZED' });
      expect(prisma.user.update).not.toHaveBeenCalled();
    },
  );

  it('gives an anonymized account an address that is unique, lower case and never deliverable', () => {
    const id = '01970000-0000-7000-8000-00000000abcd';
    expect(anonymizedEmail(id)).toBe(`deleted-${id}@deleted.invalid`);
    expect(anonymizedEmail(id)).toBe(anonymizedEmail(id).toLowerCase());
  });
});
