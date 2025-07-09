const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'userType'
    },
    userType: {
        type: String,
        required: true,
        enum: ['Advertiser', 'ContentCreator', 'Admin']
    },
    balance: {
        type: Number,
        default: 0,
        min: 0
    },
    pixKey: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
}, { timestamps: true });

const Wallet = mongoose.model('Wallet', WalletSchema);
module.exports = Wallet;