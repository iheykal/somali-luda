import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readdirSync } from 'fs';
import User from './models/User.js';
import Transaction from './models/Transaction.js';
import MatchRevenue from './models/MatchRevenue.js';
import AuditLog from './models/AuditLog.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config();

const app = express();

// Security: Improved CORS configuration
const corsOptions = {
    origin: (origin, callback) => {
        // If no origin (same-origin request), allow it
        // This happens when frontend and backend are on the same domain
        if (!origin) {
            return callback(null, true);
        }
        
        // In production, allow specific origins or same-origin
        // BUT also allow local network IPs for local development/testing
        if (process.env.NODE_ENV === 'production') {
            const allowedOrigins = process.env.FRONTEND_URL?.split(',') || [];
            
            // First check if it's a local network IP (for local testing even in production mode)
            const localNetworkPatterns = [
                /^http:\/\/localhost:\d+$/,
                /^http:\/\/127\.0\.0\.1:\d+$/,
                /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
                /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
                /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/
            ];
            const isLocalNetwork = localNetworkPatterns.some(pattern => pattern.test(origin));
            
            if (isLocalNetwork) {
                // Allow local network IPs even in production mode (for local testing)
                console.log(`✅ CORS allowing local network origin (production mode): ${origin}`);
                callback(null, origin);
            } else if (allowedOrigins.includes(origin)) {
                // Allow explicitly configured origins
                callback(null, true);
            } else {
                // If FRONTEND_URL is not set, allow all (for same-origin deployment)
                // Otherwise, reject
                if (allowedOrigins.length === 0) {
                    callback(null, true);
                } else {
                    console.warn(`⚠️  CORS blocked origin in production: ${origin}`);
                    callback(new Error('Not allowed by CORS'));
                }
            }
        } else {
            // Development: Allow localhost and local network - be very permissive
            const allowedPatterns = [
                /^http:\/\/localhost:\d+$/,
                /^http:\/\/127\.0\.0\.1:\d+$/,
                /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
                /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
                /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/
            ];
            const isAllowed = allowedPatterns.some(pattern => pattern.test(origin)) || 
                            process.env.FRONTEND_URL?.split(',').includes(origin);
            if (isAllowed) {
                console.log(`✅ CORS allowing origin: ${origin}`);
                callback(null, origin);
            } else {
                // In development, be permissive - allow the origin anyway
                console.log(`⚠️  CORS pattern not matched, but allowing in dev: ${origin}`);
                callback(null, origin);
            }
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

// Manual OPTIONS handler (MUST be before CORS middleware to handle preflight)
app.options('*', (req, res) => {
    const origin = req.headers.origin;
    console.log('🔍 OPTIONS request received (manual handler):', {
        origin: origin,
        path: req.path,
        method: req.method,
        headers: req.headers['access-control-request-headers']
    });
    
    // Always allow network IPs in development
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (!origin) {
        res.header('Access-Control-Allow-Origin', '*');
    } else {
        if (!isProduction) {
            // Development: Allow localhost and network IPs
            const allowedPatterns = [
                /^http:\/\/localhost:\d+$/,
                /^http:\/\/127\.0\.0\.1:\d+$/,
                /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
                /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
                /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/
            ];
            const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
            console.log('🔍 Origin check:', { origin, isAllowed, patterns: allowedPatterns.map(p => p.toString()) });
            if (isAllowed) {
                res.header('Access-Control-Allow-Origin', origin);
                console.log('✅ Allowed origin:', origin);
            } else {
                // In development, allow all origins
                res.header('Access-Control-Allow-Origin', origin);
                console.log('✅ Allowed origin (dev fallback):', origin);
            }
        } else {
            // Production: Check FRONTEND_URL
            const allowedOrigins = process.env.FRONTEND_URL?.split(',') || [];
            if (allowedOrigins.includes(origin) || allowedOrigins.length === 0) {
                res.header('Access-Control-Allow-Origin', origin || '*');
            } else {
                res.header('Access-Control-Allow-Origin', '*');
            }
        }
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    
    console.log('✅ OPTIONS response headers set');
    res.sendStatus(200);
});

// Apply CORS middleware (after OPTIONS handler)
app.use(cors(corsOptions));

// Add CORS headers to all responses (safety net)
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Debug logging for CORS (development only)
    if (process.env.NODE_ENV !== 'production') {
        if (req.method === 'OPTIONS') {
            console.log('🔍 CORS Preflight Request:', {
                origin: origin,
                method: req.method,
                path: req.path,
                headers: req.headers['access-control-request-headers']
            });
        }
    }
    
    // Set CORS headers for all requests
    if (origin) {
        const isProduction = process.env.NODE_ENV === 'production';
        if (!isProduction) {
            // Development: Allow localhost
            const allowedPatterns = [
                /^http:\/\/localhost:\d+$/,
                /^http:\/\/127\.0\.0\.1:\d+$/,
                /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
                /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
                /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/
            ];
            const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
            if (isAllowed) {
                res.header('Access-Control-Allow-Origin', origin);
            }
        } else {
            // Production: Check FRONTEND_URL
            const allowedOrigins = process.env.FRONTEND_URL?.split(',') || [];
            if (allowedOrigins.includes(origin) || allowedOrigins.length === 0) {
                res.header('Access-Control-Allow-Origin', origin);
            }
        }
    }
    
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    
    next();
});

app.use(express.json()); // Parse JSON bodies

// Security: Trust proxy for accurate IP addresses (important for rate limiting)
app.set('trust proxy', 1);

const httpServer = createServer(app);

// JWT Secret (use environment variable or default)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Security: Warn if using default JWT secret in production
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'your-secret-key-change-in-production') {
    console.error('⚠️  WARNING: Using default JWT_SECRET in production! This is a security risk!');
    console.error('⚠️  Please set JWT_SECRET environment variable to a strong random string.');
}

// ===== SECURITY: Rate Limiters =====
const walletLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 requests per windowMs
    message: 'Too many wallet requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 30 * 60 * 1000, // 30 minutes
    max: 5, // limit each IP to 5 login attempts per 30 minutes
    message: 'Too many authentication attempts from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many admin requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// ===== SECURITY: Input Validation Helpers =====
const validateAmount = (amount, min = 0.01, max = 100000) => {
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
        return { valid: false, error: 'Amount must be a valid number' };
    }
    if (amount <= 0) {
        return { valid: false, error: 'Amount must be greater than zero' };
    }
    if (amount < min) {
        return { valid: false, error: `Minimum amount is $${min}` };
    }
    if (amount > max) {
        return { valid: false, error: `Maximum amount is $${max}` };
    }
    // Check for more than 2 decimal places
    if (Math.round(amount * 100) !== amount * 100) {
        return { valid: false, error: 'Amount must have at most 2 decimal places' };
    }
    return { valid: true };
};

// Check if user has pending deposit
const hasPendingDeposit = async (userId) => {
    const pendingDeposit = await Transaction.findOne({
        userId: userId,
        type: 'DEPOSIT',
        status: 'pending'
    });
    return !!pendingDeposit;
};

// Check if user has pending withdrawal
const hasPendingWithdrawal = async (userId) => {
    const pendingWithdrawal = await Transaction.findOne({
        userId: userId,
        type: 'WITHDRAWAL',
        status: 'pending'
    });
    return !!pendingWithdrawal;
};

// Check if user has withdrawn in the last 24 hours
const hasWithdrawnInLast24Hours = async (userId) => {
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    
    const recentWithdrawal = await Transaction.findOne({
        userId: userId,
        type: 'WITHDRAWAL',
        status: { $in: ['pending', 'approved'] },
        createdAt: { $gte: oneDayAgo }
    });
    return !!recentWithdrawal;
};

// Check if wallet balance would exceed maximum ($300)
const wouldExceedMaxBalance = (currentBalance, amountToAdd) => {
    const MAX_WALLET_BALANCE = 300;
    return (currentBalance + amountToAdd) > MAX_WALLET_BALANCE;
};

// ===== SECURITY: Audit Logging =====
const auditLog = async (action, req, details = {}) => {
    try {
        const logEntry = new AuditLog({
            action,
            userId: req.user?._id || null,
            adminId: req.user?.isAdmin || req.user?.isSuperAdmin ? req.user._id : null,
            transactionId: details.transactionId || null,
            details: {
                ...details,
                endpoint: req.path,
                method: req.method
            },
            ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
            userAgent: req.get('user-agent') || 'unknown',
            severity: details.severity || 'low',
            timestamp: new Date()
        });
        await logEntry.save();
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw - audit logging failure shouldn't break the app
    }
};

// ===== SECURITY: Balance Reconciliation =====
const reconcileUserBalance = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            return { success: false, error: 'User not found' };
        }

        // Get all approved/completed transactions
        const transactions = await Transaction.find({
            userId: userId,
            status: { $in: ['approved', 'completed'] }
        }).sort({ createdAt: 1 });

        let calculatedBalance = 0;
        transactions.forEach(tx => {
            if (tx.type === 'DEPOSIT' || tx.type === 'BET_WON' || tx.type === 'MANUAL_ADJUSTMENT') {
                calculatedBalance += Math.abs(tx.amount);
            } else if (tx.type === 'WITHDRAWAL' || tx.type === 'BET_PLACED' || tx.type === 'BET_LOST') {
                calculatedBalance -= Math.abs(tx.amount);
            }
        });

        const difference = Math.abs(user.balance - calculatedBalance);
        const tolerance = 0.01; // Allow 1 cent difference for rounding

        if (difference > tolerance) {
            console.error(`⚠️  Balance mismatch for user ${userId}: stored=${user.balance}, calculated=${calculatedBalance}, difference=${difference}`);
            return {
                success: false,
                mismatch: true,
                storedBalance: user.balance,
                calculatedBalance: calculatedBalance,
                difference: difference
            };
        }

        return {
            success: true,
            storedBalance: user.balance,
            calculatedBalance: calculatedBalance
        };
    } catch (error) {
        console.error('Balance reconciliation error:', error);
        return { success: false, error: error.message };
    }
};

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

const io = new Server(httpServer, {
  cors: corsOptions
});

// In-memory game storage (use Redis or database in production)
const games = new Map();
// Matchmaking queue
const matchmakingQueue = [];
// Matchmaking interval (periodic check for matches)
let matchmakingInterval = null;

// Generate unique game ID
const generateGameId = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Deduct bet from both players when match starts
const deductBetsFromPlayers = async (gameId, game) => {
  try {
    const betAmount = game.betAmount || 0.5;
    
    // Deduct from player 1
    if (game.player1UserId) {
      const user1 = await User.findById(game.player1UserId);
      if (user1) {
        const balanceBefore = user1.balance || 0;
        if (balanceBefore < betAmount) {
          console.error(`❌ Player 1 (${game.player1UserId}) has insufficient balance: $${balanceBefore} < $${betAmount}`);
          return { success: false, error: 'Player 1 has insufficient balance' };
        }
        const balanceAfter = balanceBefore - betAmount;
        user1.balance = balanceAfter;
        await user1.save();

        // Create BET_PLACED transaction
        const transaction1 = new Transaction({
          userId: game.player1UserId,
          type: 'BET_PLACED',
          amount: -betAmount,
          balanceBefore: balanceBefore,
          balanceAfter: balanceAfter,
          status: 'completed',
          description: `Bet placed for match ${gameId}`,
          gameId: gameId
        });
        await transaction1.save();
        console.log(`💰 Deducted $${betAmount} from player 1 (${game.player1UserId}) for game ${gameId}`);
      }
    }

    // Deduct from player 2
    if (game.player2UserId) {
      const user2 = await User.findById(game.player2UserId);
      if (user2) {
        const balanceBefore = user2.balance || 0;
        if (balanceBefore < betAmount) {
          console.error(`❌ Player 2 (${game.player2UserId}) has insufficient balance: $${balanceBefore} < $${betAmount}`);
          return { success: false, error: 'Player 2 has insufficient balance' };
        }
        const balanceAfter = balanceBefore - betAmount;
        user2.balance = balanceAfter;
        await user2.save();

        // Create BET_PLACED transaction
        const transaction2 = new Transaction({
          userId: game.player2UserId,
          type: 'BET_PLACED',
          amount: -betAmount,
          balanceBefore: balanceBefore,
          balanceAfter: balanceAfter,
          status: 'completed',
          description: `Bet placed for match ${gameId}`,
          gameId: gameId
        });
        await transaction2.save();
        console.log(`💰 Deducted $${betAmount} from player 2 (${game.player2UserId}) for game ${gameId}`);
      }
    }

    return { success: true };
  } catch (error) {
    console.error(`❌ Error deducting bets for game ${gameId}:`, error);
    return { success: false, error: error.message };
  }
};

// Record match revenue when game ends
const recordMatchRevenue = async (gameId, gameState, game) => {
  try {
    // Check if revenue already recorded for this game
    const existingRevenue = await MatchRevenue.findOne({ gameId });
    if (existingRevenue) {
      console.log(`💰 Revenue already recorded for game ${gameId}`);
      return;
    }

    const winnerColor = gameState.winners[0];
    const betAmount = game.betAmount || 0.5; // Get bet amount from game
    const totalBet = betAmount * 2; // Total bet pool
    const commissionRate = 0.10; // 10%
    const commission = totalBet * commissionRate; // Commission amount

    // Determine winner and loser user IDs
    let winnerUserId, loserUserId;
    
    if (game.player1Color === winnerColor) {
      winnerUserId = game.player1UserId;
      loserUserId = game.player2UserId;
    } else {
      winnerUserId = game.player2UserId;
      loserUserId = game.player1UserId;
    }

    if (!winnerUserId || !loserUserId) {
      console.error(`❌ Cannot record revenue: Missing userIds for game ${gameId}`);
      return;
    }

    // Get winner and loser users
    const winner = await User.findById(winnerUserId);
    const loser = await User.findById(loserUserId);

    if (!winner || !loser) {
      console.error(`❌ Cannot record revenue: Users not found for game ${gameId}`);
      return;
    }

    // Calculate winner amount (total bet - commission)
    const winnerAmount = totalBet - commission;

    // Update winner balance
    const winnerBalanceBefore = winner.balance || 0;
    const winnerBalanceAfter = winnerBalanceBefore + winnerAmount;
    winner.balance = winnerBalanceAfter;
    await winner.save();

    // Create BET_WON transaction for winner
    const winnerTransaction = new Transaction({
      userId: winnerUserId,
      type: 'BET_WON',
      amount: winnerAmount,
      balanceBefore: winnerBalanceBefore,
      balanceAfter: winnerBalanceAfter,
      status: 'completed',
      description: `Won match ${gameId} with bet of $${betAmount}`,
      gameId: gameId
    });
    await winnerTransaction.save();
    console.log(`✅ Created BET_WON transaction for winner ${winnerUserId} in game ${gameId}: $${winnerAmount}`);

    // Create BET_LOST transaction for loser (already deducted, just record it)
    const loserTransaction = new Transaction({
      userId: loserUserId,
      type: 'BET_LOST',
      amount: -betAmount,
      balanceBefore: (loser.balance || 0) + betAmount, // Balance before bet was placed
      balanceAfter: loser.balance || 0,
      status: 'completed',
      description: `Lost match ${gameId} with bet of $${betAmount}`,
      gameId: gameId
    });
    await loserTransaction.save();
    console.log(`❌ Created BET_LOST transaction for loser ${loserUserId} in game ${gameId}: -$${betAmount}`);

    // Create match revenue record
    const matchRevenue = new MatchRevenue({
      gameId: gameId,
      betAmount: betAmount,
      totalBet: totalBet,
      commission: commission,
      commissionRate: commissionRate,
      winnerId: winnerUserId,
      loserId: loserUserId,
      winnerAmount: winnerAmount,
      status: 'completed',
      completedAt: new Date()
    });

    await matchRevenue.save();
    console.log(`💰 Match revenue recorded for game ${gameId}: $${commission.toFixed(2)} commission from $${totalBet.toFixed(2)} total bet (bet: $${betAmount})`);
  } catch (error) {
    console.error(`❌ Error recording match revenue for ${gameId}:`, error);
  }
};

// Match players in queue - process all available matches
const matchPlayers = async () => {
  // Group players by betAmount
  const playersByBet = {};
  for (let i = matchmakingQueue.length - 1; i >= 0; i--) {
    const player = matchmakingQueue[i];
    if (!player.socket.connected) {
      matchmakingQueue.splice(i, 1);
      continue;
    }
    const betKey = player.betAmount || 0.5;
    if (!playersByBet[betKey]) {
      playersByBet[betKey] = [];
    }
    playersByBet[betKey].push(player);
  }

  // Match players with same bet amount
  for (const betAmount in playersByBet) {
    const players = playersByBet[betAmount];
    while (players.length >= 2) {
      const player1 = players.shift();
      const player2 = players.shift();
      
      // Remove from main queue
      const index1 = matchmakingQueue.findIndex(p => p.socketId === player1.socketId);
      const index2 = matchmakingQueue.findIndex(p => p.socketId === player2.socketId);
      if (index1 !== -1) matchmakingQueue.splice(index1, 1);
      if (index2 !== -1) matchmakingQueue.splice(index2, 1);
      
      // Verify both sockets are still connected
      if (!player1.socket.connected || !player2.socket.connected) {
        console.log(`Skipping match - one or both players disconnected`);
        // Re-add the connected player back to queue if still connected
        if (player1.socket.connected) {
          matchmakingQueue.push(player1);
        }
        if (player2.socket.connected) {
          matchmakingQueue.push(player2);
        }
        continue;
      }
      
      const gameId = generateGameId();
      const colors = ['red', 'yellow'];
      const shuffledColors = colors.sort(() => Math.random() - 0.5);
      const betAmountNum = parseFloat(betAmount);
      
      const game = {
        id: gameId,
        player1Id: player1.socketId,
        player1Color: shuffledColors[0],
        player1UserId: player1.userId,
        player2Id: player2.socketId,
        player2Color: shuffledColors[1],
        player2UserId: player2.userId,
        betAmount: betAmountNum,
        state: null,
        players: [],
        revenueRecorded: false,
        betsDeducted: false
      };
      
      // Check if both players have sufficient balance before starting match
      if (player1.userId && player2.userId) {
        const user1 = await User.findById(player1.userId);
        const user2 = await User.findById(player2.userId);
        
        if (!user1 || (user1.balance || 0) < betAmountNum) {
          player1.socket.emit('search-error', { message: `Insufficient balance. You need $${betAmountNum} to play.` });
          if (user2 && (user2.balance || 0) >= betAmountNum) {
            matchmakingQueue.push(player2);
          }
          continue;
        }
        
        if (!user2 || (user2.balance || 0) < betAmountNum) {
          player2.socket.emit('search-error', { message: `Insufficient balance. You need $${betAmountNum} to play.` });
          if (user1 && (user1.balance || 0) >= betAmountNum) {
            matchmakingQueue.push(player1);
          }
          continue;
        }
      }
      
      games.set(gameId, game);
      
      // Deduct bets from both players
      const betResult = await deductBetsFromPlayers(gameId, game);
      if (!betResult.success) {
        console.error(`❌ Failed to deduct bets for game ${gameId}:`, betResult.error);
        player1.socket.emit('search-error', { message: 'Failed to process bet. Please try again.' });
        player2.socket.emit('search-error', { message: 'Failed to process bet. Please try again.' });
        games.delete(gameId);
        // Re-add players to queue
        matchmakingQueue.push(player1);
        matchmakingQueue.push(player2);
        continue;
      }
      
      game.betsDeducted = true;
      
      // Both players join the game room
      player1.socket.join(gameId);
      player2.socket.join(gameId);
      
      // Notify both players they've been matched
      const matchData1 = {
        gameId,
        playerColor: shuffledColors[0],
        opponentName: player2.playerName || 'Player 2'
      };
      const matchData2 = {
        gameId,
        playerColor: shuffledColors[1],
        opponentName: player1.playerName || 'Player 1'
      };
      
      console.log(`📤 Sending match-found to player1 (${player1.socketId}):`, matchData1);
      console.log(`📤 Sending match-found to player2 (${player2.socketId}):`, matchData2);
      
      player1.socket.emit('match-found', matchData1);
      player2.socket.emit('match-found', matchData2);
      
      console.log(`✅ Matched players: ${player1.socketId} (${player1.playerName}) and ${player2.socketId} (${player2.playerName}) in game ${gameId} with bet $${betAmountNum}`);
    }
  }
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join matchmaking queue
  socket.on('search-match', async ({ playerName, userId, betAmount }) => {
    // Check if player is already in queue
    const alreadyInQueue = matchmakingQueue.find(p => p.socketId === socket.id);
    if (alreadyInQueue) {
      socket.emit('search-error', { message: 'Already searching for a match' });
      return;
    }
    
    // Check if player is already in a game
    for (const [gameId, game] of games.entries()) {
      if (game.player1Id === socket.id || game.player2Id === socket.id) {
        socket.emit('search-error', { message: 'Already in a game' });
        return;
      }
    }
    
    // Verify socket is connected
    if (!socket.connected) {
      socket.emit('search-error', { message: 'Not connected to server' });
      return;
    }

    // Validate bet amount
    const validBetAmounts = [0.5, 1, 2];
    const betAmountNum = parseFloat(betAmount) || 0.5;
    if (!validBetAmounts.includes(betAmountNum)) {
      socket.emit('search-error', { message: 'Invalid bet amount. Must be $0.5, $1, or $2' });
      return;
    }

    // Check if user has sufficient balance (if userId provided)
    if (userId) {
      try {
        const user = await User.findById(userId);
        if (!user) {
          socket.emit('search-error', { message: 'User not found. Please log in again.' });
          return;
        }
        if ((user.balance || 0) < betAmountNum) {
          socket.emit('search-error', { message: `Insufficient balance. You need $${betAmountNum} to play. Current balance: $${(user.balance || 0).toFixed(2)}` });
          return;
        }
      } catch (error) {
        console.error('Error checking user balance:', error);
        socket.emit('search-error', { message: 'Error checking balance. Please try again.' });
        return;
      }
    }
    
    // Add to queue
    const playerInfo = {
      socketId: socket.id,
      socket: socket,
      playerName: playerName || `Player ${socket.id.substring(0, 6)}`,
      userId: userId || null,
      betAmount: betAmountNum,
      joinedAt: Date.now()
    };
    
    matchmakingQueue.push(playerInfo);
    
    socket.emit('searching', { message: `Searching for opponent with $${betAmountNum} bet...` });
    console.log(`🔍 Player ${socket.id} (${playerName || 'Anonymous'}) joined matchmaking queue with bet $${betAmountNum}. Queue size: ${matchmakingQueue.length}`);
    
    // Try to match immediately - use setImmediate to ensure queue is updated
    setImmediate(async () => {
      await matchPlayers();
    });
    
    // Also set up a periodic check to catch any missed matches (safety net)
    // This ensures players get matched even if there's a timing issue
    if (!matchmakingInterval) {
      matchmakingInterval = setInterval(async () => {
        if (matchmakingQueue.length >= 2) {
          await matchPlayers();
        }
        // Clear interval if queue is empty for a while (cleanup)
        if (matchmakingQueue.length === 0) {
          // Keep interval running, it's lightweight
        }
      }, 300); // Check every 300ms for faster matching
    }
  });

  // Cancel matchmaking search
  socket.on('cancel-search', () => {
    const index = matchmakingQueue.findIndex(p => p.socketId === socket.id);
    if (index !== -1) {
      matchmakingQueue.splice(index, 1);
      socket.emit('search-cancelled');
      console.log(`Player ${socket.id} cancelled search. Queue size: ${matchmakingQueue.length}`);
    }
  });

  // Send game action
  socket.on('game-action', ({ gameId, action, playerId }) => {
    const game = games.get(gameId);
    if (!game) {
      console.warn(`⚠️ Game action received for non-existent game: ${gameId}`);
      return;
    }
    
    // Verify player is in this game
    if (game.player1Id !== socket.id && game.player2Id !== socket.id) {
      console.warn(`⚠️ Game action from unauthorized player: ${socket.id} in game ${gameId}`);
      return;
    }
    
    // Broadcast to other players in the room
    const targetCount = io.sockets.adapter.rooms.get(gameId)?.size || 0;
    socket.to(gameId).emit('game-action', { action, playerId });
    console.log(`📤 Game action broadcasted in ${gameId} by ${playerId} (${socket.id}), action: ${action.type}, target players: ${targetCount - 1}`);
  });

  // Update game state
  socket.on('game-state-update', async ({ gameId, state }) => {
    const game = games.get(gameId);
    if (game) {
      // Verify player is in this game
      if (game.player1Id !== socket.id && game.player2Id !== socket.id) {
        console.log(`⚠️ Game state update rejected: Player ${socket.id} not in game ${gameId}`);
        return;
      }
      
      // Log all state updates to track what's being received
      console.log(`📥 Game state update received for ${gameId}:`, {
        turnState: state.turnState,
        hasWinners: !!(state.winners && state.winners.length > 0),
        winnersCount: state.winners?.length || 0,
        winners: state.winners,
        revenueRecorded: game.revenueRecorded
      });
      
      game.state = state;
      
      // Debug logging for game state updates
      if (state.turnState === 'GAMEOVER') {
        console.log(`🎯 GAMEOVER state received for game ${gameId}:`, {
          turnState: state.turnState,
          winners: state.winners,
          revenueRecorded: game.revenueRecorded,
          player1UserId: game.player1UserId,
          player2UserId: game.player2UserId
        });
      }
      
      // Check if game is over and record match revenue
      // Also check if winners array has entries even if turnState isn't GAMEOVER (fallback)
      const hasWinners = state.winners && state.winners.length > 0;
      const isGameOver = state.turnState === 'GAMEOVER' || hasWinners;
      
      if (isGameOver && hasWinners && !game.revenueRecorded) {
        console.log(`💰 Attempting to record revenue for game ${gameId}...`);
        await recordMatchRevenue(gameId, state, game);
        game.revenueRecorded = true;
        console.log(`✅ Revenue recording completed for game ${gameId}`);
        
        // Get winner amount to send to clients
        const betAmount = game.betAmount || 0.5;
        const totalBet = betAmount * 2;
        const commission = totalBet * 0.10; // 10%
        const winnerAmount = totalBet - commission;
        
        // Add winner info to state for display
        const winnerColor = state.winners[0];
        const winnerInfo = {
          winnerColor: winnerColor,
          winnerAmount: winnerAmount,
          betAmount: betAmount
        };
        
        // Broadcast state with winner info
        const stateWithWinnerInfo = {
          ...state,
          winnerInfo: winnerInfo
        };
        
        // Broadcast to all players in the game
        io.to(gameId).emit('game-state-update', { state: stateWithWinnerInfo });
        socket.emit('game-state-update', { state: stateWithWinnerInfo });
        console.log(`📊 Game state updated with winner info: $${winnerAmount.toFixed(2)} won by ${winnerColor}`);
      } else {
        // Broadcast to other players
        socket.to(gameId).emit('game-state-update', { state });
        console.log(`📊 Game state updated and broadcasted for game ${gameId}`);
      }
    }
  });

  // Request game state sync (for recovery)
  socket.on('request-state-sync', ({ gameId }) => {
    const game = games.get(gameId);
    if (game && (game.player1Id === socket.id || game.player2Id === socket.id)) {
      // Send current game state to the requesting player
      if (game.state) {
        socket.emit('game-state-update', { state: game.state });
        console.log(`🔄 State sync sent to ${socket.id} for game ${gameId}`);
      }
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove from matchmaking queue
    const queueIndex = matchmakingQueue.findIndex(p => p.socketId === socket.id);
    if (queueIndex !== -1) {
      matchmakingQueue.splice(queueIndex, 1);
      console.log(`Player ${socket.id} removed from queue. Queue size: ${matchmakingQueue.length}`);
    }
    
    // Clean up games when player disconnects
    for (const [gameId, game] of games.entries()) {
      if (game.player1Id === socket.id || game.player2Id === socket.id) {
        io.to(gameId).emit('player-disconnected', { playerId: socket.id });
        games.delete(gameId);
        console.log(`Game ${gameId} deleted due to player disconnect`);
      }
    }
  });
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    const connectionURI = process.env.CONNECTION_URI;
    if (!connectionURI) {
      console.warn('⚠️  CONNECTION_URI not found in .env file. MongoDB connection skipped.');
      return;
    }
    
    await mongoose.connect(connectionURI);
    console.log('✅ MongoDB connected successfully');
    console.log(`📦 Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('⚠️  Server will continue without database connection');
  }
};

// ===== AUTHENTICATION ROUTES =====

// Register new user
app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
        const { username, phone, password } = req.body;

        // Validation
        if (!username || !phone || !password) {
            return res.status(400).json({ error: 'Username, phone, and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this phone number already exists' });
        }

        // Create new user
        const user = new User({
            username,
            phone,
            password, // Will be hashed by pre-save hook
            balance: 0,
            isAdmin: false,
            isSuperAdmin: false
        });

        await user.save();

        // Audit log
        await auditLog('USER_CREATED', req, {
            username: user.username,
            phone: user.phone,
            userId: user._id
        });

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, phone: user.phone },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Return user data (without password)
        const userData = {
            _id: user._id,
            username: user.username,
            phone: user.phone,
            balance: user.balance,
            isAdmin: user.isAdmin,
            isSuperAdmin: user.isSuperAdmin
        };

        res.status(201).json({
            token,
            user: userData
        });
    } catch (error) {
        console.error('Registration error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Phone number already exists' });
        }
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// Login user
app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { phone, password } = req.body;

        // Validation
        if (!phone || !password) {
            return res.status(400).json({ error: 'Phone and password are required' });
        }

        // Find user
        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(401).json({ error: 'Invalid phone number or password' });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            // Audit log failed login attempt
            await auditLog('SUSPICIOUS_ACTIVITY', req, {
                action: 'FAILED_LOGIN',
                phone: phone,
                severity: 'medium'
            });
            return res.status(401).json({ error: 'Invalid phone number or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, phone: user.phone },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Return user data (without password)
        const userData = {
            _id: user._id,
            username: user.username,
            phone: user.phone,
            balance: user.balance,
            isAdmin: user.isAdmin,
            isSuperAdmin: user.isSuperAdmin
        };

        res.json({
            token,
            user: userData
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// Get current user profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const userData = {
            _id: req.user._id,
            username: req.user.username,
            phone: req.user.phone,
            balance: req.user.balance,
            isAdmin: req.user.isAdmin,
            isSuperAdmin: req.user.isSuperAdmin
        };
        res.json(userData);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to load profile' });
    }
});

// Get user balance
app.get('/api/auth/balance', authenticateToken, async (req, res) => {
    try {
        res.json({ balance: req.user.balance || 0 });
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ error: 'Failed to load balance' });
    }
});

// ===== WALLET ROUTES =====

// Deposit money
app.post('/api/wallet/deposit', walletLimiter, authenticateToken, async (req, res) => {
    try {
        const { amount, paymentReference, paymentGateway } = req.body;

        // Security: Enhanced validation
        const amountValidation = validateAmount(amount, 1, 100000);
        if (!amountValidation.valid) {
            await auditLog('SUSPICIOUS_ACTIVITY', req, {
                action: 'INVALID_DEPOSIT_AMOUNT',
                amount: amount,
                severity: 'medium'
            });
            return res.status(400).json({ error: amountValidation.error });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Security: Check if user has pending deposit
        const hasPending = await hasPendingDeposit(user._id);
        if (hasPending) {
            await auditLog('SUSPICIOUS_ACTIVITY', req, {
                action: 'MULTIPLE_PENDING_DEPOSITS',
                userId: user._id,
                severity: 'medium'
            });
            return res.status(400).json({ 
                error: 'You already have a pending deposit request. Please wait for admin approval or rejection before requesting another deposit.' 
            });
        }

        const balanceBefore = user.balance || 0;

        // Security: Check if deposit would exceed maximum wallet balance ($300)
        if (wouldExceedMaxBalance(balanceBefore, amount)) {
            const maxAllowed = 300 - balanceBefore;
            await auditLog('SUSPICIOUS_ACTIVITY', req, {
                action: 'DEPOSIT_EXCEEDS_MAX_BALANCE',
                userId: user._id,
                currentBalance: balanceBefore,
                requestedAmount: amount,
                maxAllowed: maxAllowed,
                severity: 'medium'
            });
            return res.status(400).json({ 
                error: `Maximum wallet balance is $300. Your current balance is $${balanceBefore.toFixed(2)}. Maximum deposit allowed is $${maxAllowed.toFixed(2)}.` 
            });
        }

        // Balance will be updated after admin approval
        const balanceAfter = balanceBefore; // Keep same until approved

        // Create pending deposit transaction
        const transaction = new Transaction({
            userId: user._id,
            type: 'DEPOSIT',
            amount: amount,
            balanceBefore: balanceBefore,
            balanceAfter: balanceAfter,
            status: 'pending', // Requires admin approval
            description: `Deposit request of $${amount}`,
            paymentReference: paymentReference || null,
            paymentGateway: paymentGateway || 'manual'
        });

        await transaction.save();

        // Balance is NOT updated until admin approves
        // user.balance remains unchanged

        // Audit log
        await auditLog('DEPOSIT_CREATED', req, {
            transactionId: transaction._id,
            amount: amount,
            userId: user._id
        });

        res.json({
            success: true,
            message: 'Deposit request submitted. Pending admin approval.',
            transaction: {
                id: transaction._id,
                amount: amount,
                status: transaction.status
            }
        });
    } catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({ error: 'Deposit failed. Please try again.' });
    }
});

// Request withdrawal
app.post('/api/wallet/withdraw', walletLimiter, authenticateToken, async (req, res) => {
    try {
        const { amount, withdrawalMethod, phoneNumber, recipientName, accountNumber, bankName } = req.body;

        // Security: Enhanced validation
        const amountValidation = validateAmount(amount, 3, 100000);
        if (!amountValidation.valid) {
            await auditLog('SUSPICIOUS_ACTIVITY', req, {
                action: 'INVALID_WITHDRAWAL_AMOUNT',
                amount: amount,
                severity: 'medium'
            });
            return res.status(400).json({ error: amountValidation.error });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Security: Check if user has pending withdrawal
        const hasPending = await hasPendingWithdrawal(user._id);
        if (hasPending) {
            await auditLog('SUSPICIOUS_ACTIVITY', req, {
                action: 'MULTIPLE_PENDING_WITHDRAWALS',
                userId: user._id,
                severity: 'medium'
            });
            return res.status(400).json({ 
                error: 'You already have a pending withdrawal request. Please wait for admin approval or rejection before requesting another withdrawal.' 
            });
        }

        // Security: Check if user has withdrawn in the last 24 hours
        const hasRecentWithdrawal = await hasWithdrawnInLast24Hours(user._id);
        if (hasRecentWithdrawal) {
            await auditLog('SUSPICIOUS_ACTIVITY', req, {
                action: 'WITHDRAWAL_WITHIN_24_HOURS',
                userId: user._id,
                severity: 'medium'
            });
            return res.status(400).json({ 
                error: 'You can only make one withdrawal request every 24 hours. Please wait before requesting another withdrawal.' 
            });
        }

        const balanceBefore = user.balance || 0;

        // Security: Check sufficient balance - user cannot withdraw more than what's in wallet
        if (balanceBefore < amount) {
            await auditLog('SUSPICIOUS_ACTIVITY', req, {
                action: 'INSUFFICIENT_BALANCE_WITHDRAWAL',
                userId: user._id,
                requestedAmount: amount,
                currentBalance: balanceBefore,
                severity: 'medium'
            });
            return res.status(400).json({ 
                error: `Insufficient balance. Your current balance is $${balanceBefore.toFixed(2)}. You cannot withdraw more than what is in your wallet.` 
            });
        }

        const balanceAfter = balanceBefore - amount;

        // Create pending withdrawal transaction
        const transaction = new Transaction({
            userId: user._id,
            type: 'WITHDRAWAL',
            amount: -amount, // Negative for withdrawal
            balanceBefore: balanceBefore,
            balanceAfter: balanceAfter,
            status: 'pending', // Requires admin approval
            description: `Withdrawal request of $${amount}`,
            withdrawalMethod: withdrawalMethod || 'evc_plus',
            withdrawalDetails: {
                phoneNumber: phoneNumber || null,
                accountNumber: accountNumber || null,
                recipientName: recipientName || null,
                bankName: bankName || null
            }
        });

        await transaction.save();

        // Hold the balance (deduct immediately, refund if rejected)
        user.balance = balanceAfter;
        await user.save();

        // Audit log
        await auditLog('WITHDRAWAL_CREATED', req, {
            transactionId: transaction._id,
            amount: amount,
            userId: user._id
        });

        res.json({
            success: true,
            message: 'Withdrawal request submitted. Pending admin approval.',
            transaction: {
                id: transaction._id,
                amount: amount,
                status: transaction.status
            }
        });
    } catch (error) {
        console.error('Withdrawal request error:', error);
        res.status(500).json({ error: 'Withdrawal request failed. Please try again.' });
    }
});

// Get user transaction history
app.get('/api/wallet/transactions', walletLimiter, authenticateToken, async (req, res) => {
    try {
        const { type, status, limit = 50, skip = 0 } = req.query;

        const query = { userId: req.user._id };
        if (type) query.type = type;
        if (status) query.status = status;

        const transactions = await Transaction.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .select('-__v');

        const total = await Transaction.countDocuments(query);

        res.json({
            success: true,
            transactions: transactions,
            total: total
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// ===== ADMIN WALLET ROUTES =====

// Get pending transactions (Admin only) - both deposits and withdrawals
app.get('/api/admin/transactions/pending', adminLimiter, authenticateToken, async (req, res) => {
    try {
        if (!req.user.isAdmin && !req.user.isSuperAdmin) {
            await auditLog('SUSPICIOUS_ACTIVITY', req, {
                action: 'UNAUTHORIZED_ADMIN_ACCESS',
                endpoint: '/api/admin/transactions/pending',
                severity: 'high'
            });
            return res.status(403).json({ error: 'Admin access required' });
        }

        const transactions = await Transaction.find({
            type: { $in: ['DEPOSIT', 'WITHDRAWAL'] },
            status: 'pending'
        })
        .populate('userId', 'username phone balance')
        .sort({ createdAt: -1 })
        .select('-__v');

        res.json({
            success: true,
            transactions: transactions
        });
    } catch (error) {
        console.error('Get pending transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch pending transactions' });
    }
});

// Get all transactions (Admin only)
app.get('/api/admin/transactions', adminLimiter, authenticateToken, async (req, res) => {
    try {
        if (!req.user.isAdmin && !req.user.isSuperAdmin) {
            await auditLog('SUSPICIOUS_ACTIVITY', req, {
                action: 'UNAUTHORIZED_ADMIN_ACCESS',
                endpoint: '/api/admin/transactions',
                severity: 'high'
            });
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { type, status, limit = 100, skip = 0 } = req.query;

        const query = {};
        if (type) query.type = type;
        if (status) query.status = status;

        const transactions = await Transaction.find(query)
            .populate('userId', 'username phone')
            .populate('processedBy', 'username')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .select('-__v');

        const total = await Transaction.countDocuments(query);

        res.json({
            success: true,
            transactions: transactions,
            total: total
        });
    } catch (error) {
        console.error('Get all transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Approve transaction (Admin only) - works for both deposits and withdrawals
app.post('/api/admin/transactions/:transactionId/approve', adminLimiter, authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (!req.user.isAdmin && !req.user.isSuperAdmin) {
            await auditLog('SUSPICIOUS_ACTIVITY', req, {
                action: 'UNAUTHORIZED_ADMIN_ACCESS',
                endpoint: '/api/admin/transactions/approve',
                severity: 'high'
            });
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { transactionId } = req.params;
        const { adminNotes } = req.body;

        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (transaction.status !== 'pending') {
            return res.status(400).json({ error: 'Transaction is not pending' });
        }

        if (transaction.type !== 'DEPOSIT' && transaction.type !== 'WITHDRAWAL') {
            return res.status(400).json({ error: 'Only deposits and withdrawals can be approved' });
        }

        const user = await User.findById(transaction.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const balanceBefore = user.balance || 0;
        let balanceAfter;

        if (transaction.type === 'DEPOSIT') {
            // Security: Check if deposit would exceed maximum wallet balance ($300)
            if (wouldExceedMaxBalance(balanceBefore, transaction.amount)) {
                const maxAllowed = 300 - balanceBefore;
                await auditLog('SUSPICIOUS_ACTIVITY', req, {
                    action: 'DEPOSIT_APPROVAL_EXCEEDS_MAX_BALANCE',
                    userId: user._id,
                    transactionId: transaction._id,
                    currentBalance: balanceBefore,
                    depositAmount: transaction.amount,
                    maxAllowed: maxAllowed,
                    severity: 'high'
                });
                return res.status(400).json({ 
                    error: `Cannot approve deposit: Maximum wallet balance is $300. Current balance is $${balanceBefore.toFixed(2)}. Maximum deposit allowed is $${maxAllowed.toFixed(2)}.` 
                });
            }
            // Add deposit amount to balance
            balanceAfter = balanceBefore + transaction.amount;
            user.balance = balanceAfter;
        } else if (transaction.type === 'WITHDRAWAL') {
            // Balance was already deducted when withdrawal was created
            // Just update the balanceAfter to reflect current balance
            balanceAfter = user.balance || 0;
        }

        await user.save();

        // Security: Reconcile balance after update
        const reconciliation = await reconcileUserBalance(user._id);
        if (!reconciliation.success && reconciliation.mismatch) {
            console.error(`⚠️  Balance mismatch detected after transaction approval for user ${user._id}`);
            await auditLog('BALANCE_RECONCILIATION', req, {
                action: 'BALANCE_MISMATCH_DETECTED',
                userId: user._id,
                transactionId: transaction._id,
                storedBalance: reconciliation.storedBalance,
                calculatedBalance: reconciliation.calculatedBalance,
                difference: reconciliation.difference,
                severity: 'high'
            });
        }

        // Update transaction
        transaction.status = 'approved';
        transaction.balanceBefore = balanceBefore;
        transaction.balanceAfter = balanceAfter;
        transaction.processedBy = req.user._id;
        transaction.processedAt = new Date();
        if (adminNotes) transaction.adminNotes = adminNotes;
        await transaction.save();

        // Audit log
        await auditLog(transaction.type === 'DEPOSIT' ? 'DEPOSIT_APPROVED' : 'WITHDRAWAL_APPROVED', req, {
            transactionId: transaction._id,
            userId: user._id,
            amount: transaction.amount,
            adminNotes: adminNotes || null,
            severity: 'medium'
        });

        res.json({
            success: true,
            message: `${transaction.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'} approved successfully`,
            transaction: transaction
        });
    } catch (error) {
        console.error('Approve transaction error:', error);
        res.status(500).json({ error: 'Failed to approve transaction' });
    }
});

// Reject transaction (Admin only) - works for both deposits and withdrawals
app.post('/api/admin/transactions/:transactionId/reject', adminLimiter, authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (!req.user.isAdmin && !req.user.isSuperAdmin) {
            await auditLog('SUSPICIOUS_ACTIVITY', req, {
                action: 'UNAUTHORIZED_ADMIN_ACCESS',
                endpoint: '/api/admin/transactions/reject',
                severity: 'high'
            });
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { transactionId } = req.params;
        const { adminNotes } = req.body;

        if (!adminNotes) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }

        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (transaction.status !== 'pending') {
            return res.status(400).json({ error: 'Transaction is not pending' });
        }

        const user = await User.findById(transaction.userId);
        if (user) {
            if (transaction.type === 'WITHDRAWAL') {
                // Refund the balance for rejected withdrawals
                const withdrawalAmount = Math.abs(transaction.amount);
                user.balance = (user.balance || 0) + withdrawalAmount;
                await user.save();
                transaction.balanceAfter = user.balance;
            } else if (transaction.type === 'DEPOSIT') {
                // For deposits, balance was never added, so no refund needed
                transaction.balanceAfter = user.balance || 0;
            }
        }

        // Update transaction status
        transaction.status = 'rejected';
        transaction.processedBy = req.user._id;
        transaction.processedAt = new Date();
        transaction.adminNotes = adminNotes;
        await transaction.save();

        // Audit log
        await auditLog(transaction.type === 'DEPOSIT' ? 'DEPOSIT_REJECTED' : 'WITHDRAWAL_REJECTED', req, {
            transactionId: transaction._id,
            userId: user._id,
            amount: transaction.amount,
            adminNotes: adminNotes,
            severity: 'medium'
        });

        res.json({
            success: true,
            message: `${transaction.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'} rejected${transaction.type === 'WITHDRAWAL' ? ' and balance refunded' : ''}`,
            transaction: transaction
        });
    } catch (error) {
        console.error('Reject transaction error:', error);
        res.status(500).json({ error: 'Failed to reject transaction' });
    }
});

// ===== ADMIN USER ROUTES =====

// Get all users (admin only)
app.get('/api/admin/users', adminLimiter, authenticateToken, async (req, res) => {
    try {
        console.log('📊 GET /api/admin/users - Request received');
        console.log('User making request:', req.user.username, 'isAdmin:', req.user.isAdmin, 'isSuperAdmin:', req.user.isSuperAdmin);
        
        // Check if user is admin or super admin
        if (!req.user.isAdmin && !req.user.isSuperAdmin) {
            console.log('❌ Access denied - user is not admin');
            await auditLog('SUSPICIOUS_ACTIVITY', req, {
                action: 'UNAUTHORIZED_ADMIN_ACCESS',
                endpoint: '/api/admin/users',
                severity: 'high'
            });
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }

        const users = await User.find({})
            .select('-password') // Exclude password
            .sort({ createdAt: -1 }); // Sort by newest first

        // Count matches played and calculate profitability for each user
        const usersWithMatchCount = await Promise.all(
            users.map(async (user) => {
                // Count unique gameIds where user participated (BET_PLACED, BET_WON, or BET_LOST)
                const matchCount = await Transaction.distinct('gameId', {
                    userId: user._id,
                    type: { $in: ['BET_PLACED', 'BET_WON', 'BET_LOST'] },
                    gameId: { $ne: null }
                }).then(gameIds => gameIds.filter(id => id !== null).length);

                // Calculate profitability (net profit from betting)
                const bettingTransactions = await Transaction.aggregate([
                    {
                        $match: {
                            userId: user._id,
                            type: { $in: ['BET_PLACED', 'BET_WON', 'BET_LOST'] }
                        }
                    },
                    {
                        $group: {
                            _id: '$type',
                            total: { $sum: '$amount' }
                        }
                    }
                ]);

                // Calculate net profit: BET_WON - BET_LOST - BET_PLACED
                let totalWon = 0;
                let totalLost = 0;
                let totalPlaced = 0;

                bettingTransactions.forEach(t => {
                    if (t._id === 'BET_WON') totalWon = t.total;
                    if (t._id === 'BET_LOST') totalLost = Math.abs(t.total);
                    if (t._id === 'BET_PLACED') totalPlaced = Math.abs(t.total);
                });

                const netProfit = totalWon - totalLost - totalPlaced;

                return {
                    ...user.toObject(),
                    matchesPlayed: matchCount,
                    totalWon: totalWon,
                    totalLost: totalLost,
                    totalPlaced: totalPlaced,
                    netProfit: netProfit
                };
            })
        );

        const totalUsers = usersWithMatchCount.length;
        console.log(`✅ Found ${totalUsers} users in database`);

        res.json({
            success: true,
            users: usersWithMatchCount,
            total: totalUsers
        });
    } catch (error) {
        console.error('❌ Get all users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get user match history (admin only)
app.get('/api/admin/users/:userId/matches', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin or super admin
        if (!req.user.isAdmin && !req.user.isSuperAdmin) {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }

        const { userId } = req.params;

        // Get all game transactions for this user
        const gameTransactions = await Transaction.find({
            userId: userId,
            type: { $in: ['BET_PLACED', 'BET_WON', 'BET_LOST'] },
            gameId: { $ne: null }
        })
        .sort({ createdAt: -1 });

        console.log(`📊 Match history for user ${userId}: Found ${gameTransactions.length} transactions`);

        // Group transactions by gameId
        const matchesMap = new Map();
        
        gameTransactions.forEach(transaction => {
            const gameId = transaction.gameId;
            if (!matchesMap.has(gameId)) {
                matchesMap.set(gameId, {
                    gameId: gameId,
                    date: transaction.createdAt,
                    betAmount: 0,
                    result: null, // 'won' or 'lost'
                    amount: 0
                });
            }
            
            const match = matchesMap.get(gameId);
            
            if (transaction.type === 'BET_PLACED') {
                match.betAmount = Math.abs(transaction.amount);
            } else if (transaction.type === 'BET_WON') {
                match.result = 'won';
                match.amount = transaction.amount;
                console.log(`✅ Found BET_WON for game ${gameId}, amount: $${transaction.amount}`);
            } else if (transaction.type === 'BET_LOST') {
                match.result = 'lost';
                match.amount = Math.abs(transaction.amount);
                console.log(`❌ Found BET_LOST for game ${gameId}, amount: $${Math.abs(transaction.amount)}`);
            }
        });

        // Convert map to array and sort by date
        const matches = Array.from(matchesMap.values())
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Count wins and losses
        const wins = matches.filter(m => m.result === 'won').length;
        const losses = matches.filter(m => m.result === 'lost').length;

        res.json({
            success: true,
            matches: matches,
            total: matches.length,
            wins: wins,
            losses: losses
        });
    } catch (error) {
        console.error('Get user match history error:', error);
        res.status(500).json({ error: 'Failed to fetch match history' });
    }
});

// Get user deposits and withdrawals (admin only)
app.get('/api/admin/users/:userId/transactions', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin or super admin
        if (!req.user.isAdmin && !req.user.isSuperAdmin) {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }

        const { userId } = req.params;

        // Get all deposit and withdrawal transactions for this user
        const transactions = await Transaction.find({
            userId: userId,
            type: { $in: ['DEPOSIT', 'WITHDRAWAL'] }
        })
        .sort({ createdAt: -1 });

        res.json({
            success: true,
            transactions: transactions
        });
    } catch (error) {
        console.error('Get user transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch user transactions' });
    }
});

// ===== SECURITY ADMIN ROUTES =====

// Reconcile user balance (admin only)
app.post('/api/admin/users/:userId/reconcile', adminLimiter, authenticateToken, async (req, res) => {
    try {
        if (!req.user.isAdmin && !req.user.isSuperAdmin) {
            await auditLog('SUSPICIOUS_ACTIVITY', req, {
                action: 'UNAUTHORIZED_ADMIN_ACCESS',
                endpoint: '/api/admin/users/reconcile',
                severity: 'high'
            });
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { userId } = req.params;
        const reconciliation = await reconcileUserBalance(userId);

        // Audit log
        await auditLog('BALANCE_RECONCILIATION', req, {
            userId: userId,
            ...reconciliation,
            severity: reconciliation.mismatch ? 'high' : 'low'
        });

        res.json({
            success: true,
            ...reconciliation
        });
    } catch (error) {
        console.error('Balance reconciliation error:', error);
        res.status(500).json({ error: 'Failed to reconcile balance' });
    }
});

// Get audit logs (admin only)
app.get('/api/admin/audit-logs', adminLimiter, authenticateToken, async (req, res) => {
    try {
        if (!req.user.isAdmin && !req.user.isSuperAdmin) {
            await auditLog('SUSPICIOUS_ACTIVITY', req, {
                action: 'UNAUTHORIZED_ADMIN_ACCESS',
                endpoint: '/api/admin/audit-logs',
                severity: 'high'
            });
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { userId, action, severity, limit = 100, skip = 0 } = req.query;

        const query = {};
        if (userId) query.userId = userId;
        if (action) query.action = action;
        if (severity) query.severity = severity;

        const logs = await AuditLog.find(query)
            .populate('userId', 'username phone')
            .populate('adminId', 'username')
            .populate('transactionId')
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const total = await AuditLog.countDocuments(query);

        res.json({
            success: true,
            logs: logs,
            total: total
        });
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

// ===== MATCH REVENUE ROUTES =====

// Get match revenue (admin only)
app.get('/api/admin/revenue', adminLimiter, authenticateToken, async (req, res) => {
    try {
        // Check if user is admin or super admin
        if (!req.user.isAdmin && !req.user.isSuperAdmin) {
            await auditLog('SUSPICIOUS_ACTIVITY', req, {
                action: 'UNAUTHORIZED_ADMIN_ACCESS',
                endpoint: '/api/admin/revenue',
                severity: 'high'
            });
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }

        const { filter = 'all' } = req.query;
        
        // Build date filter
        let dateFilter = {};
        const now = new Date();
        if (filter === 'today') {
            const startOfDay = new Date(now.setHours(0, 0, 0, 0));
            dateFilter = { completedAt: { $gte: startOfDay } };
        } else if (filter === 'week') {
            const weekAgo = new Date(now.setDate(now.getDate() - 7));
            dateFilter = { completedAt: { $gte: weekAgo } };
        } else if (filter === 'month') {
            const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
            dateFilter = { completedAt: { $gte: monthAgo } };
        }

        // Get all match revenues
        const matchRevenues = await MatchRevenue.find({
            status: 'completed',
            ...dateFilter
        })
        .populate('winnerId', 'username phone')
        .populate('loserId', 'username phone')
        .sort({ completedAt: -1 });

        // Calculate totals
        const totalRevenue = matchRevenues.reduce((sum, mr) => sum + (mr.commission || 0), 0);
        const totalMatches = matchRevenues.length;
        const totalBet = matchRevenues.reduce((sum, mr) => sum + (mr.totalBet || 0), 0);

        // Calculate total deposits (all approved deposits)
        const totalDeposits = await Transaction.aggregate([
            {
                $match: {
                    type: 'DEPOSIT',
                    status: 'approved'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);
        const totalDepositsAmount = totalDeposits.length > 0 ? totalDeposits[0].total : 0;

        // Calculate circulating amount (sum of all user balances)
        const circulatingAmount = await User.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: '$balance' }
                }
            }
        ]);
        const circulatingAmountValue = circulatingAmount.length > 0 ? circulatingAmount[0].total : 0;

        // Format matches for response
        const matches = matchRevenues.map(mr => ({
            gameId: mr.gameId,
            betAmount: mr.betAmount || 0.5,
            totalBet: mr.totalBet,
            commission: mr.commission,
            winner: {
                username: mr.winnerId?.username || 'Unknown',
                phone: mr.winnerId?.phone || 'N/A'
            },
            loser: {
                username: mr.loserId?.username || 'Unknown',
                phone: mr.loserId?.phone || 'N/A'
            },
            completedAt: mr.completedAt
        }));

        res.json({
            success: true,
            availableBalance: totalRevenue,
            totalRevenue: totalRevenue,
            allTimeRevenue: totalRevenue, // For now, same as total
            totalMatches: totalMatches,
            totalBet: totalBet,
            totalDeposits: totalDepositsAmount,
            circulatingAmount: circulatingAmountValue,
            matches: matches
        });
    } catch (error) {
        console.error('Get match revenue error:', error);
        res.status(500).json({ error: 'Failed to fetch match revenue' });
    }
});

// Get game statistics (admin only)
app.get('/api/admin/stats', adminLimiter, authenticateToken, async (req, res) => {
    try {
        // Check if user is admin or super admin
        if (!req.user.isAdmin && !req.user.isSuperAdmin) {
            await auditLog('UNAUTHORIZED_ACCESS', req, {
                action: 'GET_GAME_STATS',
                endpoint: '/api/admin/stats',
                severity: 'high'
            });
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }

        // Get total games from MatchRevenue
        const totalGames = await MatchRevenue.countDocuments({ status: 'completed' });
        
        // Calculate total revenue (sum of all commissions)
        const revenueData = await MatchRevenue.aggregate([
            {
                $match: { status: 'completed' }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$commission' },
                    totalBet: { $sum: '$totalBet' }
                }
            }
        ]);

        const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;
        const totalBet = revenueData.length > 0 ? revenueData[0].totalBet : 0;

        res.json({
            success: true,
            totalGames: totalGames,
            totalRevenue: totalRevenue,
            totalBet: totalBet,
            commissionRate: 0.10, // 10%
            totalCommission: totalRevenue
        });
    } catch (error) {
        console.error('Get game stats error:', error);
        res.status(500).json({ error: 'Failed to fetch game statistics' });
    }
});

// Manual fix endpoint to record revenue for incomplete games (admin only)
app.post('/api/admin/fix/incomplete-games', adminLimiter, authenticateToken, async (req, res) => {
    try {
        // Check if user is admin or super admin
        if (!req.user.isAdmin && !req.user.isSuperAdmin) {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }

        // Find games with BET_PLACED but no BET_WON/BET_LOST
        const incompleteGames = await Transaction.aggregate([
            {
                $match: {
                    type: 'BET_PLACED',
                    gameId: { $ne: null }
                }
            },
            {
                $group: {
                    _id: '$gameId',
                    betPlaced: { $push: '$$ROOT' }
                }
            }
        ]);

        const fixedGames = [];
        const errors = [];

        for (const gameGroup of incompleteGames) {
            const gameId = gameGroup._id;
            
            // Check if BET_WON or BET_LOST exist
            const hasWinOrLoss = await Transaction.findOne({
                gameId: gameId,
                type: { $in: ['BET_WON', 'BET_LOST'] }
            });

            if (hasWinOrLoss) {
                continue; // Already has win/loss, skip
            }

            // Check if match revenue exists
            const matchRevenue = await MatchRevenue.findOne({ gameId });
            if (matchRevenue) {
                continue; // Already recorded, skip
            }

            // Try to get game state from in-memory games
            const game = games.get(gameId);
            if (game && game.state && game.state.winners && game.state.winners.length > 0) {
                try {
                    await recordMatchRevenue(gameId, game.state, game);
                    game.revenueRecorded = true;
                    fixedGames.push({ gameId, status: 'fixed' });
                    console.log(`✅ Fixed incomplete game ${gameId}`);
                } catch (error) {
                    errors.push({ gameId, error: error.message });
                    console.error(`❌ Error fixing game ${gameId}:`, error);
                }
            } else {
                // Game not in memory, try to reconstruct from transactions
                const betTransactions = await Transaction.find({
                    gameId: gameId,
                    type: 'BET_PLACED'
                }).populate('userId');

                if (betTransactions.length === 2) {
                    // We have both players, but we need to determine winner
                    // This is a fallback - we can't determine winner without game state
                    errors.push({ 
                        gameId, 
                        error: 'Game state not available. Cannot determine winner without game state.' 
                    });
                }
            }
        }

        res.json({
            success: true,
            fixedGames: fixedGames.length,
            errors: errors.length,
            details: {
                fixed: fixedGames,
                errors: errors
            }
        });
    } catch (error) {
        console.error('Fix incomplete games error:', error);
        res.status(500).json({ error: 'Failed to fix incomplete games', details: error.message });
    }
});

// Diagnostic endpoint to check match recording (admin only)
app.get('/api/admin/diagnose/matches', adminLimiter, authenticateToken, async (req, res) => {
    try {
        // Check if user is admin or super admin
        if (!req.user.isAdmin && !req.user.isSuperAdmin) {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }

        // Get recent match revenues
        const recentMatches = await MatchRevenue.find({})
            .populate('winnerId', 'username phone')
            .populate('loserId', 'username phone')
            .sort({ completedAt: -1 })
            .limit(10);

        // Get recent game transactions
        const recentTransactions = await Transaction.find({
            type: { $in: ['BET_PLACED', 'BET_WON', 'BET_LOST'] },
            gameId: { $ne: null }
        })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('userId', 'username phone');

        // Group transactions by gameId to see which games have complete records
        const gameStatus = {};
        recentTransactions.forEach(transaction => {
            const gameId = transaction.gameId;
            if (!gameStatus[gameId]) {
                gameStatus[gameId] = {
                    gameId: gameId,
                    betPlaced: [],
                    betWon: [],
                    betLost: [],
                    isComplete: false
                };
            }
            if (transaction.type === 'BET_PLACED') {
                gameStatus[gameId].betPlaced.push({
                    userId: transaction.userId?._id || transaction.userId,
                    username: transaction.userId?.username || 'Unknown',
                    amount: transaction.amount,
                    date: transaction.createdAt
                });
            } else if (transaction.type === 'BET_WON') {
                gameStatus[gameId].betWon.push({
                    userId: transaction.userId?._id || transaction.userId,
                    username: transaction.userId?.username || 'Unknown',
                    amount: transaction.amount,
                    date: transaction.createdAt
                });
            } else if (transaction.type === 'BET_LOST') {
                gameStatus[gameId].betLost.push({
                    userId: transaction.userId?._id || transaction.userId,
                    username: transaction.userId?.username || 'Unknown',
                    amount: transaction.amount,
                    date: transaction.createdAt
                });
            }
        });

        // Mark games as complete if they have both BET_WON and BET_LOST
        Object.keys(gameStatus).forEach(gameId => {
            const game = gameStatus[gameId];
            game.isComplete = game.betWon.length > 0 && game.betLost.length > 0;
        });

        // Count statistics
        const totalMatches = await MatchRevenue.countDocuments({ status: 'completed' });
        const totalBetPlaced = await Transaction.countDocuments({ type: 'BET_PLACED' });
        const totalBetWon = await Transaction.countDocuments({ type: 'BET_WON' });
        const totalBetLost = await Transaction.countDocuments({ type: 'BET_LOST' });

        res.json({
            success: true,
            summary: {
                totalMatchRevenues: totalMatches,
                totalBetPlacedTransactions: totalBetPlaced,
                totalBetWonTransactions: totalBetWon,
                totalBetLostTransactions: totalBetLost,
                incompleteGames: Object.values(gameStatus).filter(g => !g.isComplete).length,
                completeGames: Object.values(gameStatus).filter(g => g.isComplete).length
            },
            recentMatches: recentMatches.map(m => ({
                gameId: m.gameId,
                betAmount: m.betAmount,
                totalBet: m.totalBet,
                commission: m.commission,
                winner: {
                    id: m.winnerId?._id || m.winnerId,
                    username: m.winnerId?.username || 'Unknown',
                    phone: m.winnerId?.phone || 'N/A'
                },
                loser: {
                    id: m.loserId?._id || m.loserId,
                    username: m.loserId?.username || 'Unknown',
                    phone: m.loserId?.phone || 'N/A'
                },
                completedAt: m.completedAt
            })),
            gameStatus: Object.values(gameStatus),
            recentTransactions: recentTransactions.map(t => ({
                type: t.type,
                gameId: t.gameId,
                userId: t.userId?._id || t.userId,
                username: t.userId?.username || 'Unknown',
                amount: t.amount,
                createdAt: t.createdAt
            }))
        });
    } catch (error) {
        console.error('Diagnose matches error:', error);
        res.status(500).json({ error: 'Failed to diagnose matches', details: error.message });
    }
});

// Connect to database before starting server
connectDB();

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err);
});

// ===== HEALTH CHECK ENDPOINT =====
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// ===== SERVE FRONTEND STATIC FILES (Production) =====
// Serve static files from the React app build directory
if (process.env.NODE_ENV === 'production') {
    // Path to the built frontend (dist folder in root, one level up from server)
    const frontendPath = path.join(__dirname, '..', 'dist');
    
    // Check if dist folder exists
    if (existsSync(frontendPath)) {
        console.log('📦 Serving frontend from:', frontendPath);
        
        // Serve static files (CSS, JS, images, etc.) with proper MIME types
        // This MUST be before the catch-all route
        // Use absolute path resolution to ensure it works on Render
        const absoluteFrontendPath = path.resolve(frontendPath);
        console.log('📦 Absolute frontend path:', absoluteFrontendPath);
        console.log('📦 Dist folder exists:', existsSync(absoluteFrontendPath));
        
        if (existsSync(absoluteFrontendPath)) {
            // List files in dist/assets to verify build
            try {
                const assetsPath = path.join(absoluteFrontendPath, 'assets');
                if (existsSync(assetsPath)) {
                    const assets = readdirSync(assetsPath);
                    console.log('📦 Assets found:', assets.slice(0, 5), '...');
                }
            } catch (e) {
                console.warn('⚠️  Could not list assets:', e.message);
            }
        }
        
        app.use(express.static(absoluteFrontendPath, {
            // Don't serve index.html for static file requests
            index: false,
            // Set proper cache headers
            maxAge: '1d',
            // Set proper MIME types
            setHeaders: (res, filePath) => {
                // Set correct MIME types for different file extensions
                if (filePath.endsWith('.css')) {
                    res.setHeader('Content-Type', 'text/css; charset=utf-8');
                } else if (filePath.endsWith('.js')) {
                    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
                } else if (filePath.endsWith('.json')) {
                    res.setHeader('Content-Type', 'application/json; charset=utf-8');
                } else if (filePath.endsWith('.mp3')) {
                    res.setHeader('Content-Type', 'audio/mpeg');
                } else if (filePath.endsWith('.png')) {
                    res.setHeader('Content-Type', 'image/png');
                } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
                    res.setHeader('Content-Type', 'image/jpeg');
                } else if (filePath.endsWith('.svg')) {
                    res.setHeader('Content-Type', 'image/svg+xml');
                }
            },
            // Don't fallthrough - return 404 if file not found
            fallthrough: false
        }));
        
        // Add logging middleware for static file requests (production)
        app.use((req, res, next) => {
            if (req.path.startsWith('/assets/') || req.path.startsWith('/audio/')) {
                const requestedFile = path.join(absoluteFrontendPath, req.path);
                console.log('📁 Static file request:', {
                    path: req.path,
                    exists: existsSync(requestedFile),
                    absolutePath: requestedFile
                });
            }
            next();
        });
        
        // Log static file requests for debugging
        if (process.env.NODE_ENV !== 'production') {
            app.use((req, res, next) => {
                if (req.path.startsWith('/assets/') || req.path.startsWith('/audio/')) {
                    const requestedFile = path.join(frontendPath, req.path);
                    console.log('📁 Static file request:', {
                        path: req.path,
                        exists: existsSync(requestedFile),
                        file: requestedFile
                    });
                }
                next();
            });
        }
        
        // Explicitly handle root path
        app.get('/', (req, res) => {
            const indexPath = path.join(absoluteFrontendPath, 'index.html');
            if (!existsSync(indexPath)) {
                console.error(`❌ index.html not found at: ${indexPath}`);
                return res.status(500).json({ 
                    error: 'Frontend not built',
                    message: 'The frontend has not been built. Please run "npm run build" before starting the server.',
                    expectedPath: indexPath
                });
            }
            console.log('📄 Serving index.html for root path');
            res.sendFile(indexPath, (err) => {
                if (err) {
                    console.error('Error serving index.html:', err);
                    res.status(500).json({ error: 'Failed to serve frontend', details: err.message });
                }
            });
        });
        
        // Handle React routing - return index.html for all non-API routes
        // This must be after all API routes and static file serving
        app.get('*', (req, res) => {
            // Don't serve index.html for API routes or socket.io
            if (req.path.startsWith('/api')) {
                console.warn(`⚠️  API route not found: ${req.method} ${req.path}`);
                return res.status(404).json({ 
                    error: 'API route not found',
                    path: req.path,
                    method: req.method,
                    message: 'The requested API endpoint does not exist. Check the server logs for available endpoints.'
                });
            }
            
            if (req.path.startsWith('/socket.io')) {
                return res.status(404).json({ error: 'Socket.io endpoint not found' });
            }
            
            // Don't serve index.html for static asset requests (they should be handled by static middleware)
            // Check if it's a static asset request (has file extension)
            const hasExtension = /\.[a-zA-Z0-9]+$/.test(req.path);
            if (hasExtension) {
                // Static file should have been served by express.static, but if we get here, it doesn't exist
                const requestedFile = path.join(absoluteFrontendPath, req.path);
                console.warn(`⚠️  Static file not found: ${req.path} (checked: ${requestedFile})`);
                return res.status(404).json({ 
                    error: 'File not found',
                    path: req.path,
                    message: 'The requested static file does not exist. Make sure the frontend was built correctly.'
                });
            }
            
            // Serve index.html for all other routes (React Router)
            const indexPath = path.join(absoluteFrontendPath, 'index.html');
            if (!existsSync(indexPath)) {
                console.error(`❌ index.html not found at: ${indexPath}`);
                return res.status(500).json({ 
                    error: 'Frontend not built',
                    message: 'The frontend has not been built. Please run "npm run build" before starting the server.',
                    expectedPath: indexPath
                });
            }
            
            console.log(`📄 Serving index.html for route: ${req.path}`);
            res.sendFile(indexPath, (err) => {
                if (err) {
                    console.error('Error serving index.html:', err);
                    res.status(500).json({ error: 'Failed to serve frontend', details: err.message });
                }
            });
        });
    } else {
        console.warn('⚠️  Frontend dist folder not found. Make sure to build the frontend first.');
        console.warn('   Expected path:', frontendPath);
        
        // Provide a helpful error page in production if dist doesn't exist
        app.get('*', (req, res) => {
            if (req.path.startsWith('/api')) {
                console.warn(`⚠️  API route not found: ${req.method} ${req.path}`);
                return res.status(404).json({ 
                    error: 'API route not found',
                    path: req.path,
                    method: req.method
                });
            }
            res.status(503).send(`
                <html>
                    <head><title>Frontend Not Built</title></head>
                    <body style="font-family: Arial; padding: 40px; text-align: center;">
                        <h1>Frontend Not Built</h1>
                        <p>The frontend has not been built yet. Please run:</p>
                        <pre style="background: #f0f0f0; padding: 20px; display: inline-block; border-radius: 5px;">npm run build</pre>
                        <p>Expected dist folder at: ${frontendPath}</p>
                    </body>
                </html>
            `);
        });
    }
} else {
    // In development, frontend is served by Vite dev server
    console.log('🔧 Development mode: Frontend served by Vite dev server');
}

const PORT = process.env.PORT || 3001;
// Bind to 0.0.0.0 to allow connections from other devices on the network
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Ludo game server running on port ${PORT}`);
  console.log(`📡 Accessible from:`);
  console.log(`   - Local: http://localhost:${PORT}`);
  console.log(`   - Network: http://192.168.100.32:${PORT}`);
  console.log(`   - Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
  console.log(`   - MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Not connected'}`);
});

