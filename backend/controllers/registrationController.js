const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Organizer = require('../models/Organizer');
const User = require('../models/User');
const { generateTicketId, generateQR } = require('../services/qrService');
const { sendTicketEmail } = require('../services/emailService');
const path = require('path');
const multer = require('multer');

// Multer config for payment proof uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads', 'payment-proofs')),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
    },
});
exports.uploadPaymentProof = upload.single('paymentProof');

// ─── POST /api/events/:id/register — Normal event registration ───
exports.registerForEvent = async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        if (!['published', 'ongoing'].includes(event.status)) {
            return res.status(400).json({ message: 'Event is not open for registration' });
        }
        if (event.eventType !== 'normal') {
            return res.status(400).json({ message: 'Use /purchase for merchandise events' });
        }
        if (event.registrationDeadline && new Date(event.registrationDeadline) < new Date()) {
            return res.status(400).json({ message: 'Registration deadline has passed' });
        }
        if (event.registrationLimit > 0 && event.currentRegistrations >= event.registrationLimit) {
            return res.status(400).json({ message: 'Event is full' });
        }

        const user = req.user;
        if (event.eligibility === 'iiit-only' && user.participantType !== 'iiit') {
            return res.status(403).json({ message: 'This event is for IIIT students only' });
        }
        if (event.eligibility === 'non-iiit-only' && user.participantType !== 'non-iiit') {
            return res.status(403).json({ message: 'This event is for non-IIIT participants only' });
        }

        const existing = await Registration.findOne({ event: event._id, participant: user._id, status: { $in: ['confirmed', 'pending_approval'] } });
        if (existing) {
            return res.status(400).json({ message: 'You are already registered for this event', registration: existing });
        }

        const { formResponses } = req.body;
        if (event.customForm && event.customForm.fields && event.customForm.fields.length > 0) {
            for (const field of event.customForm.fields) {
                if (field.required) {
                    const val = formResponses?.[field.fieldId];
                    if (val === undefined || val === null || val === '') {
                        return res.status(400).json({ message: `Field "${field.label}" is required` });
                    }
                }
            }
        }

        const ticketId = generateTicketId();
        const isPaid = event.registrationFee && event.registrationFee > 0;

        if (isPaid) {
            // Paid normal event: require payment proof like merchandise
            const registration = await Registration.create({
                ticketId,
                event: event._id,
                participant: user._id,
                registrationType: 'normal',
                formResponses: formResponses || {},
                status: 'pending_approval',
                totalAmount: event.registrationFee,
                paymentStatus: 'pending',
                approvalStatus: 'pending',
                // No QR yet — generated on approval
            });

            if (event.customForm) event.customForm.isLocked = true;
            await event.save();

            res.status(201).json({ registration, ticketId, message: 'Registration submitted. Upload payment proof to proceed.' });
        } else {
            // Free event: instant confirm
            const qrData = { ticketId, eventId: event._id, eventName: event.name, participantId: user._id };
            const qrCodeData = await generateQR(qrData);

            const registration = await Registration.create({
                ticketId,
                event: event._id,
                participant: user._id,
                registrationType: 'normal',
                formResponses: formResponses || {},
                status: 'confirmed',
                totalAmount: 0,
                paymentStatus: 'paid',
                qrCodeData,
                approvalStatus: 'not_required',
            });

            event.currentRegistrations += 1;
            if (event.customForm) event.customForm.isLocked = true;
            await event.save();

            sendTicketEmail(user.email, event, ticketId, qrCodeData).catch(() => { });

            res.status(201).json({ registration, ticketId });
        }
    } catch (error) {
        next(error);
    }
};

// ─── POST /api/events/:id/purchase — Merchandise purchase (pending approval) ───
exports.purchaseMerch = async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        if (!['published', 'ongoing'].includes(event.status)) {
            return res.status(400).json({ message: 'Event is not open for purchases' });
        }
        if (event.eventType !== 'merchandise') {
            return res.status(400).json({ message: 'This is not a merchandise event' });
        }
        if (event.registrationDeadline && new Date(event.registrationDeadline) < new Date()) {
            return res.status(400).json({ message: 'Purchase deadline has passed' });
        }

        const user = req.user;
        if (event.eligibility === 'iiit-only' && user.participantType !== 'iiit') {
            return res.status(403).json({ message: 'This event is for IIIT students only' });
        }
        if (event.eligibility === 'non-iiit-only' && user.participantType !== 'non-iiit') {
            return res.status(403).json({ message: 'This event is for non-IIIT participants only' });
        }

        const existingCount = await Registration.countDocuments({
            event: event._id, participant: user._id, status: { $in: ['confirmed', 'pending_approval'] },
        });
        const purchaseLimit = event.merchDetails?.purchaseLimitPerParticipant || 1;
        if (existingCount >= purchaseLimit) {
            return res.status(400).json({ message: `Purchase limit (${purchaseLimit}) reached for this event` });
        }

        const { merchSelections } = req.body;
        if (!merchSelections || merchSelections.length === 0) {
            return res.status(400).json({ message: 'No items selected' });
        }

        // Validate selections and calculate total (don't decrement stock yet)
        let totalAmount = 0;
        const validatedSelections = [];

        for (const sel of merchSelections) {
            const item = event.merchDetails.items.find(i => i.name === sel.itemName);
            if (!item) return res.status(400).json({ message: `Item "${sel.itemName}" not found` });

            const variant = item.variants.find(v =>
                v.size === sel.variant.size && v.color === sel.variant.color
            );
            if (!variant) return res.status(400).json({ message: `Variant not found for "${sel.itemName}"` });

            const qty = parseInt(sel.quantity) || 1;
            if (variant.stock < qty) {
                return res.status(400).json({ message: `Insufficient stock for "${sel.itemName}" (${variant.size}/${variant.color}). Available: ${variant.stock}` });
            }

            totalAmount += variant.price * qty;
            validatedSelections.push({
                itemName: sel.itemName,
                variant: { size: variant.size, color: variant.color },
                quantity: qty,
                price: variant.price,
            });
        }

        // Create registration in pending_approval state — NO stock decrement, NO QR
        const ticketId = generateTicketId();

        const registration = await Registration.create({
            ticketId,
            event: event._id,
            participant: user._id,
            registrationType: 'merchandise',
            merchSelections: validatedSelections,
            status: 'pending_approval',
            totalAmount,
            paymentStatus: 'pending',
            approvalStatus: 'pending',
            // No qrCodeData yet — generated on approval
        });

        res.status(201).json({ registration, ticketId, message: 'Order placed. Upload payment proof to proceed.' });
    } catch (error) {
        next(error);
    }
};

// ─── POST /api/participant/registrations/:id/payment-proof — Upload payment proof ───
exports.uploadPaymentProofHandler = async (req, res, next) => {
    try {
        const registration = await Registration.findById(req.params.id);
        if (!registration) return res.status(404).json({ message: 'Registration not found' });
        if (registration.participant.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        if (registration.approvalStatus !== 'pending') {
            return res.status(400).json({ message: 'Payment proof can only be uploaded for pending orders' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        registration.paymentProof = `/uploads/payment-proofs/${req.file.filename}`;
        await registration.save();

        res.json({ message: 'Payment proof uploaded', registration });
    } catch (error) {
        next(error);
    }
};

// ─── GET /api/organizer/events/:id/orders — List orders for organizer ───
exports.getEventOrders = async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const organizer = await Organizer.findOne({ user: req.user._id });
        if (!organizer || event.organizer.toString() !== organizer._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { status } = req.query;
        const filter = { event: event._id, approvalStatus: { $in: ['pending', 'approved', 'rejected'] } };
        if (status) filter.approvalStatus = status;

        const orders = await Registration.find(filter)
            .populate('participant', 'firstName lastName email contactNumber')
            .sort({ createdAt: -1 });

        res.json({ orders });
    } catch (error) {
        next(error);
    }
};

// ─── PUT /api/organizer/registrations/:id/approve — Approve or reject order ───
exports.approveOrder = async (req, res, next) => {
    try {
        const { action, note } = req.body; // 'approve' or 'reject'
        const registration = await Registration.findById(req.params.id).populate('event');
        if (!registration) return res.status(404).json({ message: 'Order not found' });

        const organizer = await Organizer.findOne({ user: req.user._id });
        if (!organizer || registration.event.organizer.toString() !== organizer._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (registration.approvalStatus !== 'pending') {
            return res.status(400).json({ message: 'Order already processed' });
        }

        if (action === 'approve') {
            // Atomic stock decrement — only for merchandise registrations
            if (registration.registrationType === 'merchandise' && registration.merchSelections && registration.merchSelections.length > 0) {
                for (const sel of registration.merchSelections) {
                    const result = await Event.updateOne(
                        {
                            _id: registration.event._id,
                            'merchDetails.items': {
                                $elemMatch: {
                                    name: sel.itemName,
                                    variants: {
                                        $elemMatch: {
                                            size: sel.variant.size,
                                            color: sel.variant.color,
                                            stock: { $gte: sel.quantity },
                                        },
                                    },
                                },
                            },
                        },
                        { $inc: { 'merchDetails.items.$[item].variants.$[variant].stock': -sel.quantity } },
                        { arrayFilters: [{ 'item.name': sel.itemName }, { 'variant.size': sel.variant.size, 'variant.color': sel.variant.color }] }
                    );
                    if (result.modifiedCount === 0) {
                        return res.status(400).json({ message: `Insufficient stock for "${sel.itemName}" — cannot approve` });
                    }
                }
            }

            // Generate QR + ticket
            const qrData = { ticketId: registration.ticketId, eventId: registration.event._id, eventName: registration.event.name, participantId: registration.participant };
            const qrCodeData = await generateQR(qrData);

            registration.status = 'confirmed';
            registration.approvalStatus = 'approved';
            registration.paymentStatus = 'paid';
            registration.qrCodeData = qrCodeData;
            registration.approvedBy = req.user._id;
            registration.approvedAt = new Date();
            registration.approvalNote = note || '';
            await registration.save();

            // Increment registration count
            await Event.findByIdAndUpdate(registration.event._id, { $inc: { currentRegistrations: 1 } });

            // Send email
            const participant = await User.findById(registration.participant);
            if (participant) {
                sendTicketEmail(participant.email, registration.event, registration.ticketId, qrCodeData, {
                    merchSelections: registration.merchSelections,
                    totalAmount: registration.totalAmount,
                }).catch(() => { });
            }

            res.json({ message: 'Order approved — ticket generated', registration });
        } else if (action === 'reject') {
            registration.status = 'rejected';
            registration.approvalStatus = 'rejected';
            registration.approvedBy = req.user._id;
            registration.approvedAt = new Date();
            registration.approvalNote = note || '';
            await registration.save();

            res.json({ message: 'Order rejected', registration });
        } else {
            res.status(400).json({ message: 'Invalid action. Use "approve" or "reject"' });
        }
    } catch (error) {
        next(error);
    }
};

// ─── QR Scanner & Attendance ───

// POST /api/organizer/events/:id/scan — Scan QR code
exports.scanTicket = async (req, res, next) => {
    try {
        const { ticketId } = req.body;
        if (!ticketId) return res.status(400).json({ message: 'ticketId is required' });

        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const organizer = await Organizer.findOne({ user: req.user._id });
        if (!organizer || event.organizer.toString() !== organizer._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const registration = await Registration.findOne({ ticketId, event: event._id })
            .populate('participant', 'firstName lastName email contactNumber');

        if (!registration) {
            return res.status(404).json({ message: 'Invalid ticket — not found for this event', valid: false });
        }
        if (registration.status !== 'confirmed') {
            return res.status(400).json({ message: `Ticket status is "${registration.status}" — not valid`, valid: false });
        }
        if (registration.attended) {
            return res.status(400).json({
                message: `Already scanned at ${registration.attendedAt?.toLocaleString()}`,
                valid: false,
                duplicate: true,
                participant: registration.participant,
            });
        }

        registration.attended = true;
        registration.attendedAt = new Date();
        registration.scannedBy = req.user._id;
        await registration.save();

        res.json({
            valid: true,
            message: 'Attendance marked',
            participant: registration.participant,
            ticketId: registration.ticketId,
            registrationType: registration.registrationType,
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/organizer/events/:id/attendance — Live attendance data
exports.getAttendance = async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const organizer = await Organizer.findOne({ user: req.user._id });
        if (!organizer || event.organizer.toString() !== organizer._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const registrations = await Registration.find({ event: event._id, status: 'confirmed' })
            .populate('participant', 'firstName lastName email contactNumber')
            .sort({ attended: -1, attendedAt: -1 });

        const total = registrations.length;
        const scanned = registrations.filter(r => r.attended).length;

        res.json({ total, scanned, notScanned: total - scanned, registrations });
    } catch (error) {
        next(error);
    }
};

// GET /api/organizer/events/:id/attendance/export — CSV export
exports.exportAttendance = async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const organizer = await Organizer.findOne({ user: req.user._id });
        if (!organizer || event.organizer.toString() !== organizer._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const registrations = await Registration.find({ event: event._id, status: 'confirmed' })
            .populate('participant', 'firstName lastName email contactNumber college');

        const { createObjectCsvStringifier } = require('csv-writer');

        // Base columns
        const header = [
            { id: 'name', title: 'Name' },
            { id: 'email', title: 'Email' },
            { id: 'contact', title: 'Contact' },
            { id: 'college', title: 'College' },
            { id: 'ticketId', title: 'Ticket ID' },
            { id: 'attended', title: 'Attended' },
            { id: 'scannedAt', title: 'Scanned At' },
            { id: 'amount', title: 'Amount' },
        ];

        // For normal events: add custom form field columns
        const formFields = (event.eventType === 'normal' && event.customForm?.fields) ? event.customForm.fields : [];
        for (const field of formFields) {
            header.push({ id: `form_${field.fieldId}`, title: field.label || field.fieldId });
        }

        // For merch events: add merch-specific columns
        if (event.eventType === 'merchandise') {
            header.push({ id: 'merchItems', title: 'Items Ordered' });
            header.push({ id: 'approvalStatus', title: 'Approval Status' });
        }

        const csvStringifier = createObjectCsvStringifier({ header });

        const records = registrations.map(r => {
            const row = {
                name: `${r.participant?.firstName || ''} ${r.participant?.lastName || ''}`.trim(),
                email: r.participant?.email || '',
                contact: r.participant?.contactNumber || '',
                college: r.participant?.college || '',
                ticketId: r.ticketId,
                attended: r.attended ? 'Yes' : 'No',
                scannedAt: r.attendedAt ? r.attendedAt.toISOString() : '',
                amount: r.totalAmount,
            };

            // Add custom form responses
            for (const field of formFields) {
                const val = r.formResponses?.[field.fieldId];
                row[`form_${field.fieldId}`] = Array.isArray(val) ? val.join('; ') : (val ?? '');
            }

            // Add merch selections
            if (event.eventType === 'merchandise') {
                row.merchItems = (r.merchSelections || []).map(s =>
                    `${s.itemName} (${s.variant?.size || ''}${s.variant?.color ? '/' + s.variant.color : ''}) x${s.quantity} @₹${s.price}`
                ).join(' | ');
                row.approvalStatus = r.approvalStatus || '';
            }

            return row;
        });

        const csv = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${event.name}_attendance.csv"`);
        res.send(csv);
    } catch (error) {
        next(error);
    }
};

// PUT /api/organizer/events/:id/attendance/:registrationId — Manual override
exports.manualAttendance = async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const organizer = await Organizer.findOne({ user: req.user._id });
        if (!organizer || event.organizer.toString() !== organizer._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const registration = await Registration.findById(req.params.registrationId);
        if (!registration || registration.event.toString() !== event._id.toString()) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        const { attended, reason } = req.body;
        registration.attended = attended !== false;
        registration.attendedAt = registration.attended ? new Date() : null;
        registration.scannedBy = req.user._id;
        await registration.save();

        console.log(`[Audit] Manual attendance override for ${registration.ticketId} by ${req.user._id}: attended=${registration.attended}, reason="${reason || 'N/A'}"`);

        res.json({ message: `Attendance ${registration.attended ? 'marked' : 'unmarked'}`, registration });
    } catch (error) {
        next(error);
    }
};

// ─── Participant endpoints ───

// GET /api/participant/registrations — My registrations
exports.getMyRegistrations = async (req, res, next) => {
    try {
        const registrations = await Registration.find({ participant: req.user._id })
            .populate('event', 'name eventType status eventStartDate organizer')
            .populate({ path: 'event', populate: { path: 'organizer', select: 'organizerName' } })
            .sort({ createdAt: -1 });

        res.json({ registrations });
    } catch (error) {
        next(error);
    }
};

// GET /api/participant/registrations/:id — Single registration
exports.getRegistration = async (req, res, next) => {
    try {
        const registration = await Registration.findById(req.params.id)
            .populate('event', 'name description eventType status eventStartDate eventEndDate organizer registrationFee')
            .populate({ path: 'event', populate: { path: 'organizer', select: 'organizerName category' } });

        if (!registration) return res.status(404).json({ message: 'Registration not found' });
        if (registration.participant.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json({ registration });
    } catch (error) {
        next(error);
    }
};
