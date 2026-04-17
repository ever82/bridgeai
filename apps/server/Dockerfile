# syntax=docker/dockerfile:1

# BridgeAI Server Dockerfile
# Multi-stage build for Express + TypeScript backend

FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy workspace configuration and package files first (for layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server

# Build shared workspace dependency
RUN pnpm --filter @bridgeai/shared build

# Generate Prisma client and build server
RUN pnpm --filter @bridgeai/server db:generate
RUN pnpm --filter @bridgeai/server build

# Remove devDependencies to reduce image size
RUN pnpm prune --prod

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

WORKDIR /app/apps/server

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
