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
 * tells (free A4, 402, spend a credit, re-export, edit, Pro). Row locks and concurrency are covered by the e2e test.
 */
describe('ExportService.request gating', () => {
  type Tier = keyof typeof ENTITLEMENTS;
  let tier: Tier;
  let version: number;
  let balance: number;
  let unlocks: { id: string; projectVersion: number; expiresAt: Date; refundedAt: Date | null; debitOperationId: string }[];
  let jobs: { id: string; fileType: string; watermarked: boolean; unlockId: string | null }[];
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
    const now = () => new Date();
    const findUnlock = ({ where }: { where: { projectVersion: number } }) =>
      Promise.resolve(
        unlocks.find((u) => u.projectVersion === where.projectVersion && !u.refundedAt && u.expiresAt > now()) ?? null,
      );
    tx = {
      $queryRaw: jest.fn(() => Promise.resolve([{ version }])),
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

  it('Free, A4 PDF: free and watermarked, no credit spent', async () => {
    await expect(service.request('p-1', 'PDF_A4_PRINT')).resolves.toMatchObject({
      watermarked: true,
      charged: false,
      exportCredits: { balance: 0 },
    });
    expect(jobs).toEqual([expect.objectContaining({ fileType: 'PDF_A4_PRINT', watermarked: true, unlockId: null })]);
    expect(credits.debit).not.toHaveBeenCalled();
    expect(queue.add).toHaveBeenCalled();
  });

  it('Free, SVG without useCredit: 402 EXPORT_CREDIT_REQUIRED with the balance, nothing queued', async () => {
    balance = 2;
    await expect(error(service.request('p-1', 'SVG'))).resolves.toEqual({
      status: 402,
      body: expect.objectContaining({ code: 'EXPORT_CREDIT_REQUIRED', balance: 2 }),
    });
    expect(jobs).toEqual([]);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('useCredit with no credit left: 402 INSUFFICIENT_CREDITS, no unlock and no job written', async () => {
    await expect(error(service.request('p-1', 'PDF_CMYK', true))).resolves.toEqual({
      status: 402,
      body: expect.objectContaining({ code: 'INSUFFICIENT_CREDITS', balance: 0 }),
    });
    expect(unlocks).toEqual([]);
    expect(jobs).toEqual([]);
  });

  it('useCredit: spends 1 credit, unlocks this version for 7 days, clean file', async () => {
    balance = 3;
    const started = await service.request('p-1', 'SVG', true);
    expect(started).toMatchObject({ watermarked: false, charged: true, exportCredits: { balance: 2 } });
    expect(credits.debit).toHaveBeenCalledWith(
      'u-1',
      expect.objectContaining({ reason: 'EXPORT_UNLOCK', refId: 'unlock-1', operationId: unlocks[0].debitOperationId }),
      tx,
    );
    expect(unlocks).toEqual([expect.objectContaining({ projectVersion: 1 })]);
    const days = (unlocks[0].expiresAt.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeCloseTo(7, 1);
    expect(jobs[0]).toMatchObject({ watermarked: false, unlockId: 'unlock-1' });
    // The project row is locked first, so a second request for the same version waits and reuses the unlock.
    expect((tx.$queryRaw as jest.Mock).mock.calls[0][0].join('?')).toContain('FOR UPDATE');
  });

  it('other formats of the same version: clean, nothing spent again (A4 too)', async () => {
    balance = 3;
    await service.request('p-1', 'SVG', true);
    for (const fileType of ['DXF', 'PDF_CMYK', 'PDF_A4_PRINT'] as const) {
      await expect(service.request('p-1', fileType)).resolves.toMatchObject({ watermarked: false, charged: false });
    }
    // Even a repeated useCredit does not pay twice for an unlocked version.
    await expect(service.request('p-1', 'SVG', true)).resolves.toMatchObject({ charged: false });
    expect(credits.debit).toHaveBeenCalledTimes(1);
    expect(balance).toBe(2);
    expect(jobs.every((job) => job.unlockId === 'unlock-1' && !job.watermarked)).toBe(true);
  });

  it('after an edit (new version) the design needs a credit again', async () => {
    balance = 3;
    await service.request('p-1', 'SVG', true);
    version = 2;
    await expect(error(service.request('p-1', 'SVG'))).resolves.toMatchObject({ status: 402 });
    await expect(service.request('p-1', 'PDF_A4_PRINT')).resolves.toMatchObject({ watermarked: true });
    await expect(service.request('p-1', 'SVG', true)).resolves.toMatchObject({ charged: true, exportCredits: { balance: 1 } });
    expect(unlocks.map((u) => u.projectVersion)).toEqual([1, 2]);
  });

  it('an expired or refunded unlock no longer counts', async () => {
    unlocks.push(
      { id: 'old', projectVersion: 1, expiresAt: new Date(Date.now() - 1000), refundedAt: null, debitOperationId: 'a' },
      { id: 'refunded', projectVersion: 1, expiresAt: new Date(Date.now() + 86_400_000), refundedAt: new Date(), debitOperationId: 'b' },
    );
    await expect(error(service.request('p-1', 'DXF'))).resolves.toMatchObject({ status: 402 });
  });

  it('Pro: clean every time, no credit, no unlock', async () => {
    tier = 'STARTER';
    balance = 1;
    for (const fileType of ['PDF_A4_PRINT', 'SVG', 'PRINT_PACKAGE'] as const) {
      await expect(service.request('p-1', fileType)).resolves.toMatchObject({
        watermarked: false,
        charged: false,
        exportCredits: { balance: 1 },
      });
    }
    expect(credits.debit).not.toHaveBeenCalled();
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(unlocks).toEqual([]);
  });

  it('PDF A4 with useCredit: the paid, clean home-print file', async () => {
    balance = 1;
    await expect(service.request('p-1', 'PDF_A4_PRINT', true)).resolves.toMatchObject({ watermarked: false, charged: true });
  });

  it('gives the credit back when the job cannot be queued', async () => {
    balance = 1;
    queue.add.mockRejectedValue(new Error('redis down'));
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
    await expect(service.request('p-1', 'SVG', true)).rejects.toThrow('The export queue is unavailable');
    expect(refunds.refundFailed).toHaveBeenCalledWith('job-1');

    refunds.refundFailed.mockClear();
    await expect(service.request('p-1', 'PDF_A4_PRINT')).rejects.toThrow('The export queue is unavailable');
    expect(refunds.refundFailed).not.toHaveBeenCalled(); // nothing was paid
  });

  it('access: tells the dialog whether this version is unlocked and how many credits are left', async () => {
    await expect(service.access('p-1')).resolves.toEqual({ mode: 'FREE_A4', unlocked: false, unlockExpiresAt: null, balance: 0 });
    balance = 2;
    await service.request('p-1', 'SVG', true);
    await expect(service.access('p-1')).resolves.toMatchObject({ unlocked: true, unlockExpiresAt: expect.any(Date), balance: 1 });
    version = 2;
    await expect(service.access('p-1')).resolves.toMatchObject({ unlocked: false });
    tier = 'STARTER';
    await expect(service.access('p-1')).resolves.toMatchObject({ mode: 'UNLIMITED', unlocked: true });
  });
});
