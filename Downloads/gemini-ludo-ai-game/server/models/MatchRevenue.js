import mongoose from 'mongoose';

const matchRevenueSchema = new mongoose.Schema({
    gameId: {
        type: String,
        required: true,
        unique: true
    },
    betAmount: {
        type: Number,
        required: true,
        default: 0.5
    },
    totalBet: {
        type: Number,
        required: true
    },
    commission: {
        type: Number,
        required: true
    },
    commissionRate: {
        type: Number,
        default: 0.10 // 10%
    },
    winnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    loserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    winnerAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['completed', 'pending', 'cancelled'],
        default: 'completed'
    },
    completedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
matchRevenueSchema.index({ gameId: 1 });
matchRevenueSchema.index({ completedAt: -1 });
matchRevenueSchema.index({ status: 1 });

const MatchRevenue = mongoose.models.MatchRevenue || mongoose.model('MatchRevenue', matchRevenueSchema);

export default MatchRevenue;

