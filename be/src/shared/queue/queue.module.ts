import { BullModule } from '@nestjs/bullmq';
import { DynamicModule } from '@nestjs/common';
import { ConfigService, redisConnection } from '../../common';

/**
 * BullMQ root connection (Redis from REDIS_URL).
 * - `producer` (API): commands fail fast once connected, but BullMQ still waits for the first connection while Redis
 *   is down, so call sites bound `queue.add` with `withTimeout` (common/utils) to answer instead of hanging.
 * - `worker`: keeps retrying until Redis is back.
 */
export function queueRootModule(role: 'producer' | 'worker'): DynamicModule {
  return BullModule.forRootAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      connection: {
        ...redisConnection(config.get('redis.url')),
        ...(role === 'producer' ? { enableOfflineQueue: false, maxRetriesPerRequest: 1 } : {}),
      },
    }),
  });
}
