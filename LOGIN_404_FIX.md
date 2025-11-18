# Login 404 Error Fix

## Problem
The login was failing with a 404 error because the frontend was trying to call `/api/auth/login` on port 3000 (Vite dev server) instead of `http://localhost:3001/api/auth/login` (backend server).

## Root Cause
The `getApiUrl()` function in the API service files was using relative URLs (`/api`) in development mode when an environment variable was set to `/api`. This caused the frontend (running on port 3000) to try to call the API on the same port instead of the backend port (3001).

## Solution
Updated the `getApiUrl()` function in all three API service files:
- `services/authAPI.ts`
- `services/walletAPI.ts`
- `services/adminAPI.ts`

The fix ensures that:
1. **In development mode**: Always uses the full URL `http://localhost:3001/api` even if environment variables are set to relative URLs
2. **In production mode**: Uses relative URLs (`/api`) when frontend and backend are on the same domain
3. **Full URLs**: If environment variables contain full URLs (http://... or https://...), they are used as-is

## Changes Made

### Before
```typescript
// If environment variable was set to "/api", it would use that
// This caused requests to go to localhost:3000/api instead of localhost:3001/api
if (envUrl && envUrl.trim() !== '') {
  return cleanUrl; // Could be "/api" - relative URL
}
```

### After
```typescript
// If it's a relative URL (/api) and we're in development, convert to full URL
if (cleanUrl.startsWith('/') && !isProduction) {
  // In development, relative URLs won't work (frontend on 3000, backend on 3001)
  // So use the full localhost URL
  return 'http://localhost:3001/api';
}
```

## Testing

1. **Start the backend server:**
   ```bash
   cd server
   npm start
   ```
   Should see: `🚀 Ludo game server running on port 3001`

2. **Start the frontend dev server:**
   ```bash
   npm run dev
   ```
   Should see: `Local: http://localhost:3000/`

3. **Check browser console:**
   - Open browser console (F12)
   - Look for: `🔧 Auth API Configuration:`
   - Should show: `API_URL: "http://localhost:3001/api"`

4. **Try to login:**
   - The login request should now go to `http://localhost:3001/api/auth/login`
   - Should not get 404 error anymore

## Verification

After the fix, when you try to login, you should see in the browser console:
```
API: Sending login request to: http://localhost:3001/api/auth/login
API: Using real backend, credentials: {...}
API: Response status: 200 (or 401 if wrong credentials, but NOT 404)
```

## Environment Variables

If you want to explicitly set the API URL, you can create a `.env` file in the root directory:

```env
# For development - use full URL
VITE_API_URL=http://localhost:3001/api

# For production - use relative URL (when frontend and backend are on same domain)
# VITE_API_URL=/api
```

**Note:** The fix ensures that even if you set `VITE_API_URL=/api` in development, it will automatically convert it to `http://localhost:3001/api`.

## Related Files
- `services/authAPI.ts` - Authentication API calls
- `services/walletAPI.ts` - Wallet API calls  
- `services/adminAPI.ts` - Admin API calls
- `services/socketService.ts` - WebSocket connections (already working correctly)

