import express from 'express';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Printer from '../models/Printer.js';
import Notification from '../models/Notification.js';
import Violation from '../models/Violation.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { sendAccountApprovedEmail, sendOrderReadyEmail, sendOrderPrintingEmail, sendViolationWarningEmail, sendViolationSettledEmail, sendBanNotificationEmail, sendUnbanNotificationEmail } from '../utils/email.js';

const router = express.Router();

// ==================== ACCOUNT APPROVAL (IT Admin Only) ====================

// @route   GET /api/admin/pending-accounts
// @desc    Get all pending BSIT account approvals
// @access  Private (IT Admin only)
router.get('/pending-accounts', protect, adminOnly('IT'), async (req, res) => {
  try {
    const pendingAccounts = await User.find({
      isBSIT: true,
      accountStatus: 'pending'
    }).select('-password').sort({ createdAt: -1 });

    res.json(pendingAccounts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/admin/approve-account/:id
// @desc    Approve a pending account
// @access  Private (IT Admin only)
router.put('/approve-account/:id', protect, adminOnly('IT'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.accountStatus !== 'pending') {
      return res.status(400).json({ message: 'Account is not pending approval' });
    }

    user.accountStatus = 'approved';
    await user.save();

    // Send approval email
    try {
      await sendAccountApprovedEmail(user.email, user.fullName);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    // Create notification
    await Notification.create({
      userId: user._id,
      title: 'Account Approved',
      message: 'Your account has been approved! You can now access IT Printing Shop.',
      type: 'account_status'
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(user._id.toString()).emit('account_approved', user);
      io.to('IT_admins').emit('account_approved', { userId: user._id });
    }

    res.json({ message: 'Account approved successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/admin/decline-account/:id
// @desc    Decline and delete a pending account
// @access  Private (IT Admin only)
router.delete('/decline-account/:id', protect, adminOnly('IT'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'Account declined and deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== ORDERS MANAGEMENT ====================

// @route   GET /api/admin/orders/:shop
// @desc    Get all orders for a specific shop
// @access  Private (Admin only)
router.get('/orders/:shop', protect, async (req, res) => {
  try {
    const { shop } = req.params;
    
    // Check admin permission
    if (shop === 'IT' && req.user.role !== 'it_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (shop === 'SSC' && req.user.role !== 'ssc_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { status } = req.query;

    const query = { shop };
    if (status && status !== 'all') {
      if (status === 'active') {
        query.status = { $in: ['In Queue', 'Printing', 'Ready for Pickup', 'Ready for Pickup & Payment'] };
      } else if (status === 'completed') {
        query.status = 'Completed';
      } else if (status === 'cancelled') {
        query.status = 'Cancelled';
      }
    }

    const orders = await Order.find(query)
      .populate('userId', 'fullName email')
      .populate('printerId')
      .sort({ createdAt: -1 });

    // Calculate queue positions for orders that need them
    const ordersWithQueuePosition = await Promise.all(orders.map(async (order) => {
      // Convert to plain object to modify
      const orderObj = order.toObject ? order.toObject() : { ...order };
      
      // Only calculate queue position for orders with status "In Queue"
      if (orderObj.status === 'In Queue') {
        const printerId = orderObj.printerId._id || orderObj.printerId;
        const queuePosition = await Order.countDocuments({
          printerId: printerId,
          status: 'In Queue',
          createdAt: { $lte: orderObj.createdAt }
        });
        orderObj.queuePosition = queuePosition;
      } else {
        // Orders with other statuses should not have queue positions
        orderObj.queuePosition = 0;
      }
      return orderObj;
    }));

    res.json(ordersWithQueuePosition);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/admin/update-order-status/:id
// @desc    Update order status
// @access  Private (Admin only)
router.put('/update-order-status/:id', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id).populate('userId printerId');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check admin permission
    if (order.shop === 'IT' && req.user.role !== 'it_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (order.shop === 'SSC' && req.user.role !== 'ssc_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const oldStatus = order.status;
    order.status = status;

    // Get printer ID
    const printerId = order.printerId._id || order.printerId;

    if (status === 'Completed') {
      order.completedAt = new Date();
    }

    // Save order first before recalculating queue count
    await order.save();

    // Update printer queue count based on status change
    // Queue count should only include orders with status "In Queue"
    if (oldStatus !== status) {
      // Recalculate actual queue count after order status change
      // This ensures accuracy regardless of what the status change was
      const actualQueueCount = await Order.countDocuments({
        printerId: printerId,
        status: 'In Queue'
      });
      
      // Update printer with accurate queue count
      const updatedPrinter = await Printer.findByIdAndUpdate(
        printerId, 
        { queueCount: actualQueueCount }, 
        { new: true }
      );
      
      if (updatedPrinter) {
        const io = req.app.get('io');
        io.emit('printer_updated', updatedPrinter);
      }
    }

    // If order status changed to something other than "In Queue", remove its queue position
    if (oldStatus !== status && status !== 'In Queue') {
      await Order.findByIdAndUpdate(order._id, { queuePosition: 0 });
    }

    // Recalculate queue positions for all "In Queue" orders on this printer when status changes
    // This ensures queue positions are accurate when orders move through the queue
    if (oldStatus !== status) {
      const affectedOrders = await Order.find({
        printerId: printerId,
        status: 'In Queue'
      }).populate('userId', '_id');

      // Recalculate queue positions for all affected orders
      for (const affectedOrder of affectedOrders) {
        const queuePosition = await Order.countDocuments({
          printerId: printerId,
          status: 'In Queue',
          createdAt: { $lte: affectedOrder.createdAt }
        });
        await Order.findByIdAndUpdate(affectedOrder._id, { queuePosition });
        
        // Emit update to the user who owns this order
        const io = req.app.get('io');
        if (io && affectedOrder.userId && affectedOrder.userId._id) {
          io.to(affectedOrder.userId._id.toString()).emit('order_queue_updated', {
            orderId: affectedOrder._id,
            queuePosition
          });
        }
      }
    }

    // Create notification for user
    let notificationMessage = '';
    if (status === 'In Queue') notificationMessage = `Your order #${order.orderNumber} is in queue.`;
    if (status === 'Printing') notificationMessage = `Your order #${order.orderNumber} is now being printed.`;
    if (status === 'Ready for Pickup') notificationMessage = `Your order #${order.orderNumber} is ready for pickup!`;
    if (status === 'Ready for Pickup & Payment') notificationMessage = `Your order #${order.orderNumber} is ready for pickup and payment!`;
    if (status === 'Completed') notificationMessage = `Your order #${order.orderNumber} has been completed.`;

    await Notification.create({
      userId: order.userId._id,
      title: 'Order Status Updated',
      message: notificationMessage,
      type: 'order_update',
      relatedOrderId: order._id
    });

    // Send email notifications for order status changes
    try {
      if (status === 'Printing') {
        await sendOrderPrintingEmail(order.userId.email, order.userId.fullName, order.orderNumber, order.shop);
      } else if (status === 'Ready for Pickup' || status === 'Ready for Pickup & Payment') {
        await sendOrderReadyEmail(order.userId.email, order.userId.fullName, order.orderNumber, order.shop);
      }
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    // Populate order before emitting
    const populatedOrderForEmit = await Order.findById(order._id)
      .populate('userId', 'fullName email')
      .populate('printerId');

    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      io.to(order.userId._id.toString()).emit('order_updated', populatedOrderForEmit || order);
      io.to(`${order.shop}_admins`).emit('order_updated', populatedOrderForEmit || order);
    }

    res.json({ message: 'Order status updated successfully', order: populatedOrderForEmit || order });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== PRINTER MANAGEMENT ====================

// @route   POST /api/admin/printers
// @desc    Create a new printer
// @access  Private (Admin only)
router.post('/printers', protect, async (req, res) => {
  try {
    const { name, shop, availablePaperSizes } = req.body;

    // Check admin permission
    if (shop === 'IT' && req.user.role !== 'it_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (shop === 'SSC' && req.user.role !== 'ssc_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Format paper sizes
    const formattedPaperSizes = availablePaperSizes.map(size => ({
      size: typeof size === 'string' ? size : size.size,
      enabled: true
    }));

    const printer = await Printer.create({
      name,
      shop,
      availablePaperSizes: formattedPaperSizes
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('printer_created', printer);
    }

    res.status(201).json({ message: 'Printer created successfully', printer });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/admin/printers/:id
// @desc    Update printer settings
// @access  Private (Admin only)
router.put('/printers/:id', protect, async (req, res) => {
  try {
    const { status, availablePaperSizes, name } = req.body;
    const printer = await Printer.findById(req.params.id);

    if (!printer) {
      return res.status(404).json({ message: 'Printer not found' });
    }

    // Check admin permission
    if (printer.shop === 'IT' && req.user.role !== 'it_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (printer.shop === 'SSC' && req.user.role !== 'ssc_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (name) printer.name = name;
    if (status) printer.status = status;
    if (availablePaperSizes) printer.availablePaperSizes = availablePaperSizes;

    await printer.save();

    // Refresh printer to ensure all fields are populated
    const updatedPrinter = await Printer.findById(printer._id);

    // If status changed, recalculate queue count (only "In Queue" orders)
    if (status) {
      const actualQueueCount = await Order.countDocuments({
        printerId: printer._id,
        status: 'In Queue'
      });
      updatedPrinter.queueCount = actualQueueCount;
      await updatedPrinter.save();
    }

    // Emit socket event with updated printer
    const io = req.app.get('io');
    if (io) {
      io.emit('printer_updated', updatedPrinter);
    }

    res.json({ message: 'Printer updated successfully', printer: updatedPrinter });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/admin/printers/:id
// @desc    Delete a printer
// @access  Private (Admin only)
router.delete('/printers/:id', protect, async (req, res) => {
  try {
    const printer = await Printer.findById(req.params.id);

    if (!printer) {
      return res.status(404).json({ message: 'Printer not found' });
    }

    // Check admin permission
    if (printer.shop === 'IT' && req.user.role !== 'it_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (printer.shop === 'SSC' && req.user.role !== 'ssc_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if printer has active orders
    const activeOrders = await Order.countDocuments({
      printerId: req.params.id,
      status: { $in: ['In Queue', 'Printing'] }
    });

    if (activeOrders > 0) {
      return res.status(400).json({ message: 'Cannot delete printer with active orders' });
    }

    await Printer.findByIdAndDelete(req.params.id);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('printer_deleted', { id: req.params.id });
    }

    res.json({ message: 'Printer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== USER MANAGEMENT ====================

// @route   GET /api/admin/users/:shop
// @desc    Get all users with access to specific shop
// @access  Private (Admin only)
router.get('/users/:shop', protect, async (req, res) => {
  try {
    const { shop } = req.params;

    // Check admin permission
    if (shop === 'IT' && req.user.role !== 'it_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (shop === 'SSC' && req.user.role !== 'ssc_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    let query = { role: 'student', accountStatus: 'approved' };
    
    if (shop === 'IT') {
      query.isBSIT = true;
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });

    // Check which users have active orders (not completed or cancelled)
    const usersWithActiveOrders = await Promise.all(users.map(async (user) => {
      const userObj = user.toObject ? user.toObject() : { ...user };
      
      // Check if user has active orders for this shop
      const activeOrderCount = await Order.countDocuments({
        userId: user._id,
        shop: shop,
        status: { $nin: ['Completed', 'Cancelled'] }
      });
      
      userObj.hasActiveOrders = activeOrderCount > 0;
      return userObj;
    }));

    res.json(usersWithActiveOrders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/admin/ban-user/:id
// @desc    Ban user from a shop
// @access  Private (Admin only)
router.put('/ban-user/:id', protect, async (req, res) => {
  try {
    const { shop } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check admin permission
    if (shop === 'IT' && req.user.role !== 'it_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (shop === 'SSC' && req.user.role !== 'ssc_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!user.bannedFrom.includes(shop)) {
      user.bannedFrom.push(shop);
      await user.save();

      // Emit socket event immediately for real-time updates
      const io = req.app.get('io');
      if (io) {
        io.to(user._id.toString()).emit('user_banned', { shop, user });
        io.to(user._id.toString()).emit('notification', { type: 'user_banned' });
      }

      // Send response immediately
      res.json({ message: 'User banned successfully', user });

      // Handle notification and email asynchronously (don't block response)
      (async () => {
        // Create notification
        try {
          await Notification.create({
            userId: user._id,
            title: 'Account Banned',
            message: `You have been banned from ${shop} Printing Shop.`,
            type: 'general'
          });
        } catch (notifError) {
          console.error('Error creating notification:', notifError);
        }

        // Send email notification
        try {
          await sendBanNotificationEmail(user.email, user.fullName, shop);
        } catch (emailError) {
          console.error('Error sending ban notification email:', emailError);
        }
      })();
    } else {
      res.json({ message: 'User already banned from this shop', user });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/admin/unban-user/:id
// @desc    Unban user from a shop
// @access  Private (Admin only)
router.put('/unban-user/:id', protect, async (req, res) => {
  try {
    const { shop } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check admin permission
    if (shop === 'IT' && req.user.role !== 'it_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (shop === 'SSC' && req.user.role !== 'ssc_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    user.bannedFrom = user.bannedFrom.filter(s => s !== shop);
    await user.save();

    // Emit socket event immediately for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(user._id.toString()).emit('user_unbanned', { shop, user });
      io.to(user._id.toString()).emit('notification', { type: 'user_unbanned' });
    }

    // Send response immediately
    res.json({ message: 'User unbanned successfully', user });

    // Handle notification and email asynchronously (don't block response)
    (async () => {
      // Create notification
      try {
        await Notification.create({
          userId: user._id,
          title: 'Ban Lifted',
          message: `Your ban from ${shop} Printing Shop has been lifted.`,
          type: 'general'
        });
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
      }

      // Send email notification
      try {
        await sendUnbanNotificationEmail(user.email, user.fullName, shop);
      } catch (emailError) {
        console.error('Error sending unban notification email:', emailError);
      }
    })();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== VIOLATION MANAGEMENT ====================

// @route   POST /api/admin/send-violation
// @desc    Send violation warning to user
// @access  Private (Admin only)
router.post('/send-violation', protect, async (req, res) => {
  try {
    const { userId, shop, reason } = req.body;

    // Check admin permission
    if (shop === 'IT' && req.user.role !== 'it_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (shop === 'SSC' && req.user.role !== 'ssc_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create violation
    const defaultReason = shop === 'IT' 
      ? 'There is a violation recorded on this account. To avoid being banned from accessing this Printing Shop, please settle the violation first at the IT Office.'
      : 'There is a violation recorded on this account. To avoid being banned from accessing this Printing Shop, please settle the violation first at the SSC Office.';
    
    const violation = await Violation.create({
      userId,
      shop,
      reason: reason || defaultReason
    });

    // Create notification with shop-specific office name
    const officeName = shop === 'IT' ? 'IT Office' : 'SSC Office';
    await Notification.create({
      userId,
      title: 'Violation Warning',
      message: `There is a violation recorded on this account. To avoid being banned from accessing this Printing Shop, please settle the violation first at the ${officeName}.`,
      type: 'violation'
    });

    // Send email
    try {
      await sendViolationWarningEmail(user.email, user.fullName, shop);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    // Populate violation before emitting
    const populatedViolation = await Violation.findById(violation._id)
      .populate('userId', 'fullName email');

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(userId).emit('violation_warning', populatedViolation || violation);
      // Notify admins of the shop to refresh violations list
      io.to(`${shop}_admins`).emit('violation_created', populatedViolation || violation);
    }

    res.json({ message: 'Violation warning sent successfully', violation: populatedViolation || violation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/admin/send-violation-followup
// @desc    Send follow-up violation warning to user (without creating new violation)
// @access  Private (Admin only)
router.post('/send-violation-followup', protect, async (req, res) => {
  try {
    const { userId, shop } = req.body;

    // Check admin permission
    if (shop === 'IT' && req.user.role !== 'it_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (shop === 'SSC' && req.user.role !== 'ssc_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create notification with shop-specific office name (follow-up)
    const officeName = shop === 'IT' ? 'IT Office' : 'SSC Office';
    await Notification.create({
      userId,
      title: 'Violation Warning',
      message: `There is a violation recorded on this account. To avoid being banned from accessing this Printing Shop, please settle the violation first at the ${officeName}.`,
      type: 'violation'
    });

    // Send email (follow-up)
    try {
      await sendViolationWarningEmail(user.email, user.fullName, shop);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    // Emit socket event to user
    const io = req.app.get('io');
    if (io) {
      io.to(userId.toString()).emit('violation_warning', { shop });
    }

    res.json({ message: 'Follow-up violation warning sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/admin/violations/:shop
// @desc    Get all violations for a shop (only unresolved)
// @access  Private (Admin only)
router.get('/violations/:shop', protect, async (req, res) => {
  try {
    const { shop } = req.params;

    // Check admin permission
    if (shop === 'IT' && req.user.role !== 'it_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (shop === 'SSC' && req.user.role !== 'ssc_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only get unresolved violations
    const violations = await Violation.find({ shop, resolved: false })
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 });

    res.json(violations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/admin/settle-violation/:id
// @desc    Mark violation as settled/resolved
// @access  Private (Admin only)
router.put('/settle-violation/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    // Find violation
    const violation = await Violation.findById(id).populate('userId', 'fullName email');
    if (!violation) {
      return res.status(404).json({ message: 'Violation not found' });
    }

    const shop = violation.shop;

    // Check admin permission
    if (shop === 'IT' && req.user.role !== 'it_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (shop === 'SSC' && req.user.role !== 'ssc_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Mark as resolved
    violation.resolved = true;
    await violation.save();

    // Create notification for user
    await Notification.create({
      userId: violation.userId._id,
      title: 'Violation Settled',
      message: `Your violation at the ${shop} Printing Shop has been settled.`,
      type: 'violation',
      relatedViolationId: violation._id
    });

    // Send email notification to user
    try {
      await sendViolationSettledEmail(
        violation.userId.email,
        violation.userId.fullName,
        shop
      );
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Continue even if email fails
    }

    // Emit socket event to user
    const io = req.app.get('io');
    if (io) {
      io.to(violation.userId._id.toString()).emit('violation_settled', {
        violationId: violation._id,
        shop
      });
      // Notify admins to refresh violations list
      io.to(`${shop}_admins`).emit('violation_settled', {
        violationId: violation._id,
        shop
      });
    }

    res.json({ message: 'Violation marked as settled', violation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

