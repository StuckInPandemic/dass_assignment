const mongoose = require('mongoose');

const organizerSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    organizerName: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        default: '',
    },
    contactEmail: {
        type: String,
        required: true,
    },
    contactNumber: {
        type: String,
        default: '',
    },
    discordWebhookUrl: {
        type: String,
        default: '',
    },
    status: {
        type: String,
        enum: ['active', 'disabled', 'archived'],
        default: 'active',
    },
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
}, { timestamps: true });

module.exports = mongoose.model('Organizer', organizerSchema);
