const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
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
        unique: true
    },
    pixKey: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['super_admin', 'admin', 'finance_admin'],
        default: 'admin'
    },
    permissions: [{
        type: String,
        enum: ['manage_users', 'manage_campaigns', 'manage_payments', 'view_reports']
    }],
    isActive: {
        type: Boolean,
        default: true
    },
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema)

module.exports = Admin;