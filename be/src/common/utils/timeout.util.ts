/**
 * Rejects when `promise` has not settled within `ms`. BullMQ waits for Redis to be ready before running a command and
 * keeps waiting while Redis is down, so a request that queues a job must bound that wait itself.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label = 'operation'): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms);
    timer.unref();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** How long a request waits to queue a job before treating the queue as unavailable. */
export const QUEUE_ADD_TIMEOUT_MS = 3000;
