import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Param, ParseUUIDPipe, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common';
import { QueryHubDto } from './dto/query-hub.dto';
import { TemplatesService } from './templates.service';

/**
 * Public, identical for every visitor: responses are cached in memory per URL for 60 s
 * (likes and usage counters may lag by up to a minute).
 */
@ApiTags('templates')
@Public()
@UseInterceptors(CacheInterceptor)
@CacheTTL(60_000)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get('structures')
  @ApiOperation({ summary: 'Box structures (tuck-top, sleeve-drawer, lid-base, pillow, mailer, gable, insert, hang-tag, folded-card, belly-band) with their size limits' })
  structures() {
    return this.templatesService.structures();
  }

  @Get('hub')
  @ApiOperation({ summary: 'Template hub: curated designs or community projects, with filters (paginated)' })
  hub(@Query() query: QueryHubDto) {
    return this.templatesService.hub(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'A curated design with its canvas, to start a project from it' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOne(id);
  }
}
