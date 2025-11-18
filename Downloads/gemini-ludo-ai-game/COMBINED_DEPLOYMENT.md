# Combined Deployment Guide (Frontend + Backend Together)

This guide shows you how to deploy both frontend and backend as **one service** on Render, just like you're used to with other web apps.

## ✅ Benefits of Combined Deployment

- **Single deployment** - Everything in one place
- **No CORS issues** - Same origin, no cross-origin problems
- **Simpler configuration** - One service, one set of environment variables
- **Lower cost** - One service instead of two
- **Easier management** - One place to check logs and status

## 📋 Prerequisites

- MongoDB database (MongoDB Atlas free tier works great)
- GitHub repository connected to Render
- Render account

## 🚀 Step-by-Step Deployment

### Step 1: Update Your Render Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Find your existing service (`studio-1-rmo5` or similar)
3. Go to **Settings**

### Step 2: Change Service Type (if needed)

If your service is currently a **Static Site**, you need to:
- Delete the static site service
- Create a new **Web Service** instead

**OR** if it's already a Web Service, just update the settings below.

### Step 3: Configure Build Settings

In your service settings, update:

**Basic Settings:**
- **Name**: `gemini-ludo-game` (or any name)
- **Branch**: `master` (or your main branch)
- **Root Directory**: `.` (root of repository) ⚠️ **Important**
- **Region**: Choose your preferred region
- **Instance Type**: Free (or paid if needed)

**Build & Deploy:**
- **Build Command**: 
  ```
  npm install && npm run build && cd server && npm install
  ```
  This will:
  1. Install frontend dependencies
  2. Build the frontend (creates `dist` folder)
  3. Install backend dependencies

- **Start Command**: 
  ```
  cd server && npm start
  ```
  This starts the Node.js server which serves both API and frontend

- **Environment**: `Node`

### Step 4: Add Environment Variables

Click **Add Environment Variable** and add these:

**Required:**
```
CONNECTION_URI=mongodb+srv://username:password@cluster.mongodb.net/ludo-game?retryWrites=true&w=majority
```
(Your MongoDB connection string)

```
JWT_SECRET=your-super-secret-random-string-here
```
(Generate a random string - use `openssl rand -base64 32` or any random string)

```
NODE_ENV=production
```

**Optional (for CORS if needed):**
```
FRONTEND_URL=https://your-service-name.onrender.com
```
(Your Render service URL - only needed if you want to allow external frontends)

**Optional (for AI features):**
```
GEMINI_API_KEY=your-gemini-api-key
```

**Note:** You do NOT need:
- `VITE_API_URL` (uses relative URLs `/api`)
- `VITE_SOCKET_URL` (uses same origin)
- `VITE_USE_REAL_API` (automatically enabled in production)

### Step 5: Deploy

1. Click **Save Changes**
2. Render will automatically start building and deploying
3. Wait 3-5 minutes for deployment to complete

### Step 6: Verify Deployment

1. **Check Logs:**
   - Go to **Logs** tab
   - You should see:
     ```
     📦 Serving frontend from: /opt/render/project/src/dist
     🚀 Ludo game server running on port 10000
     ✅ MongoDB connected
     ```

2. **Test Your App:**
   - Open your service URL: `https://your-service-name.onrender.com`
   - Try to login
   - Check browser console (F12) - should see API calls to `/api`

3. **Test API Directly:**
   - Visit: `https://your-service-name.onrender.com/api/auth/login`
   - Should see an error (not "connection refused") - means API is working

## 🔧 How It Works

1. **Build Process:**
   - Frontend is built into `dist/` folder
   - Backend dependencies are installed

2. **Runtime:**
   - Node.js server starts
   - Server serves API routes at `/api/*`
   - Server serves frontend static files from `dist/` folder
   - React Router handles client-side routing

3. **API Calls:**
   - Frontend uses relative URLs: `/api/auth/login`
   - No CORS issues (same origin)
   - Socket.io uses same origin automatically

## 🐛 Troubleshooting

### Build Fails

**Error: "dist folder not found"**
- Make sure build command includes `npm run build`
- Check that `vite build` completes successfully

**Error: "Cannot find module"**
- Make sure both `npm install` (root) and `cd server && npm install` run
- Check package.json files exist

### Server Won't Start

**Error: "MongoDB connection failed"**
- Check `CONNECTION_URI` is correct
- Verify MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- Check username/password in connection string

**Error: "Port already in use"**
- Render sets PORT automatically - don't override it
- Remove any `PORT` environment variable

### Frontend Not Loading

**404 on all routes**
- Check server logs - should see "Serving frontend from: ..."
- Verify `dist` folder exists after build
- Check that static file serving code is in server.js

**API calls fail**
- Check browser console for errors
- Verify API routes work: `https://your-url.onrender.com/api/auth/login`
- Check server logs for API request errors

### CORS Errors

**"CORS policy blocked"**
- Shouldn't happen with same-origin deployment
- If it does, check `FRONTEND_URL` matches your service URL exactly
- Or remove `FRONTEND_URL` to allow same-origin only

## 📝 File Structure

After deployment, your service structure:
```
/
├── dist/              # Built frontend (created during build)
│   ├── index.html
│   └── assets/
├── server/            # Backend code
│   ├── server.js      # Main server (serves API + frontend)
│   ├── models/
│   └── package.json
├── services/          # Frontend API services
├── package.json       # Frontend package.json
└── vite.config.ts
```

## 🔄 Updating Your App

1. Make changes to your code
2. Commit and push to GitHub
3. Render automatically detects changes and redeploys
4. Wait for deployment to complete

## ✅ Quick Checklist

- [ ] Service type is **Web Service** (not Static Site)
- [ ] Root Directory is `.` (root)
- [ ] Build Command: `npm install && npm run build && cd server && npm install`
- [ ] Start Command: `cd server && npm start`
- [ ] Environment: `Node`
- [ ] `CONNECTION_URI` added (MongoDB)
- [ ] `JWT_SECRET` added (random string)
- [ ] `NODE_ENV=production` added
- [ ] Service deployed successfully
- [ ] Logs show "Serving frontend from: ..."
- [ ] Logs show "MongoDB connected"
- [ ] App loads at service URL
- [ ] Login works

## 🎉 That's It!

Your app is now deployed as one service, just like your previous web apps. The frontend and backend work together seamlessly on the same domain.

