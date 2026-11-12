import type { Queue } from 'bullmq';
import { ENTITLEMENTS } from '@wrapfit/shared';
import type { ProductEventsService } from '../analytics';
import { insufficientCredits, type CreditsService, type EntitlementsService } from '../billing';
import type { PrismaService } from '../shared/prisma';
import type { StorageService } from '../storage';
import type { ExportCreditRefunds } from './export-credits';
import type { ExportJobData } from './export.constants';
import { ExportService } from './export.service';

/**
 * Export gating (docs/16 §5.2): an in-memory ledger stands in for PostgreSQL, so each case reads like the story it
 * tells (no paid order, paid order, edit, Pro). Row locks and concurrency are covered by the e2e test.
 */
describe('ExportService.request gating', () => {
  type Tier = keyof typeof ENTITLEMENTS;
  let tier: Tier;
  let version: number;
  let balance: number;
  let unlocks: { id: string; projectVersion: number; expiresAt: Date; refundedAt: Date | null; debitOperationId: string }[];
  let jobs: { id: string; fileType: string; watermarked: boolean; unlockId: string | null }[];
  // Print orders holding project p-1: the cart flow unlocks the print file of the version a paid order holds.
  let orders: { projectVersion: number; status: string; paidAt: Date | null }[];
  let queue: { add: jest.Mock };
  let credits: { balance: jest.Mock; debit: jest.Mock };
  let refunds: { refundFailed: jest.Mock };
  let tx: Record<string, unknown>;
  let service: ExportService;

  const project = {
    userId: 'u-1',
    status: 'ACTIVE',
    templateId: 'tuck-top',
    formulaVersion: 3,
    dimensions: { length: 120, width: 80, height: 60, paperThickness: 0.4 },
    canvasState: { elements: [] },
  };

  beforeEach(() => {
    tier = 'FREE';
    version = 1;
    balance = 0;
    unlocks = [];
    jobs = [];
    orders = [];
    const now = () => new Date();
    const findPaidItem = ({ where }: { where: { projectVersion: number } }) =>
      Promise.resolve(
        orders.some((o) => o.projectVersion === where.projectVersion && o.paidAt !== null && o.status !== 'CANCELLED')
          ? { id: 'item-1' }
          : null,
      );
    const findUnlock = ({ where }: { where: { projectVersion: number } }) =>
      Promise.resolve(
        unlocks.find((u) => u.projectVersion === where.projectVersion && !u.refundedAt && u.expiresAt > now()) ?? null,
      );
    tx = {
      $queryRaw: jest.fn(() => Promise.resolve([{ version }])),
      orderItem: { findFirst: jest.fn(findPaidItem) },
      exportUnlock: {
        findFirst: jest.fn(findUnlock),
        create: jest.fn(({ data }) => {
          const unlock = { id: `unlock-${unlocks.length + 1}`, refundedAt: null, ...data };
          unlocks.push(unlock);
          return Promise.resolve({ id: unlock.id });
        }),
      },
      exportJob: {
        create: jest.fn(({ data }) => {
          const job = { id: `job-${jobs.length + 1}`, status: 'PENDING', ...data };
          jobs.push(job);
          return Promise.resolve(job);
        }),
      },
    };
    const prisma = {
      packagingProject: {
        findUniqueOrThrow: jest.fn(() => Promise.resolve({ ...project, version })),
        update: jest.fn(),
      },
      exportUnlock: { findFirst: jest.fn(findUnlock) },
      orderItem: { findFirst: jest.fn(findPaidItem) },
      exportJob: { update: jest.fn() },
      // Interactive transaction; when the callback throws, what it wrote is rolled back like PostgreSQL would.
      $transaction: jest.fn(async (fn: (client: unknown) => unknown) => {
        const [savedUnlocks, savedJobs] = [[...unlocks], [...jobs]];
        try {
          return await fn(tx);
        } catch (error) {
          [unlocks, jobs] = [savedUnlocks, savedJobs];
          throw error;
        }
      }),
    };
    credits = {
      balance: jest.fn(() => Promise.resolve(balance)),
      debit: jest.fn(() => {
        if (balance < 1) return Promise.reject(insufficientCredits(balance));
        balance -= 1;
        return Promise.resolve({ operationId: 'op', balance });
      }),
    };
    refunds = { refundFailed: jest.fn().mockResolvedValue(1) };
    queue = { add: jest.fn().mockResolvedValue({}) };
    service = new ExportService(
      prisma as unknown as PrismaService,
      { enabled: true } as unknown as StorageService,
      { record: jest.fn() } as unknown as ProductEventsService,
      credits as unknown as CreditsService,
      { of: () => Promise.resolve({ tier, entitlements: ENTITLEMENTS[tier] }) } as unknown as EntitlementsService,
      refunds as unknown as ExportCreditRefunds,
      queue as unknown as Queue<ExportJobData>,
    );
  });

  const error = (promise: Promise<unknown>) =>
    promise.then(
      () => {
        throw new Error('expected a rejection');
      },
      (e: { getStatus(): number; getResponse(): unknown }) => ({ status: e.getStatus(), body: e.getResponse() }),
    );

  const payOrder = (projectVersion: number, status = 'PAID') => orders.push({ projectVersion, status, paidAt: new Date() });

  it('no paid order: 402 ORDER_PAYMENT_REQUIRED for every format, nothing queued (no free print file)', async () => {
    for (const fileType of ['PDF_A4_PRINT', 'SVG', 'PDF_CMYK'] as const) {
      await expect(error(service.request('p-1', fileType))).resolves.toEqual({
        status: 402,
        body: expect.objectContaining({ code: 'ORDER_PAYMENT_REQUIRED' }),
      });
    }
    expect(jobs).toEqual([]);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('export credits and useCredit no longer skip the cart: nothing spent, 402', async () => {
    balance = 3;
    await expect(error(service.request('p-1', 'SVG', true))).resolves.toMatchObject({ status: 402 });
    expect(credits.debit).not.toHaveBeenCalled();
    expect(unlocks).toEqual([]);
    expect(balance).toBe(3);
  });

  it('Pro without a paid order: 402 too (Pro no longer skips the cart)', async () => {
    tier = 'STARTER';
    await expect(error(service.request('p-1', 'SVG'))).resolves.toMatchObject({ status: 402 });
    expect(jobs).toEqual([]);
  });

  it('a paid order of this version: clean file in every format, nothing charged', async () => {
    payOrder(1);
    for (const fileType of ['SVG', 'DXF', 'PDF_CMYK', 'PDF_A4_PRINT'] as const) {
      await expect(service.request('p-1', fileType)).resolves.toMatchObject({ watermarked: false, charged: false });
    }
    expect(credits.debit).not.toHaveBeenCalled();
    expect(jobs.every((job) => !job.watermarked && job.unlockId === null)).toBe(true);
    // The project row is locked first, so an edit cannot slip in between the check and the job.
    expect((tx.$queryRaw as jest.Mock).mock.calls[0][0].join('?')).toContain('FOR UPDATE');
  });

  it('after an edit (new version) the design needs a new paid order', async () => {
    payOrder(1);
    version = 2;
    await expect(error(service.request('p-1', 'SVG'))).resolves.toMatchObject({ status: 402 });
    payOrder(2);
    await expect(service.request('p-1', 'SVG')).resolves.toMatchObject({ watermarked: false });
  });

  it('an order waiting for payment or cancelled does not unlock', async () => {
    orders.push({ projectVersion: 1, status: 'PENDING_PAYMENT', paidAt: null });
    await expect(error(service.request('p-1', 'SVG'))).resolves.toMatchObject({ status: 402 });
    payOrder(1, 'CANCELLED');
    await expect(error(service.request('p-1', 'SVG'))).resolves.toMatchObject({ status: 402 });
  });

  it('an unlock bought before the cart flow still counts until it expires; expired or refunded ones do not', async () => {
    unlocks.push(
      { id: 'old', projectVersion: 1, expiresAt: new Date(Date.now() - 1000), refundedAt: null, debitOperationId: 'a' },
      { id: 'refunded', projectVersion: 1, expiresAt: new Date(Date.now() + 86_400_000), refundedAt: new Date(), debitOperationId: 'b' },
    );
    await expect(error(service.request('p-1', 'DXF'))).resolves.toMatchObject({ status: 402 });
    unlocks.push({ id: 'valid', projectVersion: 1, expiresAt: new Date(Date.now() + 86_400_000), refundedAt: null, debitOperationId: 'c' });
    await expect(service.request('p-1', 'DXF')).resolves.toMatchObject({ watermarked: false, charged: false });
    expect(jobs[0]).toMatchObject({ unlockId: 'valid' });
  });

  it('marks the job failed when it cannot be queued, nothing to refund', async () => {
    payOrder(1);
    queue.add.mockRejectedValue(new Error('redis down'));
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
    await expect(service.request('p-1', 'SVG')).rejects.toThrow('The export queue is unavailable');
    expect(refunds.refundFailed).not.toHaveBeenCalled();
  });

  it('access: unlocked once a paid order holds this version, locked again after an edit, Pro alone is not enough', async () => {
    await expect(service.access('p-1')).resolves.toEqual({ mode: 'FREE_A4', unlocked: false, unlockExpiresAt: null, balance: 0 });
    payOrder(1);
    await expect(service.access('p-1')).resolves.toMatchObject({ unlocked: true, unlockExpiresAt: null });
    version = 2;
    await expect(service.access('p-1')).resolves.toMatchObject({ unlocked: false });
    tier = 'STARTER';
    await expect(service.access('p-1')).resolves.toMatchObject({ mode: 'UNLIMITED', unlocked: false });
  });
});
