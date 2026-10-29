import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ProductEventsService } from './product-events.service';

/**
 * Analytics dashboard (docs/17 S7). Simple module: Controller -> Service -> PrismaService. Other modules record
 * events through ProductEventsService; this module imports no feature module.
 */
@Module({
  imports: [CacheModule.register()],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, ProductEventsService],
  exports: [ProductEventsService],
})
export class AnalyticsModule {}
