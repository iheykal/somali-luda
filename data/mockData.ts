// This file contains mock data to simulate a real backend for the admin dashboard.

export const mockUsers = [
  { id: 'u001', name: 'Alice', email: 'alice@example.com', balance: 1250, gamesPlayed: 15, wins: 8, status: 'Active', joined: '2023-10-15' },
  { id: 'u002', name: 'Bob', email: 'bob@example.com', balance: 800, gamesPlayed: 12, wins: 5, status: 'Active', joined: '2023-10-18' },
  { id: 'u003', name: 'Charlie', email: 'charlie@example.com', balance: 2500, gamesPlayed: 25, wins: 18, status: 'Active', joined: '2023-09-01' },
  { id: 'u004', name: 'Diana', email: 'diana@example.com', balance: 50, gamesPlayed: 5, wins: 0, status: 'Suspended', joined: '2023-11-01' },
  { id: 'u005', name: 'Gemini AI', email: 'ai@gemini.dev', balance: null, gamesPlayed: 100, wins: 78, status: 'System', joined: '2023-01-01' },
];

export const mockGames = [
  { 
    id: 'g001', 
    players: ['Alice (u001)', 'Bob (u002)'], 
    stake: 50, 
    pot: 100, 
    winner: 'Alice (u001)', 
    status: 'Completed', 
    startedAt: '2023-11-10T10:00:00Z', 
    duration: '12m 34s',
    moves: [
        { turn: 1, player: 'Alice', roll: 6, move: 'red-0 out of yard' },
        { turn: 2, player: 'Bob', roll: 3, move: 'No move' },
        { turn: 3, player: 'Alice', roll: 4, move: 'red-0 to path 4' },
        // ... more moves
        { turn: 25, player: 'Alice', roll: 5, move: 'red-2 to HOME' },
    ]
  },
  { 
    id: 'g002', 
    players: ['Charlie (u003)', 'Gemini AI'], 
    stake: 100, 
    pot: 200, 
    winner: 'Charlie (u003)', 
    status: 'Completed', 
    startedAt: '2023-11-10T11:30:00Z', 
    duration: '8m 12s',
    moves: [
        { turn: 1, player: 'Charlie', roll: 6, move: 'yellow-0 out of yard' },
        { turn: 2, player: 'Gemini AI', roll: 6, move: 'red-0 out of yard' },
    ]
  },
  { 
    id: 'g003', 
    players: ['Alice (u001)', 'Gemini AI'], 
    stake: 50, 
    pot: 100, 
    winner: null, 
    status: 'In Progress', 
    startedAt: '2023-11-11T09:00:00Z', 
    duration: '5m 02s',
    moves: [
        { turn: 1, player: 'Alice', roll: 6, move: 'red-0 out of yard' },
        { turn: 2, player: 'Gemini AI', roll: 4, move: 'No move' },
    ]
  },
   { 
    id: 'g004', 
    players: ['Diana (u004)', 'Bob (u002)'], 
    stake: 25, 
    pot: 50, 
    winner: null, 
    status: 'Disputed', 
    startedAt: '2023-11-09T14:00:00Z', 
    duration: '15m 50s',
    moves: [
        { turn: 1, player: 'Diana', roll: 1, move: 'No move' },
    ]
  },
];

export const mockTransactions: ({
    id: string;
    userId: string;
    type: "Entry Fee" | "Winnings" | "Commission" | "Manual Adjustment" | "DEPOSIT" | "WITHDRAWAL";
    amount: number;
    date: string;
    description: string;
})[] = [
  { id: 't001', userId: 'u001', type: 'Entry Fee', amount: -50, date: '2023-11-10T10:00:00Z', description: 'Game g001 entry' },
  { id: 't002', userId: 'u002', type: 'Entry Fee', amount: -50, date: '2023-11-10T10:00:00Z', description: 'Game g001 entry' },
  { id: 't003', userId: 'u001', type: 'Winnings', amount: 95, date: '2023-11-10T10:12:34Z', description: 'Game g001 win (5% commission)' },
  { id: 't004', userId: 'platform', type: 'Commission', amount: -5, date: '2023-11-10T10:12:34Z', description: 'Game g001 rake' },
  { id: 't005', userId: 'u003', type: 'Entry Fee', amount: -100, date: '2023-11-10T11:30:00Z', description: 'Game g002 entry' },
  { id: 't006', userId: 'u003', type: 'Winnings', amount: 190, date: '2023-11-10T11:38:12Z', description: 'Game g002 win (5% commission)' },
  { id: 't007', userId: 'platform', type: 'Commission', amount: -10, date: '2023-11-10T11:38:12Z', description: 'Game g002 rake' },
  { id: 't008', userId: 'u004', type: 'Manual Adjustment', amount: 100, date: '2023-11-11T15:00:00Z', description: 'Credited by admin for dispute g004' },
];

export const mockAuditLog = [
    { id: 'a001', admin: 'super_admin', action: "Logged in from IP 192.168.1.100", timestamp: '2023-11-11T14:55:12Z' },
    { id: 'a002', admin: 'super_admin', action: "Viewed details for Game g004", timestamp: '2023-11-11T14:58:03Z' },
    { id: 'a003', admin: 'super_admin', action: "Manually credited 100 to User Diana (u004). Reason: Refund for disputed game g004.", timestamp: '2023-11-11T15:00:00Z' },
    { id: 'a004', admin: 'super_admin', action: "Changed system setting 'commission_rate' from '5' to '7'", timestamp: '2023-11-11T15:02:45Z' },
    { id: 'a005', admin: 'support_staff', action: "Logged in from IP 203.0.113.25", timestamp: '2023-11-11T16:10:05Z' },
    { id: 'a006', admin: 'support_staff', action: "Suspended User Diana (u004). Reason: Fair play violation.", timestamp: '2023-11-11T16:11:30Z' },
].reverse(); // Show newest first by default