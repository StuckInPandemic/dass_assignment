const User = require('../models/User');
const Organizer = require('../models/Organizer');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Message = require('../models/Message');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const crypto = require('crypto');

// POST /api/admin/organizers — Create organizer account
exports.createOrganizer = async (req, res, next) => {
    try {
        const { organizerName, category, description, contactEmail } = req.body;

        if (!organizerName || !category || !contactEmail) {
            return res.status(400).json({ message: 'Organizer name, category, and contact email are required' });
        }

        // Generate login credentials
        const loginEmail = contactEmail;
        const generatedPassword = crypto.randomBytes(4).toString('hex'); // 8-char password

        // Check if email exists
        const existing = await User.findOne({ email: loginEmail.toLowerCase() });
        if (existing) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        // Create user account
        const user = await User.create({
            email: loginEmail.toLowerCase(),
            password: generatedPassword,
            role: 'organizer',
        });

        // Create organizer profile
        const organizer = await Organizer.create({
            user: user._id,
            organizerName,
            category,
            description: description || '',
            contactEmail,
        });

        // Link organizer profile to user
        user.organizerProfile = organizer._id;
        await user.save();

        res.status(201).json({
            message: 'Organizer account created',
            credentials: {
                email: loginEmail,
                password: generatedPassword,
            },
            organizer,
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/organizers — List all organizers
exports.getOrganizers = async (req, res, next) => {
    try {
        const organizers = await Organizer.find().populate('user', 'email');
        res.json({ organizers });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/admin/organizers/:id — Disable, archive, or permanently delete organizer
// Query params: action=disable|archive|delete
exports.removeOrganizer = async (req, res, next) => {
    try {
        const { action } = req.query;
        const organizer = await Organizer.findById(req.params.id);
        if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

        if (action === 'delete') {
            // Cascade delete: remove all events, registrations, messages, and reset requests
            const events = await Event.find({ organizer: organizer._id });
            const eventIds = events.map(e => e._id);
            await Registration.deleteMany({ event: { $in: eventIds } });
            await Message.deleteMany({ event: { $in: eventIds } });
            await Event.deleteMany({ organizer: organizer._id });
            await PasswordResetRequest.deleteMany({ organizer: organizer.user });
            await User.findByIdAndDelete(organizer.user);
            await Organizer.findByIdAndDelete(organizer._id);
            res.json({ message: 'Organizer and all associated data permanently deleted' });
        } else if (action === 'archive') {
            organizer.status = 'archived';
            await organizer.save();
            res.json({ message: 'Organizer archived', organizer });
        } else {
            // default: disable
            organizer.status = 'disabled';
            await organizer.save();
            res.json({ message: 'Organizer disabled', organizer });
        }
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/organizers/:id/restore — Re-enable organizer
exports.restoreOrganizer = async (req, res, next) => {
    try {
        const organizer = await Organizer.findById(req.params.id);
        if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

        organizer.status = 'active';
        await organizer.save();
        res.json({ message: 'Organizer restored', organizer });
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/password-resets — List all requests
exports.getPasswordResets = async (req, res, next) => {
    try {
        const requests = await PasswordResetRequest.find()
            .populate('organizer', 'email')
            .sort({ createdAt: -1 });

        // Enrich with organizer/club name from Organizer collection
        const enriched = await Promise.all(requests.map(async (r) => {
            const obj = r.toObject();
            if (r.organizer) {
                const org = await Organizer.findOne({ user: r.organizer._id });
                obj.organizerName = org?.organizerName || '';
                obj.organizerCategory = org?.category || '';
            }
            return obj;
        }));

        res.json({ requests: enriched });
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/password-resets/:id — Resolve or reject
exports.resolvePasswordReset = async (req, res, next) => {
    try {
        const { action, comments } = req.body; // 'resolve' or 'reject'
        const request = await PasswordResetRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ message: 'Request not found' });

        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'Request already processed' });
        }

        if (action === 'resolve') {
            const newPassword = crypto.randomBytes(4).toString('hex');
            const user = await User.findById(request.organizer);
            if (!user) return res.status(404).json({ message: 'User not found' });

            user.password = newPassword;
            await user.save();

            request.status = 'resolved';
            request.resolvedBy = req.user._id;
            request.resolvedAt = new Date();
            request.adminComments = comments || '';
            await request.save();

            res.json({ message: 'Password reset', newPassword, request });
        } else if (action === 'reject') {
            request.status = 'rejected';
            request.resolvedBy = req.user._id;
            request.resolvedAt = new Date();
            request.adminComments = comments || '';
            await request.save();

            res.json({ message: 'Request rejected', request });
        } else {
            res.status(400).json({ message: 'Invalid action. Use "resolve" or "reject"' });
        }
    } catch (error) {
        next(error);
    }
};
