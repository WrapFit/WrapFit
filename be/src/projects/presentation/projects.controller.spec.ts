import type { EventEmitter2 } from '@nestjs/event-emitter';
import { PROJECT_SAVED } from '../../common';
import type { ProjectsService } from '../application/projects.service';
import type { SnapshotsService } from '../application/snapshots.service';
import type { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsController } from './projects.controller';

describe('ProjectsController.update: project.saved for the other editor tabs (docs/28 Q5)', () => {
  const saved = { id: 'p1', version: 4, updatedAt: new Date('2026-11-18T10:00:00Z') };
  const setup = () => {
    const emit = jest.fn();
    const projects = { update: jest.fn().mockResolvedValue(saved) } as unknown as ProjectsService;
    const controller = new ProjectsController(projects, {} as SnapshotsService, { emit } as unknown as EventEmitter2);
    return { controller, emit };
  };

  it('emits the save with the tab that made it', async () => {
    const { controller, emit } = setup();
    await expect(controller.update('p1', 'u1', { title: 'Hộp nến', version: 3 } as UpdateProjectDto, 'tab-1')).resolves.toBe(saved);
    expect(emit).toHaveBeenCalledWith(PROJECT_SAVED, {
      userId: 'u1',
      projectId: 'p1',
      version: 4,
      updatedAt: '2026-11-18T10:00:00.000Z',
      tabId: 'tab-1',
    });
  });

  it('drops a malformed tab id, and says nothing for a thumbnail alone', async () => {
    const { controller, emit } = setup();
    await controller.update('p1', 'u1', { tags: ['tet'] } as UpdateProjectDto, 'bad tab <id>');
    expect(emit).toHaveBeenLastCalledWith(PROJECT_SAVED, expect.objectContaining({ tabId: null }));
    emit.mockClear();
    await controller.update('p1', 'u1', { thumbnailUrl: 'https://cdn/x.png', version: 4, title: undefined } as UpdateProjectDto, 'tab-1');
    expect(emit).not.toHaveBeenCalled();
  });
});
