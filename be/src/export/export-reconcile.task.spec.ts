import type { Queue } from 'bullmq';
import type { PrismaService } from '../shared/prisma';
import { WORKER_LOST_ERROR } from './export.constants';
import { ExportReconcileTask } from './export-reconcile.task';

describe('ExportReconcileTask', () => {
  const states: Record<string, string> = {
    'stalled-job': 'failed', // the worker died: BullMQ gave up without calling process()
    'lost-job': 'unknown', // no longer in Redis
    'queued-job': 'waiting', // the worker is down or busy: it will still run
    'running-job': 'active',
  };
  let prisma: {
    exportJob: { findMany: jest.Mock; findUnique: jest.Mock; updateMany: jest.Mock };
    $transaction: jest.Mock;
    $executeRaw: jest.Mock;
  };
  let queue: { getJobState: jest.Mock; getJob: jest.Mock };
  let task: ExportReconcileTask;

  beforeEach(() => {
    prisma = {
      exportJob: {
        findMany: jest.fn().mockResolvedValue(Object.keys(states).map((id) => ({ id }))),
        findUnique: jest.fn().mockResolvedValue({ projectId: 'p-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
      $executeRaw: jest.fn().mockResolvedValue(0),
    };
    queue = {
      getJobState: jest.fn(async (id: string) => states[id]),
      getJob: jest.fn().mockResolvedValue({
        failedReason: 'job stalled more than allowable limit',
      }),
    };
    task = new ExportReconcileTask(prisma as unknown as PrismaService, queue as unknown as Queue);
    jest.spyOn(task['logger'], 'warn').mockImplementation(() => undefined);
  });

  it('fails the old unfinished exports that BullMQ gave up on or lost, and leaves queued ones alone', async () => {
    const now = new Date('2026-10-07T10:00:00Z');
    await expect(task.reconcile(now)).resolves.toBe(2);

    expect(prisma.exportJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: { in: ['PENDING', 'PROCESSING'] },
          createdAt: { lt: new Date('2026-10-07T09:50:00Z') },
        },
      }),
    );
    expect(prisma.exportJob.updateMany.mock.calls.map(([args]) => args.where.id)).toEqual(['stalled-job', 'lost-job']);
    expect(prisma.exportJob.updateMany).toHaveBeenCalledWith({
      where: { id: 'stalled-job', status: { in: ['PENDING', 'PROCESSING'] } },
      data: { status: 'FAILED', errorLog: WORKER_LOST_ERROR },
    });
    // Each failed job releases the files only its design kept alive (refs recomputed in the same transaction).
    const sql = prisma.$executeRaw.mock.calls.map(([strings]) => (strings as string[]).join('?'));
    expect(sql.filter((text) => text.includes('INSERT INTO project_file_refs'))).toHaveLength(2);
  });

  it('never throws out of the scheduled run', async () => {
    prisma.exportJob.findMany.mockRejectedValue(new Error('Redis down'));
    const error = jest.spyOn(task['logger'], 'error').mockImplementation(() => undefined);
    await expect(task.run()).resolves.toBeUndefined();
    expect(error).toHaveBeenCalled();
  });
});
