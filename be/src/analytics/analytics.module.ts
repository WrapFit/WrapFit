import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ProductEventsService } from './product-events.service';
import { XuReportService } from './xu-report.service';

/**
 * Analytics dashboard (docs/17 S7) and the admin xu report (docs/19 S5). Simple module: Controller -> Service ->
 * PrismaService. Other modules record events through ProductEventsService; this module imports no feature module
 * (the xu report only reads the token prices of `ai`).
 */
@Module({
  imports: [CacheModule.register()],
  controllers: [AnalyticsController, AdminAnalyticsController],
  providers: [AnalyticsService, ProductEventsService, XuReportService],
  exports: [ProductEventsService],
})
export class AnalyticsModule {}
