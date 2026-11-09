# Multi-stage production build for RTB Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY tsconfig.json ./
COPY src ./src/

# Generate prisma client and compile typescript
RUN npx prisma generate
RUN npm run build

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install openssl for Prisma engine
RUN apk add --no-cache openssl curl

COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled code and prisma engines
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

CMD ["node", "dist/server.js"]
