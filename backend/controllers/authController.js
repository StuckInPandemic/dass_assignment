const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organizer = require('../models/Organizer');

const generateToken = (userId, role) => {
    return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

// POST /api/auth/register
exports.register = async (req, res, next) => {
    try {
        const { email, password, firstName, lastName, college, contactNumber } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Auto-detect participant type from email domain
        const iiitDomains = ['@iiit.ac.in', '@students.iiit.ac.in', '@research.iiit.ac.in'];
        const isIIIT = iiitDomains.some(domain => email.toLowerCase().endsWith(domain));
        const participantType = isIIIT ? 'iiit' : 'non-iiit';

        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const user = await User.create({
            email: email.toLowerCase(),
            password,
            role: 'participant',
            firstName,
            lastName,
            participantType,
            college: college || '',
            contactNumber: contactNumber || '',
        });

        const token = generateToken(user._id, user.role);

        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                participantType: user.participantType,
                onboardingComplete: user.onboardingComplete,
            },
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check if organizer is active
        if (user.role === 'organizer') {
            const organizer = await Organizer.findOne({ user: user._id });
            if (organizer && organizer.status !== 'active') {
                const statusMsg = organizer.status === 'archived'
                    ? 'Account has been archived. Contact admin.'
                    : 'Account has been disabled. Contact admin.';
                return res.status(403).json({ message: statusMsg });
            }
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = generateToken(user._id, user.role);

        // Build user response based on role
        let userData = {
            id: user._id,
            email: user.email,
            role: user.role,
        };

        if (user.role === 'participant') {
            userData = {
                ...userData,
                firstName: user.firstName,
                lastName: user.lastName,
                participantType: user.participantType,
                onboardingComplete: user.onboardingComplete,
            };
        } else if (user.role === 'organizer') {
            const organizer = await Organizer.findOne({ user: user._id });
            userData.organizer = organizer;
        }

        res.json({ token, user: userData });
    } catch (error) {
        next(error);
    }
};

// GET /api/auth/me
exports.getMe = async (req, res, next) => {
    try {
        const user = req.user;
        let userData = {
            id: user._id,
            email: user.email,
            role: user.role,
        };

        if (user.role === 'participant') {
            userData = {
                ...userData,
                firstName: user.firstName,
                lastName: user.lastName,
                participantType: user.participantType,
                college: user.college,
                contactNumber: user.contactNumber,
                interests: user.interests,
                followedOrganizers: user.followedOrganizers,
                onboardingComplete: user.onboardingComplete,
            };
        } else if (user.role === 'organizer') {
            const organizer = await Organizer.findOne({ user: user._id });
            userData.organizer = organizer;
        }

        res.json({ user: userData });
    } catch (error) {
        next(error);
    }
};
