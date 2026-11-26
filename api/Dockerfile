# Ventra API (NestJS 11 + Prisma 6). Applies pending migrations on start.
FROM node:22-bookworm-slim AS build
WORKDIR /app
# whatsapp-web.js pulls puppeteer; the bot is disabled in containers, so skip the Chromium download
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx prisma generate && npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3010 \
    UPLOADS_DIR=./uploads \
    WHATSAPP_ENABLED=false \
    PUPPETEER_SKIP_DOWNLOAD=true
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
RUN mkdir -p uploads
EXPOSE 3010
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
