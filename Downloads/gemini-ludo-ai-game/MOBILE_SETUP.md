# Mobile Device Setup Guide

## Connecting from Mobile Device on Same Network

To play from your mobile device on the same Wi-Fi network:

### Step 1: Find Your Computer's Local IP Address

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x)

**Mac/Linux:**
```bash
ifconfig
# or
ip addr
```

Your IP is likely: **192.168.100.32** (from your system)

### Step 2: Start the Server

```bash
cd server
npm run dev
```

The server will be accessible at:
- `http://localhost:3001` (from your computer)
- `http://192.168.100.32:3001` (from mobile device)

### Step 3: Start the Frontend

```bash
npm run dev
```

The frontend will be accessible at:
- `http://localhost:3000` (from your computer)
- `http://192.168.100.32:3000` (from mobile device)

### Step 4: Access from Mobile

1. **Make sure your mobile device is on the same Wi-Fi network** as your computer
2. **Open a browser on your mobile device**
3. **Navigate to:** `http://192.168.100.32:3000`
4. **Click "Multiplayer" → "Find Match"**
5. **On your computer, also open** `http://localhost:3000` and click "Find Match"
6. **Both devices should match automatically!**

### Troubleshooting

**Can't connect from mobile?**
- Check that both devices are on the same Wi-Fi network
- Make sure Windows Firewall allows connections on port 3000 and 3001
- Try accessing `http://192.168.100.32:3001` directly in mobile browser to test server connection

**Firewall Settings (Windows):**
1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Allow Node.js or add ports 3000 and 3001

**Connection still not working?**
- Verify your IP address hasn't changed: `ipconfig`
- Try disabling firewall temporarily to test
- Check router settings - some routers block device-to-device communication

### Quick Test

1. On mobile browser, go to: `http://192.168.100.32:3001`
2. If you see a connection or error (not "can't reach"), the server is accessible
3. If you see "can't reach", check firewall/network settings

