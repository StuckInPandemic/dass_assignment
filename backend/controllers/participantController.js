const User = require('../models/User');
const Organizer = require('../models/Organizer');

// PUT /api/participant/profile
exports.updateProfile = async (req, res, next) => {
    try {
        const { firstName, lastName, contactNumber, college, interests } = req.body;

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (contactNumber !== undefined) user.contactNumber = contactNumber;
        if (college !== undefined) user.college = college;
        if (interests) user.interests = interests;

        await user.save();

        res.json({
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                participantType: user.participantType,
                college: user.college,
                contactNumber: user.contactNumber,
                interests: user.interests,
                followedOrganizers: user.followedOrganizers,
                onboardingComplete: user.onboardingComplete,
            },
        });
    } catch (error) {
        next(error);
    }
};

// PUT /api/participant/onboarding
exports.completeOnboarding = async (req, res, next) => {
    try {
        const { interests, followedOrganizers } = req.body;

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (interests) user.interests = interests;
        if (followedOrganizers && followedOrganizers.length > 0) {
            user.followedOrganizers = followedOrganizers;
            // Add user to each organizer's followers
            await Organizer.updateMany(
                { _id: { $in: followedOrganizers } },
                { $addToSet: { followers: user._id } }
            );
        }
        user.onboardingComplete = true;
        await user.save();

        res.json({ message: 'Onboarding complete', user: { id: user._id, onboardingComplete: true, interests: user.interests, followedOrganizers: user.followedOrganizers } });
    } catch (error) {
        next(error);
    }
};

// POST /api/participant/follow/:organizerId
exports.followOrganizer = async (req, res, next) => {
    try {
        const { organizerId } = req.params;
        const organizer = await Organizer.findById(organizerId);
        if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

        await User.findByIdAndUpdate(req.user._id, { $addToSet: { followedOrganizers: organizerId } });
        await Organizer.findByIdAndUpdate(organizerId, { $addToSet: { followers: req.user._id } });

        res.json({ message: 'Followed organizer' });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/participant/follow/:organizerId
exports.unfollowOrganizer = async (req, res, next) => {
    try {
        const { organizerId } = req.params;

        await User.findByIdAndUpdate(req.user._id, { $pull: { followedOrganizers: organizerId } });
        await Organizer.findByIdAndUpdate(organizerId, { $pull: { followers: req.user._id } });

        res.json({ message: 'Unfollowed organizer' });
    } catch (error) {
        next(error);
    }
};

// PUT /api/participant/change-password
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new passwords are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        const user = await User.findById(req.user._id);
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        next(error);
    }
};
