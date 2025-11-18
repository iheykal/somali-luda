# 🚨 URGENT: Render Build Fix

## Problem
Render build is failing because:
1. **Still building from `master` branch** (not `main`)
2. **Using wrong build command**: `npm install && npm run build && cd server && npm install`
3. **Missing dev dependencies**: `vite: not found` error

## Root Cause
Render is NOT using `render.yaml` - it's using manual settings from the dashboard.

## Fix: Update Render Dashboard Settings

### Step 1: Change Branch to `main`
1. Go to: https://dashboard.render.com
2. Click on: `gemini-ludo-game` service
3. **Settings** → **Repository**
4. **Branch**: Change from `master` to **`main`**
5. **Save**

### Step 2: Fix Build Command
1. **Settings** → **Build & Deploy**
2. **Build Command**: Change to:
   ```
   npm run render:build
   ```
   (NOT `npm install && npm run build && cd server && npm install`)
3. **Start Command**: Should be:
   ```
   npm run render:start
   ```
4. **Save**

### Step 3: Verify Root Directory
1. **Settings** → **Build & Deploy**
2. **Root Directory**: Should be empty (`.` or blank)
3. **Save**

### Step 4: Trigger New Deployment
1. Click **"Manual Deploy"**
2. Select **"Deploy latest commit"**
3. Wait for build to complete

## Why This Happened

The `render.yaml` file specifies `branch: main`, but Render is using **manual dashboard settings** which override the YAML file. You must update the dashboard settings manually.

## Expected Build Output

After fixing, you should see:
- ✅ `npm run render:build` executing
- ✅ `npm install --production=false` (installs dev dependencies)
- ✅ `vite build` completing successfully
- ✅ `✓ built in X.XXs` message
- ✅ Server starting successfully

## Current Build Command (WRONG)
```
npm install && npm run build && cd server && npm install
```
This fails because:
- `npm install` only installs production dependencies
- `vite` is a dev dependency, so it's not installed
- Results in: `vite: not found`

## Correct Build Command
```
npm run render:build
```
Which runs:
```
npm install --production=false && npm run build && cd server && npm install
```
This:
- Installs ALL dependencies (including dev dependencies like vite)
- Builds the frontend
- Installs server dependencies

## Summary

**Action Required:**
1. ⚠️ Change branch from `master` to `main` in Render dashboard
2. ⚠️ Change build command to `npm run render:build`
3. ⚠️ Trigger manual deployment

**Without these changes, Render will keep building from the broken `master` branch!**


