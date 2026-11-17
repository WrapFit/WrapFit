import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PaymentPurpose } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { CreditsService } from '../../src/billing';
import { newPaymentReference } from '../../src/payments';
import { PrismaService } from '../../src/shared/prisma';
import { CONVERSION_REF, convertExportCredits } from '../../prisma/scripts/convert-export-credits';
import { signUp } from './helpers/accounts';
import { deleteUsers } from './helpers/cleanup';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The one-time conversion of export credits to xu (docs/25 item 7, prisma/scripts/convert-export-credits.ts) on a
 * prepared database: purchased credits become xu at the price paid, free ones are emptied, the ledger stays whole and
 * a second run converts nothing. Scoped to the users of this test (`userIds`), so other data is left alone.
 */
describe('convert-export-credits script (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let credits: CreditsService;
  const run = Date.now();
  const ids: Record<'ann' | 'bao' | 'chi' | 'dan', string> = { ann: '', bao: '', chi: '', dan: '' };
  const inDays = (days: number) => new Date(Date.now() + days * DAY_MS);

  /** An export pack bought before the packs stopped: a PAID payment and its PURCHASE lot, as PaymentsService made them. */
  const bought = async (userId: string, purpose: PaymentPurpose, quantity: number, amountVnd: number, expiresAt: Date) => {
    const paidAt = new Date(expiresAt.getTime() - 365 * DAY_MS);
    const payment = await prisma.payment.create({
      data: {
        userId,
        purpose,
        amountVnd,
        reference: newPaymentReference(),
        status: 'PAID',
        paidAt,
        confirmedVia: 'SEPAY_WEBHOOK',
        expiresAt: paidAt,
        metadata: { credits: quantity },
      },
    });
    const lot = await credits.grant(userId, { quantity, source: 'PURCHASE', expiresAt, paymentId: payment.id, note: payment.reference });
    return { payment, lot };
  };
  const exportBalance = (userId: string) => credits.balance(userId, prisma, { kind: 'EXPORT' });
  const xuLotsOf = (userId: string) =>
    prisma.creditLot.findMany({ where: { userId, kind: 'XU', source: 'PURCHASE' }, orderBy: { quantity: 'asc' } });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    await app.init();
    prisma = app.get(PrismaService);
    credits = app.get(CreditsService);
    for (const name of Object.keys(ids) as (keyof typeof ids)[]) {
      ids[name] = (await signUp(app, `convert-${name}-${run}@e2e.test`)).id;
    }
  });

  afterAll(async () => {
    await deleteUsers(prisma, { email: { endsWith: `-${run}@e2e.test` } });
    await app.close();
  });

  it('converts purchased credits at the price paid, empties free ones, keeps the ledger, and runs only once', async () => {
    // Ann: EXPORT_5 at 79.000đ with 2 credits spent (3 left), 2 credits granted by an admin, and an expired pack.
    const annPack = await bought(ids.ann, 'EXPORT_5', 5, 79_000, inDays(200));
    await credits.grant(ids.ann, { quantity: 2, source: 'ADMIN', expiresAt: null });
    await credits.debit(ids.ann, { kind: 'EXPORT', quantity: 2, reason: 'EXPORT_UNLOCK' }); // the lot expiring first
    const annExpired = await bought(ids.ann, 'EXPORT_1', 1, 19_000, inDays(-1));
    // Bao: EXPORT_15 at 199.000đ with 7 left (8 spent), and an untouched EXPORT_1.
    const baoBig = await bought(ids.bao, 'EXPORT_15', 15, 199_000, inDays(100));
    await credits.debit(ids.bao, { kind: 'EXPORT', quantity: 8, reason: 'EXPORT_UNLOCK' });
    const baoOne = await bought(ids.bao, 'EXPORT_1', 1, 19_000, inDays(300));
    // Chi: only free credits (the demo seed's kind of lot). Dan: xu only, nothing to convert.
    await credits.grant(ids.chi, { quantity: 4, source: 'ADMIN', expiresAt: null });
    await credits.grant(ids.dan, { kind: 'XU', quantity: 30, source: 'ADMIN', expiresAt: null });
    const userIds = Object.values(ids);
    const debitsBefore = await prisma.creditDebit.count({ where: { userId: { in: userIds } } });

    // Dry run: the numbers, nothing written.
    const dry = await convertExportCredits(prisma, { apply: false, userIds });
    expect(dry.applied).toBe(false);
    // 3/5 × 79.000 = 47.400đ = 474 xu; 7/15 × 199.000 = 92.866,67đ -> 929 xu (rounded up); 1 × 19.000 = 190 xu.
    expect(dry.totals).toEqual({ users: 3, purchasedCredits: 11, freeCredits: 6, xuLots: 3, xu: 474 + 929 + 190, valueVnd: 47_400 + 92_867 + 19_000 });
    expect(dry.users.find((user) => user.userId === ids.chi)).toMatchObject({ purchased: [], freeCredits: 4, xu: 0 });
    expect(await exportBalance(ids.ann)).toBe(5);
    expect(await xuLotsOf(ids.ann)).toEqual([]);
    expect(await prisma.creditDebit.count({ where: { userId: { in: userIds } } })).toBe(debitsBefore);

    const applied = await convertExportCredits(prisma, { apply: true, userIds });
    expect(applied.totals).toEqual(dry.totals);

    // Every unexpired export lot is empty; the expired one is left as it was.
    for (const id of userIds) expect(await exportBalance(id)).toBe(0);
    expect(await prisma.creditLot.findUniqueOrThrow({ where: { id: annExpired.lot.id } })).toMatchObject({ remaining: 1 });

    // One xu lot per purchased lot: same payment and expiry, worth the money left on it.
    const [annXu] = await xuLotsOf(ids.ann);
    expect(annXu).toMatchObject({ quantity: 474, remaining: 474, valueVnd: 47_400, paymentId: annPack.payment.id });
    expect(annXu.expiresAt).toEqual(annPack.lot.expiresAt);
    expect((await xuLotsOf(ids.ann)).length).toBe(1);
    const baoXu = await xuLotsOf(ids.bao);
    expect(baoXu.map((lot) => [lot.quantity, lot.valueVnd, lot.paymentId])).toEqual([
      [190, 19_000, baoOne.payment.id],
      [929, 92_867, baoBig.payment.id],
    ]);
    expect(await xuLotsOf(ids.chi)).toEqual([]);
    expect(await xuLotsOf(ids.dan)).toEqual([]);
    expect(await credits.balance(ids.ann, prisma, { kind: 'XU' })).toBe(474);
    expect(await credits.balance(ids.dan, prisma, { kind: 'XU' })).toBe(30);

    // The ledger: one debit operation per user, from the lots it emptied; on every export lot, what was granted equals
    // what is left plus what was debited.
    const conversion = await prisma.creditDebit.findMany({ where: { userId: { in: userIds }, refId: CONVERSION_REF } });
    expect(conversion.every((debit) => debit.reason === 'ADMIN_ADJUSTMENT' && debit.refundedAt === null)).toBe(true);
    expect(new Set(conversion.map((debit) => debit.operationId)).size).toBe(3);
    expect(conversion.reduce((sum, debit) => sum + debit.quantity, 0)).toBe(11 + 6);
    const exportLots = await prisma.creditLot.findMany({
      where: { userId: { in: userIds }, kind: 'EXPORT' },
      include: { debits: true },
    });
    for (const lot of exportLots) {
      expect(lot.quantity).toBe(lot.remaining + lot.debits.reduce((sum, debit) => sum + debit.quantity, 0));
    }

    // Second run: nothing left to convert, nothing written.
    const debitsAfter = await prisma.creditDebit.count({ where: { userId: { in: userIds } } });
    const lotsAfter = await prisma.creditLot.count({ where: { userId: { in: userIds } } });
    const again = await convertExportCredits(prisma, { apply: true, userIds });
    expect(again.totals).toEqual({ users: 0, purchasedCredits: 0, freeCredits: 0, xuLots: 0, xu: 0, valueVnd: 0 });
    expect(await prisma.creditDebit.count({ where: { userId: { in: userIds } } })).toBe(debitsAfter);
    expect(await prisma.creditLot.count({ where: { userId: { in: userIds } } })).toBe(lotsAfter);
  });
});
