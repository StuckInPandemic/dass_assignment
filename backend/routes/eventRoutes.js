const router = require('express').Router();
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const {
    createEvent,
    updateEvent,
    publishEvent,
    changeStatus,
    closeRegistrations,
    getEvents,
    getTrending,
    getEvent,
    getParticipants,
    getEventAnalytics,
    exportParticipants,
} = require('../controllers/eventController');
const { registerForEvent, purchaseMerch } = require('../controllers/registrationController');
const { getMessages, deleteMessage } = require('../controllers/messageController');

// Public browse (but still authenticated)
router.get('/', auth, getEvents);
router.get('/trending', auth, getTrending);
router.get('/:id', auth, getEvent);

// Participant registration
router.post('/:id/register', auth, roleGuard('participant'), registerForEvent);
router.post('/:id/purchase', auth, roleGuard('participant'), purchaseMerch);

// Discussion messages (any authenticated user with access)
router.get('/:id/messages', auth, getMessages);
router.delete('/:id/messages/:messageId', auth, deleteMessage);

// Organizer-only
router.post('/', auth, roleGuard('organizer'), createEvent);
router.put('/:id', auth, roleGuard('organizer'), updateEvent);
router.put('/:id/publish', auth, roleGuard('organizer'), publishEvent);
router.put('/:id/status', auth, roleGuard('organizer'), changeStatus);
router.put('/:id/close-registrations', auth, roleGuard('organizer'), closeRegistrations);
router.get('/:id/participants', auth, roleGuard('organizer'), getParticipants);
router.get('/:id/analytics', auth, roleGuard('organizer'), getEventAnalytics);
router.get('/:id/participants/export', auth, roleGuard('organizer'), exportParticipants);

module.exports = router;
