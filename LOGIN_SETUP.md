# Login Setup Guide

## Current Issue: "Invalid phone number or password"

This error occurs because the system is using **mock authentication** by default.

## Solution Options

### Option 1: Use Mock Credentials (For Testing)

Use these test credentials:
- **Phone:** `610251014`
- **Password:** `password123`

### Option 2: Connect to Your Real Backend

1. **Create `/server/.env` file** with your backend configuration:

```env
# Your Backend API URL
VITE_API_URL=http://your-backend-url.com/api
# OR
API_URL=http://your-backend-url.com/api

# Enable Real API
VITE_USE_REAL_API=true
USE_REAL_API=true

# WebSocket URL (if different)
VITE_SOCKET_URL=http://your-backend-url.com
SOCKET_URL=http://your-backend-url.com
```

2. **Restart your dev server:**
   ```bash
   npm run dev
   ```

3. **Use your real credentials** from your backend database

## How to Check Which Mode You're In

Open your browser console (F12) and look for:
- `🔧 Auth API Configuration:` - Shows current settings
- `⚠️ API: Using MOCK authentication` - Mock mode active
- `API: Sending login request to: [URL]` - Real API mode active

## Troubleshooting

### Still Getting "Invalid phone number or password"?

1. **Check browser console** for the configuration logs
2. **Verify `/server/.env` exists** and has correct values
3. **Restart dev server** after changing `.env` file
4. **Check your backend** is running and accessible
5. **Verify credentials** match your backend database

### Using Real Backend?

Make sure:
- ✅ `/server/.env` has `VITE_USE_REAL_API=true`
- ✅ `/server/.env` has correct `VITE_API_URL` pointing to your backend
- ✅ Your backend server is running
- ✅ Your backend has the `/auth/login` endpoint
- ✅ Credentials exist in your backend database








