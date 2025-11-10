import express from 'express';
import Order from '../models/Order.js';
import Printer from '../models/Printer.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Pricing from '../models/Pricing.js';
import { protect } from '../middleware/auth.js';
import { uploadFile } from '../middleware/upload.js';
import { generateOrderNumber } from '../utils/helpers.js';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { sendOrderCreatedEmail } from '../utils/email.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    // Normalize comparison: trim whitespace and compare case-insensitively
    const normalizedPaperSize = paperSize ? paperSize.trim() : '';
    const paperSizeAvailable = printer.availablePaperSizes.find(ps => {
      const normalizedDbSize = ps.size ? ps.size.trim() : '';
      return normalizedDbSize.toLowerCase() === normalizedPaperSize.toLowerCase() && ps.enabled;
    });

    if (!paperSizeAvailable) {
      // Log for debugging
      console.log('Paper size validation failed:', {
        requested: paperSize,
        normalized: normalizedPaperSize,
        availableSizes: printer.availablePaperSizes.map(ps => ({
          size: ps.size,
          enabled: ps.enabled
        }))
      });
      return res.status(400).json({ 
        message: 'Selected paper size is not available',
        availableSizes: printer.availablePaperSizes
          .filter(ps => ps.enabled)
          .map(ps => ps.size)
      });
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

    // Get pricing for this order
    const pricing = await Pricing.findOne({
      shop,
      paperSize: normalizedPaperSize,
      colorType
    }).lean();

    if (!pricing) {
      return res.status(400).json({ 
        message: 'Pricing not found for this combination. Please contact admin.' 
      });
    }

    const pricePerCopy = pricing.pricePerCopy;
    const totalPrice = pricePerCopy * parseInt(copies);

    // Store file in GridFS if MongoDB is connected
    let gridfsFileId = null;
    let filePath = `/uploads/files/${req.file.originalname}`;
    
    if (mongoose.connection.readyState === 1 && req.file.buffer) {
      try {
        const gridFSBucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = `file-${uniqueSuffix}${path.extname(req.file.originalname)}`;
        
        const uploadStream = gridFSBucket.openUploadStream(filename, {
          metadata: {
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            uploadedBy: req.user._id.toString()
          }
        });
        
        uploadStream.end(req.file.buffer);
        
        await new Promise((resolve, reject) => {
          uploadStream.on('finish', () => {
            gridfsFileId = uploadStream.id;
            filePath = `/gridfs/${gridfsFileId}`;
            console.log('File stored in GridFS:', gridfsFileId, filename);
            resolve();
          });
          uploadStream.on('error', reject);
        });
      } catch (gridfsError) {
        console.error('Error storing file in GridFS, falling back to local storage:', gridfsError);
        // Fall back to local file storage if GridFS fails
        // File is already in memory, we need to save it to disk
        const filesDir = path.join(__dirname, '../../uploads/files');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = `file-${uniqueSuffix}${path.extname(req.file.originalname)}`;
        const filePath_local = path.join(filesDir, filename);
        
        if (!fs.existsSync(filesDir)) {
          fs.mkdirSync(filesDir, { recursive: true });
        }
        
        fs.writeFileSync(filePath_local, req.file.buffer);
        filePath = `/uploads/files/${filename}`;
      }
    } else if (req.file.path) {
      // File was saved to disk (fallback)
      filePath = `/uploads/files/${req.file.filename}`;
    }

    // Create order
    const order = await Order.create({
      orderNumber,
      userId: req.user._id,
      printerId,
      shop,
      fileName: req.file.originalname,
      filePath: filePath,
      gridfsFileId: gridfsFileId,
      paperSize,
      orientation,
      colorType,
      copies: parseInt(copies),
      pricePerCopy,
      totalPrice,
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

    // Send email notification to student when order is created (non-blocking)
    // Don't await - send email asynchronously so it doesn't block the response
    sendOrderCreatedEmail(
      req.user.email,
      req.user.fullName,
      orderNumber,
      shop,
      order.queuePosition
    ).catch(emailError => {
      console.error('Error sending order created email:', emailError.message || emailError);
      // Email failure shouldn't affect order creation
    });

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

    // Optimize queue position recalculation using bulk operations
    if (io) {
      setImmediate(async () => {
        try {
          const affectedOrders = await Order.find({
            printerId: printerId,
            status: 'In Queue'
          }).select('_id userId createdAt').lean().sort({ createdAt: 1 });

          // Calculate queue positions in a single pass and bulk update
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
            
            // Emit updates to users
            affectedOrders.forEach((affectedOrder, index) => {
              if (affectedOrder.userId) {
                io.to(affectedOrder.userId.toString()).emit('order_queue_updated', {
                  orderId: affectedOrder._id,
                  queuePosition: index + 1
                });
              }
            });
          }
        } catch (queueError) {
          console.error('Error recalculating queue positions:', queueError);
        }
      });
    }

    // Send response immediately before emitting socket events
    res.status(201).json({
      message: 'Order created successfully',
      order: populatedOrder
    });

    // Emit socket events after response is sent (non-blocking)
    if (io) {
      setImmediate(() => {
        try {
          io.to(`${shop}_admins`).emit('new_order', populatedOrder);
          if (updatedPrinter) {
            io.emit('printer_updated', updatedPrinter);
          }
          io.to(`${shop}_admins`).emit('notification', { type: 'new_order' });
          io.to(req.user._id.toString()).emit('order_created', populatedOrder);
        } catch (socketError) {
          console.error('Error emitting socket events:', socketError);
        }
      });
    }
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
    // Use lean() for faster queries and select only needed fields
    const orders = await Order.find({ userId: req.user._id })
      .populate('printerId', 'name shop status availablePaperSizes')
      .select('orderNumber printerId shop fileName filePath gridfsFileId paperSize orientation colorType copies pricePerCopy totalPrice status queuePosition createdAt completedAt')
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

// @route   PUT /api/orders/cancel/:id
// @desc    Cancel an order
// @access  Private
router.put('/cancel/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', '_id fullName')
      .populate('printerId', '_id');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if order belongs to user
    // Handle both populated and non-populated userId
    const orderUserId = order.userId?._id || order.userId;
    if (!orderUserId) {
      console.error('Order userId is missing:', order._id);
      return res.status(400).json({ message: 'Order user information is missing' });
    }
    
    if (orderUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    // Can't cancel if already cancelled
    if (order.status === 'Cancelled') {
      return res.status(400).json({ message: 'Order is already cancelled' });
    }

    // Can't cancel if already printing or completed
    if (['Printing', 'Ready for Pickup', 'Ready for Pickup & Payment', 'Completed'].includes(order.status)) {
      return res.status(400).json({ message: 'Cannot cancel order at this stage' });
    }

    // Update order status
    order.status = 'Cancelled';
    order.queuePosition = 0; // Reset queue position when cancelled
    
    try {
      await order.save();
    } catch (saveError) {
      console.error('Error saving cancelled order:', saveError);
      return res.status(500).json({ message: 'Failed to cancel order', error: saveError.message });
    }

    // Store user ID and order details for async operations
    const userId = req.user._id.toString();
    const orderId = order._id.toString();
    const orderNumber = order.orderNumber;
    const orderShop = order.shop;
    const userFullName = order.userId?.fullName || 'a student';
    
    // Get printer ID (handle both ObjectId and populated object)
    const printerId = order.printerId?._id || order.printerId;
    const io = req.app.get('io');

    // Send response immediately before async operations
    res.json({ message: 'Order cancelled successfully', order });

    // All async operations happen in the background (non-blocking)
    setImmediate(async () => {
      try {
        // Recalculate queue count and positions if printerId exists
        if (printerId) {
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
          ).lean();

          if (updatedPrinter && io) {
            io.emit('printer_updated', updatedPrinter);
          }

          // Optimize queue position recalculation using bulk operations
          const affectedOrders = await Order.find({
            printerId: printerId,
            status: 'In Queue'
          }).select('_id userId createdAt').lean().sort({ createdAt: 1 });

          // Calculate queue positions in a single pass and bulk update
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
            
            // Emit updates to users
            if (io) {
              affectedOrders.forEach((affectedOrder, index) => {
                if (affectedOrder.userId) {
                  io.to(affectedOrder.userId.toString()).emit('order_queue_updated', {
                    orderId: affectedOrder._id,
                    queuePosition: index + 1
                  });
                }
              });
            }
          }
        }
      } catch (queueError) {
        console.error('Error recalculating queue positions:', queueError);
        // Continue even if queue position recalculation fails
      }

      // Create notification for user
      try {
        await Notification.create({
          userId: userId,
          title: 'Order Cancelled',
          message: `Your order #${orderNumber} has been cancelled.`,
          type: 'order_update',
          relatedOrderId: orderId
        });
      } catch (notifError) {
        console.error('Error creating user notification:', notifError);
        // Continue even if notification creation fails
      }

      // Create notifications for all admins of this shop
      try {
        const adminRole = orderShop === 'IT' ? 'it_admin' : 'ssc_admin';
        const admins = await User.find({ role: adminRole }).select('_id').lean();
        
        if (admins.length > 0) {
          const adminNotifications = admins.map(admin => ({
            userId: admin._id,
            title: 'Order Cancelled',
            message: `Order #${orderNumber} from ${userFullName} has been cancelled.`,
            type: 'order_cancelled',
            relatedOrderId: orderId
          }));
          
          await Notification.insertMany(adminNotifications);
        }
      } catch (adminNotifError) {
        console.error('Error creating admin notifications:', adminNotifError);
        // Continue even if admin notification creation fails
      }

      // Populate order and emit socket events
      if (io) {
        try {
          const populatedCancelledOrder = await Order.findById(orderId)
            .populate('userId', 'fullName email')
            .populate('printerId');
          
          io.to(userId).emit('order_cancelled', populatedCancelledOrder || order);
          io.to(`${orderShop}_admins`).emit('order_cancelled', populatedCancelledOrder || order);
          io.to(`${orderShop}_admins`).emit('notification', { type: 'order_cancelled' });
        } catch (socketError) {
          console.error('Error emitting socket events:', socketError);
          // Continue even if socket emission fails
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

