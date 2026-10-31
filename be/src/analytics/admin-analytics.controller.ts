import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ACCESS_COOKIE, Roles } from '../common';
import { XuReportQueryDto } from './dto/xu-report-query.dto';
import { vietnamMonthOf, XuReportService } from './xu-report.service';

@ApiTags('analytics')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly xuReport: XuReportService) {}

  @Get('xu')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Xu Wrap of a month (admin): issued, spent, refunded, expired, revenue, deferred revenue, provider cost',
    description:
      'Revenue counts each spent xu at the money paid for its lot (allowance and gift xu are worth 0đ).',
  })
  xu(@Query() query: XuReportQueryDto) {
    return this.xuReport.report(query.month ?? vietnamMonthOf(new Date()));
  }
}
