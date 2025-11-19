import mongoose from 'mongoose';
import Match from './server/models/Match.js';

async function checkMatches() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ludo-game');

    const totalMatches = await Match.countDocuments();
    const completedMatches = await Match.countDocuments({ status: 'completed' });
    const liveMatches = await Match.countDocuments({ status: 'live' });

    console.log('Total matches:', totalMatches);
    console.log('Completed matches:', completedMatches);
    console.log('Live matches:', liveMatches);

    if (completedMatches > 0) {
      const recentCompleted = await Match.find({ status: 'completed' })
        .sort({ completedAt: -1 })
        .limit(3)
        .populate('winnerId', 'username')
        .populate('player1Id', 'username')
        .populate('player2Id', 'username');

      console.log('\nRecent completed matches:');
      recentCompleted.forEach(match => {
        console.log('- Game:', match.gameId);
        console.log('  Player1:', match.player1Id?.username, '(' + match.player1Color + ')');
        console.log('  Player2:', match.player2Id?.username, '(' + match.player2Color + ')');
        console.log('  Winner:', match.winnerId?.username, '(' + match.winnerAmount + ')');
        console.log('  Completed:', match.completedAt);
        console.log('');
      });
    } else {
      console.log('No completed matches found');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkMatches();
