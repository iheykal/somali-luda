# Railway deployment - Simple single-stage build
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy all necessary files for the build
COPY index.html ./
COPY index.tsx ./
COPY App.tsx ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY constants.ts ./
COPY types.ts ./

# Copy directories
COPY components ./components
COPY services ./services
COPY lib ./lib
COPY hooks ./hooks
COPY context ./context
COPY data ./data
COPY public ./public
COPY api ./api

# List services directory to verify it's copied
RUN echo "Checking services directory..." && ls -la services/

# Build the frontend
RUN npm run build

# Verify dist folder was created  
RUN echo "========================================" && \
    echo "📦 Verifying build output..." && \
    echo "========================================" && \
    echo "Current directory: $(pwd)" && \
    echo "Contents of /app:" && \
    ls -la /app && \
    echo "----------------------------------------" && \
    if [ -d "/app/dist" ]; then \
      echo "✅ dist folder created successfully at /app/dist"; \
      echo "Contents of /app/dist:" && \
      ls -la /app/dist/; \
      echo "----------------------------------------" && \
      if [ -d "/app/dist/assets" ]; then \
        echo "✅ assets folder exists"; \
        echo "First 10 files in /app/dist/assets:" && \
        ls -la /app/dist/assets/ | head -15; \
      else \
        echo "❌ assets folder missing!"; \
        exit 1; \
      fi; \
    else \
      echo "❌ dist folder not created!"; \
      echo "Expected at: /app/dist"; \
      exit 1; \
    fi && \
    echo "========================================"

# Copy server files
COPY server ./server

# Install server dependencies
WORKDIR /app/server
RUN npm ci --only=production
WORKDIR /app

# Set environment
ENV NODE_ENV=production
EXPOSE 3001

# Ensure we're at root for starting (dist at /app/dist, server at /app/server)
WORKDIR /app

# Start the server - it will look for dist at /app/dist
CMD ["npm", "run", "start:server"]
