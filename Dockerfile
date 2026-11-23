# =====================================================================
# Stage 1: Compilar el Frontend (React + Vite)
# =====================================================================
FROM node:22-bookworm-slim AS client-builder
WORKDIR /build/client

COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# =====================================================================
# Stage 2: Instalar dependencias de producción del Backend (SQLite, Express)
# =====================================================================
FROM node:22-bookworm-slim AS server-deps
WORKDIR /build/server

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# =====================================================================
# Stage 3: Imagen final de Producción (Mínima y sin privilegios root)
# =====================================================================
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3001 \
    HOST=0.0.0.0 \
    DB_PATH=/app/data/calendar.db \
    UPLOAD_DIR=/app/data/uploads/icons

# Crear carpeta persistente de datos con permisos para usuario no-root
RUN mkdir -p /app/data/uploads/icons && chown -R node:node /app && chmod -R 755 /app

# Copiar artefactos compilados desde las etapas anteriores
COPY --chown=node:node --from=server-deps /build/server/node_modules ./server/node_modules
COPY --chown=node:node server/package.json ./server/package.json
COPY --chown=node:node server/src ./server/src
COPY --chown=node:node --from=client-builder /build/client/dist ./client/dist

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server/src/index.js"]
