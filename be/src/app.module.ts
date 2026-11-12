import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  AllExceptionsFilter,
  CommonModule,
  ConfigService,
  HttpThrottlerGuard,
  LoggingInterceptor,
  OriginGuard,
  RolesGuard,
} from './common';
import { queueRootModule } from './shared/queue';
import { AuthModule, JwtAuthGuard } from './auth';
import { configuration, validateEnv } from './config';
import { AiModule } from './ai';
import { BillingModule } from './billing';
import { AnalyticsModule } from './analytics';
import { ExportModule } from './export';
import { CollectionsModule } from './collections';
import { EventsModule } from './events';
import { BaseModule } from './base';
import { ProjectsModule } from './projects';
import { PublicShowcaseModule } from './public-showcase';
import { StorageMaintenanceModule, StorageModule } from './storage';
import { LibraryModule } from './library';
import { TemplatesModule } from './templates';
import { UnboxingModule } from './unboxing';
import { UsersModule } from './users';
import { PrintShopsModule } from './print-shops';
import { OrdersModule } from './orders';
import { PaymentsModule } from './payments';
import { PrismaModule } from './shared/prisma';
import { RedisModule } from './shared/redis';
import { CloudinaryModule } from './shared/cloudinary';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv, load: [configuration] }),
    CommonModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        { ttl: config.get('throttle.ttlSeconds') * 1000, limit: config.get('throttle.limit') },
      ],
    }),
    ScheduleModule.forRoot(), // @Cron / @Interval tasks: TrashPurgeTask, ExportReconcileTask, StorageMaintenanceTask
    EventEmitterModule.forRoot(), // internal events, e.g. project.forked
    PrismaModule,
    RedisModule,
    StorageModule,
    StorageMaintenanceModule,
    CloudinaryModule,
    queueRootModule('producer'), // BullMQ (Redis): jobs are processed by src/worker.ts
    AuthModule,
    UsersModule,
    BillingModule,
    ProjectsModule,
    CollectionsModule,
    PublicShowcaseModule,
    TemplatesModule,
    LibraryModule,
    AiModule,
    AnalyticsModule,
    UnboxingModule,
    ExportModule,
    EventsModule,
    PrintShopsModule,
    OrdersModule,
    PaymentsModule,
    BaseModule,
  ],
  providers: [
    // Guards run in this order: origin (CSRF) -> rate limit -> authentication -> role check.
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: HttpThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
