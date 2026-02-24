const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');
const Organizer = require('../models/Organizer');

let io;

const initSocket = (server) => {
    const { Server } = require('socket.io');
    io = new Server(server, {
        cors: { origin: '*', methods: ['GET', 'POST'] },
    });

    // Auth middleware — verify JWT on connection, then fetch user name from DB
    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('Authentication required'));
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            socket.userRole = decoded.role;

            // Fetch display name from DB
            if (decoded.role === 'organizer') {
                const org = await Organizer.findOne({ user: decoded.userId }).select('organizerName').lean();
                socket.userName = org?.organizerName || 'Organizer';
            } else {
                const user = await User.findById(decoded.userId).select('firstName lastName').lean();
                socket.userName = user ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User';
            }
            next();
        } catch {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.userId} (${socket.userRole})`);

        // Join an event's discussion room
        socket.on('join-event', async (eventId) => {
            try {
                // Verify the user is registered for the event (participant) or owns it (organizer)
                const event = await Event.findById(eventId);
                if (!event) return socket.emit('error', { message: 'Event not found' });

                if (socket.userRole === 'organizer') {
                    const org = await Organizer.findOne({ user: socket.userId });
                    if (!org || event.organizer.toString() !== org._id.toString()) {
                        return socket.emit('error', { message: 'Not your event' });
                    }
                } else {
                    const reg = await Registration.findOne({
                        event: eventId,
                        participant: socket.userId,
                        status: { $in: ['confirmed', 'pending_approval'] },
                    });
                    if (!reg) return socket.emit('error', { message: 'Not registered for this event' });
                }

                socket.join(`event:${eventId}`);
                socket.currentEvent = eventId;
                socket.emit('joined', { eventId });
            } catch (err) {
                socket.emit('error', { message: 'Failed to join room' });
            }
        });

        // Send a message
        socket.on('send-message', async (data) => {
            try {
                const { text, replyTo } = data;
                const eventId = socket.currentEvent;
                if (!eventId) return socket.emit('error', { message: 'Join an event first' });
                if (!text || !text.trim()) return;

                const message = await Message.create({
                    event: eventId,
                    sender: socket.userId,
                    senderName: socket.userName,
                    senderRole: socket.userRole,
                    text: text.trim().substring(0, 1000),
                    replyTo: replyTo || null,
                });

                // Populate replyTo if present
                let populated = message.toObject();
                if (replyTo) {
                    const parent = await Message.findById(replyTo).select('senderName text').lean();
                    populated.replyTo = parent;
                }

                io.to(`event:${eventId}`).emit('new-message', populated);
            } catch (err) {
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Leave room
        socket.on('leave-event', () => {
            if (socket.currentEvent) {
                socket.leave(`event:${socket.currentEvent}`);
                socket.currentEvent = null;
            }
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.userId}`);
        });
    });

    return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };
