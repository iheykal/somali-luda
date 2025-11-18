#!/bin/bash

# Verify Build Script
# This script verifies that all necessary files exist before deployment

echo "🔍 Verifying project structure for deployment..."
echo ""

# Check critical directories
directories=("services" "components" "lib" "hooks" "context" "data" "public" "api" "server")

for dir in "${directories[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir/ directory exists"
    else
        echo "❌ $dir/ directory MISSING"
        exit 1
    fi
done

echo ""
echo "🔍 Checking services directory files..."

required_services=(
    "services/audioService.ts"
    "services/geminiService.ts"
    "services/socketService.ts"
    "services/adminAPI.ts"
    "services/authAPI.ts"
    "services/walletAPI.ts"
)

for file in "${required_services[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file MISSING"
        exit 1
    fi
done

echo ""
echo "🔍 Checking root files..."

required_files=(
    "index.tsx"
    "App.tsx"
    "package.json"
    "Dockerfile"
    "vite.config.ts"
    "tsconfig.json"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file MISSING"
        exit 1
    fi
done

echo ""
echo "🔍 Verifying git tracking..."

if git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "✅ Git repository initialized"
    
    tracked_services=$(git ls-files services/ | wc -l)
    echo "📊 Services tracked by git: $tracked_services files"
    
    if [ "$tracked_services" -lt 6 ]; then
        echo "⚠️  Warning: Expected 6 service files, found $tracked_services"
    fi
else
    echo "⚠️  Not a git repository - initialize with 'git init'"
fi

echo ""
echo "✅ All verification checks passed!"
echo ""
echo "Next steps:"
echo "1. Run 'npm install' to install dependencies"
echo "2. Run 'npm run build' to test the build locally"
echo "3. Push to GitHub: git push -u origin main"
echo "4. Deploy on Render"

