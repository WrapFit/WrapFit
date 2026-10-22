#!/bin/sh
set -e

# Same image, two processes: `docker-entrypoint.sh worker` starts the BullMQ export worker (no migrations, no HTTP).
if [ "$1" = "worker" ]; then
  echo "[WrapFit Docker] Starting WrapFit export worker..."
  exec node dist/worker.js
fi

echo "[WrapFit Docker] Applying database migrations..."
npx prisma migrate deploy

echo "[WrapFit Docker] Seeding box templates (idempotent)..."
npx prisma db seed

# RUN_WORKER=true: the worker runs in this container too, for hosts with a single free service (Render free has no
# background worker). Restarted when it stops; the two heaps share the memory of the container (512 MB on Render).
if [ "$RUN_WORKER" = "true" ]; then
  echo "[WrapFit Docker] Starting WrapFit export worker in the same container..."
  (
    while true; do
      node --max-old-space-size="${WORKER_MAX_OLD_SPACE_MB:-160}" dist/worker.js || true
      echo "[WrapFit Docker] Worker stopped, restarting in 5 s..."
      sleep 5
    done
  ) &
  echo "[WrapFit Docker] Starting WrapFit Backend (NestJS) on port ${PORT:-8080}..."
  exec node --max-old-space-size="${API_MAX_OLD_SPACE_MB:-256}" dist/app.js
fi

echo "[WrapFit Docker] Starting WrapFit Backend (NestJS) on port ${PORT:-8080}..."
exec node dist/app.js
