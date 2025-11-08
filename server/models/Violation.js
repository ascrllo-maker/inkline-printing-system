import mongoose from 'mongoose';

const violationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shop: {
    type: String,
    enum: ['IT', 'SSC'],
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  resolved: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Violation', violationSchema);

