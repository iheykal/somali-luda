# Render Deployment Guide - Final Configuration

## Overview
This guide ensures your app works correctly on both **localhost** and **Render** with proper CORS and API URL detection.

## Key Differences: Localhost vs Render

### Localhost (Development)
- Frontend: `http://localhost:3000` or `http://192.168.x.x:3000`
- Backend: `http://localhost:3001` or `http://192.168.x.x:3001`
- API URL: Full URL (`http://localhost:3001/api` or `http://192.168.x.x:3001/api`)
- CORS: Allows localhost and network IPs

### Render (Production)
- Frontend & Backend: Same domain (e.g., `https://ludo-252.onrender.com`)
- API URL: Relative URL (`/api`)
- CORS: Allows the Render domain

## How It Works

The code automatically detects the environment:

1. **API URL Detection** (`services/authAPI.ts`, `walletAPI.ts`, `adminAPI.ts`):
   - If `VITE_API_URL` is set to `/api` → Uses relative URL (Render)
   - If on `localhost` or network IP → Uses full URL with port 3001
   - If on production domain → Uses relative URL

2. **CORS Configuration** (`server/server.js`):
   - Development: Allows localhost and network IPs
   - Production: Allows local network IPs (for testing) + configured domains

## Render Configuration

### render.yaml
```yaml
services:
  - type: web
    name: gemini-ludo-game
    env: node
    region: frankfurt
    plan: free
    branch: master
    buildCommand: npm install && npm run build && cd server && npm install
    startCommand: cd server && npm start
    rootDir: .
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        generateValue: true
      - key: CONNECTION_URI
        sync: false  # Set in Render dashboard
      - key: JWT_SECRET
        sync: false  # Set in Render dashboard
      - key: FRONTEND_URL
        sync: false  # Set to: https://your-app.onrender.com
      - key: VITE_API_URL
        value: /api  # Relative URL for Render
      - key: VITE_USE_REAL_API
        value: true
      - key: VITE_SOCKET_URL
        sync: false  # Set to: https://your-app.onrender.com
```

### Environment Variables in Render Dashboard

Set these in Render dashboard (Environment tab):

1. **CONNECTION_URI**
   ```
   mongodb+srv://ludo:ilyaas@ludo.1umgvpn.mongodb.net/ludo?retryWrites=true&w=majority&appName=ludo
   ```

2. **JWT_SECRET**
   ```
   8f9a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7
   ```

3. **FRONTEND_URL**
   ```
   https://your-app-name.onrender.com
   ```
   (Replace `your-app-name` with your actual Render app name)

4. **VITE_SOCKET_URL** (optional, for WebSocket)
   ```
   https://your-app-name.onrender.com
   ```

## Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Fix CORS and API URL detection for Render"
git push origin master
```

### 2. Deploy on Render
- Render will automatically detect `render.yaml`
- It will run the build command
- It will start the server

### 3. Verify Deployment

After deployment, check:

1. **Health Endpoint:**
   ```
   https://your-app.onrender.com/health
   ```
   Should return: `{"status":"ok",...}`

2. **API Endpoint:**
   ```
   https://your-app.onrender.com/api/auth/login
   ```
   Should not return 404

3. **Frontend:**
   ```
   https://your-app.onrender.com
   ```
   Should load the React app

## Code Behavior

### On Localhost
- API calls go to: `http://localhost:3001/api` or `http://192.168.x.x:3001/api`
- CORS allows: `http://localhost:3000` and `http://192.168.x.x:3000`

### On Render
- API calls go to: `/api` (relative, same domain)
- CORS allows: `https://your-app.onrender.com`
- Also allows local network IPs (for testing from localhost)

## Testing

### Test Locally
```bash
# Terminal 1: Backend
cd server
npm start

# Terminal 2: Frontend
npm run dev
```

Visit: `http://localhost:3000` or `http://192.168.x.x:3000`

### Test on Render
Visit: `https://your-app.onrender.com`

## Troubleshooting

### Issue: CORS errors on Render
**Solution:** Make sure `FRONTEND_URL` is set to your Render URL in the dashboard.

### Issue: API calls fail on Render
**Solution:** 
- Check that `VITE_API_URL=/api` is set in `render.yaml`
- Verify the build completed successfully
- Check Render logs for errors

### Issue: Works locally but not on Render
**Solution:**
- Check Render build logs
- Verify all environment variables are set
- Check that `dist/` folder exists after build
- Verify server is serving static files correctly

### Issue: Socket.io not connecting on Render
**Solution:**
- Set `VITE_SOCKET_URL` to your Render URL
- Make sure WebSocket is enabled in Render (it should be by default)

## Current Configuration Status

✅ **API URL Detection:** Works for both localhost and Render
✅ **CORS Configuration:** Allows local network IPs even in production mode
✅ **Static File Serving:** Properly configured for production
✅ **Environment Detection:** Automatically detects localhost vs production

## Important Notes

1. **VITE_* variables** are injected at BUILD TIME, not runtime
   - If you change them, you need to rebuild

2. **NODE_ENV=production** on Render
   - The code still allows local network IPs for testing
   - Production domains are checked via `FRONTEND_URL`

3. **Relative URLs** (`/api`) work on Render because frontend and backend are on the same domain

4. **Full URLs** are used on localhost because frontend (3000) and backend (3001) are on different ports

## Verification Checklist

Before deploying:
- [ ] `render.yaml` is configured correctly
- [ ] Environment variables are set in Render dashboard
- [ ] Code changes are committed and pushed
- [ ] Build command works locally: `npm install && npm run build && cd server && npm install`
- [ ] Start command works locally: `cd server && npm start`

After deployment:
- [ ] Health endpoint works: `/health`
- [ ] Frontend loads: `/`
- [ ] API endpoints work: `/api/auth/login`
- [ ] No CORS errors in browser console
- [ ] Login/Register works
- [ ] WebSocket connects (if using multiplayer)

