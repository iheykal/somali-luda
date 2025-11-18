# Railway deployment - Simple single-stage build
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Install server dependencies
WORKDIR /app/server
COPY package.json package-lock.json ./
RUN npm ci --only=production
WORKDIR /app

# Set environment
ENV NODE_ENV=production
EXPOSE 3001

# Start the server
CMD ["npm", "run", "start:server"]
