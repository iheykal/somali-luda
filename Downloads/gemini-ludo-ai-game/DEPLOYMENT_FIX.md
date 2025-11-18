# Deployment Fix Guide

## Problem
Your frontend is deployed successfully, but login fails with:
```
Network error. Please check your connection and ensure the server is running on port 3001.
```

This happens because:
1. ✅ Frontend is deployed at: `https://studio-1-rmo5.onrender.com`
2. ❌ Backend server is NOT deployed (needs to be deployed separately)
3. ❌ Frontend is trying to connect to a backend that doesn't exist

## Solution: Deploy the Backend Server

### Step 1: Create Backend Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Web Service**
3. Connect your repository (same repo as frontend)
4. Configure the service:

   **Basic Settings:**
   - **Name**: `ludo-backend` (or any name you prefer)
   - **Branch**: `master` (or your main branch)
   - **Root Directory**: `server` ⚠️ **Important: Set this to `server`**
   - **Region**: Choose your preferred region
   - **Instance Type**: Free (or paid if needed)

   **Build & Deploy:**
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: `Node`

   **Environment Variables:**
   Add these in Render's environment variables section:
   
   ```
   PORT=10000
   ```
   (Render will set this automatically, but you can override)
   
   ```
   CONNECTION_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/ludo-game?retryWrites=true&w=majority
   ```
   (Replace with your actual MongoDB connection string)
   
   ```
   JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string
   ```
   (Use a strong random string, e.g., generate with: `openssl rand -base64 32`)
   
   ```
   FRONTEND_URL=https://studio-1-rmo5.onrender.com
   ```
   (Your frontend URL - can add multiple URLs separated by commas)
   
   ```
   NODE_ENV=production
   ```
   
   ```
   GEMINI_API_KEY=your-gemini-api-key-here
   ```
   (Optional, only if using AI features)

5. Click **Create Web Service**
6. Wait for deployment to complete
7. **Note the backend URL** (e.g., `https://ludo-backend.onrender.com`)

### Step 2: Update Frontend Environment Variables

1. Go to your **Frontend Web Service** on Render (the one at `studio-1-rmo5.onrender.com`)
2. Navigate to **Environment** tab
3. Click **Add Environment Variable**
4. Add these variables:

   ```
   VITE_API_URL=https://ludo-backend.onrender.com/api
   ```
   (Replace `ludo-backend` with your actual backend service name)
   
   ```
   VITE_SOCKET_URL=https://ludo-backend.onrender.com
   ```
   (Same as VITE_API_URL but without `/api`)
   
   ```
   VITE_USE_REAL_API=true
   ```

5. Click **Save Changes**
6. Render will automatically redeploy your frontend

### Step 3: Verify Backend is Running

1. Check backend logs in Render to ensure it started successfully
2. You should see something like:
   ```
   Server running on port 10000
   MongoDB connected
   ```

### Step 4: Test the Connection

1. Open your frontend: `https://studio-1-rmo5.onrender.com`
2. Open browser console (F12)
3. Try to login
4. Check console for:
   - `🔧 Auth API Configuration:` - Should show your backend URL
   - `API: Sending login request to: https://ludo-backend.onrender.com/api/auth/login`

## MongoDB Setup (if needed)

If you don't have a MongoDB database:

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Get your connection string
5. Format: `mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority`
6. Add it as `CONNECTION_URI` in your backend environment variables

## Troubleshooting

### Backend won't start:
- ✅ Check MongoDB connection string is correct
- ✅ Verify all environment variables are set
- ✅ Check Render logs for errors
- ✅ Ensure `Root Directory` is set to `server`

### Frontend can't connect:
- ✅ Verify `VITE_API_URL` points to your backend URL (with `/api` at the end)
- ✅ Check backend CORS settings allow your frontend URL
- ✅ Ensure backend is running (check backend service status)
- ✅ Verify `FRONTEND_URL` in backend matches your frontend URL exactly

### CORS errors:
- ✅ Make sure `FRONTEND_URL` in backend matches your frontend URL exactly
- ✅ Include protocol (`https://`) in `FRONTEND_URL`
- ✅ Check backend logs for CORS rejection messages
- ✅ You can add multiple frontend URLs separated by commas: `https://url1.com,https://url2.com`

### Still getting "Network error":
1. Check browser console (F12) for the actual error
2. Verify the API URL in console logs matches your backend URL
3. Try accessing backend directly: `https://your-backend.onrender.com/api/auth/login` (should return an error, not connection refused)
4. Check backend logs for incoming requests

## Quick Checklist

- [ ] Backend service created on Render
- [ ] Root Directory set to `server`
- [ ] MongoDB connection string added
- [ ] JWT_SECRET added
- [ ] FRONTEND_URL added (matches your frontend URL)
- [ ] Backend deployed successfully
- [ ] Frontend environment variables updated:
  - [ ] VITE_API_URL
  - [ ] VITE_SOCKET_URL
  - [ ] VITE_USE_REAL_API=true
- [ ] Frontend redeployed
- [ ] Tested login functionality

## Code Changes Made

I've updated the frontend code to:
1. ✅ Properly detect production environment
2. ✅ Use HTTPS in production (instead of HTTP)
3. ✅ Respect environment variables (`VITE_API_URL`, `VITE_SOCKET_URL`)
4. ✅ Provide better error messages

The code will now:
- Use environment variables if set (highest priority)
- In production, use HTTPS and same origin if no env var is set
- In development, use `http://localhost:3001`

But you **still need to deploy the backend** and set the environment variables for it to work!


