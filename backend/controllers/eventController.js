const Event = require('../models/Event');
const Organizer = require('../models/Organizer');
const Registration = require('../models/Registration');
const { sendDiscordNotification } = require('../services/discordWebhook');

// ─── Auto-update event status based on current time ───
const autoUpdateEventStatus = async (event) => {
    const now = new Date();
    let updated = false;
    if (event.status === 'published' && event.eventStartDate && new Date(event.eventStartDate) <= now) {
        event.status = 'ongoing';
        updated = true;
    }
    if (event.status === 'ongoing' && event.eventEndDate && new Date(event.eventEndDate) <= now) {
        event.status = 'completed';
        updated = true;
    }
    if (updated) await event.save();
    return event;
};

const autoUpdateMultipleEvents = async (events) => {
    const now = new Date();
    const bulkOps = [];
    for (const event of events) {
        let newStatus = null;
        if (event.status === 'published' && event.eventStartDate && new Date(event.eventStartDate) <= now) {
            newStatus = 'ongoing';
        }
        if ((event.status === 'ongoing' || newStatus === 'ongoing') && event.eventEndDate && new Date(event.eventEndDate) <= now) {
            newStatus = 'completed';
        }
        if (newStatus) {
            event.status = newStatus;
            bulkOps.push({ updateOne: { filter: { _id: event._id }, update: { status: newStatus } } });
        }
    }
    if (bulkOps.length > 0) await Event.bulkWrite(bulkOps);
    return events;
};
// POST /api/events — Create event (draft)
exports.createEvent = async (req, res, next) => {
    try {
        const organizer = await Organizer.findOne({ user: req.user._id });
        if (!organizer) return res.status(404).json({ message: 'Organizer profile not found' });

        const {
            name, description, eventType, eligibility,
            registrationDeadline, eventStartDate, eventEndDate,
            registrationLimit, registrationFee, tags,
            customForm, merchDetails,
        } = req.body;

        const event = await Event.create({
            name,
            description,
            eventType,
            eligibility: eligibility || 'all',
            registrationDeadline,
            eventStartDate,
            eventEndDate,
            registrationLimit: registrationLimit || 0,
            registrationFee: registrationFee || 0,
            organizer: organizer._id,
            tags: tags || [],
            status: 'draft',
            customForm: eventType === 'normal' ? (customForm || { fields: [], isLocked: false }) : undefined,
            merchDetails: eventType === 'merchandise' ? (merchDetails || { items: [], purchaseLimitPerParticipant: 1 }) : undefined,
        });

        res.status(201).json({ event });
    } catch (error) {
        next(error);
    }
};

// PUT /api/events/:id — Edit event (with status-based restrictions)
exports.updateEvent = async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Verify ownership
        const organizer = await Organizer.findOne({ user: req.user._id });
        if (!organizer || event.organizer.toString() !== organizer._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to edit this event' });
        }

        const updates = req.body;

        if (event.status === 'draft') {
            // Free edits on draft
            Object.keys(updates).forEach(key => {
                if (key !== '_id' && key !== 'organizer' && key !== 'status' && key !== 'currentRegistrations') {
                    event[key] = updates[key];
                }
            });
        } else if (event.status === 'published') {
            // Limited edits: description, extend deadline, increase limit
            const allowed = ['description', 'registrationDeadline', 'registrationLimit', 'tags'];
            Object.keys(updates).forEach(key => {
                if (allowed.includes(key)) {
                    if (key === 'registrationLimit' && updates[key] < event.registrationLimit) {
                        return; // Can only increase
                    }
                    event[key] = updates[key];
                }
            });
        } else {
            // Ongoing/Completed — no content edits
            return res.status(400).json({ message: 'Cannot edit event in current status' });
        }

        // Lock form after first registration
        if (event.customForm && event.currentRegistrations > 0) {
            event.customForm.isLocked = true;
        }

        await event.save();
        res.json({ event });
    } catch (error) {
        next(error);
    }
};

// PUT /api/events/:id/publish
exports.publishEvent = async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const organizer = await Organizer.findOne({ user: req.user._id });
        if (!organizer || event.organizer.toString() !== organizer._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (event.status !== 'draft') {
            return res.status(400).json({ message: 'Only draft events can be published' });
        }

        // Validate required fields
        if (!event.name || !event.eventStartDate || !event.registrationDeadline) {
            return res.status(400).json({ message: 'Event name, start date, and registration deadline are required' });
        }

        event.status = 'published';
        await event.save();

        // Send Discord notification
        await sendDiscordNotification(organizer, event);

        res.json({ event });
    } catch (error) {
        next(error);
    }
};

// PUT /api/events/:id/status — Change status (ongoing, completed, closed)
exports.changeStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const validTransitions = {
            published: ['ongoing', 'closed'],
            ongoing: ['completed', 'closed'],
        };

        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const organizer = await Organizer.findOne({ user: req.user._id });
        if (!organizer || event.organizer.toString() !== organizer._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const allowed = validTransitions[event.status];
        if (!allowed || !allowed.includes(status)) {
            return res.status(400).json({ message: `Cannot transition from '${event.status}' to '${status}'` });
        }

        event.status = status;
        await event.save();
        res.json({ event });
    } catch (error) {
        next(error);
    }
};

// GET /api/events — Browse events (search, filter, paginate)
exports.getEvents = async (req, res, next) => {
    try {
        const { search, eventType, eligibility, startDate, endDate, organizer, followed, page = 1, limit = 12 } = req.query;

        const filter = { status: { $in: ['published', 'ongoing'] } };

        if (search) {
            // Build a fuzzy regex: "code" → "c.*o.*d.*e" allows character gaps
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const fuzzyPattern = escaped.split('').join('.*');
            const fuzzyRegex = new RegExp(fuzzyPattern, 'i');
            const partialRegex = new RegExp(escaped, 'i');

            // Generate sub-patterns by removing one char at a time (handles typos/insertions)
            const subPatterns = [];
            if (escaped.length >= 3) {
                for (let i = 0; i < escaped.length; i++) {
                    const sub = escaped.slice(0, i) + escaped.slice(i + 1);
                    subPatterns.push(new RegExp(sub, 'i'));
                }
            }

            // Also search by organizer name — find matching organizer IDs first
            const orgNameConditions = [{ organizerName: partialRegex }];
            if (subPatterns.length > 0) {
                orgNameConditions.push(...subPatterns.map(p => ({ organizerName: p })));
            }
            const matchingOrgs = await Organizer.find({
                $or: orgNameConditions,
            }).select('_id');
            const orgIds = matchingOrgs.map(o => o._id);

            filter.$or = [
                { name: partialRegex },
                { name: fuzzyRegex },
                { description: partialRegex },
                { tags: partialRegex },
            ];
            // Add typo-tolerant sub-patterns on name
            for (const sp of subPatterns) {
                filter.$or.push({ name: sp });
            }
            if (orgIds.length > 0) {
                filter.$or.push({ organizer: { $in: orgIds } });
            }
        }

        if (eventType) filter.eventType = eventType;
        if (eligibility) filter.eligibility = eligibility;
        if (organizer) filter.organizer = organizer;

        if (startDate || endDate) {
            filter.eventStartDate = {};
            if (startDate) filter.eventStartDate.$gte = new Date(startDate);
            if (endDate) filter.eventStartDate.$lte = new Date(endDate);
        }

        // Filter by followed clubs
        if (followed === 'true' && req.user.role === 'participant') {
            const user = req.user;
            if (user.followedOrganizers && user.followedOrganizers.length > 0) {
                // Get organizer profile IDs from user's followed list
                const orgProfiles = await Organizer.find({ _id: { $in: user.followedOrganizers } });
                filter.organizer = { $in: orgProfiles.map(o => o._id) };
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Event.countDocuments(filter);

        let events = await Event.find(filter)
            .populate('organizer', 'organizerName category')
            .sort({ eventStartDate: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Auto-update event statuses based on current time
        await autoUpdateMultipleEvents(events);

        // Personalized ordering: move events matching interests to top
        if (req.user.role === 'participant' && req.user.interests && req.user.interests.length > 0) {
            const userInterests = req.user.interests.map(i => i.toLowerCase());
            events = events.sort((a, b) => {
                const aMatch = a.tags.some(t => userInterests.includes(t.toLowerCase()));
                const bMatch = b.tags.some(t => userInterests.includes(t.toLowerCase()));
                if (aMatch && !bMatch) return -1;
                if (!aMatch && bMatch) return 1;
                return 0;
            });
        }

        res.json({
            events,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/events/trending — Top 5 by registrations in last 24h
exports.getTrending = async (req, res, next) => {
    try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const trending = await Registration.aggregate([
            { $match: { createdAt: { $gte: oneDayAgo } } },
            { $group: { _id: '$event', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
        ]);

        const eventIds = trending.map(t => t._id);
        const events = await Event.find({ _id: { $in: eventIds } })
            .populate('organizer', 'organizerName category');

        // Maintain trending order
        const orderedEvents = eventIds.map(id => {
            const ev = events.find(e => e._id.toString() === id.toString());
            const trendData = trending.find(t => t._id.toString() === id.toString());
            return ev ? { ...ev.toObject(), trendingCount: trendData.count } : null;
        }).filter(Boolean);

        res.json({ events: orderedEvents });
    } catch (error) {
        next(error);
    }
};

// GET /api/events/:id — Event detail
exports.getEvent = async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('organizer', 'organizerName category description contactEmail');

        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Auto-update status based on time
        await autoUpdateEventStatus(event);

        res.json({ event });
    } catch (error) {
        next(error);
    }
};

// GET /api/events/:id/participants — Organizer: list participants
exports.getParticipants = async (req, res, next) => {
    try {
        const { search, attendanceStatus, participantType, page = 1, limit = 20 } = req.query;
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const organizer = await Organizer.findOne({ user: req.user._id });
        if (!organizer || event.organizer.toString() !== organizer._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const filter = { event: event._id };

        // Filter by attendance status
        if (attendanceStatus === 'attended') filter.attended = true;
        if (attendanceStatus === 'not_attended') filter.attended = false;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build aggregation pipeline for search to work before pagination
        const pipeline = [{ $match: filter }];

        // Lookup participant data
        pipeline.push({
            $lookup: {
                from: 'users',
                localField: 'participant',
                foreignField: '_id',
                as: 'participantData',
            },
        });
        pipeline.push({ $unwind: '$participantData' });

        // Filter by participant type
        if (participantType === 'iiit') {
            pipeline.push({ $match: { 'participantData.participantType': 'iiit' } });
        } else if (participantType === 'non-iiit') {
            pipeline.push({ $match: { 'participantData.participantType': 'non-iiit' } });
        }

        // Search by name or email (before pagination)
        if (search) {
            const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            pipeline.push({
                $match: {
                    $or: [
                        { 'participantData.firstName': searchRegex },
                        { 'participantData.lastName': searchRegex },
                        { 'participantData.email': searchRegex },
                    ],
                },
            });
        }

        // Count total after search filters
        const countPipeline = [...pipeline, { $count: 'total' }];
        const countResult = await Registration.aggregate(countPipeline);
        const total = countResult[0]?.total || 0;

        // Sort and paginate
        pipeline.push({ $sort: { createdAt: -1 } });
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: parseInt(limit) });

        // Project to match the expected shape
        pipeline.push({
            $addFields: {
                participant: {
                    _id: '$participantData._id',
                    firstName: '$participantData.firstName',
                    lastName: '$participantData.lastName',
                    email: '$participantData.email',
                    contactNumber: '$participantData.contactNumber',
                    participantType: '$participantData.participantType',
                },
            },
        });
        pipeline.push({ $unset: 'participantData' });

        const registrations = await Registration.aggregate(pipeline);

        res.json({
            registrations,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
        });
    } catch (error) {
        next(error);
    }
};

// PUT /api/events/:id/close-registrations — Close registrations for published event
exports.closeRegistrations = async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const organizer = await Organizer.findOne({ user: req.user._id });
        if (!organizer || event.organizer.toString() !== organizer._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (event.status !== 'published') {
            return res.status(400).json({ message: 'Can only close registrations for published events' });
        }

        // Set deadline to now to block new registrations
        event.registrationDeadline = new Date();
        await event.save();

        res.json({ message: 'Registrations closed', event });
    } catch (error) {
        next(error);
    }
};

// GET /api/events/:id/analytics
exports.getEventAnalytics = async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const organizer = await Organizer.findOne({ user: req.user._id });
        if (!organizer || event.organizer.toString() !== organizer._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const stats = await Registration.aggregate([
            { $match: { event: event._id, status: 'confirmed' } },
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
            analytics: stats[0] || { totalRegistrations: 0, totalRevenue: 0, totalAttended: 0 },
            event: { name: event.name, status: event.status, registrationLimit: event.registrationLimit, currentRegistrations: event.currentRegistrations },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/events/:id/participants/export — CSV export
exports.exportParticipants = async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const organizer = await Organizer.findOne({ user: req.user._id });
        if (!organizer || event.organizer.toString() !== organizer._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const registrations = await Registration.find({ event: event._id })
            .populate('participant', 'firstName lastName email contactNumber college');

        const { createObjectCsvStringifier } = require('csv-writer');

        // Base columns
        const header = [
            { id: 'name', title: 'Name' },
            { id: 'email', title: 'Email' },
            { id: 'contact', title: 'Contact' },
            { id: 'college', title: 'College' },
            { id: 'ticketId', title: 'Ticket ID' },
            { id: 'status', title: 'Status' },
            { id: 'attended', title: 'Attended' },
            { id: 'amount', title: 'Amount' },
            { id: 'date', title: 'Registration Date' },
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
                status: r.status,
                attended: r.attended ? 'Yes' : 'No',
                amount: r.totalAmount,
                date: r.createdAt.toISOString().split('T')[0],
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
        res.setHeader('Content-Disposition', `attachment; filename="${event.name}_participants.csv"`);
        res.send(csv);
    } catch (error) {
        next(error);
    }
};
