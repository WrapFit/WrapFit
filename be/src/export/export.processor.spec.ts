import { inflateSync } from 'zlib';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { Job } from 'bullmq';
import type { NotificationsService } from '../notifications';
import type { PrismaService } from '../shared/prisma';
import type { StorageService } from '../storage';
import type { ExportJobData } from './export.constants';
import { EXPORT_COMPLETED, type ConfigService } from '../common';
import { ExportProcessor, MAX_ARTWORK_BYTES } from './export.processor';

describe('ExportProcessor', () => {
  // The design frozen on the job by ExportService.request (docs-old/30 item 1).
  const design = {
    title: 'Hộp nến',
    templateId: 'tuck-top',
    formulaVersion: 1,
    dimensions: { length: 120, width: 80, height: 60, paperThickness: 0.4 },
    canvasState: { elements: [] as object[] },
  };
  // The export_jobs row, in memory: the conditional updates below behave like PostgreSQL's.
  let row: { status: string; storageKey: string | null; fileType: string; watermarked: boolean; design: object | null };
  type Where = { id: string; status: string | { in: string[] } };
  const matches = (where: Where) =>
    where.id === 'job-1' && (typeof where.status === 'string' ? row.status === where.status : where.status.in.includes(row.status));
  let prisma: {
    exportJob: { updateMany: jest.Mock; findUniqueOrThrow: jest.Mock; findUnique: jest.Mock };
    packagingProject: { findUniqueOrThrow: jest.Mock };
    projectSnapshot: { create: jest.Mock };
    productEvent: { create: jest.Mock };
    $transaction: jest.Mock;
    $executeRaw: jest.Mock;
  };
  let storage: { putGeneratedFile: jest.Mock; uploadedKeyOf: jest.Mock; getObject: jest.Mock };
  let events: { emit: jest.Mock };
  let notifications: { recordExportCompleted: jest.Mock };
  let processor: ExportProcessor;
  const job = (attemptsMade: number) =>
    ({ data: { exportJobId: 'job-1' }, attemptsMade, opts: { attempts: 3 } }) as unknown as Job<ExportJobData>;

  beforeEach(() => {
    row = { status: 'PENDING', storageKey: null, fileType: 'DXF', watermarked: false, design };
    prisma = {
      exportJob: {
        updateMany: jest.fn(({ where, data }: { where: Where; data: object }) => {
          if (!matches(where)) return Promise.resolve({ count: 0 });
          Object.assign(row, data);
          return Promise.resolve({ count: 1 });
        }),
        findUniqueOrThrow: jest.fn(() =>
          Promise.resolve({ fileType: row.fileType, watermarked: row.watermarked, design: row.design, project: { id: 'p-1', userId: 'u-1' } }),
        ),
        findUnique: jest.fn(() => Promise.resolve({ status: row.status, storageKey: row.storageKey, projectId: 'p-1' })),
      },
      // The project as it is now: an export with a frozen design never reads it.
      packagingProject: { findUniqueOrThrow: jest.fn() },
      projectSnapshot: { create: jest.fn() },
      productEvent: { create: jest.fn() },
      // Interactive transaction: the callback receives the same mocks as its transaction client.
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
      $executeRaw: jest.fn().mockResolvedValue(0),
    };
    storage = {
      putGeneratedFile: jest.fn().mockResolvedValue(true),
      uploadedKeyOf: jest.fn((url: string) => (url.startsWith('https://cdn/users/') ? url.slice('https://cdn/'.length) : null)),
      getObject: jest.fn().mockResolvedValue({ body: Buffer.from([0x89, 0x50, 0x4e, 0x47]), contentType: 'image/png' }),
    };
    events = { emit: jest.fn() };
    notifications = { recordExportCompleted: jest.fn() };
    processor = new ExportProcessor(
      prisma as unknown as PrismaService,
      storage as unknown as StorageService,
      events as unknown as EventEmitter2,
      { get: () => 2 } as unknown as ConfigService,
      notifications as unknown as NotificationsService,
    );
    jest.spyOn(processor['logger'], 'warn').mockImplementation(() => undefined);
    jest.spyOn(processor['logger'], 'log').mockImplementation(() => undefined);
  });

  it('renders, stores the file, completes the job with a snapshot and emits an event', async () => {
    await expect(processor.process(job(0))).resolves.toEqual({ storageKey: 'private/projects/p-1/exports/job-1.dxf' });

    expect(prisma.exportJob.updateMany).toHaveBeenCalledWith({
      where: { id: 'job-1', status: { in: ['PENDING', 'PROCESSING'] } },
      data: { status: 'PROCESSING', errorLog: null },
    });
    expect(storage.putGeneratedFile).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'private/projects/p-1/exports/job-1.dxf', purpose: 'EXPORT', contentType: 'application/dxf', projectId: 'p-1' }),
    );
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(row).toMatchObject({ status: 'COMPLETED', storageKey: 'private/projects/p-1/exports/job-1.dxf' });
    // The snapshot keeps the exported design, not the project as it is now.
    expect(prisma.projectSnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: 'p-1',
        name: expect.stringMatching(/^Bản xuất in DXF /),
        isAutomatic: true,
        canvasState: design.canvasState,
        dimensions: design.dimensions,
        formulaVersion: design.formulaVersion,
      }),
    });
    expect(prisma.packagingProject.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(prisma.productEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'EXPORT_COMPLETED',
        userId: 'u-1',
        projectId: 'p-1',
        payload: { exportJobId: 'job-1', fileType: 'DXF', watermarked: false },
      }),
    });
    // Only the newest automatic snapshots are kept.
    const sql = prisma.$executeRaw.mock.calls.map(([strings]) => (strings as string[]).join('?'));
    expect(sql.some((text) => text.includes('DELETE FROM project_snapshots'))).toBe(true);
    // The project row is locked first, before the job row (same order as failExport).
    expect(sql[0]).toContain('FOR NO KEY UPDATE');
    const completed = { exportJobId: 'job-1', projectId: 'p-1', userId: 'u-1', fileType: 'DXF' };
    // The notification is stored with the job (same transaction client); the event after the commit only pushes it.
    expect(notifications.recordExportCompleted).toHaveBeenCalledWith(prisma, completed);
    expect(events.emit).toHaveBeenCalledWith(EXPORT_COMPLETED, completed);
  });

  it('lets BullMQ retry, and marks the job FAILED only after the last attempt', async () => {
    storage.putGeneratedFile.mockRejectedValue(new Error('bucket unreachable'));

    const failed = () => prisma.exportJob.updateMany.mock.calls.filter(([{ data }]) => data.status === 'FAILED');
    await expect(processor.process(job(0))).rejects.toThrow('bucket unreachable');
    await expect(processor.process(job(1))).rejects.toThrow('bucket unreachable');
    expect(failed()).toEqual([]);

    await expect(processor.process(job(2))).rejects.toThrow('bucket unreachable');
    // Only an unfinished row: a job completed meanwhile (stalled, then re-run) is never turned into FAILED.
    expect(failed()).toEqual([
      [{ where: { id: 'job-1', status: { in: ['PENDING', 'PROCESSING'] } }, data: { status: 'FAILED', errorLog: 'bucket unreachable' } }],
    ]);
    expect(row.status).toBe('FAILED');
    // In the same transaction, the file refs drop what only this job's design kept alive.
    const sql = prisma.$executeRaw.mock.calls.map(([strings]) => (strings as string[]).join('?'));
    expect(sql.at(-1)).toContain('project_file_refs');
  });

  describe('a job handed out again (docs-old/30 item 6)', () => {
    const writes = () => ({
      files: storage.putGeneratedFile.mock.calls.length,
      events: prisma.productEvent.create.mock.calls.length,
      snapshots: prisma.projectSnapshot.create.mock.calls.length,
      emitted: events.emit.mock.calls.length,
      notifications: notifications.recordExportCompleted.mock.calls.length,
    });

    it('after the first run committed: not rendered again, nothing recorded twice', async () => {
      await processor.process(job(0));
      await expect(processor.process(job(0))).resolves.toEqual({ storageKey: 'private/projects/p-1/exports/job-1.dxf' });
      expect(writes()).toEqual({ files: 1, events: 1, snapshots: 1, emitted: 1, notifications: 1 });
      expect(row.status).toBe('COMPLETED');
    });

    it('two runs at once: both render, only the first to complete records it', async () => {
      await Promise.all([processor.process(job(0)), processor.process(job(0))]);
      expect(writes()).toEqual({ files: 2, events: 1, snapshots: 1, emitted: 1, notifications: 1 });
      const completions = prisma.exportJob.updateMany.mock.results.slice(-2);
      expect(await Promise.all(completions.map((result) => result.value))).toEqual([{ count: 1 }, { count: 0 }]);
    });

    it('a job ExportReconcileTask marked FAILED stays failed and is not rendered', async () => {
      row.status = 'FAILED';
      await expect(processor.process(job(0))).resolves.toEqual({ storageKey: null });
      expect(writes()).toEqual({ files: 0, events: 0, snapshots: 0, emitted: 0, notifications: 0 });
      expect(row.status).toBe('FAILED');
    });
  });

  it('renders the project as it is now only for a job queued before the design was frozen', async () => {
    row.design = null;
    prisma.packagingProject.findUniqueOrThrow.mockResolvedValue({ ...design, title: 'Hộp cũ' });
    await expect(processor.process(job(0))).resolves.toEqual({ storageKey: 'private/projects/p-1/exports/job-1.dxf' });
    expect(prisma.packagingProject.findUniqueOrThrow).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'p-1' } }));
    expect(processor['logger'].warn).toHaveBeenCalledWith(expect.stringContaining('no frozen design'));
  });

  it('renders the A4 PDF clean, even for an old job row flagged watermarked (docs-old/25 item 7)', async () => {
    Object.assign(row, { fileType: 'PDF_A4_PRINT', watermarked: true });
    await processor.process(job(0));
    const [{ body }] = storage.putGeneratedFile.mock.calls[0];
    const pdf = body as Buffer;
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    // The watermark was the only marked text (/ActualText) of a print PDF: no content stream carries one now.
    const text = pdf.toString('latin1');
    const streams = [...text.matchAll(/stream\s/g)].map((match) => {
      const start = match.index + match[0].length;
      try {
        return inflateSync(pdf.subarray(start, text.indexOf('endstream', start))).toString('latin1');
      } catch {
        return ''; // not a Flate stream (images are raw)
      }
    });
    const content = streams.join('\n');
    expect(content).toContain('/OC /L0 BDC');
    expect(content).not.toContain('/ActualText');
  });

  describe('artwork', () => {
    const image = (id: string, content: string) => ({
      id,
      type: 'image',
      panelId: 'panel_front',
      x: 5,
      y: 5,
      width: 20,
      height: 20,
      rotation: 0,
      content,
    });
    const withImages = (fileType: string, ...elements: ReturnType<typeof image>[]) =>
      Object.assign(row, { status: 'PENDING', fileType, design: { ...design, canvasState: { elements } } });

    it('embeds uploads of this platform once each, and never fetches other hosts', async () => {
      withImages(
        'SVG',
        image('a', 'https://cdn/users/u-1/image/a.png'),
        image('b', 'https://cdn/users/u-1/image/a.png'),
        image('c', 'https://elsewhere.example/c.png'),
      );
      await processor.process(job(0));
      expect(storage.getObject).toHaveBeenCalledTimes(1);
      expect(storage.getObject).toHaveBeenCalledWith('users/u-1/image/a.png');
      const svg = (storage.putGeneratedFile.mock.calls[0][0].body as Buffer).toString();
      expect(svg.match(/<image /g)).toHaveLength(2);
      expect(svg).toContain('href="data:image/png;base64,iVBORw=="');
    });

    it('fails the export when an image cannot be read or the images are too large', async () => {
      withImages('SVG', image('a', 'https://cdn/users/u-1/image/gone.png'));
      storage.getObject.mockRejectedValueOnce(new Error('NoSuchKey'));
      await expect(processor.process(job(0))).rejects.toThrow(
        'Could not read the image https://cdn/users/u-1/image/gone.png: NoSuchKey',
      );

      withImages('SVG', image('a', 'https://cdn/users/u-1/image/huge.png'));
      storage.getObject.mockResolvedValueOnce({ body: Buffer.alloc(MAX_ARTWORK_BYTES + 1), contentType: 'image/png' });
      await expect(processor.process(job(0))).rejects.toThrow('exceed 40 MB');
    });

    it('does not load images for a DXF (cutting lines only)', async () => {
      withImages('DXF', image('a', 'https://cdn/users/u-1/image/a.png'));
      await processor.process(job(0));
      expect(storage.getObject).not.toHaveBeenCalled();
    });
  });
});
