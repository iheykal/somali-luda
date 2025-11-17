import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

const createSuperAdmin = async () => {
    try {
        // Connect to MongoDB
        const connectionURI = process.env.CONNECTION_URI;
        if (!connectionURI) {
            console.error('❌ CONNECTION_URI not found in .env file');
            process.exit(1);
        }

        await mongoose.connect(connectionURI);
        console.log('✅ Connected to MongoDB');

        // Check if user already exists
        const existingUser = await User.findOne({ phone: '610251014' });
        
        if (existingUser) {
            // Update existing user to superadmin
            existingUser.username = 'Ilyaas';
            existingUser.isAdmin = true;
            existingUser.isSuperAdmin = true;
            
            // Update password if needed
            existingUser.password = 'ilyaas321';
            await existingUser.save();
            
            console.log('✅ Updated existing user to superadmin');
            console.log('   Phone: 610251014');
            console.log('   Password: ilyaas321');
            console.log('   Role: SuperAdmin');
        } else {
            // Create new superadmin user
            const superAdmin = new User({
                username: 'Ilyaas',
                phone: '610251014',
                password: 'ilyaas321',
                balance: 0,
                isAdmin: true,
                isSuperAdmin: true
            });

            await superAdmin.save();
            console.log('✅ Superadmin user created successfully!');
            console.log('   Phone: 610251014');
            console.log('   Password: ilyaas321');
            console.log('   Role: SuperAdmin');
        }

        // Verify the user
        const user = await User.findOne({ phone: '610251014' });
        console.log('\n📋 User Details:');
        console.log('   ID:', user._id);
        console.log('   Username:', user.username);
        console.log('   Phone:', user.phone);
        console.log('   Is Admin:', user.isAdmin);
        console.log('   Is SuperAdmin:', user.isSuperAdmin);
        console.log('   Balance:', user.balance);

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating superadmin:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

// Run the script
createSuperAdmin();





