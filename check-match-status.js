/**
 * Script to check match recording status
 * Run with: node check-match-status.js
 * 
 * This script connects to MongoDB and checks:
 * 1. MatchRevenue records
 * 2. BET_PLACED, BET_WON, BET_LOST transactions
 * 3. Identifies incomplete games
 */

import mongoose from 'mongoose';
import MatchRevenue from './server/models/MatchRevenue.js';
import Transaction from './server/models/Transaction.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ludo-game';

async function checkMatchStatus() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get match revenue records
        const matchRevenues = await MatchRevenue.find({})
            .populate('winnerId', 'username phone')
            .populate('loserId', 'username phone')
            .sort({ completedAt: -1 });

        console.log('📊 MATCH REVENUE RECORDS');
        console.log('='.repeat(50));
        console.log(`Total Match Revenues: ${matchRevenues.length}\n`);

        if (matchRevenues.length > 0) {
            matchRevenues.forEach((match, index) => {
                console.log(`Match #${index + 1}:`);
                console.log(`  Game ID: ${match.gameId}`);
                console.log(`  Bet Amount: $${match.betAmount}`);
                console.log(`  Total Bet: $${match.totalBet}`);
                console.log(`  Commission (10%): $${match.commission}`);
                console.log(`  Winner: ${match.winnerId?.username || 'Unknown'} (${match.winnerId?.phone || 'N/A'})`);
                console.log(`  Loser: ${match.loserId?.username || 'Unknown'} (${match.loserId?.phone || 'N/A'})`);
                console.log(`  Completed At: ${match.completedAt}`);
                console.log('');
            });
        } else {
            console.log('⚠️  No match revenue records found!\n');
        }

        // Get game transactions
        const gameTransactions = await Transaction.find({
            type: { $in: ['BET_PLACED', 'BET_WON', 'BET_LOST'] },
            gameId: { $ne: null }
        })
        .sort({ createdAt: -1 })
        .populate('userId', 'username phone');

        console.log('💳 GAME TRANSACTIONS');
        console.log('='.repeat(50));
        
        const betPlaced = gameTransactions.filter(t => t.type === 'BET_PLACED').length;
        const betWon = gameTransactions.filter(t => t.type === 'BET_WON').length;
        const betLost = gameTransactions.filter(t => t.type === 'BET_LOST').length;

        console.log(`Total BET_PLACED: ${betPlaced}`);
        console.log(`Total BET_WON: ${betWon}`);
        console.log(`Total BET_LOST: ${betLost}\n`);

        // Group by gameId
        const gameStatus = {};
        gameTransactions.forEach(transaction => {
            const gameId = transaction.gameId;
            if (!gameStatus[gameId]) {
                gameStatus[gameId] = {
                    gameId: gameId,
                    betPlaced: [],
                    betWon: [],
                    betLost: []
                };
            }
            if (transaction.type === 'BET_PLACED') {
                gameStatus[gameId].betPlaced.push(transaction);
            } else if (transaction.type === 'BET_WON') {
                gameStatus[gameId].betWon.push(transaction);
            } else if (transaction.type === 'BET_LOST') {
                gameStatus[gameId].betLost.push(transaction);
            }
        });

        console.log('🎮 GAME STATUS');
        console.log('='.repeat(50));
        
        const gameIds = Object.keys(gameStatus);
        console.log(`Total Games with Transactions: ${gameIds.length}\n`);

        let completeGames = 0;
        let incompleteGames = 0;

        gameIds.forEach(gameId => {
            const game = gameStatus[gameId];
            const isComplete = game.betWon.length > 0 && game.betLost.length > 0;
            
            if (isComplete) {
                completeGames++;
            } else {
                incompleteGames++;
            }

            console.log(`Game: ${gameId}`);
            console.log(`  BET_PLACED: ${game.betPlaced.length}`);
            console.log(`  BET_WON: ${game.betWon.length}`);
            console.log(`  BET_LOST: ${game.betLost.length}`);
            console.log(`  Status: ${isComplete ? '✅ COMPLETE' : '⚠️  INCOMPLETE'}`);
            
            if (game.betWon.length > 0) {
                game.betWon.forEach(t => {
                    console.log(`    Winner: ${t.userId?.username || 'Unknown'} - $${t.amount}`);
                });
            }
            if (game.betLost.length > 0) {
                game.betLost.forEach(t => {
                    console.log(`    Loser: ${t.userId?.username || 'Unknown'} - -$${Math.abs(t.amount)}`);
                });
            }
            console.log('');
        });

        console.log('📈 SUMMARY');
        console.log('='.repeat(50));
        console.log(`Match Revenue Records: ${matchRevenues.length}`);
        console.log(`Complete Games: ${completeGames}`);
        console.log(`Incomplete Games: ${incompleteGames}`);
        console.log(`BET_PLACED Transactions: ${betPlaced}`);
        console.log(`BET_WON Transactions: ${betWon}`);
        console.log(`BET_LOST Transactions: ${betLost}`);

        if (incompleteGames > 0) {
            console.log('\n⚠️  WARNING: Some games are incomplete!');
            console.log('   This means BET_WON or BET_LOST transactions are missing.');
            console.log('   Check if recordMatchRevenue() is being called when games end.');
        } else if (gameIds.length > 0) {
            console.log('\n✅ All games have complete transaction records!');
        }

        if (betWon !== betLost && gameIds.length > 0) {
            console.log('\n⚠️  WARNING: Mismatch in win/loss transactions!');
            console.log(`   BET_WON: ${betWon}, BET_LOST: ${betLost}`);
            console.log('   These should be equal (one winner, one loser per game).');
        }

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkMatchStatus();

