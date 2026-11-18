/**
 * Thrown by `withTimeout`. Only the wait ended: the operation goes on and may still succeed (a `queue.add` whose job
 * Redis already has), so a caller must not treat it as a refusal.
 */
export class TimeoutError extends Error {
  override name = 'TimeoutError';
}

/**
 * Rejects with a TimeoutError when `promise` has not settled within `ms`. BullMQ waits for Redis to be ready before running a command and
 * keeps waiting while Redis is down, so a request that queues a job must bound that wait itself.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label = 'operation'): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(`${label} timed out after ${ms} ms`)), ms);
    timer.unref();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** How long a request waits to queue a job before treating the queue as unavailable. */
export const QUEUE_ADD_TIMEOUT_MS = 3000;
