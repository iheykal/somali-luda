# Verify Build Script (PowerShell)
# This script verifies that all necessary files exist before deployment

Write-Host "Verifying project structure for deployment..." -ForegroundColor Cyan
Write-Host ""

$allChecksPassed = $true

# Check critical directories
$directories = @("services", "components", "lib", "hooks", "context", "data", "public", "api", "server")

foreach ($dir in $directories) {
    if (Test-Path $dir -PathType Container) {
        Write-Host "[OK] $dir/ directory exists" -ForegroundColor Green
    } else {
        Write-Host "[MISSING] $dir/ directory" -ForegroundColor Red
        $allChecksPassed = $false
    }
}

Write-Host ""
Write-Host "Checking services directory files..." -ForegroundColor Cyan

$required_services = @(
    "services\audioService.ts",
    "services\geminiService.ts",
    "services\socketService.ts",
    "services\adminAPI.ts",
    "services\authAPI.ts",
    "services\walletAPI.ts"
)

foreach ($file in $required_services) {
    if (Test-Path $file) {
        Write-Host "[OK] $file exists" -ForegroundColor Green
    } else {
        Write-Host "[MISSING] $file" -ForegroundColor Red
        $allChecksPassed = $false
    }
}

Write-Host ""
Write-Host "Checking root files..." -ForegroundColor Cyan

$required_files = @(
    "index.tsx",
    "App.tsx",
    "package.json",
    "Dockerfile",
    "vite.config.ts",
    "tsconfig.json"
)

foreach ($file in $required_files) {
    if (Test-Path $file) {
        Write-Host "[OK] $file exists" -ForegroundColor Green
    } else {
        Write-Host "[MISSING] $file" -ForegroundColor Red
        $allChecksPassed = $false
    }
}

Write-Host ""
Write-Host "Verifying git tracking..." -ForegroundColor Cyan

try {
    $gitStatus = git rev-parse --is-inside-work-tree 2>$null
    if ($gitStatus -eq "true") {
        Write-Host "Git repository initialized" -ForegroundColor Green
        
        $tracked_services = (git ls-files services/).Count
        Write-Host "Services tracked by git: $tracked_services files" -ForegroundColor Cyan
        
        if ($tracked_services -lt 6) {
            Write-Host "Warning: Expected 6 service files, found $tracked_services" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "Not a git repository - initialize with git init" -ForegroundColor Yellow
}

Write-Host ""
if ($allChecksPassed) {
    Write-Host "All verification checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Run npm install to install dependencies"
    Write-Host "2. Run npm run build to test the build locally"
    Write-Host "3. Push to GitHub: git push -u origin main"
    Write-Host "4. Deploy on Render"
} else {
    Write-Host "Some verification checks failed!" -ForegroundColor Red
    Write-Host "Please fix the issues above before deploying." -ForegroundColor Yellow
    exit 1
}

