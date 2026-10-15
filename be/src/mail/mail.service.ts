import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { currentRequestId, QUEUE_ADD_TIMEOUT_MS, withTimeout } from '../common';
import {
  ACCOUNT_EXISTS_JOB,
  ACCOUNT_EXISTS_WINDOW_MS,
  AccountExistsJobData,
  AUTH_EMAIL_JOB,
  AuthEmailJobData,
  MAIL_JOB_OPTIONS,
  MAIL_QUEUE,
} from './mail.constants';

/** API side: queues emails; the worker process (MailProcessor) sends them. */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(@InjectQueue(MAIL_QUEUE) private readonly queue: Queue<AuthEmailJobData | AccountExistsJobData>) {}

  /**
   * Queues the email of a verify-email / reset-password token. Returns false when the queue is unreachable: the
   * caller decides whether that fails the request (resend) or not (register, forgot password: the user can resend).
   */
  async sendAuthEmail(authTokenId: string): Promise<boolean> {
    try {
      await withTimeout(
        this.queue.add(
          AUTH_EMAIL_JOB,
          { authTokenId, requestId: currentRequestId() },
          { ...MAIL_JOB_OPTIONS, jobId: authTokenId },
        ),
        QUEUE_ADD_TIMEOUT_MS,
        'mail queue',
      );
      return true;
    } catch (error) {
      this.logger.error(
        `mail.enqueue_failed authTokenId=${authTokenId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }

  /**
   * Queues the "someone tried to register with your address" notice. At most one per account and hour: the job id
   * names the hour and stays in Redis that long, so repeated registrations cannot flood the mailbox.
   */
  async sendAccountExistsNotice(userId: string): Promise<boolean> {
    const hour = Math.floor(Date.now() / ACCOUNT_EXISTS_WINDOW_MS);
    try {
      await withTimeout(
        this.queue.add(
          ACCOUNT_EXISTS_JOB,
          { userId, requestId: currentRequestId() },
          {
            ...MAIL_JOB_OPTIONS,
            jobId: `${ACCOUNT_EXISTS_JOB}-${userId}-${hour}`, // BullMQ refuses `:` in custom ids
            removeOnComplete: { age: ACCOUNT_EXISTS_WINDOW_MS / 1000 },
          },
        ),
        QUEUE_ADD_TIMEOUT_MS,
        'mail queue',
      );
      return true;
    } catch (error) {
      this.logger.error(
        `mail.enqueue_failed account-exists userId=${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }
}
