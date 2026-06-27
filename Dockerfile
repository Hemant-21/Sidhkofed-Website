# =============================================================================
# SIDHKOFED CMS — Backend API  (multi-stage production build)
# =============================================================================
# Stage 1 (deps)    — install ALL deps (dev + prod) for the TypeScript build
# Stage 2 (builder) — compile TypeScript → dist/
# Stage 3 (runner)  — minimal runtime image with production deps only
# =============================================================================

# ── Stage 1: install all dependencies ────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install OS packages needed for native addons (bcrypt, etc.)
RUN apk add --no-cache libc6-compat python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ── Stage 2: TypeScript compile ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Bring in the installed node_modules from the deps stage.
COPY --from=deps /app/node_modules ./node_modules

# Copy the full source tree (filtered by .dockerignore at the root).
COPY . .

# Generate Prisma client before compiling (the generated client is required
# by the import statements at build time).
RUN npx prisma generate

# Compile TypeScript → CommonJS in dist/; resolve path aliases (tsc-alias).
RUN npm run build

# ── Stage 3: production runtime ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Metadata
LABEL org.opencontainers.image.title="sidhkofed-cms-api" \
      org.opencontainers.image.description="SIDHKOFED CMS Backend API" \
      org.opencontainers.image.vendor="SIDHKOFED"

# Runtime OS packages (none required for a pure-JS Node app; add only what is
# strictly needed — e.g. curl for the healthcheck probe).
RUN apk add --no-cache curl && \
    addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nodeuser && \
    mkdir -p /app/storage && \
    chown -R nodeuser:nodejs /app

# Install ONLY production dependencies.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy compiled output from the builder stage.
COPY --from=builder /app/dist ./dist

# Copy Prisma schema + the generated client (already generated in builder stage).
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

# Run as non-root.
USER nodeuser

EXPOSE 4000

# Liveness probe via the /live endpoint (lightweight — no DB calls).
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:4000/live || exit 1

# Start the compiled server.
CMD ["node", "dist/server.js"]
