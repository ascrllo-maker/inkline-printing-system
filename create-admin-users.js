import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './server/models/User.js';
import readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const seedUsers = async () => {
  try {
    // Get MongoDB URI
    let mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      console.log('\n⚠️  MONGODB_URI not found in .env file');
      console.log('Please provide your MongoDB connection string.\n');
      mongoURI = await question('Enter MongoDB Connection String: ');
      
      if (!mongoURI) {
        console.error('❌ MongoDB connection string is required!');
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
    }

    console.log('\n🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing test users
    console.log('🧹 Clearing existing test users...');
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
    console.log('✅ Cleared existing test users\n');

    // Create test users
    console.log('👤 Creating admin users...');
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

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating admin users:', error.message);
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 Tip: Check your MongoDB username and password in the connection string.');
    }
    if (error.message.includes('network')) {
      console.error('\n💡 Tip: Check your MongoDB network access settings (should allow 0.0.0.0/0).');
    }
    rl.close();
    process.exit(1);
  }
};

seedUsers();

