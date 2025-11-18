# Multi-stage build for Railway deployment
FROM node:22-alpine AS base

# Install dependencies for the root package
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Build the frontend
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Install server dependencies
FROM base AS server-deps
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --only=production

# Production image
FROM base AS runner
WORKDIR /app

# Copy built frontend
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Copy server and its dependencies
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server/ ./server/

# Set environment
ENV NODE_ENV=production
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/healthz || exit 1

# Start the server
CMD ["npm", "run", "start:server"]
