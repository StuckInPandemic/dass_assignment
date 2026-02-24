const router = require('express').Router();
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const {
    createOrganizer,
    getOrganizers,
    removeOrganizer,
    restoreOrganizer,
    getPasswordResets,
    resolvePasswordReset,
} = require('../controllers/adminController');

router.use(auth, roleGuard('admin'));

router.post('/organizers', createOrganizer);
router.get('/organizers', getOrganizers);
router.delete('/organizers/:id', removeOrganizer);
router.put('/organizers/:id/restore', restoreOrganizer);
router.get('/password-resets', getPasswordResets);
router.put('/password-resets/:id', resolvePasswordReset);

module.exports = router;
