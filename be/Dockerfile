# ===================================================
# WrapFit Backend (NestJS) — build context is the REPO ROOT:
#   docker build -f be/Dockerfile .
# ===================================================
FROM node:24-alpine AS base
# Prisma engines need OpenSSL on Alpine
RUN apk add --no-cache openssl
WORKDIR /app

# ===================================================
# Stage 1: Build shared package + backend
# ===================================================
FROM base AS builder
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Layer 1: workspace descriptors only, for dependency caching
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY be/package.json ./be/
COPY fe/package.json ./fe/

# Only the backend and shared workspaces are needed (skips Next.js / Three.js)
RUN npm ci --workspace=shared --workspace=be && mkdir -p be/node_modules

# Layer 2: shared domain package (@wrapfit/shared)
COPY shared ./shared
RUN npm --workspace=shared run build

# Layer 3: backend source, Prisma client, compile
COPY be ./be
RUN npm --workspace=be run db:generate && npm --workspace=be run build

# ===================================================
# Stage 2: Runtime
# ===================================================
FROM base AS runner
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=384"
ENV PORT=8080

COPY --chown=node:node package.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/shared/package.json ./shared/package.json
COPY --from=builder --chown=node:node /app/shared/dist ./shared/dist
COPY --from=builder --chown=node:node /app/be/node_modules ./be/node_modules
COPY --from=builder --chown=node:node /app/be/package.json /app/be/tsconfig.json ./be/
COPY --from=builder --chown=node:node /app/be/dist ./be/dist
COPY --from=builder --chown=node:node /app/be/prisma ./be/prisma
COPY --chown=node:node be/docker-entrypoint.sh ./be/docker-entrypoint.sh

# Normalize line endings (repo may be checked out on Windows) and make the entrypoint executable
RUN sed -i 's/\r$//' ./be/docker-entrypoint.sh && chmod +x ./be/docker-entrypoint.sh

USER node
WORKDIR /app/be
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider "http://127.0.0.1:${PORT}/api/health" || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
