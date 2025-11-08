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
    required: true
  },
  printerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Printer',
    required: true
  },
  shop: {
    type: String,
    enum: ['IT', 'SSC'],
    required: true
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
    default: 'In Queue'
  },
  queuePosition: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
});

export default mongoose.model('Order', orderSchema);

