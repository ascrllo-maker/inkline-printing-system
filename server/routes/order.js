import express from 'express';
import Order from '../models/Order.js';
import Printer from '../models/Printer.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { uploadFile } from '../middleware/upload.js';
import { generateOrderNumber } from '../utils/helpers.js';
import { sendOrderCreatedEmail } from '../utils/email.js';

const router = express.Router();

// @route   POST /api/orders/create
// @desc    Create a new print order
// @access  Private
router.post('/create', protect, uploadFile.single('file'), async (req, res) => {
  try {
    const { printerId, shop, paperSize, orientation, colorType, copies } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    // Check if user is banned from this shop
    if (req.user.bannedFrom.includes(shop)) {
      return res.status(403).json({ message: `You are banned from ${shop} Printing Shop` });
    }

    // Verify printer exists and is active
    const printer = await Printer.findById(printerId);
    if (!printer) {
      return res.status(404).json({ message: 'Printer not found' });
    }

    if (printer.status !== 'Active') {
      return res.status(400).json({ message: 'Printer is not available' });
    }

    // Check if paper size is available
    const paperSizeAvailable = printer.availablePaperSizes.find(
      ps => ps.size === paperSize && ps.enabled
    );

    if (!paperSizeAvailable) {
      return res.status(400).json({ message: 'Selected paper size is not available' });
    }

    // Generate unique order number
    let orderNumber;
    let isUnique = false;
    while (!isUnique) {
      orderNumber = generateOrderNumber();
      const existing = await Order.findOne({ orderNumber });
      if (!existing) isUnique = true;
    }

    // Get queue position (only count "In Queue" orders)
    const queueCount = await Order.countDocuments({
      printerId,
      status: 'In Queue'
    });

    // Create order
    const order = await Order.create({
      orderNumber,
      userId: req.user._id,
      printerId,
      shop,
      fileName: req.file.originalname,
      filePath: `/uploads/files/${req.file.filename}`,
      paperSize,
      orientation,
      colorType,
      copies: parseInt(copies),
      queuePosition: queueCount + 1
    });

    // Recalculate actual queue count after order creation
    const actualQueueCount = await Order.countDocuments({
      printerId: printerId,
      status: { $in: ['In Queue', 'Printing'] }
    });

    // Update printer queue count with accurate count
    const updatedPrinter = await Printer.findByIdAndUpdate(
      printerId, 
      { queueCount: actualQueueCount }, 
      { new: true }
    );

    // Create notification for user
    try {
      await Notification.create({
        userId: req.user._id,
        title: 'Order Created',
        message: `Your order #${orderNumber} has been created and is in queue.`,
        type: 'order_update',
        relatedOrderId: order._id
      });
    } catch (notifError) {
      console.error('Error creating user notification:', notifError);
      // Continue even if notification creation fails
    }

    // Send email notification to student when order is created
    try {
      await sendOrderCreatedEmail(
        req.user.email,
        req.user.fullName,
        orderNumber,
        shop,
        order.queuePosition
      );
    } catch (emailError) {
      console.error('Error sending order created email:', emailError);
      // Continue even if email fails
    }

    // Create notifications for all admins of this shop
    try {
      const adminRole = shop === 'IT' ? 'it_admin' : 'ssc_admin';
      const admins = await User.find({ role: adminRole });
      
      for (const admin of admins) {
        await Notification.create({
          userId: admin._id,
          title: 'New Order Received',
          message: `New order #${orderNumber} from ${req.user.fullName || 'a student'} has been created.`,
          type: 'new_order',
          relatedOrderId: order._id
        });
      }
    } catch (adminNotifError) {
      console.error('Error creating admin notifications:', adminNotifError);
      // Continue even if admin notification creation fails
    }

    // Populate order with necessary fields before emitting
    let populatedOrder;
    try {
      populatedOrder = await Order.findById(order._id)
        .populate('userId', 'fullName email')
        .populate('printerId');
      
      if (!populatedOrder) {
        throw new Error('Failed to populate order');
      }
    } catch (populateError) {
      console.error('Error populating order:', populateError);
      // Fallback to basic order if population fails
      populatedOrder = order;
    }

    // Get io instance once
    const io = req.app.get('io');
    if (!io) {
      console.error('Socket.IO instance not available');
    }

    // Recalculate queue positions for all "In Queue" orders on this printer
    if (io) {
      try {
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
          
          // Emit queue position update to the user who owns this order
          if (affectedOrder.userId && affectedOrder.userId._id) {
            io.to(affectedOrder.userId._id.toString()).emit('order_queue_updated', {
              orderId: affectedOrder._id,
              queuePosition
            });
          }
        }
      } catch (queueError) {
        console.error('Error recalculating queue positions:', queueError);
        // Continue even if queue position recalculation fails
      }
    }

    // Emit socket events
    if (io) {
      try {
        io.to(`${shop}_admins`).emit('new_order', populatedOrder);
        if (updatedPrinter) {
          io.emit('printer_updated', updatedPrinter);
        }
        io.to(`${shop}_admins`).emit('notification', { type: 'new_order' });
        io.to(req.user._id.toString()).emit('order_created', populatedOrder);
      } catch (socketError) {
        console.error('Error emitting socket events:', socketError);
        // Continue even if socket emission fails
      }
    }

    res.status(201).json({
      message: 'Order created successfully',
      order: populatedOrder
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/orders/my-orders
// @desc    Get all orders for current user
// @access  Private
router.get('/my-orders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
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

// @route   PUT /api/orders/cancel/:id
// @desc    Cancel an order
// @access  Private
router.put('/cancel/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'fullName');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if order belongs to user
    // Handle both populated and non-populated userId
    const orderUserId = order.userId._id ? order.userId._id.toString() : order.userId.toString();
    if (orderUserId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    // Can't cancel if already printing or completed
    if (['Printing', 'Ready for Pickup', 'Ready for Pickup & Payment', 'Completed'].includes(order.status)) {
      return res.status(400).json({ message: 'Cannot cancel order at this stage' });
    }

    order.status = 'Cancelled';
    await order.save();

    // Get printer ID (handle both ObjectId and populated object)
    const printerId = order.printerId._id ? order.printerId._id : order.printerId;

    // Recalculate actual queue count after cancellation (only "In Queue" orders)
    const actualQueueCount = await Order.countDocuments({
      printerId: printerId,
      status: 'In Queue'
    });

    // Update printer queue count with accurate count
    const updatedPrinter = await Printer.findByIdAndUpdate(
      printerId, 
      { queueCount: actualQueueCount }, 
      { new: true }
    );

    // Get io instance once
    const io = req.app.get('io');

    // Recalculate queue positions for all "In Queue" orders on this printer
    if (io) {
      try {
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
          if (affectedOrder.userId && affectedOrder.userId._id) {
            io.to(affectedOrder.userId._id.toString()).emit('order_queue_updated', {
              orderId: affectedOrder._id,
              queuePosition
            });
          }
        }
      } catch (queueError) {
        console.error('Error recalculating queue positions:', queueError);
        // Continue even if queue position recalculation fails
      }
    }

    // Create notification for user
    try {
      await Notification.create({
        userId: req.user._id,
        title: 'Order Cancelled',
        message: `Your order #${order.orderNumber} has been cancelled.`,
        type: 'order_update',
        relatedOrderId: order._id
      });
    } catch (notifError) {
      console.error('Error creating user notification:', notifError);
      // Continue even if notification creation fails
    }

    // Create notifications for all admins of this shop
    try {
      const adminRole = order.shop === 'IT' ? 'it_admin' : 'ssc_admin';
      const admins = await User.find({ role: adminRole });
      
      for (const admin of admins) {
        await Notification.create({
          userId: admin._id,
          title: 'Order Cancelled',
          message: `Order #${order.orderNumber} from ${order.userId?.fullName || 'a student'} has been cancelled.`,
          type: 'order_cancelled',
          relatedOrderId: order._id
        });
      }
    } catch (adminNotifError) {
      console.error('Error creating admin notifications:', adminNotifError);
      // Continue even if admin notification creation fails
    }

    // Populate order before emitting
    let populatedCancelledOrder;
    try {
      populatedCancelledOrder = await Order.findById(order._id)
        .populate('userId', 'fullName email')
        .populate('printerId');
      
      if (!populatedCancelledOrder) {
        populatedCancelledOrder = order;
      }
    } catch (populateError) {
      console.error('Error populating order:', populateError);
      populatedCancelledOrder = order;
    }

    // Emit socket events
    if (io) {
      try {
        io.to(req.user._id.toString()).emit('order_cancelled', populatedCancelledOrder);
        io.to(`${order.shop}_admins`).emit('order_cancelled', populatedCancelledOrder);
        
        // Emit notification event to admins
        io.to(`${order.shop}_admins`).emit('notification', { type: 'order_cancelled' });
        
        if (updatedPrinter) {
          io.emit('printer_updated', updatedPrinter);
        }
      } catch (socketError) {
        console.error('Error emitting socket events:', socketError);
        // Continue even if socket emission fails
      }
    }

    res.json({ message: 'Order cancelled successfully', order: populatedCancelledOrder || order });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

