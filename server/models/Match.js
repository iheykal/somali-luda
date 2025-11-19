import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
    gameId: {
        type: String,
        required: true,
        unique: true
    },
    player1Id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    player2Id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    player1Color: {
        type: String,
        required: true
    },
    player2Color: {
        type: String,
        required: true
    },
    betAmount: {
        type: Number,
        required: true
    },
    totalBet: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['live', 'completed', 'cancelled'],
        default: 'live'
    },
    winnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    loserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    winnerAmount: {
        type: Number,
        default: null
    },
    commission: {
        type: Number,
        default: null
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for faster queries
matchSchema.index({ gameId: 1 });
matchSchema.index({ status: 1, startedAt: -1 });
matchSchema.index({ startedAt: -1 });
matchSchema.index({ completedAt: -1 });

const Match = mongoose.models.Match || mongoose.model('Match', matchSchema);

export default Match;


