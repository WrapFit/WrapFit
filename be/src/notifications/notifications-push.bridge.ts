import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { EventsGateway } from '../events/events.gateway';
import { REDIS } from '../shared/redis';
import { NOTIFICATIONS_CHANGED, NOTIFICATIONS_CHANNEL } from './notifications.constants';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * API process only: listens on the Redis channel every process publishes to when it stores a notification (the worker
 * for exports, any API instance for remixes) and tells the recipient's open browsers through the WebSocket gateway.
 * Each API instance emits to its own sockets, so this also works with several instances (no Socket.IO adapter).
 *
 * Fails soft: while Redis is down nothing is pushed and the frontend learns at its next poll of the unread count. The
 * subscriber connection queues its SUBSCRIBE until Redis answers and subscribes again after a reconnection.
 */
@Injectable()
export class NotificationsPushBridge implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsPushBridge.name);
  private subscriber?: Redis;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly gateway: EventsGateway,
  ) {}

  onModuleInit(): void {
    // A subscribed connection cannot run other commands: a dedicated one, unlike the shared fail-fast client.
    const subscriber = this.redis.duplicate({ enableOfflineQueue: true, maxRetriesPerRequest: null });
    let down = false;
    subscriber.on('error', (error: Error) => {
      if (!down) this.logger.warn(`Notification push unavailable (Redis): ${error.message}`);
      down = true;
    });
    subscriber.on('ready', () => (down = false));
    subscriber.on('message', (channel: string, userId: string) => this.deliver(channel, userId));
    subscriber.subscribe(NOTIFICATIONS_CHANNEL).catch((error: Error) => {
      this.logger.warn(`Could not subscribe to ${NOTIFICATIONS_CHANNEL}: ${error.message}`);
    });
    this.subscriber = subscriber;
  }

  async onModuleDestroy(): Promise<void> {
    const subscriber = this.subscriber;
    if (subscriber) await subscriber.quit().catch(() => subscriber.disconnect());
  }

  deliver(channel: string, userId: string): void {
    if (channel !== NOTIFICATIONS_CHANNEL || !UUID.test(userId)) return;
    try {
      this.gateway.emitToUser(userId, NOTIFICATIONS_CHANGED, {});
    } catch (error) {
      this.logger.warn(`Notification push failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
