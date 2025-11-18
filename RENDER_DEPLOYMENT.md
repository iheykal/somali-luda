# Render Deployment Guide

## Backend Server Deployment

### Step 1: Create Backend Web Service on Render

1. Go to Render Dashboard → **New** → **Web Service**
2. Connect your repository: `iheykal/studio`
3. Configure the service:

   **Basic Settings:**
   - **Name**: `ludo-backend` (or any name you prefer)
   - **Branch**: `master`
   - **Root Directory**: `Downloads/gemini-ludo-ai-game/server`
   - **Region**: Choose your preferred region
   - **Instance Type**: Free (or paid if needed)

   **Build & Deploy:**
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

   **Environment Variables:**
   Add these environment variables in Render:
   
   ```
   CONNECTION_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/ludo-game?retryWrites=true&w=majority
   ```
   (Replace with your actual MongoDB connection string)
   
   ```
   JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string
   ```
   (Use a strong random string, e.g., generate with: `openssl rand -base64 32`)
   
   ```
   FRONTEND_URL=https://your-frontend-service.onrender.com
   ```
   (Replace with your actual frontend URL from Render)
   
   ```
   NODE_ENV=production
   ```
   
   ```
   GEMINI_API_KEY=your-gemini-api-key-here
   ```
   (Optional, only if using AI features)

4. Click **Create Web Service**

5. Wait for deployment to complete. Note the backend URL (e.g., `https://ludo-backend.onrender.com`)

### Step 2: Update Frontend Configuration

1. Go to your **Frontend Web Service** on Render
2. Navigate to **Environment Variables**
3. Add/Update these variables:

   ```
   VITE_API_URL=https://your-backend-service.onrender.com/api
   ```
   (Replace `your-backend-service` with your actual backend service name)
   
   ```
   VITE_USE_REAL_API=true
   ```
   
   ```
   VITE_SOCKET_URL=https://your-backend-service.onrender.com
   ```
   (Same as VITE_API_URL but without `/api`)

4. **Save Changes** - Render will automatically redeploy

### Step 3: Update Backend CORS (if needed)

If your frontend URL changes, update the `FRONTEND_URL` environment variable in your backend service.

## MongoDB Setup

If you don't have a MongoDB database:

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Get your connection string
5. Format: `mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority`
6. Add it as `CONNECTION_URI` in your backend environment variables

## Testing

After deployment:

1. Check backend logs in Render to ensure it started successfully
2. Check frontend logs to see if it's connecting to the backend
3. Open browser console (F12) and look for:
   - `🔧 Auth API Configuration:` - Should show your backend URL
   - `API: Sending login request to: [your-backend-url]`

## Troubleshooting

### Backend won't start:
- Check MongoDB connection string is correct
- Verify all environment variables are set
- Check Render logs for errors

### Frontend can't connect:
- Verify `VITE_API_URL` points to your backend URL
- Check backend CORS settings allow your frontend URL
- Ensure backend is running (check backend service status)

### CORS errors:
- Make sure `FRONTEND_URL` in backend matches your frontend URL exactly
- Include protocol (https://) in FRONTEND_URL
- Check backend logs for CORS rejection messages




