import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ACCESS_COOKIE, CurrentUser } from '../common';
import { AnalyticsService } from './analytics.service';
import { SummaryQueryDto } from './dto/summary-query.dto';

@ApiTags('analytics')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({
    summary:
      'Design numbers of the dashboard: boxes, box types, FitCheck errors prevented, box creation time, exports',
    description:
      'scope=me: my projects, always fresh. scope=global: anonymous totals of every user, cached for 60 s. ' +
      'Creation time = median active studio time from creating a project to its first completed export.',
  })
  summary(@CurrentUser('id') userId: string, @Query() query: SummaryQueryDto) {
    return this.analytics.summary(query.scope, query.days, userId);
  }
}
