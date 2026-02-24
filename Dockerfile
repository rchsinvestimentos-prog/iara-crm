# ============================================
# Dockerfile — Painel SaaS IARA
# Multi-stage build para Next.js standalone
# Deploy: EasyPanel (Hetzner)
# ============================================

# --- Stage 1: Dependencies ---
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# --- Stage 2: Builder ---
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma 5: DATABASE_URL como build arg
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# Gerar Prisma Client
RUN npx prisma generate

# Build Next.js (standalone)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Stage 3: Runner (produção) ---
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Criar user não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar arquivos necessários do build
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copiar Prisma (schema + engine)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
