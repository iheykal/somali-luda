import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: [
            'DEPOSIT_CREATED',
            'DEPOSIT_APPROVED',
            'DEPOSIT_REJECTED',
            'WITHDRAWAL_CREATED',
            'WITHDRAWAL_APPROVED',
            'WITHDRAWAL_REJECTED',
            'BALANCE_ADJUSTED',
            'USER_CREATED',
            'USER_UPDATED',
            'ADMIN_ACTION',
            'BALANCE_RECONCILIATION',
            'SUSPICIOUS_ACTIVITY'
        ]
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        default: null
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ipAddress: {
        type: String,
        default: null
    },
    userAgent: {
        type: String,
        default: null
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for faster queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ adminId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;


