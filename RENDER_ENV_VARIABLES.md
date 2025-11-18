# Environment Variables for Render Deployment

## 🔑 Required Environment Variables

Copy and paste these into your Render dashboard:

### 1. Go to Render Dashboard
- Navigate to: https://dashboard.render.com/
- Select your service: `ludo-252`
- Go to "Environment" tab
- Click "Add Environment Variable"

### 2. Add These Variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `CONNECTION_URI` | `mongodb+srv://ludo:ilyaas@ludo.1umgvpn.mongodb.net/ludo?retryWrites=true&w=majority&appName=ludo` |
| `JWT_SECRET` | `8f9a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7` |
| `FRONTEND_URL` | `https://ludo-252.onrender.com` |
| `VITE_API_URL` | `/api` |
| `VITE_USE_REAL_API` | `true` |

### 3. Additional Variables (if needed)

You may also need:

| Key | Value |
|-----|-------|
| `GEMINI_API_KEY` | Your Gemini API key |
| `MONGODB_URI` | Same as CONNECTION_URI (some code may reference this) |
| `VITE_SOCKET_URL` | `https://ludo-252.onrender.com` |

### 4. Save and Deploy

After adding all variables:
1. Click "Save Changes"
2. Render will automatically redeploy your service
3. Wait for deployment to complete (5-10 minutes)

---

## 💻 For Local Development

### Option 1: Create .env file manually

Create `server/.env` file with this content:

```
NODE_ENV=production
CONNECTION_URI=mongodb+srv://ludo:ilyaas@ludo.1umgvpn.mongodb.net/ludo?retryWrites=true&w=majority&appName=ludo
JWT_SECRET=8f9a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7
FRONTEND_URL=https://ludo-252.onrender.com
VITE_API_URL=/api
VITE_USE_REAL_API=true
```

### Option 2: Use CMD script

Run the provided script:
```cmd
set-env-variables.cmd
```

This sets the variables for your current CMD session.

### Option 3: Set in CMD manually

```cmd
set NODE_ENV=production
set CONNECTION_URI=mongodb+srv://ludo:ilyaas@ludo.1umgvpn.mongodb.net/ludo?retryWrites=true^&w=majority^&appName=ludo
set JWT_SECRET=8f9a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7
set FRONTEND_URL=https://ludo-252.onrender.com
set VITE_API_URL=/api
set VITE_USE_REAL_API=true
```

**Note:** The `^&` escapes the `&` character in CMD.

---

## ⚠️ Important Notes

1. **Never commit .env files to git** - They contain sensitive information
2. **The .env file is already in .gitignore** - It won't be pushed to GitHub
3. **Render uses environment variables from dashboard** - Not from .env files
4. **MongoDB URI contains sensitive credentials** - Keep it secret

---

## ✅ Verification

After deployment, check:
1. Render logs show no "undefined" environment variable errors
2. Database connection is successful
3. JWT authentication works
4. Frontend can communicate with backend

