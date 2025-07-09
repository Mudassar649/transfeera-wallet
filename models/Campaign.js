const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    advertiser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Advertiser',
        required: true
    },
    contentCreator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ContentCreator'
    },
    budget: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        required: true,
        enum: ['DRAFT', 'ACTIVE', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FAILED'],
        default: 'DRAFT'
    },
    paymentStatus: {
        type: String,
        required: true,
        enum: ['PENDING', 'ESCROWED', 'RELEASED', 'REFUNDED'],
        default: 'PENDING'
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    requirements: [{
        type: String
    }],
    deliverables: [{
        type: String
    }],
    escrowTransactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
    },
    paymentTransactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
    },
    commissionTransactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
    },
}, { timestamps: true });

const Campaign = mongoose.model('Campaign', CampaignSchema);

module.exports = Campaign