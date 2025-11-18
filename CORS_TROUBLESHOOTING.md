# CORS Troubleshooting Guide

## Current Issue
CORS errors persist even after fixes. The server might not be running with updated code, or there might be a 500 error.

## Steps to Fix

### 1. Verify Server is Running
Check if the server is actually running:
```bash
# Check if port 3001 is in use
netstat -ano | findstr :3001
```

### 2. Check Server Console
When you try to login, you should see in the backend console:
```
🔍 OPTIONS request received (manual handler): { origin: 'http://192.168.100.32:3000', ... }
🔍 Origin check: { origin: 'http://192.168.100.32:3000', isAllowed: true, ... }
✅ Allowed origin: http://192.168.100.32:3000
✅ OPTIONS response headers set
```

**If you DON'T see these logs:**
- The server might not be running
- The server might be running old code
- The OPTIONS handler might not be working

### 3. Restart Server with Updated Code
Make sure you restart the server after code changes:

```bash
# Stop the server (Ctrl+C)
cd server
npm start
```

### 4. Test Server Health
Test if the server is accessible:
```bash
# In browser, visit:
http://192.168.100.32:3001/health

# Should return JSON with status: "ok"
```

### 5. Check for 500 Errors
If you see 500 errors, check the server console for:
- Error messages
- Stack traces
- Database connection issues

### 6. Verify CORS Headers
In browser DevTools → Network tab:
1. Look for the OPTIONS request to `/api/auth/login`
2. Check Response Headers:
   - Should have: `Access-Control-Allow-Origin: http://192.168.100.32:3000`
   - Should have: `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH`
   - Should have: `Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With`

### 7. Check Environment Variables
Make sure `NODE_ENV` is NOT set to `production` in development:

In `server/.env`:
```env
NODE_ENV=development
```

### 8. Test CORS Manually
You can test CORS with curl:
```bash
curl -X OPTIONS http://192.168.100.32:3001/api/auth/login \
  -H "Origin: http://192.168.100.32:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

Should return headers with `Access-Control-Allow-Origin`.

## Common Issues

### Issue 1: No OPTIONS logs in console
**Solution:** Server might not be running or using old code. Restart the server.

### Issue 2: 500 Internal Server Error
**Solution:** Check server console for error messages. Common causes:
- Database connection issues
- Missing environment variables
- Code errors

### Issue 3: CORS headers not present
**Solution:** 
- Verify OPTIONS handler is running (check logs)
- Make sure CORS middleware is configured correctly
- Check that `NODE_ENV=development` is set

### Issue 4: Origin still blocked
**Solution:**
- Check server console for "CORS blocked origin" warnings
- Verify the origin matches the pattern: `http://192.168.100.32:3000`
- Make sure server is running with latest code

## Quick Fix: Temporarily Allow All Origins

If nothing works, you can temporarily allow all origins in development:

In `server/server.js`, change the CORS origin callback to:
```javascript
origin: (origin, callback) => {
    if (process.env.NODE_ENV !== 'production') {
        // Development: allow all origins
        callback(null, true);
    } else {
        // Production: use your existing logic
        // ...
    }
}
```

**⚠️ Warning:** Only use this in development! Never allow all origins in production.

## Next Steps

1. Restart the server
2. Check the server console for OPTIONS request logs
3. Check browser Network tab for CORS headers
4. Report what you see in the console

