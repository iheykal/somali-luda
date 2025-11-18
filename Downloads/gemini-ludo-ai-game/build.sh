#!/bin/bash

# Build script for Render deployment
# This script handles the complete build process for the combined frontend + backend deployment

set -e  # Exit on any error

echo "🚀 Starting build process..."

echo "📦 Installing root dependencies..."
npm install

echo "🔨 Building frontend..."
npm run build

echo "📦 Installing server dependencies..."
cd server
npm install

echo "✅ Build completed successfully!"
echo "📁 Frontend built to: dist/"
echo "📁 Server dependencies installed in: server/"

