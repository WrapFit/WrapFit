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
