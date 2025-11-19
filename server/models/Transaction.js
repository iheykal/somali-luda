import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['DEPOSIT', 'WITHDRAWAL', 'BET_PLACED', 'BET_WON', 'BET_LOST', 'COMMISSION', 'MANUAL_ADJUSTMENT'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    balanceBefore: {
        type: Number,
        required: true
    },
    balanceAfter: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed', 'failed'],
        default: 'pending'
    },
    description: {
        type: String,
        default: ''
    },
    // For deposits
    depositDetails: {
        phoneNumber: String
    },
    // For withdrawals
    withdrawalMethod: {
        type: String,
        enum: ['evc_plus', 'somnet', 'e_dahab'],
        default: null
    },
    withdrawalDetails: {
        phoneNumber: String,
        accountNumber: String,
        recipientName: String,
        bankName: String
    },
    // Admin fields
    adminNotes: {
        type: String,
        default: ''
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    processedAt: {
        type: Date,
        default: null
    },
    gameId: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Index for faster queries
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ status: 1, type: 1 });

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

export default Transaction;

