# =============================================================================
# SIDHKOFED CMS — Admin CMS  (Next.js 14, multi-stage production build)
# =============================================================================
# Requires next.config.mjs `output: 'standalone'` (already set).
# Stage 1 (deps)    — install ALL deps for the Next.js build
# Stage 2 (builder) — next build → .next/standalone
# Stage 3 (runner)  — minimal runtime; standalone + static assets only
# =============================================================================

# ── Stage 1: dependencies ─────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ── Stage 2: Next.js build ────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Required build-time env vars (values replaced by the reverse proxy at runtime).
# Set BACKEND_ORIGIN so the rewrite compiles; it is overridden via the compose
# BACKEND_ORIGIN env in the container at runtime.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ── Stage 3: production runtime ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

LABEL org.opencontainers.image.title="sidhkofed-cms-admin" \
      org.opencontainers.image.description="SIDHKOFED CMS Admin Frontend" \
      org.opencontainers.image.vendor="SIDHKOFED"

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache curl && \
    addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Next.js standalone bundle + static/public assets.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

CMD ["node", "server.js"]
