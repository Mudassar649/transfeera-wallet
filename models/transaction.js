const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        required: true,
        unique: true
    },
    transfereeraTransactionId: {
        type: String,
        required: true
    },
    fromWallet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Wallet'
    },
    toWallet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Wallet'
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    type: {
        type: String,
        required: true,
        enum: ['DEPOSIT', 'WITHDRAWAL', 'CAMPAIGN_ESCROW', 'CAMPAIGN_PAYMENT', 'CAMPAIGN_REFUND', 'COMMISSION']
    },
    status: {
        type: String,
        required: true,
        enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
        default: 'PENDING'
    },
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign'
    },
    description: {
        type: String,
        required: true
    },
    pixPaymentId: {
        type: String // Transfeera payment ID
    },
    pixChargeId: {
        type: String // Transfeera charge ID
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    },
    completedAt: {
        type: Date
    }
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', TransactionSchema);
module.exports = Transaction