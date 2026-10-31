import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { configuration, createAppLogger, validateEnv } from './config';
import { queueRootModule } from './shared/queue';
import { CommonModule } from './common';
import { AiImageWorkerModule } from './ai';
import { BillingCoreModule } from './billing';
import { ExportWorkerModule } from './export';
import { MailWorkerModule } from './mail';
import { StorageModule } from './storage';
import { PrismaModule } from './shared/prisma';

/**
 * Worker process (docs 07, section 1.3): runs the BullMQ processors only, no HTTP port. Same image as the API,
 * started with `node dist/worker.js` (docker compose service `worker`). Scale it independently of the API.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv, load: [configuration] }),
    CommonModule,
    EventEmitterModule.forRoot(),
    PrismaModule,
    StorageModule,
    queueRootModule('worker'),
    BillingCoreModule, // refunds the export credit or the xu of a failed job (docs/16 section 5.3, docs/19)
    ExportWorkerModule,
    MailWorkerModule,
    AiImageWorkerModule,
  ],
})
export class WorkerModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: createAppLogger(),
  });
  app.enableShutdownHooks(); // finishes the running jobs on SIGTERM
  new Logger('Worker').log('WrapFit worker started: queues "export", "mail", "ai-image"');
}

if (require.main === module) bootstrap();
