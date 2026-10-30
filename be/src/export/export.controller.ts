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
      'Not unlocked on a free or credit plan: PDF_A4_PRINT is watermarked, other formats answer 402 EXPORT_CREDIT_REQUIRED ' +
      '{ balance } until the request sends useCredit: true (402 INSUFFICIENT_CREDITS when none are left).',
  })
  request(@Param('id') projectId: string, @Body() dto: CreateExportDto) {
    return this.exports.request(projectId, dto.fileType, dto.useCredit);
  }

  @Get('projects/:id/exports/access')
  @UseGuards(ProjectOwnerGuard)
  @ApiOperation({ summary: 'Export mode of my plan, whether this design version is unlocked, export credits left' })
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
