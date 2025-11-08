import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const seedUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing test users (optional - comment out if you want to keep existing users)
    await User.deleteMany({ 
      email: { 
        $in: [
          'student@test.com',
          'itadmin@test.com',
          'sscadmin@test.com',
          'bsitstudent@test.com'
        ] 
      } 
    });
    console.log('🧹 Cleared existing test users');

    // Create test users
    const users = [
      {
        fullName: 'Test Student',
        email: 'student@test.com',
        password: 'password123',
        isBSIT: false,
        accountStatus: 'approved',
        role: 'student'
      },
      {
        fullName: 'BSIT Student (Pending)',
        email: 'bsitstudent@test.com',
        password: 'password123',
        isBSIT: true,
        accountStatus: 'pending',
        role: 'student'
      },
      {
        fullName: 'IT Admin',
        email: 'itadmin@test.com',
        password: 'password123',
        isBSIT: false,
        accountStatus: 'approved',
        role: 'it_admin'
      },
      {
        fullName: 'SSC Admin',
        email: 'sscadmin@test.com',
        password: 'password123',
        isBSIT: false,
        accountStatus: 'approved',
        role: 'ssc_admin'
      }
    ];

    for (const userData of users) {
      const user = await User.create(userData);
      console.log(`✅ Created user: ${user.email} (Role: ${user.role})`);
    }

    console.log('\n🎉 Test users created successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Student Portal:');
    console.log('  Email: student@test.com');
    console.log('  Password: password123');
    console.log('\nIT Admin Portal:');
    console.log('  Email: itadmin@test.com');
    console.log('  Password: password123');
    console.log('\nSSC Admin Portal:');
    console.log('  Email: sscadmin@test.com');
    console.log('  Password: password123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  }
};

seedUsers();

