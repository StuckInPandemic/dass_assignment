const User = require('../models/User');
const Organizer = require('../models/Organizer');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const axios = require('axios');

// GET /api/organizer/profile
exports.getProfile = async (req, res, next) => {
    try {
        const organizer = await Organizer.findOne({ user: req.user._id }).populate('user', 'email');
        if (!organizer) return res.status(404).json({ message: 'Organizer profile not found' });
        res.json({ organizer });
    } catch (error) {
        next(error);
    }
};

// PUT /api/organizer/profile
exports.updateProfile = async (req, res, next) => {
    try {
        const { organizerName, category, description, contactEmail, contactNumber, discordWebhookUrl } = req.body;

        const organizer = await Organizer.findOne({ user: req.user._id });
        if (!organizer) return res.status(404).json({ message: 'Organizer profile not found' });

        if (organizerName) organizer.organizerName = organizerName;
        if (category) organizer.category = category;
        if (description !== undefined) organizer.description = description;
        if (contactEmail) organizer.contactEmail = contactEmail;
        if (contactNumber !== undefined) organizer.contactNumber = contactNumber;
        if (discordWebhookUrl !== undefined) organizer.discordWebhookUrl = discordWebhookUrl;

        await organizer.save();
        res.json({ organizer });
    } catch (error) {
        next(error);
    }
};

// GET /api/organizer/events
exports.getMyEvents = async (req, res, next) => {
    try {
        const organizer = await Organizer.findOne({ user: req.user._id });
        if (!organizer) return res.status(404).json({ message: 'Organizer profile not found' });

        const events = await Event.find({ organizer: organizer._id }).sort({ createdAt: -1 });
        res.json({ events });
    } catch (error) {
        next(error);
    }
};

// GET /api/organizer/dashboard
exports.getDashboard = async (req, res, next) => {
    try {
        const organizer = await Organizer.findOne({ user: req.user._id });
        if (!organizer) return res.status(404).json({ message: 'Organizer profile not found' });

        const events = await Event.find({ organizer: organizer._id }).sort({ createdAt: -1 });

        // Aggregate analytics for completed events
        const completedEventIds = events.filter(e => e.status === 'completed').map(e => e._id);
        const analytics = await Registration.aggregate([
            { $match: { event: { $in: completedEventIds }, status: 'confirmed' } },
            {
                $group: {
                    _id: null,
                    totalRegistrations: { $sum: 1 },
                    totalRevenue: { $sum: '$totalAmount' },
                    totalAttended: { $sum: { $cond: ['$attended', 1, 0] } },
                },
            },
        ]);

        res.json({
            events,
            analytics: analytics[0] || { totalRegistrations: 0, totalRevenue: 0, totalAttended: 0 },
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/organizer/password-reset-request
exports.requestPasswordReset = async (req, res, next) => {
    try {
        const reason = req.body?.reason || '';

        const existing = await PasswordResetRequest.findOne({
            organizer: req.user._id,
            status: 'pending',
        });
        if (existing) {
            return res.status(400).json({ message: 'You already have a pending reset request' });
        }

        await PasswordResetRequest.create({
            organizer: req.user._id,
            reason: reason || '',
        });
        res.json({ message: 'Password reset request submitted to admin' });
    } catch (error) {
        next(error);
    }
};

// GET /api/organizer/password-reset-requests — View own reset request history
exports.getMyResetRequests = async (req, res, next) => {
    try {
        const requests = await PasswordResetRequest.find({ organizer: req.user._id })
            .sort({ createdAt: -1 });
        res.json({ requests });
    } catch (error) {
        next(error);
    }
};

// Utility: send Discord webhook on event publish
exports.sendDiscordNotification = async (organizer, event) => {
    if (!organizer.discordWebhookUrl) return;
    try {
        await axios.post(organizer.discordWebhookUrl, {
            embeds: [{
                title: `🎉 New Event: ${event.name}`,
                description: event.description?.substring(0, 200) || 'No description',
                color: 5793266,
                fields: [
                    { name: 'Type', value: event.eventType, inline: true },
                    { name: 'Date', value: event.eventStartDate ? new Date(event.eventStartDate).toLocaleDateString() : 'TBA', inline: true },
                    { name: 'Fee', value: event.registrationFee ? `₹${event.registrationFee}` : 'Free', inline: true },
                ],
                footer: { text: 'Felicity 2026' },
            }],
        });
    } catch (err) {
        console.error('Discord webhook failed:', err.message);
    }
};
