const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Artist = require('./models/Artist');
require('dotenv').config();

async function setupDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/artist-portfolio');
        console.log('Connected to MongoDB');

        // Create default admin artist
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@artist.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        // Check if admin already exists
        const existingAdmin = await Artist.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('Admin user already exists');
            process.exit(0);
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        // Create admin artist
        const admin = new Artist({
            name: 'Artist Admin',
            email: adminEmail,
            password: hashedPassword,
            bio: 'Professional visual artist and painter',
            location: 'Addis Ababa, Ethiopia',
            socialMedia: {
                instagram: 'https://instagram.com/artist',
                facebook: 'https://facebook.com/artist',
                twitter: 'https://twitter.com/artist',
                behance: 'https://behance.net/artist'
            }
        });

        await admin.save();
        console.log('Admin user created successfully!');
        console.log(`Email: ${adminEmail}`);
        console.log(`Password: ${adminPassword}`);
        console.log('\nPlease change these credentials after first login!');

        process.exit(0);
    } catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    }
}

setupDatabase();