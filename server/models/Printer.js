import mongoose from 'mongoose';

const printerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  shop: {
    type: String,
    enum: ['IT', 'SSC'],
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Offline', 'No Ink/Paper'],
    default: 'Active'
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

export default mongoose.model('Printer', printerSchema);

