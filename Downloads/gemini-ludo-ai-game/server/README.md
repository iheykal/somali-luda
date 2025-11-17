# Ludo Game Server

WebSocket server for online multiplayer Ludo game.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables (optional):
- `PORT` - Server port (default: 3001)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:3000)

3. Run the server:
```bash
npm run dev    # Development mode with auto-reload
npm start      # Production mode
```

## Features

- Real-time game synchronization via WebSocket
- Automatic matchmaking queue system
- Player connection handling
- Automatic cleanup on disconnect
- Game room management

## API Events

### Client → Server
- `search-match` - Join the matchmaking queue to find an opponent
- `cancel-search` - Leave the matchmaking queue
- `game-action` - Send a game action (dice roll, token move, etc.)
- `game-state-update` - Update game state

### Server → Client
- `searching` - Confirmation that player is searching for a match
- `match-found` - A match has been found, game is ready to start
- `search-error` - Error occurred while searching (already in queue/game)
- `search-cancelled` - Search was cancelled successfully
- `game-action` - Receive game action from another player
- `game-state-update` - Receive game state update
- `player-disconnected` - A player disconnected from the game

