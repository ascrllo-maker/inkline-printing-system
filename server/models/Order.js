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
  gridfsFileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
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
  totalPages: {
    type: Number,
    required: false, // Total pages in the file
    min: 0,
    default: 1
  },
  pagesToPrint: {
    type: [Number], // Array of page numbers to print (e.g., [1, 2, 3, 5, 7])
    required: false,
    default: [] // Empty array means print all pages
  },
  pagesToPrintCount: {
    type: Number, // Number of pages to print (calculated from pagesToPrint array or totalPages if empty)
    required: false,
    min: 1,
    default: 1
  },
  pricePerPage: {
    type: Number,
    required: false, // Price per page (calculated from pricing)
    min: 0,
    default: 0
  },
  pricePerCopy: {
    type: Number,
    required: false, // Make optional for backward compatibility with old orders
    min: 0,
    default: 0
  },
  totalPrice: {
    type: Number,
    required: false, // Make optional for backward compatibility with old orders
    min: 0,
    default: 0
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

