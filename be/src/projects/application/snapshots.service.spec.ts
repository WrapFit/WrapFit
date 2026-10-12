import { ConflictException, NotFoundException } from '@nestjs/common';
import { configureAssetBase } from '../../storage';
import type { ProjectDetail } from '../domain/project.types';
import type { IProjectFiles } from './ports/project-files.port';
import type { ISnapshotRepository } from './ports/snapshot.repository.port';
import type { ProjectsService } from './projects.service';
import { MAX_SNAPSHOTS_PER_PROJECT, SnapshotsService } from './snapshots.service';

describe('SnapshotsService', () => {
  const thumbnailKey = 'users/0192a4c0-0000-7000-8000-000000000001/thumbnail/now.png';
  beforeAll(() => configureAssetBase('https://cdn'));
  afterAll(() => configureAssetBase(''));

  const current = {
    id: 'project-1',
    status: 'ACTIVE',
    thumbnailUrl: `https://cdn/${thumbnailKey}`,
    template: { id: 'tuck-top', name: 'Tuck top' },
    version: 4,
    formulaVersion: 1,
    latestFormulaVersion: 3,
    dimensions: { length: 120, width: 80, height: 60, paperThickness: 0.35 },
    canvasState: { elements: [] },
  } as unknown as ProjectDetail;
  const saved = {
    id: 'snap-1',
    name: 'Mốc 1',
    dimensions: { length: 100, width: 70, height: 50, paperThickness: 0.35 },
    canvasState: { elements: [] },
    formulaVersion: null as number | null,
  };

  let projects: { findOne: jest.Mock };
  let repo: jest.Mocked<ISnapshotRepository>;
  let files: { resolveUpload: jest.Mock };
  let service: SnapshotsService;

  beforeEach(() => {
    projects = { findOne: jest.fn().mockResolvedValue(current) };
    repo = {
      list: jest.fn(),
      countManual: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      findContent: jest.fn().mockResolvedValue(saved),
      delete: jest.fn().mockResolvedValue(true),
      restore: jest.fn(),
      upgradeFormula: jest.fn().mockResolvedValue({ project: current, backup: { id: 'snap-b' } }),
    };
    files = { resolveUpload: jest.fn().mockResolvedValue('users/u-1/thumbnail/p.png') };
    service = new SnapshotsService(projects as unknown as ProjectsService, repo, files as unknown as IProjectFiles);
  });

  it('saves the current canvas and dimensions under the given name', async () => {
    await service.create('project-1', 'user-1', { name: 'Mốc 2' });
    expect(repo.create).toHaveBeenCalledWith('project-1', {
      name: 'Mốc 2',
      previewKey: null,
      canvasState: current.canvasState,
      dimensions: current.dimensions,
      formulaVersion: 1,
    });
  });

  it('stores the key of an uploaded preview, checked to be an upload of the caller', async () => {
    await service.create('project-1', 'user-1', { name: 'Mốc 3', previewUrl: 'https://cdn/users/u-1/thumbnail/p.png' });
    expect(files.resolveUpload).toHaveBeenCalledWith('https://cdn/users/u-1/thumbnail/p.png', 'user-1', ['THUMBNAIL', 'IMAGE']);
    expect(repo.create).toHaveBeenCalledWith('project-1', expect.objectContaining({ previewKey: 'users/u-1/thumbnail/p.png' }));
  });

  it('caps manual snapshots per project', async () => {
    repo.countManual.mockResolvedValueOnce(MAX_SNAPSHOTS_PER_PROJECT);
    await expect(service.create('project-1', 'user-1', { name: 'one too many' })).rejects.toThrow(ConflictException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('refuses to snapshot or restore a project in the trash', async () => {
    projects.findOne.mockResolvedValue({ ...current, status: 'DELETED' });
    await expect(service.create('project-1', 'user-1', { name: 'x' })).rejects.toThrow(ConflictException);
    await expect(service.restore('project-1', 'snap-1')).rejects.toThrow(ConflictException);
  });

  it('backs up the current state before restoring, and re-runs FitCheck on the restored design', async () => {
    await service.restore('project-1', 'snap-1');
    expect(repo.findContent).toHaveBeenCalledWith('project-1', 'snap-1');
    expect(repo.restore).toHaveBeenCalledWith(
      'project-1',
      saved,
      {
        name: 'Trước khi khôi phục: Mốc 1',
        previewKey: thumbnailKey,
        canvasState: current.canvasState,
        dimensions: current.dimensions,
        formulaVersion: 1,
      },
      expect.objectContaining({ isValidForProduction: true, score: 100 }),
    );
  });

  it('checks a restored design with the formulas of the snapshot', async () => {
    // Front panel of the snapshot size: 100 mm wide in version 1, 100.42 mm in version 3 (paper thickness added), so
    // 2.8 mm or 3.22 mm are left on the right of this text.
    const element = { id: 't', type: 'text', panelId: 'panel_front', x: 3, y: 10, width: 94.2, height: 10, rotation: 0, content: 'x' };
    const content = { ...saved, canvasState: { elements: [element] } };
    repo.findContent.mockResolvedValueOnce({ ...content, formulaVersion: 3 } as never);
    await service.restore('project-1', 'snap-1');
    expect(repo.restore.mock.calls[0][3]?.violations).toEqual([]);
    // An older snapshot keeps the project's formulas (version 1 here).
    repo.findContent.mockResolvedValueOnce({ ...content, formulaVersion: null } as never);
    await service.restore('project-1', 'snap-1');
    expect(repo.restore.mock.calls[1][3]?.violations.map((v) => v.code)).toEqual(['CREASE_OVERLAP']);
  });

  describe('formula upgrade', () => {
    it('saves the current state with its formula version, then moves to the current formulas', async () => {
      await expect(service.upgradeFormula('project-1', 4)).resolves.toEqual({ project: current, backup: { id: 'snap-b' } });
      expect(repo.upgradeFormula).toHaveBeenCalledWith(
        'project-1',
        4,
        3,
        {
          name: 'Trước khi cập nhật công thức (bản 1 → 3)',
          previewKey: thumbnailKey,
          canvasState: current.canvasState,
          dimensions: current.dimensions,
          formulaVersion: 1,
        },
        expect.objectContaining({ isValidForProduction: true }),
      );
    });

    it('answers 409 PROJECT_VERSION_CONFLICT for a stale version, before and during the write', async () => {
      await expect(service.upgradeFormula('project-1', 3)).rejects.toMatchObject({
        response: { code: 'PROJECT_VERSION_CONFLICT', currentVersion: 4 },
      });
      repo.upgradeFormula.mockResolvedValueOnce(null);
      projects.findOne.mockResolvedValueOnce(current).mockResolvedValueOnce({ ...current, version: 5 });
      await expect(service.upgradeFormula('project-1', 4)).rejects.toMatchObject({
        response: { code: 'PROJECT_VERSION_CONFLICT', currentVersion: 5 },
      });
    });

    it('refuses a project in the trash and leaves an up-to-date project alone', async () => {
      projects.findOne.mockResolvedValueOnce({ ...current, status: 'DELETED' });
      await expect(service.upgradeFormula('project-1', 4)).rejects.toThrow(ConflictException);
      projects.findOne.mockResolvedValueOnce({ ...current, formulaVersion: 3 });
      await expect(service.upgradeFormula('project-1', 4)).resolves.toMatchObject({ backup: null });
      expect(repo.upgradeFormula).not.toHaveBeenCalled();
    });
  });

  it('answers 404 for snapshots of other projects', async () => {
    repo.findContent.mockResolvedValueOnce(null);
    await expect(service.restore('project-1', 'snap-x')).rejects.toThrow(NotFoundException);
    repo.delete.mockResolvedValueOnce(false);
    await expect(service.remove('project-1', 'snap-x')).rejects.toThrow(NotFoundException);
  });
});
