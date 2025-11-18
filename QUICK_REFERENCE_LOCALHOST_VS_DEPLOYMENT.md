# ⚡ Quick Reference: Localhost vs Deployment

## 🔑 Key Differences at a Glance

### Architecture

| Aspect | Localhost | Deployment |
|--------|-----------|------------|
| **Setup** | 2 separate servers | 1 combined server |
| **Frontend** | Vite dev server (port 3000) | Express static files |
| **Backend** | Node server (port 3001) | Same Node server |
| **Build** | No build needed | `npm run render:build` |
| **Hot Reload** | ✅ Yes | ❌ No |

---

### URLs & Endpoints

| Service | Localhost | Deployment |
|---------|-----------|------------|
| **Frontend URL** | `http://localhost:3000` | `https://your-service.onrender.com` |
| **Backend URL** | `http://localhost:3001` | Same as frontend |
| **API Endpoint** | `http://localhost:3001/api` | `/api` (relative) |
| **Socket URL** | `http://localhost:3001` | `https://your-service.onrender.com` |

---

### Environment Variables

| Variable | Localhost | Deployment |
|----------|-----------|------------|
| **Source** | `server/.env` file | Render dashboard |
| **VITE_API_URL** | Not needed (auto-detects) | Must set to `/api` |
| **VITE_SOCKET_URL** | Not needed (auto-detects) | Must set to your URL |
| **VITE_USE_REAL_API** | Not needed (auto-true) | Must set to `true` |
| **NODE_ENV** | development | production |

---

### API Configuration

#### Localhost Detection Logic:
```typescript
// services/authAPI.ts
hostname === 'localhost' 
  → API_URL = 'http://localhost:3001/api'
```

#### Deployment Detection Logic:
```typescript
// services/authAPI.ts
hostname !== 'localhost' 
  → API_URL = '/api'  // Relative URL
```

---

### Socket Configuration

#### Localhost:
```typescript
// services/socketService.ts
hostname === 'localhost'
  → Socket URL = 'http://localhost:3001'
```

#### Deployment:
```typescript
// services/socketService.ts
hostname !== 'localhost'
  → Socket URL = window.location.origin
```

---

## 🚨 Common Pitfalls

| Issue | Why It Happens | Solution |
|-------|---------------|----------|
| **API 404 errors** | `VITE_API_URL` not set | Add to Render env vars |
| **Socket connection fails** | `VITE_SOCKET_URL` not set | Add to Render env vars |
| **Env vars undefined** | Not set during build | Set in Render before deployment |
| **CORS errors** | Frontend/backend on different domains | Use relative URLs (`/api`) |
| **Changes not reflecting** | Using cached build | Trigger new deployment |

---

## ✅ Required Render Environment Variables

Copy-paste these into your Render dashboard:

```bash
# Backend (Already Set - Verify)
NODE_ENV=production
CONNECTION_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
PORT=(auto-generated)

# Frontend (ADD THESE)
VITE_API_URL=/api
VITE_SOCKET_URL=https://your-service-name.onrender.com
VITE_USE_REAL_API=true
```

**⚠️ Important**: Replace `your-service-name` with your actual Render service name.

---

## 🧪 Quick Test Commands

### Test API in Browser Console:
```javascript
// Check config
console.log('API URL:', import.meta.env.VITE_API_URL);
console.log('Hostname:', window.location.hostname);

// Test API call
fetch('/api/auth/me')
  .then(r => console.log('Status:', r.status))
  .catch(e => console.error('Error:', e));
```

### Test Socket Connection:
```javascript
// Check socket config
console.log('Socket URL:', import.meta.env.VITE_SOCKET_URL);

// Look for these logs in console:
// "🔌 Connecting to socket server: ..."
// "✅ Connected to server: ..."
```

---

## 🎯 What Should Match

These should be **identical** on localhost and deployment:

✅ **Functionality**:
- Login/register works
- Wallet operations work
- Matchmaking finds opponents
- Game state syncs between players
- Dice rolls are fair
- Token movement is correct
- Winner determination is accurate
- Balance updates correctly

✅ **User Experience**:
- UI looks the same
- Animations work smoothly
- Audio plays correctly
- No lag or delays (beyond network)

✅ **Data**:
- Same game rules apply
- Same commission rates
- Same bet amounts
- Same balance calculations

---

## 🔍 How to Debug Differences

### Step 1: Identify the Difference
Play the same scenario on localhost and deployment. Document:
- What works on localhost?
- What fails on deployment?
- What error messages appear?

### Step 2: Check Configuration
```javascript
// Run this on both localhost and deployment
console.log({
  origin: window.location.origin,
  apiUrl: import.meta.env.VITE_API_URL,
  socketUrl: import.meta.env.VITE_SOCKET_URL,
  mode: import.meta.env.MODE
});
```

Compare the outputs. They should make sense for each environment.

### Step 3: Check Network
Open DevTools → Network tab:
- Are API calls going to the right URL?
- Are they returning 200/401 (not 404/500)?
- Are WebSocket connections established?

### Step 4: Check Logs
**Localhost**: Check terminal logs
**Deployment**: Check Render dashboard logs

Look for:
- Error messages (red)
- Connection logs (green)
- Request logs

---

## 🆘 Emergency Checklist

If deployment is completely broken:

1. **[ ]** Are all environment variables set in Render?
2. **[ ]** Does the build complete successfully?
3. **[ ]** Is the server actually running? (Check Render status)
4. **[ ]** Can you access the frontend at all?
5. **[ ]** Does `/api` return something (not 404)?
6. **[ ]** Is MongoDB connected? (Check logs)
7. **[ ]** Are there any errors in Render logs?
8. **[ ]** Did you rebuild after changing env vars?

---

## 📖 Full Documentation

For detailed explanations, see:
- [Investigation Report](./LOCALHOST_VS_DEPLOYMENT_INVESTIGATION.md) - Technical deep dive
- [Action Plan](./DEPLOYMENT_FIX_ACTION_PLAN.md) - Step-by-step fix guide
- [Render Deployment](./RENDER_DEPLOYMENT.md) - General deployment guide

---

## 💡 Pro Tips

1. **Always check Render logs first** - Most issues are visible there
2. **Use browser console** - Check for errors and config values
3. **Test API endpoints directly** - Use `fetch()` in console
4. **Compare side by side** - Open localhost and deployment in different tabs
5. **Environment variables require rebuild** - Don't forget to redeploy after changes
6. **Use relative URLs in production** - Simplifies CORS and routing

---

## ⏱️ Expected Timings

| Operation | Localhost | Deployment |
|-----------|-----------|------------|
| **Start app** | 2-3 seconds | 2-5 minutes (cold start) |
| **Rebuild** | Instant (hot reload) | 2-5 minutes |
| **API response** | <100ms | 100-500ms |
| **Socket connect** | <100ms | 100-500ms |

---

## 🎉 Success Indicators

You'll know it's fixed when:

1. ✅ Console shows correct config values
2. ✅ No red errors in browser console
3. ✅ Can complete a full game flow
4. ✅ Behavior is identical to localhost
5. ✅ All tests in Action Plan pass

---

**Last Updated**: 2025-11-18
**Status**: Ready for deployment

