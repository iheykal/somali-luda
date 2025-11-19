# How to Stop Vercel Auto-Deploy and Use Render Only

## Problem
Vercel is automatically deploying your repository instead of (or in addition to) Render.

## Solution Options

### Option 1: Disable Vercel in Dashboard (Recommended)
1. Go to **Vercel Dashboard**: https://vercel.com/dashboard
2. Find your project: **"studio"** or **"efficient-playfulness"**
3. Go to **Settings** → **Git**
4. **Disconnect the repository** or **Disable Auto-Deploy**
5. This will stop Vercel from deploying automatically

### Option 2: Remove vercel.json (If you don't need Vercel)
If you're only using Render and don't need Vercel at all:
- Remove or rename `vercel.json` file
- This will prevent Vercel from detecting the project

### Option 3: Keep Both (Frontend on Vercel, Backend on Render)
If you want to use Vercel for frontend and Render for backend:
- Keep `vercel.json` for Vercel frontend deployment
- Use Render for backend (server) deployment
- Configure Vercel to only build frontend
- Configure Render to only build backend

## Recommended: Disable Vercel Auto-Deploy

Since you want Render to deploy, follow Option 1:

1. **Go to Vercel Dashboard**
2. **Select your project**
3. **Settings** → **Git**
4. **Click "Disconnect"** or toggle off **"Auto-Deploy"**
5. **Save changes**

This will stop Vercel from deploying automatically, and Render will handle deployments.

## Verify Render is Connected

After disabling Vercel:

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Check your service**: `gemini-ludo-game`
3. **Settings** → **Repository**:
   - Should be connected to `iheykal/studio`
   - Branch: `main`
4. **Settings** → **Build & Deploy**:
   - Auto-Deploy: Should be **"Yes"**

## Test Deployment

After disabling Vercel:

1. **Make a small change** (or push existing commits)
2. **Check Render Dashboard** - should see new deployment
3. **Vercel should NOT deploy** anymore



