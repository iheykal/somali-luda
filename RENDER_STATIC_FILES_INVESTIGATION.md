# Comprehensive Static File Serving Investigation

## Problem Summary
The browser receives `text/html` MIME type instead of `text/css` for CSS files, causing the stylesheet to fail loading.

## Root Cause Analysis

### Issue #1: Asset Filename Mismatch (PRIMARY CAUSE)
**Browser Request**: `/assets/index-Bj7e5BiJ.css` (OLD filename)
**Actual File**: `/assets/index-DSKhBedl.css` (NEW filename from latest build)

**Why This Happens**:
1. Vite generates new hashed filenames on each build for cache busting
2. Browser cached old `index.html` with references to old asset filenames
3. Server can't find old assets, returns 404 or HTML
4. Browser interprets HTML as CSS, causing MIME type error

### Issue #2: Middleware Order
Current middleware order in `server/server.js` (production mode):
1. CORS middleware
2. express.json()
3. **All API routes** (`/api/*`)
4. Health check (`/health`)
5. **Static file logging middleware**
6. **express.static(absoluteFrontendPath)** - First attempt
7. **Static file logging middleware** (check if served)
8. **app.use('/assets', ...)** - Explicit assets handler
9. **app.get('/')** - Root route
10. **app.get('*')** - Catch-all route

**Problem**: Multiple middleware handling the same static files can cause conflicts.

## Current Build Output
```
dist/
├── assets/
│   ├── index-DSKhBedl.css  ← NEW filename
│   └── index-eUbAmZ6h.js   ← NEW filename
├── audio/
│   └── [audio files]
└── index.html              ← References NEW asset filenames
```

## Solutions

### Solution 1: Clear Browser Cache (USER ACTION)
Users must hard refresh to get new `index.html`:
- Chrome/Edge: `Ctrl + Shift + R` or `Ctrl + F5`
- Firefox: `Ctrl + Shift + R`
- Safari: `Cmd + Shift + R`

### Solution 2: Set Proper Cache Headers
Ensure `index.html` is not cached, but assets are:

```javascript
app.use(express.static(absoluteFrontendPath, {
    index: false,
    maxAge: '1d', // Cache assets for 1 day
    setHeaders: (res, filePath) => {
        // Don't cache index.html
        if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
        // Set MIME types...
    }
}));
```

### Solution 3: Simplify Middleware (RECOMMENDED)
Remove duplicate static file handlers:

```javascript
// Single express.static middleware
app.use(express.static(absoluteFrontendPath, {
    index: false,
    setHeaders: (res, filePath) => {
        // Set cache headers and MIME types
    }
}));

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(absoluteFrontendPath, 'index.html'));
});

// Catch-all for React Router
app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(absoluteFrontendPath, 'index.html'));
});
```

## Verification Steps

### Step 1: Verify Dist Folder
```bash
ls -la dist/assets/
# Should show: index-DSKhBedl.css, index-eUbAmZ6h.js
```

### Step 2: Check index.html References
```bash
cat dist/index.html | grep -E "(\.css|\.js)"
# Should reference: index-DSKhBedl.css, index-eUbAmZ6h.js
```

### Step 3: Test Local Server
```bash
cd server
set NODE_ENV=production
node server.js
```
Open browser: `http://localhost:3001`
- Check Network tab for asset requests
- Verify correct filenames are requested
- Verify Content-Type headers

### Step 4: Check Render Deployment
After deployment, check Render logs for:
```
🔍 Checking for dist folder...
✅ Dist folder found!
📦 Assets found: [ 'index-DSKhBedl.css', 'index-eUbAmZ6h.js' ]
📄 Serving index.html for root path
```

## Critical Files to Check

1. **dist/index.html** - Contains asset references
2. **dist/assets/** - Contains actual CSS/JS files
3. **server/server.js** (lines 2239-2450) - Static file serving logic

## Recommended Fix for Render

1. Ensure build runs before server starts (already configured in `render.yaml`)
2. Add cache control headers to prevent index.html caching
3. Remove duplicate `/assets` middleware (express.static already handles it)
4. Ensure absolute paths are used consistently

## Testing Checklist

- [ ] Build completes successfully
- [ ] dist/index.html references correct asset filenames
- [ ] Assets exist in dist/assets/
- [ ] Server finds dist folder
- [ ] Root path serves index.html
- [ ] Assets are served with correct MIME types
- [ ] Browser doesn't cache index.html
- [ ] Hard refresh loads new assets

