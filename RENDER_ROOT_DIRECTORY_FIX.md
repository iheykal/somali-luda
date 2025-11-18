# Render Root Directory Fix

## ⚠️ IMPORTANT: Root Directory Setting

If you're getting this error:
```
npm error path /opt/render/project/src/package.json
npm error errno -2
npm error enoent Could not read package.json
```

**The issue:** Your Render service has the Root Directory set to `src` instead of the repository root.

## ✅ How to Fix

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your service (e.g., `gemini-ludo-game`)
3. Go to **Settings** tab
4. Scroll to **Build & Deploy** section
5. Find **Root Directory** field
6. **Change it from `src` to `.`** (or leave it empty)
7. Click **Save Changes**

Render will automatically redeploy with the correct root directory.

## 📁 Correct Repository Structure

Your repository structure should be:
```
/
├── package.json          ← Root level
├── render.yaml          ← Root level
├── index.html           ← Root level
├── vite.config.ts       ← Root level
├── server/              ← Subdirectory
│   ├── package.json
│   └── server.js
└── ...
```

The `package.json` is in the **root**, not in a `src/` subdirectory.

## 🔍 Verify Your Settings

After fixing, your Render service settings should have:
- **Root Directory**: `.` (or empty)
- **Build Command**: `npm install && npm run build && cd server && npm install`
- **Start Command**: `cd server && npm start`

