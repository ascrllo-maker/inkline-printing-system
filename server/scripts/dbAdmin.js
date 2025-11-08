import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Printer from '../models/Printer.js';
import Notification from '../models/Notification.js';
import Violation from '../models/Violation.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const showStats = async () => {
  const userCount = await User.countDocuments();
  const orderCount = await Order.countDocuments();
  const printerCount = await Printer.countDocuments();
  const notificationCount = await Notification.countDocuments();
  const violationCount = await Violation.countDocuments();
  
  const students = await User.countDocuments({ role: 'student' });
  const itAdmins = await User.countDocuments({ role: 'it_admin' });
  const sscAdmins = await User.countDocuments({ role: 'ssc_admin' });
  const pendingAccounts = await User.countDocuments({ accountStatus: 'pending' });
  
  const ordersByStatus = await Order.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  console.log('\n📊 Database Statistics:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total Users: ${userCount}`);
  console.log(`  - Students: ${students}`);
  console.log(`  - IT Admins: ${itAdmins}`);
  console.log(`  - SSC Admins: ${sscAdmins}`);
  console.log(`  - Pending Approvals: ${pendingAccounts}`);
  console.log(`\nTotal Orders: ${orderCount}`);
  ordersByStatus.forEach(item => {
    console.log(`  - ${item._id}: ${item.count}`);
  });
  console.log(`\nTotal Printers: ${printerCount}`);
  console.log(`Total Notifications: ${notificationCount}`);
  console.log(`Total Violations: ${violationCount}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
};

const listUsers = async (filter) => {
  let query = {};
  if (filter === 'pending') {
    query = { accountStatus: 'pending' };
  } else if (filter === 'students') {
    query = { role: 'student' };
  } else if (filter === 'admins') {
    query = { role: { $in: ['it_admin', 'ssc_admin'] } };
  }
  
  const users = await User.find(query).select('fullName email role accountStatus isBSIT bannedFrom').sort({ createdAt: -1 });
  console.log(`\n👥 Users${filter ? ` (${filter})` : ''}:`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  users.forEach(user => {
    const banned = user.bannedFrom && user.bannedFrom.length > 0 ? ` [Banned: ${user.bannedFrom.join(', ')}]` : '';
    const bsit = user.isBSIT ? ' [BSIT]' : '';
    console.log(`- ${user.fullName} (${user.email})`);
    console.log(`  Role: ${user.role} | Status: ${user.accountStatus}${bsit}${banned}`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
};

const listOrders = async (status, shop) => {
  let query = {};
  if (status) query.status = status;
  if (shop) query.shop = shop;
  
  const orders = await Order.find(query)
    .populate('userId', 'fullName email')
    .populate('printerId', 'name')
    .sort({ createdAt: -1 })
    .limit(20);
  
  console.log(`\n📋 Orders${status ? ` (${status})` : ''}${shop ? ` - ${shop} Shop` : ''}:`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (orders.length === 0) {
    console.log('No orders found.');
  } else {
    orders.forEach(order => {
      console.log(`- Order #${order.orderNumber}`);
      console.log(`  User: ${order.userId?.fullName || 'N/A'} (${order.userId?.email || 'N/A'})`);
      console.log(`  Printer: ${order.printerId?.name || 'N/A'} | Shop: ${order.shop}`);
      console.log(`  Status: ${order.status} | ${order.paperSize} ${order.orientation} ${order.colorType} - ${order.copies} copies`);
      console.log(`  Created: ${new Date(order.createdAt).toLocaleString()}`);
      console.log('');
    });
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
};

const listPrinters = async (shop) => {
  let query = {};
  if (shop) query.shop = shop;
  
  const printers = await Printer.find(query).sort({ name: 1 });
  console.log(`\n🖨️  Printers${shop ? ` (${shop} Shop)` : ''}:`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (printers.length === 0) {
    console.log('No printers found.');
  } else {
    printers.forEach(printer => {
      const enabledSizes = printer.availablePaperSizes.filter(ps => ps.enabled).map(ps => ps.size).join(', ');
      console.log(`- ${printer.name} (${printer.shop} Shop)`);
      console.log(`  Status: ${printer.status} | Queue: ${printer.queueCount || 0}`);
      console.log(`  Available Paper Sizes: ${enabledSizes || 'None'}`);
      console.log('');
    });
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
};

// Run the script
(async () => {
  await connectDB();
  
  // Get command from command line arguments
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];
  
  try {
    switch (command) {
      case 'stats':
        await showStats();
        break;
      case 'users':
        await listUsers(arg1);
        break;
      case 'orders':
        await listOrders(arg1, arg2);
        break;
      case 'printers':
        await listPrinters(arg1);
        break;
      default:
        console.log('\n📚 Database Admin Tool - Usage:\n');
        console.log('Statistics:');
        console.log('  node server/scripts/dbAdmin.js stats');
        console.log('\nUsers:');
        console.log('  node server/scripts/dbAdmin.js users              - List all users');
        console.log('  node server/scripts/dbAdmin.js users pending      - List pending approvals');
        console.log('  node server/scripts/dbAdmin.js users students     - List all students');
        console.log('  node server/scripts/dbAdmin.js users admins       - List all admins');
        console.log('\nOrders:');
        console.log('  node server/scripts/dbAdmin.js orders             - List recent orders');
        console.log('  node server/scripts/dbAdmin.js orders "In Queue"  - List orders by status');
        console.log('  node server/scripts/dbAdmin.js orders "" IT       - List orders by shop');
        console.log('  node server/scripts/dbAdmin.js orders "In Queue" IT - List orders by status and shop');
        console.log('\nPrinters:');
        console.log('  node server/scripts/dbAdmin.js printers           - List all printers');
        console.log('  node server/scripts/dbAdmin.js printers IT        - List printers by shop');
        console.log('');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  await mongoose.connection.close();
  process.exit(0);
})();

