# Localhost vs Deployment Investigation Report

## Date: 2025-11-18

## Summary
This document investigates why the application behaves differently on localhost compared to the deployed version on Render.

---

## 🔍 Key Differences Identified

### 1. **Environment Variable Handling**

#### Localhost (Development):
```typescript
// vite.config.ts tries to read server/.env
const serverEnv = loadServerEnv();
```
- Reads from `server/.env` file
- Variables available at build time
- Can use both `VITE_` prefixed and non-prefixed variables

#### Deployment (Production):
```yaml
# render.yaml
envVars:
  - key: NODE_ENV
    value: production
  - key: CONNECTION_URI
    sync: false
```
- Variables come from Render dashboard (not from .env files)
- **CRITICAL**: No `VITE_` prefixed variables are defined in render.yaml
- Variables must be set in Render dashboard manually

**Issue**: If `VITE_API_URL` or `VITE_SOCKET_URL` are not set in Render, the frontend falls back to different detection logic.

---

### 2. **API URL Detection Logic**

#### In `services/authAPI.ts`:
```typescript
function getApiUrl(): string {
  // 1. Check environment variable (highest priority)
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
  
  // 2. If not set, use dynamic detection
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isProduction = hostname !== 'localhost' && hostname !== '127.0.0.1';
    
    if (isProduction) {
      return '/api';  // Relative URL for production
    }
    
    return 'http://localhost:3001/api';  // Development
  }
}
```

**Localhost**: Returns `http://localhost:3001/api`
**Deployment**: Returns `/api` (relative URL, assumes backend on same domain)

---

### 3. **Socket URL Detection**

#### In `services/socketService.ts`:
```typescript
private getDefaultSocketUrl(): string {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isProduction = hostname !== 'localhost' && hostname !== '127.0.0.1';
    
    if (isProduction) {
      return window.location.origin;  // Same origin in production
    }
  }
  
  return 'http://localhost:3001';  // Development
}
```

**Localhost**: Returns `http://localhost:3001`
**Deployment**: Returns `window.location.origin` (same domain)

---

### 4. **Build Process Differences**

#### Localhost:
```bash
npm run dev
# Runs Vite dev server on port 3000
# Backend runs separately on port 3001
# Frontend proxies to backend or uses full URL
```

#### Deployment:
```bash
npm run render:build
# 1. npm install (root)
# 2. npm run build (builds frontend to dist/)
# 3. cd server && npm install (installs backend deps)

npm run render:start
# cd server && npm start
# Serves both frontend (from ../dist) and backend (API routes)
# Everything on same port (Render's PORT)
```

**Key Difference**: 
- **Localhost**: 2 separate servers (frontend: 3000, backend: 3001)
- **Deployment**: 1 server serving both (frontend from `/`, API from `/api`)

---

### 5. **Frontend Static File Serving**

#### In `server/server.js`:
```javascript
if (process.env.NODE_ENV === 'production') {
    const frontendPath = path.join(__dirname, '..', 'dist');
    
    if (existsSync(frontendPath)) {
        app.use(express.static(frontendPath));
        
        // Catch-all route for React Router
        app.get('*', (req, res) => {
            if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
                return res.status(404).json({ error: 'Route not found' });
            }
            res.sendFile(path.join(frontendPath, 'index.html'));
        });
    }
}
```

**Localhost**: Frontend served by Vite dev server (hot reload, fast refresh)
**Deployment**: Frontend served by Express as static files (built HTML/CSS/JS)

---

## 🐛 Common Issues and Their Causes

### Issue 1: API Requests Failing in Production
**Symptoms**: 
- Works on localhost
- Fails with network errors or 404 on deployment

**Root Cause**:
- `VITE_API_URL` not set in Render dashboard
- Frontend trying to use `/api` but backend not responding
- CORS issues if frontend and backend are on different domains

**Solution**:
1. Ensure Render has these environment variables:
   ```
   VITE_API_URL=https://your-service.onrender.com/api
   VITE_SOCKET_URL=https://your-service.onrender.com
   ```
2. Or use relative URLs (`/api`) if both are on same domain

---

### Issue 2: WebSocket Connection Fails
**Symptoms**:
- Socket.io connection errors
- Multiplayer features not working

**Root Cause**:
- Socket trying to connect to wrong URL
- WebSocket transport not allowed by hosting provider
- CORS issues with Socket.io

**Solution**:
1. Set `VITE_SOCKET_URL` in Render
2. Check Render logs for Socket.io connection attempts
3. Ensure WebSocket transport is enabled

---

### Issue 3: Environment Variables Not Available
**Symptoms**:
- `import.meta.env.VITE_API_URL` returns `undefined`
- App uses fallback values

**Root Cause**:
- Vite injects environment variables at **build time**, not runtime
- If variables are not set when `npm run build` runs, they won't be in the bundle
- Setting variables after build has no effect

**Solution**:
1. Set environment variables **before** building
2. Rebuild after changing environment variables
3. Use Render's auto-deploy to trigger rebuilds when env vars change

---

### Issue 4: Different Behavior in Game Logic
**Symptoms**:
- Game works on localhost but not on deployment
- Game state inconsistencies

**Root Cause**:
- Different API/Socket URLs causing communication issues
- Race conditions with server communication
- Missing error handling for network failures

---

## 🔧 Debugging Steps

### Step 1: Check Frontend Configuration
Open browser console on deployed site:
```javascript
console.log('API URL:', import.meta.env.VITE_API_URL);
console.log('Socket URL:', import.meta.env.VITE_SOCKET_URL);
console.log('Mode:', import.meta.env.MODE);
```

### Step 2: Check API Connectivity
```javascript
fetch('/api/auth/me', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

### Step 3: Check Socket Connectivity
Look for these logs in browser console:
```
🔌 Connecting to socket server: [URL]
✅ Connected to server: [socket-id] at [URL]
```

### Step 4: Check Render Logs
In Render dashboard, check:
1. Build logs - ensure frontend builds successfully
2. Runtime logs - ensure backend starts and serves frontend
3. Look for errors like:
   - `Cannot GET /api/...`
   - `CORS error`
   - `WebSocket connection failed`

---

## ✅ Recommended Fixes

### Fix 1: Update render.yaml with Frontend Variables
```yaml
services:
  - type: web
    name: gemini-ludo-game
    env: node
    region: frankfurt
    plan: free
    branch: master
    buildCommand: npm run render:build
    startCommand: npm run render:start
    rootDir: .
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        generateValue: true
      - key: CONNECTION_URI
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: FRONTEND_URL
        sync: false
      - key: GEMINI_API_KEY
        sync: false
      # ADD THESE:
      - key: VITE_API_URL
        value: /api
      - key: VITE_SOCKET_URL
        sync: false  # Set in dashboard with your actual URL
      - key: VITE_USE_REAL_API
        value: true
```

### Fix 2: Add Runtime Environment Detection
Create `src/config.ts`:
```typescript
// Runtime configuration that works in both dev and production
export const getConfig = () => {
  const isDev = window.location.hostname === 'localhost';
  
  return {
    apiUrl: isDev ? 'http://localhost:3001/api' : '/api',
    socketUrl: isDev ? 'http://localhost:3001' : window.location.origin,
    useRealAPI: true
  };
};
```

### Fix 3: Add Environment Variable Checker
Add to `src/index.tsx` or `App.tsx`:
```typescript
// Check environment variables on startup
console.group('🔧 Environment Configuration');
console.log('NODE_ENV:', import.meta.env.MODE);
console.log('API URL:', import.meta.env.VITE_API_URL || 'NOT SET');
console.log('Socket URL:', import.meta.env.VITE_SOCKET_URL || 'NOT SET');
console.log('Use Real API:', import.meta.env.VITE_USE_REAL_API || 'NOT SET');
console.log('Current Location:', window.location.origin);
console.groupEnd();
```

---

## 📊 Comparison Table

| Feature | Localhost | Deployment |
|---------|-----------|------------|
| **Ports** | Frontend: 3000<br>Backend: 3001 | Single port (Render assigns) |
| **API URL** | `http://localhost:3001/api` | `/api` (relative) |
| **Socket URL** | `http://localhost:3001` | Same as frontend origin |
| **Env Vars** | From `server/.env` | From Render dashboard |
| **Frontend Serving** | Vite dev server | Express static files |
| **Hot Reload** | ✅ Yes | ❌ No |
| **Build Time** | None (dev mode) | ~2-3 minutes |
| **CORS** | May need CORS config | Same origin (no CORS needed) |

---

## 🎯 Action Items

1. ✅ **Check Render Environment Variables**
   - Go to Render dashboard
   - Check which variables are set
   - Add missing `VITE_*` variables

2. ✅ **Review Build Logs**
   - Check if environment variables are logged during build
   - Verify `dist` folder is created

3. ✅ **Test API Endpoints**
   - Use browser console to test API calls
   - Check network tab for failed requests

4. ✅ **Test Socket Connection**
   - Check if Socket.io connects successfully
   - Look for connection errors in console

5. ✅ **Compare Console Logs**
   - Run app on localhost, check console logs
   - Run app on deployment, compare logs
   - Identify differences in configuration

---

## 📝 Notes

- Vite's `import.meta.env` variables are **build-time** constants
- Changing environment variables requires a **rebuild**
- Render auto-deploys on git push, but not on env var changes (unless configured)
- Socket.io in production needs proper WebSocket support
- Same-origin deployment simplifies CORS but requires careful routing

---

## 🚀 Next Steps

1. Run diagnostics on deployed site (check console)
2. Compare with localhost behavior
3. Fix environment variable configuration
4. Rebuild and redeploy
5. Test all features systematically


