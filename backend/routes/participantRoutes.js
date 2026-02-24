const router = require('express').Router();
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const {
    updateProfile,
    completeOnboarding,
    followOrganizer,
    unfollowOrganizer,
    changePassword,
} = require('../controllers/participantController');
const { getMyRegistrations, getRegistration, uploadPaymentProof, uploadPaymentProofHandler } = require('../controllers/registrationController');

router.use(auth, roleGuard('participant'));

router.put('/profile', updateProfile);
router.put('/onboarding', completeOnboarding);
router.post('/follow/:organizerId', followOrganizer);
router.delete('/follow/:organizerId', unfollowOrganizer);
router.put('/change-password', changePassword);
router.get('/registrations', getMyRegistrations);
router.get('/registrations/:id', getRegistration);
router.post('/registrations/:id/payment-proof', uploadPaymentProof, uploadPaymentProofHandler);

module.exports = router;
