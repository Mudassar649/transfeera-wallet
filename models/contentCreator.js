// models/ContentCreator.js
const mongoose = require('mongoose');

const contentCreatorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    document: {
        type: String,
        required: true,
        unique: true // CPF/CNPJ
    },
    pixKey: {
        type: String,
        required: true
    },
    socialMediaHandles: {
        instagram: String,
        youtube: String,
        tiktok: String,
        twitter: String
    },
    categories: [{
        type: String,
        enum: ['lifestyle', 'tech', 'beauty', 'fitness', 'food', 'travel', 'gaming', 'education']
    }],
    followers: {
        type: Number,
        default: 0
    },
    phone: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
}, { timestamps: true });

module.exports = mongoose.model('ContentCreator', contentCreatorSchema);