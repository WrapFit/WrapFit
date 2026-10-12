# ===================================================
# Stage 1: Build Stage (Monorepo shared & Next.js frontend)
# ===================================================
FROM node:20-alpine AS builder
WORKDIR /app

# Cap Node memory to prevent SWC/Webpack RAM spikes during build
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Layer 1: Copy workspace descriptors for caching
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY be/package.json ./be/
COPY fe/package.json ./fe/

# Install dependencies for all workspaces
RUN npm install

# Layer 2: Copy and build shared domain package
COPY shared ./shared
RUN npm run build:shared

# Layer 3: Copy frontend source and build Next.js
COPY fe ./fe

# In Next.js, NEXT_PUBLIC_* variables are inlined at build time
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_APP_NAME="WrapFit Studio"
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
# Target of the /api/* rewrite in next.config.mjs: the standalone build fixes rewrites at build time
ARG BACKEND_INTERNAL_URL=http://backend:8080

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV BACKEND_INTERNAL_URL=$BACKEND_INTERNAL_URL

# Build standalone Next.js bundle
RUN npm --workspace=fe run build

# ===================================================
# Stage 2: Ultra-light Production Runtime Stage (Standalone)
# ===================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_OPTIONS="--max-old-space-size=512"

# Security: non-root user
RUN addgroup -S wrapfit && adduser -S wrapfit -G wrapfit

# Copy standalone output: traces only needed files (~80MB RAM at runtime vs 600MB+)
COPY --from=builder /app/fe/.next/standalone ./
COPY --from=builder /app/fe/.next/static ./fe/.next/static
COPY --from=builder /app/fe/package.json ./fe/package.json

USER wrapfit:wrapfit

EXPOSE 3000

# Standalone Next.js server starts in < 1 second using minimal RAM
CMD ["node", "fe/server.js"]
