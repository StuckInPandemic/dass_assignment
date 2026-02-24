const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
    ticketId: {
        type: String,
        required: true,
        unique: true,
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
    },
    participant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    registrationType: {
        type: String,
        enum: ['normal', 'merchandise'],
        required: true,
    },
    // Normal event form responses
    formResponses: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    // Merchandise selections
    merchSelections: [{
        itemName: String,
        variant: {
            size: String,
            color: String,
        },
        quantity: Number,
        price: Number,
    }],
    status: {
        type: String,
        enum: ['confirmed', 'pending_approval', 'cancelled', 'rejected'],
        default: 'confirmed',
    },
    attended: {
        type: Boolean,
        default: false,
    },
    attendedAt: {
        type: Date,
    },
    scannedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    totalAmount: {
        type: Number,
        default: 0,
    },
    paymentStatus: {
        type: String,
        enum: ['paid', 'pending', 'refunded'],
        default: 'pending',
    },
    qrCodeData: {
        type: String,
    },
    // Payment approval workflow (merch)
    paymentProof: {
        type: String, // file path
    },
    approvalStatus: {
        type: String,
        enum: ['not_required', 'pending', 'approved', 'rejected'],
        default: 'not_required',
    },
    approvalNote: {
        type: String,
        default: '',
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    approvedAt: {
        type: Date,
    },
}, { timestamps: true });

module.exports = mongoose.model('Registration', registrationSchema);
