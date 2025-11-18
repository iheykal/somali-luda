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

# Copy server files
COPY server ./server

# Install server dependencies
WORKDIR /app/server
RUN npm ci --only=production
WORKDIR /app

# Set environment
ENV NODE_ENV=production
EXPOSE 3001

# Start the server
CMD ["npm", "run", "start:server"]
