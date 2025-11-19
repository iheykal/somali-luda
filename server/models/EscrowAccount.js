import mongoose from 'mongoose';

const escrowAccountSchema = new mongoose.Schema({
    balance: {
        type: Number,
        default: 0,
        min: 0
    },
    totalDeposited: {
        type: Number,
        default: 0
    },
    totalReleased: {
        type: Number,
        default: 0
    },
    totalCommission: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Ensure only one escrow account exists
escrowAccountSchema.statics.getEscrowAccount = async function() {
    let account = await this.findOne();
    if (!account) {
        account = new this({
            balance: 0,
            totalDeposited: 0,
            totalReleased: 0,
            totalCommission: 0
        });
        await account.save();
    }
    return account;
};

const EscrowAccount = mongoose.models.EscrowAccount || mongoose.model('EscrowAccount', escrowAccountSchema);

export default EscrowAccount;


