# Local Development Setup Guide

## Problem
You're getting "Network error. Unable to connect to backend server" even though you have environment variables set.

## Solution

### Step 1: Check if Backend Server is Running

The backend server must be running on port 3001. Check if it's running:

```bash
# In a terminal, check if port 3001 is in use
# Windows PowerShell:
netstat -ano | findstr :3001

# Or try to access the health endpoint in browser:
# http://localhost:3001/health
```

### Step 2: Start the Backend Server

If the server is not running, start it:

```bash
cd server
npm start
```

You should see:
```
🚀 Ludo game server running on port 3001
📡 Accessible from:
   - Local: http://localhost:3001
```

### Step 3: Environment Variables for Local Development

**Important:** When running locally, you should NOT set `NODE_ENV=production`. 

Create a `.env` file in the `server/` directory with:

```env
# Local Development Settings
NODE_ENV=development

# MongoDB Connection
CONNECTION_URI=mongodb+srv://ludo:ilyaas@ludo.1umgvpn.mongodb.net/ludo?retryWrites=true&w=majority&appName=ludo

# JWT Secret
JWT_SECRET=8f9a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7

# Frontend URL (for CORS - not needed in development, but can set if needed)
# FRONTEND_URL=http://localhost:3000
```

**Do NOT set these in local development:**
- `VITE_API_URL=/api` - This is for production only
- `NODE_ENV=production` - This changes how the app behaves

### Step 4: Frontend Environment Variables

For local development, you can create a `.env` file in the **root** directory (not in `server/`):

```env
# Local Development - Frontend
# Leave VITE_API_URL unset or set to full URL
# VITE_API_URL=http://localhost:3001/api

# Or just leave it unset - the code will auto-detect localhost and use http://localhost:3001/api
```

**OR** you can set it explicitly:
```env
VITE_API_URL=http://localhost:3001/api
```

### Step 5: Start Frontend Dev Server

```bash
# In the root directory
npm run dev
```

The frontend will run on `http://localhost:3000` and automatically connect to the backend on `http://localhost:3001`.

## Quick Start Commands

### Terminal 1 - Backend:
```bash
cd server
npm start
```

### Terminal 2 - Frontend:
```bash
npm run dev
```

## Verification

1. **Backend Health Check:**
   - Open: http://localhost:3001/health
   - Should return: `{"status":"ok",...}`

2. **Frontend Console:**
   - Open browser console (F12)
   - Look for: `🔧 Auth API Configuration:`
   - Should show: `API_URL: "http://localhost:3001/api"`

3. **Try Login:**
   - Should connect to backend
   - Should NOT see CORS errors
   - Should NOT see "Network error"

## Common Issues

### Issue 1: "Network error. Unable to connect to backend server"
**Solution:** Make sure the backend server is running on port 3001.

### Issue 2: CORS Errors
**Solution:** 
- Make sure `NODE_ENV=development` in `server/.env`
- Restart the backend server after changing `.env`

### Issue 3: Wrong API URL
**Solution:**
- Check browser console for `🔧 Auth API Configuration:`
- Should show `http://localhost:3001/api` (not `/api`)
- If it shows `/api`, check your `.env` files

### Issue 4: Port Already in Use
**Solution:**
```bash
# Find and kill process on port 3001
# Windows:
netstat -ano | findstr :3001
taskkill /PID <PID_NUMBER> /F

# Or change the port in server/.env:
PORT=3002
```

## Environment Variables Summary

### For Local Development:

**server/.env:**
```env
NODE_ENV=development
CONNECTION_URI=your_mongodb_uri
JWT_SECRET=your_secret
```

**Root .env (optional):**
```env
VITE_API_URL=http://localhost:3001/api
```

### For Production Deployment:

**server/.env:**
```env
NODE_ENV=production
CONNECTION_URI=your_mongodb_uri
JWT_SECRET=your_secret
FRONTEND_URL=https://your-frontend-domain.com
```

**Root .env:**
```env
VITE_API_URL=/api
VITE_USE_REAL_API=true
```

## Testing the Connection

1. **Test Backend:**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Test API Endpoint:**
   ```bash
   curl http://localhost:3001/api/auth/login -X POST -H "Content-Type: application/json" -d "{\"phone\":\"test\",\"password\":\"test\"}"
   ```

3. **Check CORS:**
   - Open browser console
   - Try to login
   - Should NOT see CORS errors

