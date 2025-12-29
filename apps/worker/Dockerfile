# syntax=docker/dockerfile:1

# Temporal worker Dockerfile
# Multi-stage build for development and production
# Note: Using slim (Debian) instead of alpine due to Temporal native module glibc requirements

ARG NODE_VERSION=22

# =============================================================================
# Base stage: shared dependencies
# =============================================================================
FROM node:${NODE_VERSION}-slim AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# =============================================================================
# Dependencies stage: install all dependencies
# =============================================================================
FROM base AS deps

# Copy workspace config files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies (including devDependencies for building)
RUN pnpm install --frozen-lockfile

# =============================================================================
# Development stage: hot reload with tsx watch
# =============================================================================
FROM deps AS development

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/worker ./apps/worker
COPY tsconfig.base.json ./

ENV NODE_ENV=development

WORKDIR /app/apps/worker

EXPOSE 8080

# Hot reload via tsx watch
CMD ["pnpm", "dev"]

# =============================================================================
# Builder stage: compile TypeScript
# =============================================================================
FROM deps AS builder

COPY packages/shared ./packages/shared
COPY apps/worker ./apps/worker
COPY tsconfig.base.json ./

WORKDIR /app/apps/worker
RUN pnpm build

# =============================================================================
# Production stage: minimal runtime image
# =============================================================================
FROM base AS production

ENV NODE_ENV=production

# Copy only what's needed for production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/worker/package.json ./apps/worker/

WORKDIR /app/apps/worker

EXPOSE 8080

CMD ["node", "dist/index.js"]
