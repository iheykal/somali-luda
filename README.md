<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Gemini Ludo AI Game

A multiplayer Ludo game powered by Google Gemini AI, featuring online multiplayer support via WebSocket.

View your app in AI Studio: https://ai.studio/apps/drive/1-0Ito37XvLvfZlJe1ptSuWPMH8KHU9IK

## Features

- 🎲 AI-powered gameplay using Google Gemini
- 🌐 Online multiplayer support (WebSocket)
- 🎮 Local multiplayer (same device)
- 👥 Single player vs AI
- 📊 Admin dashboard

## Run Locally

**Prerequisites:** Node.js

### Frontend Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` file (optional):
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   VITE_SOCKET_URL=http://localhost:3001
   ```

3. Run the frontend:
   ```bash
   npm run dev
   ```

### Backend Server (for Online Multiplayer)

1. Navigate to server directory:
   ```bash
   cd server
   ```

2. Install server dependencies:
   ```bash
   npm install
   ```

3. Run the server:
   ```bash
   npm run dev    # Development mode
   npm start      # Production mode
   ```

The server runs on port 3001 by default.

## How to Play Online Multiplayer

1. **Start the backend server** (see Backend Server section above)
2. **Start the frontend** (`npm run dev`)
3. **Click "Multiplayer"** from the main menu
4. **Enter your name** (optional, defaults to a random name)
5. **Click "Find Match"** to search for an opponent
6. The system will automatically match you with another player searching for a game
7. Once matched, the game will start automatically!

## Deployment

### Frontend
Deploy to Vercel, Netlify, or any static hosting service.

### Backend
Deploy to Railway, Render, Heroku, or any Node.js hosting service.

**Important:** Update `VITE_SOCKET_URL` in your frontend environment variables to point to your deployed backend URL.
