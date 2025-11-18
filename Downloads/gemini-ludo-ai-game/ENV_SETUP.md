# Environment Variables Setup

This project uses environment variables from **`/server/.env`** for configuration.

## Quick Setup

1. **Create or edit `/server/.env` file:**
   ```bash
   cd server
   # Create .env file if it doesn't exist
   ```

2. **Add your environment variables to `/server/.env`:**
   ```env
   # API Configuration
   VITE_API_URL=http://localhost:3001/api
   # OR use non-prefixed version (both work):
   API_URL=http://localhost:3001/api
   
   # WebSocket Configuration
   VITE_SOCKET_URL=http://localhost:3001
   # OR use non-prefixed version:
   SOCKET_URL=http://localhost:3001
   
   # Gemini AI Configuration
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Use Real API (set to 'true' to use real backend instead of mock)
   VITE_USE_REAL_API=false
   USE_REAL_API=false
   ```

3. **Restart your dev server** after making changes:
   ```bash
   npm run dev
   ```

## Environment Variables

### API Configuration

- **`VITE_API_URL`** or **`API_URL`** - Your backend API URL
  - Example: `http://localhost:3001/api`
  - Example: `https://api.yourdomain.com/api`
  - Default: `/api` (relative path)

- **`VITE_BACKEND_URL`** or **`BACKEND_URL`** - Alternative backend URL (if API is at root)
  - Example: `http://localhost:3001`
  - Example: `https://api.yourdomain.com`

### WebSocket Configuration

- **`VITE_SOCKET_URL`** or **`SOCKET_URL`** - Your WebSocket server URL
  - Example: `http://localhost:3001`
  - Example: `wss://api.yourdomain.com`
  - Default: `http://localhost:3001`

### AI Configuration

- **`GEMINI_API_KEY`** - Google Gemini API key
  - Get from: https://makersuite.google.com/app/apikey
  - Required for AI opponent feature

### API Mode

- **`VITE_USE_REAL_API`** or **`USE_REAL_API`** - Set to `'true'` to use real backend API instead of mock
  - Default: `false` (uses mock data)
  - Set to `'true'` when you have a real backend running

## Important Notes

1. **File Location**: All environment variables should be in `/server/.env`
2. **Variable Prefixes**: 
   - Variables starting with `VITE_` are automatically exposed to the browser
   - Non-prefixed variables (like `API_URL`) are also supported and will be used
3. **Restart Required**: Always restart the dev server after changing `.env` files

## Example `/server/.env` File

```env
# Backend API URL
VITE_API_URL=http://localhost:3001/api
API_URL=http://localhost:3001/api

# WebSocket URL
VITE_SOCKET_URL=http://localhost:3001
SOCKET_URL=http://localhost:3001

# Gemini AI
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Use real API (set to true when backend is ready)
VITE_USE_REAL_API=false
USE_REAL_API=false

# Server port (for backend)
PORT=3001
FRONTEND_URL=http://localhost:3000
```

## Production Deployment

For production, set these environment variables in your hosting platform:

- **Vercel/Netlify**: Add in project settings → Environment Variables
- **Railway/Render**: Add in service settings → Environment Variables

**Important:** 
- Variables must start with `VITE_` to be accessible in the browser
- Restart/redeploy after changing environment variables
