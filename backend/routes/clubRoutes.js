const router = require('express').Router();
const auth = require('../middleware/auth');
const Organizer = require('../models/Organizer');
const Event = require('../models/Event');

// GET /api/clubs — List all active organizers
router.get('/', auth, async (req, res, next) => {
    try {
        const organizers = await Organizer.find({ status: 'active' })
            .select('organizerName category description contactEmail followers');

        // Add isFollowed flag for participants
        const result = organizers.map(org => ({
            ...org.toObject(),
            followerCount: org.followers?.length || 0,
            isFollowed: req.user.role === 'participant' && org.followers?.some(f => f.toString() === req.user._id.toString()),
        }));

        res.json({ organizers: result });
    } catch (error) {
        next(error);
    }
});

// GET /api/clubs/:id — Organizer detail + events
router.get('/:id', auth, async (req, res, next) => {
    try {
        const organizer = await Organizer.findById(req.params.id)
            .select('organizerName category description contactEmail followers');
        if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

        const now = new Date();
        const upcoming = await Event.find({
            organizer: organizer._id,
            status: { $in: ['published', 'ongoing'] },
            eventStartDate: { $gte: now },
        }).sort({ eventStartDate: 1 });

        const past = await Event.find({
            organizer: organizer._id,
            status: { $in: ['completed', 'closed'] },
        }).sort({ eventEndDate: -1 });

        res.json({
            organizer: {
                ...organizer.toObject(),
                followerCount: organizer.followers?.length || 0,
                isFollowed: req.user.role === 'participant' && organizer.followers?.some(f => f.toString() === req.user._id.toString()),
            },
            upcoming,
            past,
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
