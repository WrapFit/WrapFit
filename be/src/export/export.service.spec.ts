import type { Queue } from 'bullmq';
import type { ProductEventsService } from '../analytics';
import type { PrismaService } from '../shared/prisma';
import type { StorageService } from '../storage';
import type { ExportJobData } from './export.constants';
import { TimeoutError } from '../common';
import { ExportService } from './export.service';

/**
 * Export gating: an in-memory store stands in for PostgreSQL, so each case reads like the story it tells (no paid
 * order, paid order, edit, old unlock). Row locks and concurrency are covered by the e2e test. The service has no
 * credit ledger and no plan to read (docs-old/25 item 7): export credits and Pro never unlock an export, and any read of
 * `credit_lots` fails the test.
 */
describe('ExportService.request gating', () => {
  let version: number;
  let unlocks: { id: string; projectVersion: number; expiresAt: Date; refundedAt: Date | null; debitOperationId: string }[];
  let jobs: { id: string; fileType: string; watermarked?: boolean; unlockId: string | null }[];
  // Print orders holding project p-1: the cart flow unlocks the print file of the version a paid order holds.
  let orders: { projectVersion: number; status: string; paidAt: Date | null }[];
  let queue: { add: jest.Mock };
  let tx: Record<string, unknown>;
  let prisma: { packagingProject: { findUniqueOrThrow: jest.Mock; update: jest.Mock } } & Record<string, unknown>;
  let service: ExportService;

  const project = {
    userId: 'u-1',
    status: 'ACTIVE',
    title: 'Hộp nến',
    templateId: 'tuck-top',
    formulaVersion: 3,
    dimensions: { length: 120, width: 80, height: 60, paperThickness: 0.4 },
    canvasState: { elements: [] },
  };

  beforeEach(() => {
    version = 1;
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
      // The project row, read once and locked (SELECT ... FOR UPDATE).
      $queryRaw: jest.fn(() => Promise.resolve([{ ...project, version }])),
      // syncProjectFileRefs
      $executeRaw: jest.fn().mockResolvedValue(0),
      packagingProject: { update: jest.fn() },
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
        // failExport, when the queue refuses the job.
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn(({ data }) => {
          const job = { id: `job-${jobs.length + 1}`, status: 'PENDING', ...data };
          jobs.push(job);
          return Promise.resolve(job);
        }),
      },
    };
    const noCreditRead = () => {
      throw new Error('an export must never read the credit ledger');
    };
    tx.creditLot = { findMany: jest.fn(noCreditRead), aggregate: jest.fn(noCreditRead) };
    tx.creditDebit = { createMany: jest.fn(noCreditRead) };
    prisma = {
      creditLot: { findMany: jest.fn(noCreditRead), aggregate: jest.fn(noCreditRead) },
      packagingProject: {
        findUniqueOrThrow: jest.fn(() => Promise.resolve({ ...project, version })),
        update: jest.fn(),
      },
      exportUnlock: { findFirst: jest.fn(findUnlock) },
      orderItem: { findFirst: jest.fn(findPaidItem) },
      // The status read after a refused queue found the job taken.
      exportJob: {
        findUnique: jest.fn().mockResolvedValue({ projectId: 'p-1' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ status: 'PROCESSING' }),
      },
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
    queue = { add: jest.fn().mockResolvedValue({}) };
    service = new ExportService(
      prisma as unknown as PrismaService,
      { enabled: true } as unknown as StorageService,
      { record: jest.fn() } as unknown as ProductEventsService,
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

  it('a paid order of this version: clean file in every format, no credit read, no unlock created', async () => {
    payOrder(1);
    for (const fileType of ['SVG', 'DXF', 'PDF_CMYK', 'PDF_A4_PRINT', 'PRINT_PACKAGE'] as const) {
      const started = await service.request('p-1', fileType);
      expect(started).toEqual({ jobId: expect.any(String), status: 'PENDING', fitCheck: expect.any(Object) });
    }
    // Never written: the column default (false) applies, every new export is clean.
    expect(jobs.every((job) => job.watermarked === undefined && job.unlockId === null)).toBe(true);
    expect(unlocks).toEqual([]);
    // The project row is locked first, so an edit cannot slip in between the check and the job.
    expect((tx.$queryRaw as jest.Mock).mock.calls[0][0].join('?')).toContain('FOR UPDATE');
  });

  it('reads the project once, locked, and checks, unlocks and freezes that same version in the job (docs-old/30 item 1)', async () => {
    version = 7;
    payOrder(7);
    await service.request('p-1', 'SVG');

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect((tx.$queryRaw as jest.Mock).mock.calls[0][0].join('?')).toContain('FOR UPDATE');
    expect(prisma.packagingProject.findUniqueOrThrow).not.toHaveBeenCalled();
    // FitCheck is saved in the same transaction, for the row read above.
    expect((tx.packagingProject as { update: jest.Mock }).update).toHaveBeenCalledTimes(1);
    expect(prisma.packagingProject.update).not.toHaveBeenCalled();
    expect((tx.orderItem as { findFirst: jest.Mock }).findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ projectVersion: 7 }) }),
    );
    const { userId: _userId, status: _status, ...design } = project;
    expect(jobs).toEqual([expect.objectContaining({ projectVersion: 7, design })]);
    // The refs are recomputed in that transaction: the files of the frozen design stay alive until the job ends.
    const sql = (tx.$executeRaw as jest.Mock).mock.calls.map(([strings]) => (strings as string[]).join('?'));
    expect(sql.some((text) => text.includes('WITH canvases') && text.includes('export_jobs'))).toBe(true);
  });

  it('after an edit (new version) the design needs a new paid order', async () => {
    payOrder(1);
    version = 2;
    await expect(error(service.request('p-1', 'SVG'))).resolves.toMatchObject({ status: 402 });
    payOrder(2);
    await expect(service.request('p-1', 'SVG')).resolves.toMatchObject({ status: 'PENDING' });
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
    await expect(service.request('p-1', 'DXF')).resolves.toMatchObject({ status: 'PENDING' });
    expect(jobs[0]).toMatchObject({ unlockId: 'valid' });
    expect(jobs[0].watermarked).toBeUndefined();
  });

  describe('queueing (docs-old/30 item 6, review round 2)', () => {
    const exportJob = () => tx.exportJob as { updateMany: jest.Mock };
    beforeEach(() => {
      payOrder(1);
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
      jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
    });

    it('a queue that does not answer in time leaves the job PENDING and answers it: Redis may already have it', async () => {
      queue.add.mockRejectedValue(new TimeoutError('export queue timed out after 3000 ms'));
      await expect(service.request('p-1', 'SVG')).resolves.toEqual({ jobId: 'job-1', status: 'PENDING', fitCheck: expect.any(Object) });
      expect(exportJob().updateMany).not.toHaveBeenCalled();
    });

    it('a queue that refuses fails the PENDING job (refs recomputed) and answers 503', async () => {
      queue.add.mockRejectedValue(new Error("Stream isn't writeable and enableOfflineQueue options is false"));
      await expect(service.request('p-1', 'SVG')).rejects.toThrow('The export queue is unavailable');
      expect(exportJob().updateMany).toHaveBeenCalledWith({
        where: { id: 'job-1', status: { in: ['PENDING'] } },
        data: { status: 'FAILED', errorLog: 'The export queue is unavailable' },
      });
      expect((tx.$executeRaw as jest.Mock).mock.calls.at(-1)[0].join('?')).toContain('project_file_refs');
    });

    it('a connection lost after the command was written leaves the job PENDING too: Redis may have it', async () => {
      for (const lost of [new Error('Connection is closed.'), new Error('Reached the max retries per request limit (which is 1).')]) {
        queue.add.mockRejectedValueOnce(lost);
        await expect(service.request('p-1', 'SVG')).resolves.toMatchObject({ status: 'PENDING' });
      }
      expect(exportJob().updateMany).not.toHaveBeenCalled();
    });

    it('never fails a job a worker already took: answers it with its current status', async () => {
      queue.add.mockRejectedValue(new Error("Stream isn't writeable and enableOfflineQueue options is false"));
      exportJob().updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.request('p-1', 'SVG')).resolves.toMatchObject({ jobId: 'job-1', status: 'PROCESSING' });
    });
  });

  it('access: unlocked once a paid order holds this version or an old unlock is valid, locked again after an edit', async () => {
    await expect(service.access('p-1')).resolves.toEqual({ unlocked: false, unlockExpiresAt: null });
    payOrder(1);
    await expect(service.access('p-1')).resolves.toEqual({ unlocked: true, unlockExpiresAt: null });
    version = 2;
    await expect(service.access('p-1')).resolves.toEqual({ unlocked: false, unlockExpiresAt: null });
    const expiresAt = new Date(Date.now() + 86_400_000);
    unlocks.push({ id: 'valid', projectVersion: 2, expiresAt, refundedAt: null, debitOperationId: 'c' });
    await expect(service.access('p-1')).resolves.toEqual({ unlocked: true, unlockExpiresAt: expiresAt });
  });
});
