import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ACCESS_COOKIE, CurrentUser } from '../common';
import { ProjectOwnerGuard } from '../projects';
import { CreateExportDto } from './dto/create-export.dto';
import { ExportService } from './export.service';

@ApiTags('export')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller()
export class ExportController {
  constructor(private readonly exports: ExportService) {}

  @Post('projects/:id/exports')
  @HttpCode(202)
  @UseGuards(ProjectOwnerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Request a print file (FitCheck runs first); poll GET /api/exports/:jobId',
    description:
      'Every format is a clean file, once a paid print order (not cancelled) holds this design version, or an unlock ' +
      'bought before the print cart is still valid. Otherwise 402 ORDER_PAYMENT_REQUIRED. FitCheck errors: 422.',
  })
  request(@Param('id') projectId: string, @Body() dto: CreateExportDto) {
    return this.exports.request(projectId, dto.fileType);
  }

  @Get('projects/:id/exports/access')
  @UseGuards(ProjectOwnerGuard)
  @ApiOperation({ summary: 'Whether this design version is unlocked (a paid print order holds it)' })
  access(@Param('id') projectId: string) {
    return this.exports.access(projectId);
  }

  @Get('projects/:id/exports')
  @UseGuards(ProjectOwnerGuard)
  @ApiOperation({ summary: 'Last 20 exports of my project' })
  list(@Param('id') projectId: string) {
    return this.exports.list(projectId);
  }

  @Get('exports/:jobId')
  @ApiOperation({ summary: 'Export status; COMPLETED includes a download link valid for 15 minutes' })
  status(@Param('jobId', ParseUUIDPipe) jobId: string, @CurrentUser('id') userId: string) {
    return this.exports.status(jobId, userId);
  }
}
