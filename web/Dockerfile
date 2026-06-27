# =============================================================================
# SIDHKOFED CMS — Public Website  (Next.js 14, multi-stage production build)
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

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ── Stage 3: production runtime ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

LABEL org.opencontainers.image.title="sidhkofed-cms-web" \
      org.opencontainers.image.description="SIDHKOFED Public Website" \
      org.opencontainers.image.vendor="SIDHKOFED"

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3002
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache curl && \
    addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Next.js standalone bundle + static/public assets.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3002/ || exit 1

CMD ["node", "server.js"]
