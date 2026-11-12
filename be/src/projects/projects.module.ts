import { Module } from '@nestjs/common';
import { AnalyticsModule, ProductEventsService } from '../analytics';
import { StorageService } from '../storage';
import { PROJECT_EVENTS } from './application/ports/project-events.port';
import { PROJECT_FILES } from './application/ports/project-files.port';
import { PROJECT_REPOSITORY } from './application/ports/project.repository.port';
import { SNAPSHOT_REPOSITORY } from './application/ports/snapshot.repository.port';
import { ProjectsService } from './application/projects.service';
import { SnapshotsService } from './application/snapshots.service';
import { PrismaProjectRepository } from './infrastructure/prisma-project.repository';
import { PrismaSnapshotRepository } from './infrastructure/prisma-snapshot.repository';
import { FitCheckBackfillTask } from './presentation/fitcheck-backfill.task';
import { ProjectOwnerGuard } from './presentation/project-owner.guard';
import { ProjectsController } from './presentation/projects.controller';
import { SnapshotsController } from './presentation/snapshots.controller';
import { TrashPurgeTask } from './presentation/trash-purge.task';

/** Four layers (presentation / application / domain / infrastructure), see docs 08, section 1. */
@Module({
  imports: [AnalyticsModule],
  controllers: [ProjectsController, SnapshotsController],
  providers: [
    ProjectsService,
    SnapshotsService,
    ProjectOwnerGuard,
    TrashPurgeTask,
    FitCheckBackfillTask,
    { provide: PROJECT_REPOSITORY, useClass: PrismaProjectRepository },
    { provide: SNAPSHOT_REPOSITORY, useClass: PrismaSnapshotRepository },
    // StorageModule is global; it implements the file port of this module.
    { provide: PROJECT_FILES, useExisting: StorageService },
    // The analytics module records the product events of the dashboard.
    { provide: PROJECT_EVENTS, useExisting: ProductEventsService },
  ],
  exports: [ProjectsService, ProjectOwnerGuard],
})
export class ProjectsModule {}
