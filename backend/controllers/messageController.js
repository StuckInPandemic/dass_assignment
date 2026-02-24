const Message = require('../models/Message');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const Organizer = require('../models/Organizer');

// GET /api/events/:id/messages?page=1&limit=50
const getMessages = async (req, res) => {
    try {
        const eventId = req.params.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;

        // Access check
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        if (req.user.role === 'organizer') {
            const organizer = await Organizer.findOne({ user: req.user._id });
            if (!organizer || event.organizer.toString() !== organizer._id.toString()) {
                return res.status(403).json({ message: 'Not your event' });
            }
        } else {
            const reg = await Registration.findOne({
                event: eventId,
                participant: req.user._id,
                status: { $in: ['confirmed', 'pending_approval'] },
            });
            if (!reg) return res.status(403).json({ message: 'Not registered for this event' });
        }

        const total = await Message.countDocuments({ event: eventId });
        const messages = await Message.find({ event: eventId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('replyTo', 'senderName text')
            .lean();

        res.json({
            messages: messages.reverse(), // chronological order
            page,
            totalPages: Math.ceil(total / limit),
            total,
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// DELETE /api/events/:id/messages/:messageId (organizer only)
const deleteMessage = async (req, res) => {
    try {
        const { id: eventId, messageId } = req.params;
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        if (req.user.role === 'organizer') {
            const organizer = await Organizer.findOne({ user: req.user._id });
            if (!organizer || event.organizer.toString() !== organizer._id.toString()) {
                return res.status(403).json({ message: 'Not your event' });
            }
        } else {
            // Participants can only delete their own messages
            const msg = await Message.findById(messageId);
            if (!msg || msg.sender.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Cannot delete this message' });
            }
        }

        await Message.findByIdAndDelete(messageId);
        const { getIO } = require('../services/socketService');
        const io = getIO();
        if (io) io.to(`event:${eventId}`).emit('message-deleted', { messageId });
        res.json({ message: 'Message deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getMessages, deleteMessage };
