import { Module } from '@nestjs/common';
import { EventsModule } from '../events';
import { NotificationsPushBridge } from './notifications-push.bridge';
import { NotificationsController } from './notifications.controller';
import { NotificationsListener } from './notifications.listener';
import { NotificationsService } from './notifications.service';

/**
 * Stores notifications from internal events. Imported by both processes: the API (remixes) and the worker (exports),
 * since an event never leaves the process that emits it. Needs the global PrismaModule and RedisModule.
 */
@Module({
  providers: [NotificationsService, NotificationsListener],
  exports: [NotificationsService],
})
export class NotificationsCoreModule {}

/** API side: the inbox endpoints and the live push to open browsers. Imported by AppModule only. */
@Module({
  imports: [NotificationsCoreModule, EventsModule],
  controllers: [NotificationsController],
  providers: [NotificationsPushBridge],
})
export class NotificationsModule {}
