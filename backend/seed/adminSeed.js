require('dotenv').config();
const User = require('../models/User');
const connectDB = require('../config/db');

const seedAdmin = async () => {
    try {
        await connectDB();

        const adminEmail = process.env.ADMIN_EMAIL || 'admin@felicity.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        const existing = await User.findOne({ email: adminEmail });
        if (existing) {
            console.log('Admin already exists:', adminEmail);
            process.exit(0);
        }

        await User.create({
            email: adminEmail,
            password: adminPassword,
            role: 'admin',
        });

        console.log(`Admin account created: ${adminEmail} / ${adminPassword}`);
        process.exit(0);
    } catch (error) {
        console.error('Seed failed:', error.message);
        process.exit(1);
    }
};

seedAdmin();
