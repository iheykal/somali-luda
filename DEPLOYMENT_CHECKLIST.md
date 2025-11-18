# Deployment Checklist - Render

## Pre-Deployment Checklist

### ✅ Code Configuration
- [x] API URL detection works for both localhost and Render
- [x] CORS allows local network IPs even in production mode
- [x] CORS allows Render domain when `FRONTEND_URL` is set
- [x] Static file serving configured correctly
- [x] `render.yaml` is configured correctly

### 📝 Environment Variables to Set in Render Dashboard

Go to Render Dashboard → Your Service → Environment → Add Environment Variable

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
   https://gemini-ludo-game.onrender.com
   ```
   (Replace with your actual Render URL)

4. **VITE_SOCKET_URL** (for WebSocket)
   ```
   https://gemini-ludo-game.onrender.com
   ```
   (Same as FRONTEND_URL)

### 🔧 How It Works

#### On Localhost:
- Frontend: `http://localhost:3000` or `http://192.168.x.x:3000`
- Backend: `http://localhost:3001` or `http://192.168.x.x:3001`
- API URL: `http://localhost:3001/api` or `http://192.168.x.x:3001/api` (full URL)
- CORS: Allows localhost and network IPs

#### On Render:
- Frontend & Backend: `https://your-app.onrender.com` (same domain)
- API URL: `/api` (relative URL)
- CORS: Allows `https://your-app.onrender.com` + local network IPs (for testing)

## Deployment Steps

1. **Commit and Push:**
   ```bash
   git add .
   git commit -m "Configure for Render deployment"
   git push origin master
   ```

2. **Render will automatically:**
   - Detect `render.yaml`
   - Run build command
   - Set environment variables from `render.yaml`
   - Start the server

3. **Set Environment Variables in Dashboard:**
   - Go to your service in Render
   - Environment tab
   - Add the variables listed above

4. **Verify Deployment:**
   - Health: `https://your-app.onrender.com/health`
   - Frontend: `https://your-app.onrender.com`
   - API: `https://your-app.onrender.com/api/auth/login`

## Testing

### Test Locally First:
```bash
# Terminal 1
cd server
npm start

# Terminal 2
npm run dev
```

Visit: `http://localhost:3000` - should work

### Test on Render:
Visit: `https://your-app.onrender.com` - should work

## Troubleshooting

### CORS Errors on Render
- Check `FRONTEND_URL` is set correctly in Render dashboard
- Should match your Render URL exactly: `https://your-app.onrender.com`

### API Not Working on Render
- Check build logs in Render
- Verify `VITE_API_URL=/api` is set (it's in render.yaml)
- Check that `dist/` folder exists after build

### Works Locally but Not on Render
- Check Render build logs for errors
- Verify all environment variables are set
- Check server logs in Render dashboard

## Current Status

✅ **Ready for Render Deployment**

The code now:
- ✅ Detects localhost vs Render automatically
- ✅ Uses correct API URLs for each environment
- ✅ Handles CORS correctly for both environments
- ✅ Serves static files correctly in production
- ✅ Allows local network testing even in production mode

## Next Steps

1. Push code to GitHub
2. Deploy on Render (or let auto-deploy work)
3. Set environment variables in Render dashboard
4. Test the deployed app
5. Verify all features work

