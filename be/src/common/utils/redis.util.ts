import type { ConnectionOptions } from 'bullmq';

/** `redis://[user:password@]host:port[/db]` (or `rediss://` for TLS) -> BullMQ / ioredis connection options. */
export function redisConnection(url: string): ConnectionOptions {
  const parsed = new URL(url);
  const host = parsed.hostname === 'localhost' ? '127.0.0.1' : parsed.hostname;
  return {
    host,
    port: Number(parsed.port || 6379),
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) : undefined,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
    family: 4,
  };
}

/**
 * Whether a rejected Redis command was never written to the server. ioredis refuses a command at once while the
 * connection is not writable and the offline queue is off, as on the producer connection of BullMQ (queue.module.ts).
 * Any other error (`Connection is closed.`, MaxRetriesPerRequestError, a timeout) may come after Redis ran it.
 */
export function neverSentToRedis(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith("Stream isn't writeable and enableOfflineQueue options is false");
}
