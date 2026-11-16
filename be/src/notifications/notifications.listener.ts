import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EXPORT_COMPLETED, ExportCompletedEvent, PROJECT_FORKED, ProjectForkedEvent } from '../common';
import { NotificationsService } from './notifications.service';

/**
 * Turns internal events into stored notifications, in the process that emits them: PROJECT_FORKED in the API,
 * EXPORT_COMPLETED in the worker. A failure is logged and never reaches the request or the job that emitted the event
 * (the remix and the export have already been committed).
 */
@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent(PROJECT_FORKED, { async: true })
  async onProjectForked(event: ProjectForkedEvent): Promise<void> {
    await this.notifications.notifyRemix(event).catch((error) => this.fail('remix', event.sourceProjectId, error));
  }

  @OnEvent(EXPORT_COMPLETED, { async: true })
  async onExportCompleted(event: ExportCompletedEvent): Promise<void> {
    await this.notifications.notifyExportCompleted(event).catch((error) => this.fail('export', event.exportJobId, error));
  }

  private fail(kind: string, id: string, error: unknown): void {
    this.logger.error(`Notification (${kind} ${id}) not stored`, error instanceof Error ? error.stack : String(error));
  }
}
