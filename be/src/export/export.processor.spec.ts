import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { Job } from 'bullmq';
import type { ConfigService } from '../common';
import type { PrismaService } from '../shared/prisma';
import type { StorageService } from '../storage';
import type { ExportJobData } from './export.constants';
import { EXPORT_COMPLETED, ExportProcessor, MAX_ARTWORK_BYTES } from './export.processor';

describe('ExportProcessor', () => {
  const project = {
    id: 'p-1',
    userId: 'u-1',
    title: 'Hộp nến',
    templateId: 'tuck-top',
    formulaVersion: 1,
    dimensions: { length: 120, width: 80, height: 60, paperThickness: 0.4 },
    canvasState: { elements: [] },
  };
  let prisma: {
    exportJob: { update: jest.Mock; updateMany: jest.Mock };
    projectSnapshot: { create: jest.Mock };
    productEvent: { create: jest.Mock };
    $transaction: jest.Mock;
    $executeRaw: jest.Mock;
  };
  let storage: { putGeneratedFile: jest.Mock; uploadedKeyOf: jest.Mock; getObject: jest.Mock };
  let events: { emit: jest.Mock };
  let processor: ExportProcessor;
  const job = (attemptsMade: number) =>
    ({ data: { exportJobId: 'job-1' }, attemptsMade, opts: { attempts: 3 } }) as unknown as Job<ExportJobData>;

  beforeEach(() => {
    prisma = {
      exportJob: { update: jest.fn().mockResolvedValue({ fileType: 'DXF', project }), updateMany: jest.fn() },
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
    processor = new ExportProcessor(
      prisma as unknown as PrismaService,
      storage as unknown as StorageService,
      events as unknown as EventEmitter2,
      { get: () => 2 } as unknown as ConfigService,
    );
    jest.spyOn(processor['logger'], 'warn').mockImplementation(() => undefined);
    jest.spyOn(processor['logger'], 'log').mockImplementation(() => undefined);
  });

  it('renders, stores the file, completes the job with a snapshot and emits an event', async () => {
    await expect(processor.process(job(0))).resolves.toEqual({ storageKey: 'private/projects/p-1/exports/job-1.dxf' });

    expect(prisma.exportJob.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'PROCESSING', errorLog: null } }));
    expect(storage.putGeneratedFile).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'private/projects/p-1/exports/job-1.dxf', purpose: 'EXPORT', contentType: 'application/dxf', projectId: 'p-1' }),
    );
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.exportJob.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED', storageKey: 'private/projects/p-1/exports/job-1.dxf' }) }),
    );
    expect(prisma.projectSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ projectId: 'p-1', name: expect.stringMatching(/^Bản xuất in DXF /), isAutomatic: true }) }),
    );
    expect(prisma.productEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'EXPORT_COMPLETED',
        userId: 'u-1',
        projectId: 'p-1',
        payload: { exportJobId: 'job-1', fileType: 'DXF', watermarked: false },
      }),
    });
    // Only the newest automatic snapshots are kept.
    expect(prisma.$executeRaw.mock.calls[0][0].join('?')).toContain('DELETE FROM project_snapshots');
    expect(events.emit).toHaveBeenCalledWith(EXPORT_COMPLETED, { exportJobId: 'job-1', projectId: 'p-1', userId: 'u-1' });
  });

  it('lets BullMQ retry, and marks the job FAILED only after the last attempt', async () => {
    storage.putGeneratedFile.mockRejectedValue(new Error('bucket unreachable'));

    await expect(processor.process(job(0))).rejects.toThrow('bucket unreachable');
    await expect(processor.process(job(1))).rejects.toThrow('bucket unreachable');
    expect(prisma.exportJob.updateMany).not.toHaveBeenCalled();

    await expect(processor.process(job(2))).rejects.toThrow('bucket unreachable');
    // Only an unfinished row: a job completed meanwhile (stalled, then re-run) is never turned into FAILED.
    expect(prisma.exportJob.updateMany).toHaveBeenCalledWith({
      where: { id: 'job-1', status: { in: ['PENDING', 'PROCESSING'] } },
      data: { status: 'FAILED', errorLog: 'bucket unreachable' },
    });
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
      prisma.exportJob.update.mockResolvedValueOnce({ fileType, project: { ...project, canvasState: { elements } } });

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
