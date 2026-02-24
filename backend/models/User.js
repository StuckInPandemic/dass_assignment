const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['participant', 'organizer', 'admin'],
        required: true,
    },
    // Participant-specific fields
    firstName: { type: String },
    lastName: { type: String },
    participantType: {
        type: String,
        enum: ['iiit', 'non-iiit'],
    },
    college: { type: String },
    contactNumber: { type: String },
    interests: [{ type: String }],
    followedOrganizers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Organizer' }],
    onboardingComplete: { type: Boolean, default: false },
    // Organizer-specific fields (login email is in 'email')
    organizerProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer' },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
