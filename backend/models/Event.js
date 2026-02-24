const mongoose = require('mongoose');

const formFieldSchema = new mongoose.Schema({
    fieldId: { type: String, required: true },
    label: { type: String, required: true },
    type: {
        type: String,
        enum: ['text', 'textarea', 'dropdown', 'checkbox', 'radio', 'file', 'number', 'email'],
        required: true,
    },
    options: [String],
    required: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
}, { _id: false });

const variantSchema = new mongoose.Schema({
    size: String,
    color: String,
    stock: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
}, { _id: true });

const merchItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    variants: [variantSchema],
}, { _id: true });

const eventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: '',
    },
    eventType: {
        type: String,
        enum: ['normal', 'merchandise'],
        required: true,
    },
    eligibility: {
        type: String,
        enum: ['all', 'iiit-only', 'non-iiit-only'],
        default: 'all',
    },
    registrationDeadline: {
        type: Date,
    },
    eventStartDate: {
        type: Date,
    },
    eventEndDate: {
        type: Date,
    },
    registrationLimit: {
        type: Number,
        default: 0, // 0 = unlimited
    },
    registrationFee: {
        type: Number,
        default: 0,
    },
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organizer',
        required: true,
    },
    tags: [String],
    status: {
        type: String,
        enum: ['draft', 'published', 'ongoing', 'completed', 'closed'],
        default: 'draft',
    },
    currentRegistrations: {
        type: Number,
        default: 0,
    },
    // Normal event: custom form
    customForm: {
        fields: [formFieldSchema],
        isLocked: { type: Boolean, default: false },
    },
    // Merchandise event
    merchDetails: {
        items: [merchItemSchema],
        purchaseLimitPerParticipant: { type: Number, default: 1 },
    },
}, { timestamps: true });

// Text index for search
eventSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Event', eventSchema);
