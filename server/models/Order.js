import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Add index for faster user queries
  },
  printerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Printer',
    required: true,
    index: true // Add index for faster printer queries
  },
  shop: {
    type: String,
    enum: ['IT', 'SSC'],
    required: true,
    index: true // Add index for faster shop queries
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  paperSize: {
    type: String,
    required: true
  },
  orientation: {
    type: String,
    enum: ['Portrait', 'Landscape'],
    required: true
  },
  colorType: {
    type: String,
    enum: ['Black and White', 'Colored'],
    required: true
  },
  copies: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['In Queue', 'Printing', 'Ready for Pickup', 'Ready for Pickup & Payment', 'Completed', 'Cancelled'],
    default: 'In Queue',
    index: true // Add index for faster status queries
  },
  queuePosition: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true // Add index for faster date sorting
  },
  completedAt: {
    type: Date,
    default: null
  }
});

// Create compound indexes for common query patterns
orderSchema.index({ printerId: 1, status: 1, createdAt: 1 }); // For queue position calculations
orderSchema.index({ shop: 1, status: 1, createdAt: -1 }); // For admin order listings
orderSchema.index({ userId: 1, shop: 1 }); // For user's orders by shop

export default mongoose.model('Order', orderSchema);

