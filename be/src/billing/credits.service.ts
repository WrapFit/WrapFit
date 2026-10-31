import { Injectable } from '@nestjs/common';
import { CreditDebitReason, CreditKind, CreditSource, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../shared/prisma';
import { insufficientCredits } from './billing.errors';

type Db = PrismaService | Prisma.TransactionClient;

export interface CreditLotView {
  id: string;
  source: CreditSource;
  quantity: number;
  remaining: number;
  expiresAt: Date | null;
  createdAt: Date;
}

/** Which ledger: export credits (the default) or xu (docs/19). `now` decides which lots have expired. */
export interface LedgerScope {
  kind?: CreditKind;
  now?: Date;
}

export interface GrantInput {
  /** Default EXPORT. */
  kind?: CreditKind;
  quantity: number;
  source: CreditSource;
  /** null = never expires (ADMIN lots only, CHECK chk_credit_lots_expiry). */
  expiresAt: Date | null;
  paymentId?: string;
  /** Money the whole lot is worth: what was paid for it (PURCHASE only, chk_credit_lots_value_source). Default 0. */
  valueVnd?: number;
  note?: string;
}

export interface DebitInput {
  /** Default EXPORT. */
  kind?: CreditKind;
  quantity?: number;
  reason: CreditDebitReason;
  /** What the credits paid for, e.g. the export_unlocks id. */
  refId?: string;
  /** Pass one to record the operation elsewhere first (export_unlocks.debit_operation_id); generated otherwise. */
  operationId?: string;
}

/** A lot counts while it has not expired; lots without an expiry never do. */
const unexpired = (now: Date): Prisma.CreditLotWhereInput => ({ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] });

const LOT_VIEW = { id: true, source: true, quantity: true, remaining: true, expiresAt: true, createdAt: true } as const;

/**
 * Credit ledgers (docs/16 §1.5, docs/17 M3, docs/19): lots with an expiry, spent by debit rows, one ledger per kind
 * (export credits, xu) that never mix. There is no balance column anywhere: the balance is the sum of `remaining` over
 * the lots not expired, and `remaining` only changes here, inside a transaction that holds the lot rows locked, so two
 * concurrent debits never spend the same credit.
 */
@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  async balance(
    userId: string,
    db: Db = this.prisma,
    { kind = 'EXPORT', now = new Date() }: LedgerScope = {},
  ): Promise<number> {
    const { _sum } = await db.creditLot.aggregate({
      where: { userId, kind, ...unexpired(now) },
      _sum: { remaining: true },
    });
    return _sum.remaining ?? 0;
  }

  /** Lots not expired, the ones spent first on top. */
  async lots(
    userId: string,
    db: Db = this.prisma,
    { kind = 'EXPORT', now = new Date() }: LedgerScope = {},
  ): Promise<CreditLotView[]> {
    return db.creditLot.findMany({
      where: { userId, kind, ...unexpired(now) },
      select: LOT_VIEW,
      orderBy: [{ expiresAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
    });
  }

  async grant(userId: string, input: GrantInput, db: Db = this.prisma): Promise<CreditLotView> {
    return db.creditLot.create({
      data: {
        userId,
        kind: input.kind ?? 'EXPORT',
        source: input.source,
        quantity: input.quantity,
        remaining: input.quantity,
        expiresAt: input.expiresAt,
        paymentId: input.paymentId,
        valueVnd: input.valueVnd ?? 0,
        note: input.note,
      },
      select: LOT_VIEW,
    });
  }

  /**
   * Spends `quantity` credits, the lot that expires first first. Runs in `tx` when given (the caller commits the debit
   * together with what it pays for), otherwise in its own transaction. Not enough credits: 402 INSUFFICIENT_CREDITS and
   * nothing is written.
   */
  async debit(
    userId: string,
    input: DebitInput,
    tx?: Prisma.TransactionClient,
  ): Promise<{ operationId: string; balance: number }> {
    const run = (db: Prisma.TransactionClient) => this.debitIn(db, userId, input);
    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  /**
   * Gives back the credits of one debit operation, once: a second call (or a concurrent one) returns 0. A credit returns
   * to its own lot, so a refund after that lot expired is lost with it.
   */
  async refund(operationId: string, tx?: Prisma.TransactionClient): Promise<number> {
    const run = async (db: Prisma.TransactionClient) => {
      // The row lock taken by UPDATE makes a concurrent refund wait, then see refunded_at set and match nothing.
      const rows = await db.$queryRaw<{ lot_id: string; quantity: number }[]>`
        UPDATE credit_debits SET refunded_at = now()
        WHERE operation_id = ${operationId}::uuid AND refunded_at IS NULL
        RETURNING lot_id, quantity`;
      for (const row of rows) {
        await db.creditLot.update({ where: { id: row.lot_id }, data: { remaining: { increment: row.quantity } } });
      }
      return rows.reduce((sum, row) => sum + row.quantity, 0);
    };
    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  private async debitIn(
    db: Prisma.TransactionClient,
    userId: string,
    { kind = 'EXPORT', quantity = 1, reason, refId, operationId = randomUUID() }: DebitInput,
  ): Promise<{ operationId: string; balance: number }> {
    if (!Number.isInteger(quantity) || quantity < 1) throw new RangeError(`Invalid debit quantity: ${quantity}`);
    const now = new Date();
    // FOR UPDATE: a concurrent debit waits here, then re-reads `remaining` and skips the lots this one emptied.
    const lots = await db.$queryRaw<{ id: string; remaining: number }[]>`
      SELECT id, remaining FROM credit_lots
      WHERE user_id = ${userId}::uuid AND kind = ${kind}::"CreditKind" AND remaining > 0
        AND (expires_at IS NULL OR expires_at > ${now.toISOString()}::timestamptz)
      ORDER BY expires_at ASC NULLS LAST, created_at ASC
      FOR UPDATE`;
    const available = lots.reduce((sum, lot) => sum + lot.remaining, 0);
    if (available < quantity) throw insufficientCredits(available, kind, quantity);

    let left = quantity;
    const debits: Prisma.CreditDebitCreateManyInput[] = [];
    for (const lot of lots) {
      if (left === 0) break;
      const take = Math.min(lot.remaining, left);
      await db.creditLot.update({ where: { id: lot.id }, data: { remaining: { decrement: take } } });
      debits.push({ operationId, lotId: lot.id, userId, quantity: take, reason, refId });
      left -= take;
    }
    await db.creditDebit.createMany({ data: debits });
    return { operationId, balance: available - quantity };
  }
}
