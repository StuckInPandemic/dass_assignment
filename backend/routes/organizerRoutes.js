const router = require('express').Router();
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const {
    getProfile,
    updateProfile,
    getMyEvents,
    getDashboard,
    requestPasswordReset,
    getMyResetRequests,
} = require('../controllers/organizerController');
const {
    getEventOrders,
    approveOrder,
    scanTicket,
    getAttendance,
    exportAttendance,
    manualAttendance,
} = require('../controllers/registrationController');

router.use(auth, roleGuard('organizer'));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/events', getMyEvents);
router.get('/dashboard', getDashboard);
router.post('/password-reset-request', requestPasswordReset);
router.get('/password-reset-requests', getMyResetRequests);

// Payment approval workflow
router.get('/events/:id/orders', getEventOrders);
router.put('/registrations/:id/approve', approveOrder);

// QR Scanner & Attendance
router.post('/events/:id/scan', scanTicket);
router.get('/events/:id/attendance', getAttendance);
router.get('/events/:id/attendance/export', exportAttendance);
router.put('/events/:id/attendance/:registrationId', manualAttendance);

module.exports = router;
