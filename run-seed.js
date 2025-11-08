import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './server/models/User.js';

// Load environment variables
dotenv.config();

const seedUsers = async () => {
  try {
    // Get MongoDB URI from environment or use provided one
    let mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      console.error('\n❌ MONGODB_URI not found in .env file');
      console.error('\nPlease create a .env file with:');
      console.error('MONGODB_URI=your-mongodb-connection-string\n');
      console.error('Or get it from Render.com:');
      console.error('1. Go to Render Dashboard -> Your Service -> Environment');
      console.error('2. Copy the MONGODB_URI value');
      console.error('3. Create .env file with: MONGODB_URI=<paste-here>\n');
      process.exit(1);
    }

    // Ensure database name is included
    if (!mongoURI.includes('/inkline')) {
      if (mongoURI.includes('?')) {
        mongoURI = mongoURI.replace('?', '/inkline?');
      } else {
        mongoURI = mongoURI + '/inkline';
      }
    }

    console.log('\n🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing test users
    console.log('🧹 Clearing existing test users...');
    const deleteResult = await User.deleteMany({ 
      email: { 
        $in: [
          'student@test.com',
          'itadmin@test.com',
          'sscadmin@test.com',
          'bsitstudent@test.com'
        ] 
      } 
    });
    console.log(`✅ Cleared ${deleteResult.deletedCount} existing test users\n`);

    // Create test users
    console.log('👤 Creating admin users...\n');
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
      try {
        const user = await User.create(userData);
        console.log(`✅ Created user: ${user.email} (Role: ${user.role})`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⚠️  User ${userData.email} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n🎉 Admin users created successfully!');
    console.log('\n📋 Admin Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('IT Admin Portal:');
    console.log('  Email: itadmin@test.com');
    console.log('  Password: password123');
    console.log('\nSSC Admin Portal:');
    console.log('  Email: sscadmin@test.com');
    console.log('  Password: password123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating admin users:', error.message);
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 Tip: Check your MongoDB username and password in the connection string.');
      console.error('   Make sure the password is correct and URL-encoded if it has special characters.');
    }
    if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
      console.error('\n💡 Tip: Check your MongoDB network access settings.');
      console.error('   Go to MongoDB Atlas -> Network Access -> Allow 0.0.0.0/0');
    }
    if (error.message.includes('MONGODB_URI')) {
      console.error('\n💡 Tip: Make sure MONGODB_URI is set in your .env file.');
    }
    process.exit(1);
  }
};

seedUsers();

