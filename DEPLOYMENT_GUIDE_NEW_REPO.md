# Deployment Guide for New Repository

## Summary of Fixes

The build error `Could not resolve "./services/audioService"` was caused by Docker build context issues. 

### Changes Made:

1. **Created `.dockerignore`** - Ensures only necessary files are copied to Docker
2. **Updated `Dockerfile`** - Made file copying explicit instead of using wildcards
3. **Added verification step** - Lists services directory contents during build

## Steps to Deploy to New Repository

### 1. Push to Your New GitHub Repository

```bash
# Initialize git if not already done
git init

# Add the new remote
git remote add origin https://github.com/iheykal/somali-luda.git

# Add all files
git add .

# Commit the changes
git commit -m "Fix Docker build: explicit file copying for services directory"

# Push to main branch
git push -u origin main
```

### 2. Deploy to Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub account and select `iheykal/somali-luda`
4. Configure the service:
   - **Name**: `ludo-252` (or your preferred name)
   - **Environment**: Docker
   - **Region**: Choose closest to your users
   - **Branch**: main
   - **Docker Command**: Leave empty (uses CMD from Dockerfile)

5. Add Environment Variables:
   ```
   NODE_ENV=production
   GEMINI_API_KEY=your_gemini_api_key_here
   VITE_API_URL=/api
   VITE_SOCKET_URL=https://ludo-252.onrender.com
   VITE_USE_REAL_API=true
   JWT_SECRET=your_jwt_secret_here
   MONGODB_URI=your_mongodb_connection_string
   ```

6. Click "Create Web Service"

### 3. Verify Deployment

After deployment completes:

1. Check the build logs for "Checking services directory..." - should list all .ts files
2. Visit your deployed URL
3. Test the game functionality

## Troubleshooting

### If Build Still Fails

1. Check Render logs for specific error messages
2. Verify all environment variables are set correctly
3. Ensure MongoDB connection string is valid

### If Services Directory Still Not Found

Run this locally to verify files are tracked by git:
```bash
git ls-files services/
```

Should output:
```
services/adminAPI.ts
services/audioService.ts
services/authAPI.ts
services/geminiService.ts
services/socketService.ts
services/walletAPI.ts
```

## Key Differences from Old Repo

- Explicit file copying in Dockerfile (more reliable)
- Added `.dockerignore` for cleaner builds
- Added verification step during Docker build
- Server files copied separately to ensure proper structure

## Support

If issues persist, check:
1. GitHub repository has all files pushed
2. Render is connected to correct repository
3. Environment variables are set in Render dashboard

