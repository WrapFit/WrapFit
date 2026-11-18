// Converts the export credits people still hold into xu Wrap, once (docs/25 item 7, decision Q4). Export packs are no
// longer sold and no export spends a credit (the print file opens with a paid print order), so a credit left is money
// with no use.
//
//   npm --workspace=be run db:convert-export-credits              # dry run: prints what it would do, writes nothing
//   npm --workspace=be run db:convert-export-credits -- --apply   # writes
//
// Run it by hand before a deploy, never from a migration or at container start. Per user, in one transaction:
//   - every unexpired EXPORT lot with credits left is emptied by one debit (reason ADMIN_ADJUSTMENT) through
//     CreditsService, the ledger the app uses, so the debit rows say where each credit went;
//   - each purchased lot (source PURCHASE) gives one XU lot of source PURCHASE, worth the price paid for the credits
//     left (payments.amount_vnd × remaining / quantity) at 100đ a xu, rounded up (xuForExportCredits). The xu lot
//     keeps the payment, the expiry of the export lot and that value (credit_lots.value_vnd, for the xu report);
//   - credits granted for free (source ADMIN: admin grants, the demo seed) are emptied and give nothing: nobody paid
//     for them. Plan allowance lots are always xu (chk_credit_lots_allowance_kind), never export credits.
// Expired lots are left as they are: their credits were already lost. Running it again converts nothing: every
// unexpired export lot is empty after the first run. A user who buys nothing more keeps the "Lượt xuất" plan until
// their last purchased export lot expires (PlanService reads purchased lots, not their balance).
import { Prisma, PrismaClient } from '@prisma/client';
import { CreditsService } from '../../src/billing/credits.service';
import { xuForExportCredits } from '../../src/billing/export-credit-conversion';
import type { PrismaService } from '../../src/shared/prisma';

/** Debit rows of the conversion carry this ref_id. */
export const CONVERSION_REF = 'docs/25-item-7:export-credits-to-xu';

/**
 * Price of one credit when a purchased lot lost its payment row (payment_id SET NULL): the highest price a credit was
 * ever sold at (EXPORT_1, 19.000đ), the customer's favour. Not expected to happen: payments are never deleted.
 */
const FALLBACK_PRICE_PER_CREDIT_VND = 19_000;

interface ExportLotRow {
  id: string;
  source: 'PURCHASE' | 'ADMIN' | 'PLAN_ALLOWANCE';
  quantity: number;
  remaining: number;
  expires_at: Date | null;
  payment_id: string | null;
  amount_vnd: number | null;
}

export interface ConvertedLot {
  lotId: string;
  paymentId: string | null;
  remaining: number;
  quantity: number;
  paidVnd: number;
  xu: number;
  valueVnd: number;
  expiresAt: Date;
}

export interface UserConversion {
  userId: string;
  purchased: ConvertedLot[];
  /** Credits of free lots (ADMIN) emptied for nothing. */
  freeCredits: number;
  xu: number;
}

export interface ConversionReport {
  applied: boolean;
  users: UserConversion[];
  totals: { users: number; purchasedCredits: number; freeCredits: number; xuLots: number; xu: number; valueVnd: number };
}

const unexpiredExportLots = (userId: string, now: Date, lock: boolean) => Prisma.sql`
  SELECT l.id, l.source::text AS source, l.quantity, l.remaining, l.expires_at, l.payment_id, p.amount_vnd
  FROM credit_lots l LEFT JOIN payments p ON p.id = l.payment_id
  WHERE l.user_id = ${userId}::uuid AND l.kind = 'EXPORT' AND l.remaining > 0
    AND (l.expires_at IS NULL OR l.expires_at > ${now.toISOString()}::timestamptz)
  ORDER BY l.created_at, l.id
  ${lock ? Prisma.sql`FOR UPDATE OF l` : Prisma.empty}`;

function plan(userId: string, lots: ExportLotRow[]): UserConversion {
  const purchased: ConvertedLot[] = [];
  let freeCredits = 0;
  for (const lot of lots) {
    if (lot.source !== 'PURCHASE') {
      freeCredits += lot.remaining;
      continue;
    }
    if (lot.amount_vnd === null) {
      console.warn(`Lot ${lot.id}: purchased without a payment row, priced at ${FALLBACK_PRICE_PER_CREDIT_VND}đ a credit`);
    }
    const paidVnd = lot.amount_vnd ?? FALLBACK_PRICE_PER_CREDIT_VND * lot.quantity;
    const { xu, valueVnd } = xuForExportCredits(lot.remaining, lot.quantity, paidVnd);
    // chk_credit_lots_expiry: a purchased lot always has an expiry.
    purchased.push({
      lotId: lot.id,
      paymentId: lot.payment_id,
      remaining: lot.remaining,
      quantity: lot.quantity,
      paidVnd,
      xu,
      valueVnd,
      expiresAt: lot.expires_at!,
    });
  }
  return { userId, purchased, freeCredits, xu: purchased.reduce((sum, lot) => sum + lot.xu, 0) };
}

/** Converts (apply) or only computes (dry run) the conversion of every user's export credits. */
export async function convertExportCredits(
  prisma: PrismaClient,
  { apply, now = new Date(), userIds }: { apply: boolean; now?: Date; /** Only these users (tests). */ userIds?: string[] },
): Promise<ConversionReport> {
  const credits = new CreditsService(prisma as unknown as PrismaService);
  const holders = await prisma.creditLot.findMany({
    where: {
      kind: 'EXPORT',
      remaining: { gt: 0 },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      ...(userIds ? { userId: { in: userIds } } : {}),
    },
    distinct: ['userId'],
    select: { userId: true },
    orderBy: { userId: 'asc' },
  });

  const users: UserConversion[] = [];
  for (const { userId } of holders) {
    if (!apply) {
      users.push(plan(userId, await prisma.$queryRaw<ExportLotRow[]>(unexpiredExportLots(userId, now, false))));
      continue;
    }
    const done = await prisma.$transaction(async (tx) => {
      // Locked: a concurrent run (or an admin) cannot convert the same credits twice.
      const lots = await tx.$queryRaw<ExportLotRow[]>(unexpiredExportLots(userId, now, true));
      if (lots.length === 0) return null;
      const conversion = plan(userId, lots);
      const total = lots.reduce((sum, lot) => sum + lot.remaining, 0);
      await credits.debit(userId, { kind: 'EXPORT', quantity: total, reason: 'ADMIN_ADJUSTMENT', refId: CONVERSION_REF }, tx);
      for (const lot of conversion.purchased) {
        if (lot.xu === 0) continue; // a lot bought for 0đ (chk_credit_lots_quantity: a lot holds at least 1)
        await credits.grant(
          userId,
          {
            kind: 'XU',
            quantity: lot.xu,
            source: 'PURCHASE',
            expiresAt: lot.expiresAt,
            paymentId: lot.paymentId ?? undefined,
            valueVnd: lot.valueVnd,
            note: `${lot.remaining} lượt xuất đổi sang xu (lô ${lot.lotId})`,
          },
          tx,
        );
      }
      return conversion;
    });
    if (done) users.push(done);
  }

  const purchasedLots = users.flatMap((user) => user.purchased);
  return {
    applied: apply,
    users,
    totals: {
      users: users.length,
      purchasedCredits: purchasedLots.reduce((sum, lot) => sum + lot.remaining, 0),
      freeCredits: users.reduce((sum, user) => sum + user.freeCredits, 0),
      xuLots: purchasedLots.filter((lot) => lot.xu > 0).length,
      xu: purchasedLots.reduce((sum, lot) => sum + lot.xu, 0),
      valueVnd: purchasedLots.reduce((sum, lot) => sum + lot.valueVnd, 0),
    },
  };
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const prisma = new PrismaClient();
  try {
    const report = await convertExportCredits(prisma, { apply });
    for (const user of report.users) {
      const lots = user.purchased.map((lot) => `${lot.remaining}/${lot.quantity} lượt (${lot.paidVnd}đ) -> ${lot.xu} xu`);
      console.log(`${user.userId}: ${[...lots, `${user.freeCredits} lượt miễn phí -> 0 xu`].join('; ')}`);
    }
    const t = report.totals;
    console.log(
      `${apply ? 'Đã đổi' : 'Chạy thử, chưa ghi gì (thêm --apply để ghi): sẽ đổi'} lượt xuất của ${t.users} người: ` +
        `${t.purchasedCredits} lượt đã mua -> ${t.xu} xu (${t.xuLots} lô xu, trị giá ${t.valueVnd}đ); ` +
        `${t.freeCredits} lượt miễn phí về 0.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
