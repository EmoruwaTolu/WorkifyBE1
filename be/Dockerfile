# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# Native build tools for bcrypt/sharp during build only
RUN apk add --no-cache python3 make g++ libc6-compat

# Install deps
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# Build TS
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Strip dev deps for a slim runtime
RUN npm prune --omit=dev

# ---------- Runtime stage ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache curl libc6-compat

# Copy only what we need
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s CMD curl -fsS http://127.0.0.1:4000/health || exit 1

# Drop privileges
USER node

CMD ["sh", "-lc", "echo RUN_MIGRATIONS && npx prisma migrate deploy && echo START_API && exec node dist/server.js"]