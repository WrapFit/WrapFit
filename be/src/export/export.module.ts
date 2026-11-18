import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics';
import { BillingCoreModule } from '../billing';
import { NotificationsCoreModule } from '../notifications';
import { ProjectsModule } from '../projects';
import { ExportReconcileTask } from './export-reconcile.task';
import { EXPORT_QUEUE } from './export.constants';
import { ExportController } from './export.controller';
import { ExportProcessor } from './export.processor';
import { ExportService } from './export.service';
import { WorkerHeartbeat } from './worker-heartbeat';

/** API side: endpoints + queue producer. Imported by AppModule (HTTP process). */
@Module({
  imports: [ProjectsModule, AnalyticsModule, BillingCoreModule, BullModule.registerQueue({ name: EXPORT_QUEUE })],
  controllers: [ExportController],
  providers: [ExportService, ExportReconcileTask],
})
export class ExportModule {}

/** Worker side: the BullMQ processor only. Imported by WorkerModule (src/worker.ts), never by the API. */
@Module({
  imports: [BillingCoreModule, NotificationsCoreModule, BullModule.registerQueue({ name: EXPORT_QUEUE })],
  providers: [ExportProcessor, WorkerHeartbeat],
})
export class ExportWorkerModule {}
