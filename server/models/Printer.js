import mongoose from 'mongoose';

const printerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  shop: {
    type: String,
    enum: ['IT', 'SSC'],
    required: true,
    index: true // Add index for faster queries
  },
  status: {
    type: String,
    enum: ['Active', 'Offline', 'No Ink/Paper'],
    default: 'Active',
    index: true // Add index for faster status filtering
  },
  availablePaperSizes: [{
    size: {
      type: String,
      required: true
    },
    enabled: {
      type: Boolean,
      default: true
    }
  }],
  queueCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for shop and status queries
printerSchema.index({ shop: 1, status: 1 });

export default mongoose.model('Printer', printerSchema);

