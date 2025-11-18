# Match Diagnostic Report

## Purpose
This document records the diagnostic information for checking if matches are being properly recorded in the system.

## Diagnostic Endpoint
A new diagnostic endpoint has been created at `/api/admin/diagnose/matches` that provides comprehensive information about match recording.

## What It Checks

### 1. Match Revenue Records
- Total number of completed matches in MatchRevenue collection
- Recent match records with winner/loser information
- Commission and bet amounts

### 2. Transaction Records
- BET_PLACED transactions (when players place bets)
- BET_WON transactions (when winners receive winnings)
- BET_LOST transactions (when losers lose their bets)

### 3. Game Completion Status
- Identifies which games have complete transaction records
- Shows incomplete games (missing BET_WON or BET_LOST)
- Groups transactions by gameId

## How to Use

### Via API Call
```javascript
// In browser console or Postman
const token = localStorage.getItem('token');
fetch('http://localhost:3001/api/admin/diagnose/matches', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

### Via Admin API Service
```typescript
import { adminAPI } from './services/adminAPI';

const diagnostic = await adminAPI.diagnoseMatches();
console.log(diagnostic);
```

## Expected Output Structure

```json
{
  "success": true,
  "summary": {
    "totalMatchRevenues": 1,
    "totalBetPlacedTransactions": 2,
    "totalBetWonTransactions": 1,
    "totalBetLostTransactions": 1,
    "incompleteGames": 0,
    "completeGames": 1
  },
  "recentMatches": [
    {
      "gameId": "NXP92B",
      "betAmount": 0.5,
      "totalBet": 1.0,
      "commission": 0.1,
      "winner": { "id": "...", "username": "...", "phone": "..." },
      "loser": { "id": "...", "username": "...", "phone": "..." },
      "completedAt": "2025-11-18T..."
    }
  ],
  "gameStatus": [
    {
      "gameId": "NXP92B",
      "betPlaced": [...],
      "betWon": [...],
      "betLost": [...],
      "isComplete": true
    }
  ],
  "recentTransactions": [...]
}
```

## What to Look For

### ✅ Healthy Match Recording
- `totalMatchRevenues` > 0 (matches are being recorded)
- `totalBetWonTransactions` === `totalBetLostTransactions` (every game has a winner and loser)
- `incompleteGames` === 0 (all games have complete transaction records)
- `completeGames` === number of matches played

### ⚠️ Issues to Watch For
- `incompleteGames` > 0: Some games don't have BET_WON/BET_LOST transactions
- `totalBetWonTransactions` !== `totalBetLostTransactions`: Mismatch in win/loss records
- `totalMatchRevenues` === 0 but games were played: `recordMatchRevenue` not being called

## Server Logs to Check

When a match completes, you should see these logs:
1. `✅ Created BET_WON transaction for winner...`
2. `❌ Created BET_LOST transaction for loser...`
3. `💰 Match revenue recorded for game...`

When viewing user match history:
1. `📊 Match history for user...: Found X transactions`
2. `✅ Found BET_WON for game...`
3. `❌ Found BET_LOST for game...`

## Next Steps

1. Play a test match
2. Call the diagnostic endpoint
3. Check the summary statistics
4. Verify all games show `isComplete: true`
5. Check server console for the log messages above

