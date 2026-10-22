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

echo "[WrapFit Docker] Starting WrapFit Backend (NestJS) on port ${PORT:-8080}..."
exec node dist/app.js
