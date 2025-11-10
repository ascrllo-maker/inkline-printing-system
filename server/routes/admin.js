import express from 'express';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Printer from '../models/Printer.js';
import Notification from '../models/Notification.js';
import Violation from '../models/Violation.js';
import Pricing from '../models/Pricing.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { sendAccountApprovedEmail, sendOrderReadyEmail, sendOrderPrintingEmail, sendViolationWarningEmail, sendViolationSettledEmail, sendBanNotificationEmail, sendUnbanNotificationEmail } from '../utils/email.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import mime from 'mime-types';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

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

    // Send approval email (non-blocking)
    sendAccountApprovedEmail(user.email, user.fullName).catch(emailError => {
      console.error('Error sending approval email:', emailError.message || emailError);
    });

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

    // Use lean() for faster queries and select only needed fields
    const orders = await Order.find(query)
      .populate('userId', 'fullName email')
      .populate('printerId', 'name shop status availablePaperSizes')
      .select('orderNumber userId printerId shop fileName filePath gridfsFileId paperSize orientation colorType copies status queuePosition createdAt completedAt')
      .lean()
      .sort({ createdAt: -1 });

    // Queue positions are already calculated and stored in the database
    // Just ensure non-queue orders have queuePosition = 0
    const ordersWithQueuePosition = orders.map(order => {
      if (order.status !== 'In Queue') {
        order.queuePosition = 0;
      }
      return order;
    });

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
        const printerData = updatedPrinter.toObject ? updatedPrinter.toObject() : updatedPrinter;
        io.emit('printer_updated', printerData);
      }
    }

    // If order status changed to something other than "In Queue", remove its queue position
    if (oldStatus !== status && status !== 'In Queue') {
      await Order.findByIdAndUpdate(order._id, { queuePosition: 0 });
    }

    // Optimize queue position recalculation using bulk operations
    // Only recalculate if order status changed to/from "In Queue"
    if (oldStatus !== status && (oldStatus === 'In Queue' || status === 'In Queue')) {
      const io = req.app.get('io');
      
      // Use aggregation to calculate queue positions efficiently
      const affectedOrders = await Order.find({
        printerId: printerId,
        status: 'In Queue'
      }).select('_id userId createdAt').lean().sort({ createdAt: 1 });

      // Calculate queue positions in a single pass
      const updateOps = affectedOrders.map((affectedOrder, index) => {
        const queuePosition = index + 1;
        return {
          updateOne: {
            filter: { _id: affectedOrder._id },
            update: { $set: { queuePosition } }
          }
        };
      });

      // Bulk update all queue positions at once
      if (updateOps.length > 0) {
        await Order.bulkWrite(updateOps);
        
        // Emit updates to users (non-blocking)
        if (io) {
          setImmediate(() => {
            affectedOrders.forEach((affectedOrder, index) => {
              if (affectedOrder.userId) {
                io.to(affectedOrder.userId.toString()).emit('order_queue_updated', {
                  orderId: affectedOrder._id,
                  queuePosition: index + 1
                });
              }
            });
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

    // Send email notifications for order status changes (non-blocking)
    if (status === 'Printing') {
      sendOrderPrintingEmail(order.userId.email, order.userId.fullName, order.orderNumber, order.shop).catch(emailError => {
        console.error('Error sending printing email:', emailError.message || emailError);
      });
    } else if (status === 'Ready for Pickup' || status === 'Ready for Pickup & Payment') {
      sendOrderReadyEmail(order.userId.email, order.userId.fullName, order.orderNumber, order.shop).catch(emailError => {
        console.error('Error sending ready email:', emailError.message || emailError);
      });
    }

    // Populate order before emitting
    const populatedOrderForEmit = await Order.findById(order._id)
      .populate('userId', 'fullName email')
      .populate('printerId');

    // Send response immediately
    res.json({ message: 'Order status updated successfully', order: populatedOrderForEmit || order });

    // Emit socket events after response is sent (non-blocking)
    const io = req.app.get('io');
    if (io) {
      setImmediate(() => {
        try {
          io.to(order.userId._id.toString()).emit('order_updated', populatedOrderForEmit || order);
          io.to(`${order.shop}_admins`).emit('order_updated', populatedOrderForEmit || order);
        } catch (socketError) {
          console.error('Error emitting socket events:', socketError);
        }
      });
    }
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

    // Emit socket event (convert to plain object)
    const io = req.app.get('io');
    if (io) {
      const printerData = printer.toObject ? printer.toObject() : printer;
      io.emit('printer_created', printerData);
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

    // Emit socket event with updated printer (convert to plain object)
    const io = req.app.get('io');
    if (io) {
      const printerData = updatedPrinter.toObject ? updatedPrinter.toObject() : updatedPrinter;
      io.emit('printer_updated', printerData);
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

    // Use lean() for faster queries
    const users = await User.find(query)
      .select('fullName email accountStatus bannedFrom createdAt')
      .lean()
      .sort({ createdAt: -1 });
    
    // Batch check for active orders using aggregation pipeline (much faster)
    const userIds = users.map(u => u._id);
    const activeOrders = await Order.aggregate([
      {
        $match: {
          userId: { $in: userIds },
          shop: shop,
          status: { $nin: ['Completed', 'Cancelled'] }
        }
      },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Create a map of userId -> hasActiveOrders
    const activeOrdersMap = new Map(activeOrders.map(ao => [ao._id.toString(), ao.count > 0]));
    
    // Add hasActiveOrders to each user
    const usersWithActiveOrders = users.map(user => ({
      ...user,
      hasActiveOrders: activeOrdersMap.get(user._id.toString()) || false
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

    // Use lean() for faster queries and select only needed fields
    const violations = await Violation.find({ shop, resolved: false })
      .populate('userId', 'fullName email')
      .select('userId shop reason resolved createdAt')
      .lean()
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

// ==================== FILE SERVING ====================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @route   GET /api/admin/file/:filePath
// @desc    Serve file with authentication (for admin viewing)
// @access  Private (Admin only)
router.get('/file/*', protect, async (req, res) => {
  try {
    // Get the file path from the request
    const filePath = req.params[0]; // Get everything after /api/admin/file/
    
    console.log('File request received:', filePath);
    
    if (!filePath) {
      return res.status(400).json({ message: 'File path is required' });
    }

    // Check if this is a GridFS file path
    if (filePath.startsWith('gridfs/')) {
      const fileId = filePath.replace('gridfs/', '').trim();
      
      console.log('GridFS file path detected:', {
        filePath,
        fileId,
        isValidObjectId: mongoose.Types.ObjectId.isValid(fileId)
      });
      
      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(fileId)) {
        console.error('Invalid GridFS file ID:', fileId);
        return res.status(400).json({ message: 'Invalid file ID' });
      }

      try {
        const gridFSBucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
        const objectId = new mongoose.Types.ObjectId(fileId);
        
        console.log('Looking for GridFS file with ID:', objectId.toString());
        
        // Find file metadata
        const files = await gridFSBucket.find({ _id: objectId }).toArray();
        
        console.log('GridFS files found:', files.length);
        
        if (files.length === 0) {
          console.error('File not found in GridFS with ID:', objectId.toString());
          // Try to find order by gridfsFileId to provide better error message
          const orderByFileId = await Order.findOne({ gridfsFileId: objectId });
          if (orderByFileId) {
            console.error('Order found but file missing in GridFS:', {
              orderId: orderByFileId._id,
              orderNumber: orderByFileId.orderNumber,
              gridfsFileId: orderByFileId.gridfsFileId
            });
          }
          return res.status(404).json({ 
            message: 'File not found in GridFS',
            fileId: objectId.toString()
          });
        }

        const file = files[0];
        
        console.log('GridFS file found:', {
          fileId: file._id.toString(),
          filename: file.filename,
          size: file.length,
          uploadDate: file.uploadDate,
          metadata: file.metadata
        });
        
        // Verify admin access if it's an order file
        const order = await Order.findOne({ gridfsFileId: file._id });
        if (order) {
          console.log('Order found for GridFS file:', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            shop: order.shop,
            userRole: req.user.role
          });
          
          if (order.shop === 'IT' && req.user.role !== 'it_admin') {
            return res.status(403).json({ message: 'Access denied: IT admin required' });
          }
          if (order.shop === 'SSC' && req.user.role !== 'ssc_admin') {
            return res.status(403).json({ message: 'Access denied: SSC admin required' });
          }
        } else {
          console.warn('No order found for GridFS file, allowing admin access');
        }

        // Determine content type
        const ext = path.extname(file.filename);
        let contentType = mime.lookup(ext) || file.metadata?.mimetype || 'application/octet-stream';
        
        // Ensure PDFs have the correct content type
        if (ext.toLowerCase() === '.pdf' && contentType !== 'application/pdf') {
          contentType = 'application/pdf';
        }

        console.log('Serving GridFS file:', {
          fileId: fileId,
          filename: file.filename,
          originalName: file.metadata?.originalName,
          contentType: contentType,
          size: file.length,
          metadata: file.metadata
        });

        // Set headers BEFORE piping
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.metadata?.originalName || file.filename)}"`);
        res.setHeader('Content-Length', file.length.toString());
        res.setHeader('Cache-Control', 'private, max-age=3600');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Transfer-Encoding', 'binary');

        // Stream file from GridFS
        const downloadStream = gridFSBucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
        
        downloadStream.on('error', (error) => {
          console.error('Error streaming file from GridFS:', error);
          if (!res.headersSent) {
            res.status(500).json({ message: 'Error reading file', error: error.message });
          } else {
            res.end();
          }
        });
        
        downloadStream.on('end', () => {
          console.log('GridFS file stream ended successfully');
        });

        // Pipe the stream to response
        downloadStream.pipe(res);
        return;

      } catch (gridfsError) {
        console.error('Error retrieving file from GridFS:', gridfsError);
        return res.status(500).json({ message: 'Error retrieving file from GridFS', error: gridfsError.message });
      }
    }

    // Handle legacy file system paths
    // Extract shop from file path to verify admin access
    // File paths are like: uploads/files/filename or uploads/ids/filename (no leading slash)
    const pathParts = filePath.split('/').filter(p => p); // Remove empty parts
    console.log('Path parts:', pathParts);
    
    if (pathParts.length < 2 || pathParts[0] !== 'uploads') {
      console.error('Invalid file path format:', filePath);
      return res.status(400).json({ message: 'Invalid file path format. Expected: uploads/files/filename or gridfs/fileId' });
    }

    // Construct the full file path
    const uploadsDir = path.join(__dirname, '../../uploads');
    // pathParts is like: ['uploads', 'files', 'filename']
    // We want: files/filename (skip 'uploads' since uploadsDir already includes it)
    const relativePath = pathParts.slice(1).join(path.sep); // Remove 'uploads' from path
    const fullPath = path.join(uploadsDir, relativePath);
    
    console.log('Uploads directory:', uploadsDir);
    console.log('Relative path:', relativePath);
    console.log('Full path:', fullPath);

    // Security: Prevent directory traversal - normalize the path first
    const normalizedPath = path.normalize(fullPath);
    const normalizedUploadsDir = path.normalize(uploadsDir);
    
    if (!normalizedPath.startsWith(normalizedUploadsDir)) {
      console.error('Directory traversal attempt detected:', normalizedPath);
      return res.status(403).json({ message: 'Access denied: Invalid path' });
    }

    // Check if file exists
    if (!fs.existsSync(normalizedPath)) {
      console.error('File not found on filesystem:', normalizedPath);
      console.error('Uploads directory exists:', fs.existsSync(uploadsDir));
      
      // Try to find the file in GridFS as fallback
      const fileName = pathParts[pathParts.length - 1];
      
      console.log('Trying to find order by filePath:', {
        fileName,
        filePath,
        searchPatterns: [
          `/uploads/files/${fileName}`,
          `uploads/files/${fileName}`,
          filePath,
          `/${filePath}`
        ]
      });
      
      // First, try to find by filePath (multiple formats)
      let order = await Order.findOne({ 
        $or: [
          { filePath: `/uploads/files/${fileName}` },
          { filePath: `uploads/files/${fileName}` },
          { filePath: filePath },
          { filePath: `/${filePath}` },
          // Also check if filePath contains gridfs
          { filePath: { $regex: `gridfs.*${fileName}` } }
        ]
      });
      
      // If not found by filePath, try to find by fileName and check if it has gridfsFileId
      if (!order) {
        console.log('Order not found by filePath, trying to find by fileName:', fileName);
        order = await Order.findOne({ 
          fileName: fileName 
        }).sort({ createdAt: -1 }); // Get the most recent order with this fileName
      }
      
      if (order && order.gridfsFileId) {
        console.log('Found order with GridFS file ID, serving from GridFS:', order.gridfsFileId);
        
        try {
          const gridFSBucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
          
          // Find file metadata
          const gridfsFiles = await gridFSBucket.find({ _id: order.gridfsFileId }).toArray();
          
          if (gridfsFiles.length === 0) {
            console.error('File not found in GridFS:', order.gridfsFileId);
            return res.status(404).json({ message: 'File not found in GridFS' });
          }

          const gridfsFile = gridfsFiles[0];
          
          // Determine content type
          const ext = path.extname(gridfsFile.filename);
          let contentType = mime.lookup(ext) || gridfsFile.metadata?.mimetype || 'application/octet-stream';
          
          // Ensure PDFs have the correct content type
          if (ext.toLowerCase() === '.pdf' && contentType !== 'application/pdf') {
            contentType = 'application/pdf';
          }

          console.log('Serving GridFS file from order lookup:', {
            fileId: order.gridfsFileId,
            filename: gridfsFile.filename,
            originalName: gridfsFile.metadata?.originalName,
            contentType: contentType,
            size: gridfsFile.length,
            metadata: gridfsFile.metadata
          });

          // Set headers BEFORE piping
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(gridfsFile.metadata?.originalName || gridfsFile.filename)}"`);
          res.setHeader('Content-Length', gridfsFile.length.toString());
          res.setHeader('Cache-Control', 'private, max-age=3600');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Content-Transfer-Encoding', 'binary');

          // Stream file from GridFS
          const downloadStream = gridFSBucket.openDownloadStream(order.gridfsFileId);
          
          downloadStream.on('error', (error) => {
            console.error('Error streaming file from GridFS:', error);
            if (!res.headersSent) {
              res.status(500).json({ message: 'Error reading file', error: error.message });
            } else {
              res.end();
            }
          });
          
          downloadStream.on('end', () => {
            console.log('GridFS file stream ended successfully');
          });

          // Pipe the stream to response
          downloadStream.pipe(res);
          return;
        } catch (gridfsError) {
          console.error('Error retrieving file from GridFS:', gridfsError);
          return res.status(500).json({ message: 'Error retrieving file from GridFS', error: gridfsError.message });
        }
      }
      
      if (fs.existsSync(uploadsDir)) {
        // List files in the directory for debugging
        const filesDir = path.join(uploadsDir, 'files');
        if (fs.existsSync(filesDir)) {
          const files = fs.readdirSync(filesDir);
          console.error('Files in uploads/files directory:', files.slice(0, 10)); // Show first 10 files
        }
      }
      return res.status(404).json({ 
        message: 'File not found',
        requestedPath: filePath,
        fullPath: normalizedPath,
        note: 'File may have been lost due to server restart (Render uses ephemeral filesystem)'
      });
    }

    // If it's an order file, verify the admin has access to this shop
    if (pathParts[1] === 'files') {
      // Find the order that contains this file
      const fileName = pathParts[pathParts.length - 1];
      // Try to find order with different path formats
      const order = await Order.findOne({ 
        $or: [
          { filePath: `/uploads/files/${fileName}` },
          { filePath: `uploads/files/${fileName}` },
          { filePath: `/uploads/files/${fileName}` }
        ]
      });
      
      if (order) {
        // Check admin permission for this shop
        if (order.shop === 'IT' && req.user.role !== 'it_admin') {
          return res.status(403).json({ message: 'Access denied: IT admin required' });
        }
        if (order.shop === 'SSC' && req.user.role !== 'ssc_admin') {
          return res.status(403).json({ message: 'Access denied: SSC admin required' });
        }
      } else {
        console.warn('Order not found for file:', fileName, 'Allowing access for admin');
        // Allow access even if order not found (file might be orphaned, but admin should still access it)
      }
    }

    // Get file stats to verify it's a file and get its size
    const stats = fs.statSync(normalizedPath);
    if (!stats.isFile()) {
      return res.status(400).json({ message: 'Path is not a file' });
    }

    // Determine content type from file extension
    const ext = path.extname(normalizedPath);
    let contentType = mime.lookup(ext);
    
    // Fallback for common file types if mime lookup fails
    if (!contentType) {
      const extLower = ext.toLowerCase();
      const mimeMap = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.txt': 'text/plain'
      };
      contentType = mimeMap[extLower] || 'application/octet-stream';
    }

    console.log('Serving file:', {
      path: normalizedPath,
      size: stats.size,
      contentType: contentType,
      extension: ext
    });

    // Set headers for proper file display
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(path.basename(normalizedPath))}"`);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Accept-Ranges', 'bytes');

    // Stream the file
    const fileStream = fs.createReadStream(normalizedPath);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error reading file', error: error.message });
      } else {
        // If headers were sent, we can't send JSON, so just end the response
        res.end();
      }
    });
    
    fileStream.on('open', () => {
      console.log('File stream opened successfully');
    });
    
    fileStream.on('end', () => {
      console.log('File stream ended successfully');
    });

    fileStream.pipe(res);

  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== PRICING MANAGEMENT ====================

// @route   GET /api/admin/pricing/:shop
// @desc    Get all pricing for a specific shop
// @access  Private (Admin only)
router.get('/pricing/:shop', protect, async (req, res) => {
  try {
    const { shop } = req.params;
    
    // Check admin permission
    if (shop === 'IT' && req.user.role !== 'it_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (shop === 'SSC' && req.user.role !== 'ssc_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!['IT', 'SSC'].includes(shop)) {
      return res.status(400).json({ message: 'Invalid shop name' });
    }

    // Get all pricing for this shop
    const pricing = await Pricing.find({ shop })
      .select('shop paperSize colorType pricePerCopy updatedAt updatedBy')
      .lean()
      .sort({ paperSize: 1, colorType: 1 });

    res.json(pricing);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/admin/pricing/:shop
// @desc    Update pricing for a specific shop (bulk update)
// @access  Private (Admin only)
router.put('/pricing/:shop', protect, async (req, res) => {
  try {
    const { shop } = req.params;
    const { pricing } = req.body; // Array of { paperSize, colorType, pricePerCopy }
    
    // Check admin permission
    if (shop === 'IT' && req.user.role !== 'it_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (shop === 'SSC' && req.user.role !== 'ssc_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!['IT', 'SSC'].includes(shop)) {
      return res.status(400).json({ message: 'Invalid shop name' });
    }

    if (!Array.isArray(pricing)) {
      return res.status(400).json({ message: 'Pricing must be an array' });
    }

    // Validate pricing data
    for (const item of pricing) {
      if (!item.paperSize || !item.colorType || typeof item.pricePerCopy !== 'number') {
        return res.status(400).json({ message: 'Invalid pricing data. Each item must have paperSize, colorType, and pricePerCopy' });
      }
      if (item.pricePerCopy < 0) {
        return res.status(400).json({ message: 'Price per copy must be non-negative' });
      }
      if (!['Black and White', 'Colored'].includes(item.colorType)) {
        return res.status(400).json({ message: 'Invalid color type' });
      }
    }

    // Use bulk write for efficient updates/inserts
    const bulkOps = pricing.map(item => ({
      updateOne: {
        filter: {
          shop,
          paperSize: item.paperSize,
          colorType: item.colorType
        },
        update: {
          $set: {
            pricePerCopy: item.pricePerCopy,
            updatedBy: req.user._id,
            updatedAt: new Date()
          },
          $setOnInsert: {
            shop,
            paperSize: item.paperSize,
            colorType: item.colorType
          }
        },
        upsert: true
      }
    }));

    await Pricing.bulkWrite(bulkOps);

    // Get updated pricing
    const updatedPricing = await Pricing.find({ shop })
      .select('shop paperSize colorType pricePerCopy updatedAt updatedBy')
      .lean()
      .sort({ paperSize: 1, colorType: 1 });

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('pricing_updated', { shop, pricing: updatedPricing });
    }

    res.json({ message: 'Pricing updated successfully', pricing: updatedPricing });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

