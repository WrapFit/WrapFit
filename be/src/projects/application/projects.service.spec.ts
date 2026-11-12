import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { ProjectDetail } from '../domain/project.types';
import { CreateProjectDto } from '../presentation/dto/create-project.dto';
import { QueryProjectsDto } from '../presentation/dto/query-projects.dto';
import { IProjectEvents, PROJECT_EVENTS } from './ports/project-events.port';
import { IProjectFiles, PROJECT_FILES } from './ports/project-files.port';
import { IProjectRepository, PROJECT_REPOSITORY } from './ports/project.repository.port';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let repo: jest.Mocked<IProjectRepository>;
  let files: jest.Mocked<IProjectFiles>;
  let events: jest.Mocked<IProjectEvents>;

  const userId = 'user-1';
  const tuckTop = {
    id: 'tuck-top',
    isActive: true,
    formulaSchema: { params: { length: { min: 40, max: 600 }, width: { min: 30 }, height: { min: 20 } } },
    formulaVersion: 1,
  };
  const project = (overrides: Partial<ProjectDetail> = {}) =>
    ({
      id: 'project-1',
      status: 'ACTIVE',
      version: 4,
      formulaVersion: 1,
      template: { id: 'tuck-top', name: 'Tuck top' },
      materialSpec: { type: 'kraft', gsm: 300, caliper: 0.4, finish: 'matte' },
      dimensions: { length: 120, width: 80, height: 60, paperThickness: 0.4 },
      canvasState: { elements: [] },
      ...overrides,
    }) as ProjectDetail;
  /** A text element `x` mm from the left edge of the front panel. */
  const text = (x: number) => ({
    id: 't',
    type: 'text' as const,
    panelId: 'front',
    x,
    y: 10,
    width: 20,
    height: 10,
    rotation: 0,
    content: 'Tết',
  });
  const report = { isValidForProduction: true, score: 100, violations: [], auditedAt: '2026-10-01T00:00:00.000Z' };
  const createDto = (overrides: Partial<CreateProjectDto> = {}) =>
    ({ templateId: 'tuck-top', title: 'Gift box', dimensions: { length: 120, width: 80, height: 60 }, ...overrides }) as CreateProjectDto;

  beforeEach(async () => {
    repo = {
      findTemplateRules: jest.fn().mockResolvedValue(tuckTop),
      findDesignTemplate: jest.fn().mockResolvedValue(null),
      countTemplateUse: jest.fn(),
      isCollectionOwnedBy: jest.fn().mockResolvedValue(true),
      findOwnerId: jest.fn(),
      findById: jest.fn().mockResolvedValue(project()),
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      create: jest.fn().mockImplementation(async (data) => data),
      update: jest.fn().mockImplementation(async (_id, changes) => changes),
      updateContent: jest.fn().mockImplementation(async (_id, changes) => changes),
      setLifecycle: jest.fn().mockImplementation(async (_id, state) => state),
      delete: jest.fn(),
      findTrashedBefore: jest.fn().mockResolvedValue(['p-1', 'p-2', 'p-3']),
      deleteTrashed: jest.fn().mockResolvedValue(['p-1', 'p-3']),
      findUnchecked: jest.fn().mockResolvedValue([]),
      saveFitCheck: jest.fn(),
    };
    files = {
      detachSharedFiles: jest.fn(),
      listProjectFiles: jest.fn().mockResolvedValue([
        { projectId: 'p-1', key: 'a.png' },
        { projectId: 'p-2', key: 'b.png' },
        { projectId: 'p-3', key: 'c.png' },
      ]),
      deleteObjects: jest.fn(),
      resolveUpload: jest.fn(),
      assertCanvasUploads: jest.fn(),
    };
    events = { record: jest.fn(), recordStudioActivity: jest.fn().mockResolvedValue(true) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PROJECT_REPOSITORY, useValue: repo },
        { provide: PROJECT_FILES, useValue: files },
        { provide: PROJECT_EVENTS, useValue: events },
      ],
    }).compile();
    service = moduleRef.get(ProjectsService);
  });

  describe('create', () => {
    it('fills the defaults: ivory material, paper thickness from the caliper, empty canvas', async () => {
      await service.create(userId, createDto());
      expect(repo.create).toHaveBeenCalledWith({
        userId,
        templateId: 'tuck-top',
        formulaVersion: 1,
        collectionId: null,
        title: 'Gift box',
        dimensions: { length: 120, width: 80, height: 60, paperThickness: 0.42 },
        materialSpec: { type: 'ivory', gsm: 300, caliper: 0.42, finish: 'matte' },
        canvasState: { elements: [] },
        fitCheck: expect.objectContaining({ isValidForProduction: true, score: 100, violations: [expect.objectContaining({ code: 'EMPTY_DESIGN', severity: 'info' })] }),
        tags: [],
        occasion: null,
        industry: null,
      });
      expect(repo.countTemplateUse).not.toHaveBeenCalled();
    });

    it('counts the project as a box created on the analytics dashboard', async () => {
      repo.create.mockResolvedValueOnce(project({ id: 'project-9' }));
      await service.create(userId, createDto());
      expect(events.record).toHaveBeenCalledWith('PROJECT_CREATED', {
        userId,
        projectId: 'project-9',
        payload: { templateId: 'tuck-top', source: 'new' },
      });
    });

    it('runs FitCheck on the server (short panel ids included)', async () => {
      await service.create(userId, createDto({ canvasState: { elements: [text(0.5)] } }));
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fitCheck: expect.objectContaining({
            isValidForProduction: false,
            score: 70,
            violations: [expect.objectContaining({ code: 'CREASE_OVERLAP', severity: 'error' })],
          }),
        }),
      );
    });

    describe('from a curated design template', () => {
      const design = {
        id: 'design-1',
        boxTemplateId: 'tuck-top',
        isActive: true,
        materialSpec: { type: 'kraft' as const, gsm: 300, caliper: 0.4, finish: 'matte' as const },
        canvasState: { elements: [] },
      };

      it('takes the material and canvas of the design and counts the use', async () => {
        repo.findDesignTemplate.mockResolvedValueOnce(design);
        await service.create(userId, createDto({ designTemplateId: 'design-1' }));
        expect(repo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            materialSpec: design.materialSpec,
            canvasState: design.canvasState,
            dimensions: { length: 120, width: 80, height: 60, paperThickness: 0.4 },
          }),
        );
        expect(repo.countTemplateUse).toHaveBeenCalledWith('design-1');
      });

      it('keeps a canvas sent by the client (design resized to the gift)', async () => {
        repo.findDesignTemplate.mockResolvedValueOnce(design);
        const scaled = { elements: [] as never[] };
        await service.create(userId, createDto({ designTemplateId: 'design-1', canvasState: scaled }));
        expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ canvasState: scaled }));
      });

      it('rejects unknown designs and a structure that does not match', async () => {
        await expect(service.create(userId, createDto({ designTemplateId: 'nope' }))).rejects.toThrow(
          BadRequestException,
        );
        repo.findDesignTemplate.mockResolvedValueOnce({ ...design, boxTemplateId: 'pillow' });
        await expect(service.create(userId, createDto({ designTemplateId: 'design-1' }))).rejects.toThrow(
          'templateId must be pillow for this design template',
        );
        expect(repo.create).not.toHaveBeenCalled();
        expect(repo.countTemplateUse).not.toHaveBeenCalled();
      });
    });

    it('rejects an unknown or inactive template', async () => {
      repo.findTemplateRules.mockResolvedValueOnce(null);
      await expect(service.create(userId, createDto())).rejects.toThrow(BadRequestException);
      repo.findTemplateRules.mockResolvedValueOnce({ ...tuckTop, isActive: false });
      await expect(service.create(userId, createDto())).rejects.toThrow(BadRequestException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('rejects dimensions outside the template range', async () => {
      const error = await service
        .create(userId, createDto({ dimensions: { length: 10, width: 80, height: 60 } }))
        .catch((e: BadRequestException) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        message: ['dimensions.length must not be less than 40'],
      });
    });

    it('rejects a collection of another user', async () => {
      repo.isCollectionOwnedBy.mockResolvedValueOnce(false);
      await expect(service.create(userId, createDto({ collectionId: 'c-1' }))).rejects.toThrow(BadRequestException);
      expect(repo.isCollectionOwnedBy).toHaveBeenCalledWith('c-1', userId);
    });
  });

  it('list maps "none" to projects without a collection and paginates', async () => {
    repo.list.mockResolvedValueOnce({ items: [], total: 45 });
    const query = Object.assign(new QueryProjectsDto(), { page: 2, limit: 20, collectionId: 'none', q: '' });

    const result = await service.list(userId, query);

    expect(repo.list).toHaveBeenCalledWith(
      expect.objectContaining({ userId, status: 'ACTIVE', collectionId: null, search: undefined, skip: 20, take: 20 }),
    );
    expect(result.meta).toEqual({ total: 45, page: 2, limit: 20, totalPages: 3 });
  });

  it('list filters by box structure', async () => {
    await service.list(userId, Object.assign(new QueryProjectsDto(), { templateId: 'pillow' }));
    expect(repo.list).toHaveBeenCalledWith(expect.objectContaining({ templateId: 'pillow' }));
  });

  describe('update', () => {
    it('refuses to edit a project in the trash', async () => {
      repo.findById.mockResolvedValueOnce(project({ status: 'DELETED' }));
      await expect(service.update('project-1', userId, { title: 'x' })).rejects.toThrow(ConflictException);
      expect(repo.updateContent).not.toHaveBeenCalled();
    });

    it('writes only over the version it read, so the stored FitCheck matches the stored design', async () => {
      await service.update('project-1', userId, { title: 'x' });
      expect(repo.updateContent).toHaveBeenCalledWith('project-1', expect.objectContaining({ title: 'x' }), 4);
    });

    it('answers 409 PROJECT_VERSION_CONFLICT when the editor saves over a newer version', async () => {
      const error = await service.update('project-1', userId, { version: 3, title: 'x' }).catch((e) => e);
      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse()).toMatchObject({ code: 'PROJECT_VERSION_CONFLICT', currentVersion: 4 });
      expect(repo.updateContent).not.toHaveBeenCalled();

      await service.update('project-1', userId, { version: 4, title: 'x' });
      expect(repo.updateContent).toHaveBeenCalledTimes(1);
    });

    it('answers 409 when another save lands between the read and the write', async () => {
      repo.updateContent.mockResolvedValueOnce(null);
      repo.findById.mockResolvedValueOnce(project()).mockResolvedValueOnce(project({ version: 5 }));
      const error = await service.update('project-1', userId, { title: 'x' }).catch((e) => e);
      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse()).toMatchObject({ code: 'PROJECT_VERSION_CONFLICT', currentVersion: 5 });
    });

    it('re-checks new dimensions against the template and keeps the material caliper', async () => {
      await service.update('project-1', userId, { dimensions: { length: 200, width: 100, height: 50 } });
      expect(repo.updateContent).toHaveBeenCalledWith(
        'project-1',
        expect.objectContaining({ dimensions: { length: 200, width: 100, height: 50, paperThickness: 0.4 } }),
        4,
      );

      await expect(
        service.update('project-1', userId, { dimensions: { length: 700, width: 100, height: 50 } }),
      ).rejects.toThrow(BadRequestException);
    });

    it('recomputes FitCheck when the canvas or the dimensions change, not for other fields', async () => {
      await service.update('project-1', userId, { canvasState: { elements: [text(1.5)] } });
      expect(repo.updateContent).toHaveBeenLastCalledWith(
        'project-1',
        expect.objectContaining({ fitCheck: expect.objectContaining({ score: 90, isValidForProduction: true }) }),
        4,
      );

      await service.update('project-1', userId, { title: 'Hộp mới' });
      expect(repo.updateContent.mock.lastCall![1]).not.toHaveProperty('fitCheck');
    });

    it('allows removing the project from its collection without an ownership lookup', async () => {
      await service.update('project-1', userId, { collectionId: null });
      expect(repo.isCollectionOwnedBy).not.toHaveBeenCalled();
      expect(repo.updateContent).toHaveBeenCalledWith('project-1', expect.objectContaining({ collectionId: null }), 4);
    });
  });

  describe('changeStatus', () => {
    it('moves a project to the trash and stamps deletedAt', async () => {
      await service.changeStatus('project-1', 'DELETED');
      expect(repo.setLifecycle).toHaveBeenCalledWith('project-1', { status: 'DELETED', deletedAt: expect.any(Date) });
    });

    it('does not write anything when the status does not change', async () => {
      const current = project({ status: 'ARCHIVED' });
      repo.findById.mockResolvedValueOnce(current);
      await expect(service.changeStatus('project-1', 'ARCHIVED')).resolves.toBe(current);
      expect(repo.setLifecycle).not.toHaveBeenCalled();
    });
  });

  describe('duplicate', () => {
    it('copies the design into a new project of the current user', async () => {
      repo.findById.mockResolvedValueOnce(
        project({
          title: 'Hộp nến',
          collection: { id: 'c-1', title: 'Tết', colorTag: null },
          dimensions: { length: 120, width: 80, height: 60, paperThickness: 0.4 },
          canvasState: { elements: [] },
          fitcheckState: report,
          tags: ['tet'],
          thumbnailUrl: 'https://cdn/x.png',
        }),
      );
      await service.duplicate('project-1', userId);
      expect(repo.create).toHaveBeenCalledWith({
        userId,
        templateId: 'tuck-top',
        formulaVersion: 1,
        collectionId: 'c-1',
        title: '[Bản sao] Hộp nến',
        dimensions: { length: 120, width: 80, height: 60, paperThickness: 0.4 },
        materialSpec: { type: 'kraft', gsm: 300, caliper: 0.4, finish: 'matte' },
        canvasState: { elements: [] },
        fitCheck: report,
        tags: ['tet'],
        forkedFromId: null,
      });
      expect(events.record).toHaveBeenCalledWith('PROJECT_CREATED', expect.objectContaining({ userId, payload: { templateId: 'tuck-top', source: 'duplicate' } }));
    });

    it('refuses to duplicate a project in the trash', async () => {
      repo.findById.mockResolvedValueOnce(project({ status: 'DELETED' }));
      await expect(service.duplicate('project-1', userId)).rejects.toThrow(ConflictException);
    });
  });

  it('fork keeps the title, leaves the collections behind and links the original', async () => {
    repo.findById.mockResolvedValueOnce(
      project({ title: 'Hộp Tết', collection: { id: 'c-9', title: 'Của tác giả', colorTag: null }, tags: ['tet'] }),
    );
    await service.fork('project-1', 'remixer');
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'remixer', title: 'Hộp Tết', collectionId: null, forkedFromId: 'project-1' }),
    );
    expect(events.record).toHaveBeenCalledWith('PROJECT_CREATED', expect.objectContaining({ userId: 'remixer', payload: { templateId: 'tuck-top', source: 'fork' } }));
  });

  it('recordEvent passes Auto-Fix repairs and studio heartbeats to the analytics events', async () => {
    await service.recordEvent('project-1', userId, { type: 'AUTO_FIX_APPLIED', fixed: 2 });
    expect(events.record).toHaveBeenCalledWith('AUTO_FIX_APPLIED', { userId, projectId: 'project-1', payload: { fixed: 2 } });
    await service.recordEvent('project-1', userId, { type: 'STUDIO_ACTIVE', seconds: 45 });
    expect(events.recordStudioActivity).toHaveBeenCalledWith(userId, 'project-1', 45);
  });

  it('changeVisibility refuses projects in the trash', async () => {
    repo.findById.mockResolvedValueOnce(project({ status: 'DELETED' }));
    await expect(service.changeVisibility('project-1', { visibility: 'PUBLIC' })).rejects.toThrow(ConflictException);
    await service.changeVisibility('project-1', { visibility: 'UNLISTED', allowFork: false });
    expect(repo.update).toHaveBeenCalledWith('project-1', { visibility: 'UNLISTED', allowFork: false });
  });

  it('backfillFitChecks scores projects saved without a score, page by page', async () => {
    const unchecked = (id: string, templateId = 'tuck-top') => ({
      id,
      templateId,
      formulaVersion: 1,
      dimensions: { length: 120, width: 80, height: 60, paperThickness: 0.4 },
      canvasState: { elements: [text(0.5)] },
    });
    repo.findUnchecked
      .mockResolvedValueOnce([unchecked('a'), unchecked('b', 'hexagon')])
      .mockResolvedValueOnce([unchecked('c')])
      .mockResolvedValueOnce([]);

    await expect(service.backfillFitChecks()).resolves.toBe(2);

    expect(repo.findUnchecked.mock.calls.map(([afterId]) => afterId)).toEqual([null, 'b', 'c']);
    // "hexagon" has no dieline generator: skipped, and the cursor still moves on.
    expect(repo.saveFitCheck.mock.calls.map(([id, fitCheck]) => [id, fitCheck.score])).toEqual([
      ['a', 70],
      ['c', 70],
    ]);
  });

  describe('purgeExpiredTrash', () => {
    it('deletes what entered the trash more than 30 days ago, then their files', async () => {
      const cutoff = new Date('2026-10-01T00:00:00.000Z');
      await expect(service.purgeExpiredTrash(new Date('2026-10-31T00:00:00.000Z'))).resolves.toBe(2);

      expect(repo.findTrashedBefore).toHaveBeenCalledWith(cutoff, expect.any(Number));
      expect(repo.deleteTrashed).toHaveBeenCalledWith(['p-1', 'p-2', 'p-3'], cutoff);
      // Files still shown by copies are detached before the file list is read.
      expect(files.detachSharedFiles).toHaveBeenCalledWith(['p-1', 'p-2', 'p-3']);
      expect(files.detachSharedFiles.mock.invocationCallOrder[0]).toBeLessThan(
        files.listProjectFiles.mock.invocationCallOrder[0],
      );
      // p-2 was restored between the lookup and the deletion: its file must stay.
      expect(files.deleteObjects).toHaveBeenCalledWith(['a.png', 'c.png']);
    });

    it('does nothing when the trash has nothing expired', async () => {
      repo.findTrashedBefore.mockResolvedValueOnce([]);
      await expect(service.purgeExpiredTrash()).resolves.toBe(0);
      expect(repo.deleteTrashed).not.toHaveBeenCalled();
      expect(files.deleteObjects).not.toHaveBeenCalled();
    });
  });

  it('remove deletes only projects that are in the trash', async () => {
    await expect(service.remove('project-1')).rejects.toThrow(ConflictException);
    repo.findById.mockResolvedValueOnce(project({ status: 'DELETED' }));
    files.listProjectFiles.mockResolvedValueOnce([{ projectId: 'project-1', key: 'thumb.webp' }]);
    await service.remove('project-1');
    expect(repo.delete).toHaveBeenCalledWith('project-1');
    expect(files.detachSharedFiles).toHaveBeenCalledWith(['project-1']);
    expect(files.deleteObjects).toHaveBeenCalledWith(['thumb.webp']);
  });

  it('assertOwner hides projects of other users behind a 404', async () => {
    repo.findOwnerId.mockResolvedValueOnce('someone-else');
    await expect(service.assertOwner('project-1', userId)).rejects.toThrow(NotFoundException);
    repo.findOwnerId.mockResolvedValueOnce(null);
    await expect(service.assertOwner('project-1', userId)).rejects.toThrow(NotFoundException);
    repo.findOwnerId.mockResolvedValueOnce(userId);
    await expect(service.assertOwner('project-1', userId)).resolves.toBeUndefined();
  });
});
