# Render Auto-Deploy Fix Guide

## Problem: Render Not Deploying Automatically

If Render is not automatically deploying when you push to GitHub, follow these steps:

## Step 1: Check Auto-Deploy Settings

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click on your service**: `gemini-ludo-game` (or whatever you named it)
3. **Go to Settings** → **Build & Deploy**
4. **Check "Auto-Deploy"**:
   - Should be set to **"Yes"**
   - If it's set to "No", change it to "Yes" and save

## Step 2: Verify Repository Connection

1. **In Settings** → **Repository**:
   - **Repository**: Should be `iheykal/studio`
   - **Branch**: Should be `main`
   - **Root Directory**: Should be `.` (empty or root)

2. **If repository is not connected**:
   - Click **"Connect Repository"**
   - Select `iheykal/studio`
   - Select `main` branch
   - Save

## Step 3: Check Webhook Status

1. **Go to Settings** → **Repository**
2. **Look for "Webhook" section**
3. **If webhook is missing or broken**:
   - Render should automatically create a webhook
   - If it's not working, you may need to:
     - Disconnect and reconnect the repository
     - Or manually add webhook in GitHub (not recommended)

## Step 4: Manual Deployment (Quick Fix)

If auto-deploy is not working, you can manually trigger a deployment:

1. **Go to your service** in Render Dashboard
2. **Click "Manual Deploy"** button (top right)
3. **Select "Deploy latest commit"**
4. **Wait for deployment to complete**

## Step 5: Verify Latest Commits

Make sure your latest commits are pushed to GitHub:

```bash
# Check current status
git status

# Check recent commits
git log --oneline -5

# Verify remote
git remote -v
```

Your latest commits should include:
- `5a76f8b` - Fix move countdown cleanup
- `4c14b31` - Fix timer countdown
- `1575b78` - Improve timer fix

## Step 6: Force Reconnect Repository (If Needed)

If nothing else works:

1. **In Render Dashboard** → Your Service → **Settings**
2. **Scroll to "Repository" section**
3. **Click "Disconnect"** (if connected)
4. **Click "Connect Repository"** again
5. **Select**: `iheykal/studio`
6. **Select Branch**: `main`
7. **Root Directory**: Leave empty (`.`)
8. **Save**

This will trigger a new deployment and recreate the webhook.

## Step 7: Check Render Logs

1. **Go to your service** → **Logs** tab
2. **Look for deployment events**
3. **Check for any errors** in the build process

## Common Issues

### Issue 1: Webhook Not Working
**Solution**: Disconnect and reconnect the repository in Render

### Issue 2: Wrong Branch
**Solution**: Make sure branch is set to `main` in Render settings

### Issue 3: Auto-Deploy Disabled
**Solution**: Enable "Auto-Deploy" in Build & Deploy settings

### Issue 4: Repository Not Connected
**Solution**: Connect the repository in Settings → Repository

## Quick Manual Deploy Command

If you need to manually trigger a deployment right now:

1. Go to: https://dashboard.render.com
2. Click on your service
3. Click **"Manual Deploy"** → **"Deploy latest commit"**

## Verify Deployment

After deployment:

1. **Check the "Events" tab** in Render
2. **Look for**: "Deploy succeeded" or "Build succeeded"
3. **Check the deployed URL** to see if changes are live
4. **Open browser console** to see timer debug logs

## Next Steps

Once deployment is working:

1. Test the timer countdown in the deployed app
2. Check browser console for debug logs (⏰ emoji logs)
3. Verify the countdown displays correctly


