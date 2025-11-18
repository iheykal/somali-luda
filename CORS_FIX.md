# CORS Error Fix

## Problem
The frontend (running on `http://localhost:3000`) was blocked from accessing the backend API (running on `http://localhost:3001`) due to CORS policy. The error was:
```
Access to fetch at 'http://localhost:3001/api/auth/login' from origin 'http://localhost:3000' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Cause
The CORS configuration in `server/server.js` had two issues:
1. The callback function was passing a boolean instead of the origin value
2. Missing explicit configuration for allowed methods and headers needed for preflight requests

## Solution
Fixed the CORS configuration to:
1. Properly pass the origin value in the callback
2. Explicitly allow all necessary HTTP methods (GET, POST, PUT, DELETE, OPTIONS, PATCH)
3. Explicitly allow necessary headers (Content-Type, Authorization, X-Requested-With)
4. Added debug logging for development mode to help troubleshoot CORS issues

## Changes Made

### Before
```javascript
callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
// Second parameter was a boolean, which is incorrect
```

### After
```javascript
if (isAllowed) {
    callback(null, origin); // Pass the origin value
} else {
    console.warn(`⚠️  CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
}
```

### Added CORS Options
```javascript
credentials: true,
methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
exposedHeaders: ['Content-Type', 'Authorization'],
optionsSuccessStatus: 200
```

## Testing

1. **Restart the backend server:**
   ```bash
   cd server
   npm start
   ```

2. **Try to login again:**
   - The CORS error should be gone
   - You should see in the backend console (if in development):
     ```
     🔍 CORS Preflight Request: { origin: 'http://localhost:3000', ... }
     ```

3. **Verify the request succeeds:**
   - Check browser console - should NOT see CORS errors
   - Check Network tab - the request should have status 200 or 401 (not blocked)

## How CORS Works

1. **Preflight Request (OPTIONS):**
   - Browser sends OPTIONS request before the actual request
   - Server responds with allowed methods, headers, and origin
   - If preflight passes, browser sends the actual request

2. **Actual Request:**
   - Browser sends the actual request (POST, GET, etc.)
   - Server includes CORS headers in response
   - Browser checks if origin is allowed

## Development vs Production

### Development Mode
- Allows all localhost ports (`http://localhost:*`)
- Allows 127.0.0.1
- Allows local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
- Logs CORS preflight requests for debugging

### Production Mode
- Only allows origins specified in `FRONTEND_URL` environment variable
- If `FRONTEND_URL` is not set, allows same-origin requests only
- More restrictive for security

## Environment Variables

You can configure allowed origins in production by setting:
```env
FRONTEND_URL=http://your-frontend-domain.com,https://your-frontend-domain.com
```

Multiple origins can be separated by commas.

## Troubleshooting

If you still see CORS errors:

1. **Check backend console:**
   - Look for: `⚠️  CORS blocked origin: ...`
   - This will tell you which origin was blocked

2. **Check browser Network tab:**
   - Look at the OPTIONS request (preflight)
   - Check the response headers
   - Should see: `Access-Control-Allow-Origin: http://localhost:3000`

3. **Verify NODE_ENV:**
   - Make sure `NODE_ENV` is not set to `production` in development
   - In development, it should be `development` or unset

4. **Check origin pattern:**
   - The regex pattern `/^http:\/\/localhost:\d+$/` should match `http://localhost:3000`
   - If your origin is different, it might not match

## Related Files
- `server/server.js` - CORS configuration

