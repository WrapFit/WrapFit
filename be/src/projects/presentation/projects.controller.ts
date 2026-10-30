import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ACCESS_COOKIE, CurrentUser } from '../../common';
import { ProjectsService } from '../application/projects.service';
import { SnapshotsService } from '../application/snapshots.service';
import { ChangeStatusDto } from './dto/change-status.dto';
import { ChangeVisibilityDto } from './dto/change-visibility.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { FormulaUpgradeDto } from './dto/formula-upgrade.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { RecordProjectEventDto } from './dto/record-project-event.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectOwnerGuard } from './project-owner.guard';

@ApiTags('projects')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly snapshotsService: SnapshotsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a project from a box template' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my projects (filter by status, collection, search; paginated)' })
  list(@CurrentUser('id') userId: string, @Query() query: QueryProjectsDto) {
    return this.projectsService.list(userId, query);
  }

  @Get(':id')
  @UseGuards(ProjectOwnerGuard)
  @ApiOperation({ summary: 'Get one of my projects with its canvas' })
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(ProjectOwnerGuard)
  @ApiOperation({ summary: 'Update title, dimensions, material, canvas, collection, thumbnail or tags' })
  update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, userId, dto);
  }

  @Patch(':id/status')
  @UseGuards(ProjectOwnerGuard)
  @ApiOperation({ summary: 'Archive, move to the trash (30 days) or restore a project' })
  changeStatus(@Param('id') id: string, @Body() dto: ChangeStatusDto) {
    return this.projectsService.changeStatus(id, dto.status);
  }

  @Patch(':id/visibility')
  @UseGuards(ProjectOwnerGuard)
  @ApiOperation({ summary: 'Share a project: PRIVATE, UNLISTED (secret link) or PUBLIC, and allow remixing' })
  changeVisibility(@Param('id') id: string, @Body() dto: ChangeVisibilityDto) {
    return this.projectsService.changeVisibility(id, dto);
  }

  @Post(':id/formula-upgrade')
  @UseGuards(ProjectOwnerGuard)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Move a project to the current dieline formulas of its box structure',
    description:
      'Saves an automatic snapshot first (it keeps the old formula version: restoring it undoes the upgrade), then ' +
      'changes formulaVersion and recomputes FitCheck. 409 in the trash, 409 PROJECT_VERSION_CONFLICT when `version` ' +
      'is stale. Already current: returns the project and backup null.',
  })
  upgradeFormula(@Param('id') id: string, @Body() dto: FormulaUpgradeDto) {
    return this.snapshotsService.upgradeFormula(id, dto.version);
  }

  @Post(':id/duplicate')
  @UseGuards(ProjectOwnerGuard)
  @ApiOperation({ summary: 'Copy a project into a new, independent project' })
  duplicate(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.projectsService.duplicate(id, userId);
  }

  @Post(':id/events')
  @UseGuards(ProjectOwnerGuard)
  @HttpCode(204)
  // One heartbeat a minute and the odd Auto-Fix; more is a loop or a script.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Record a studio event for the analytics dashboard: AUTO_FIX_APPLIED or STUDIO_ACTIVE (heartbeat)',
    description: 'STUDIO_ACTIVE carries at most 60 seconds; a second heartbeat of the project within 50 s is ignored.',
  })
  recordEvent(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: RecordProjectEventDto) {
    return this.projectsService.recordEvent(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(ProjectOwnerGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a project permanently (it must be in the trash)' })
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
