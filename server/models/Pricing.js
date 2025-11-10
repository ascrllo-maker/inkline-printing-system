import mongoose from 'mongoose';

const pricingSchema = new mongoose.Schema({
  shop: {
    type: String,
    enum: ['IT', 'SSC'],
    required: true
  },
  paperSize: {
    type: String,
    required: true
  },
  colorType: {
    type: String,
    enum: ['Black and White', 'Colored'],
    required: true
  },
  pricePerCopy: {
    type: Number,
    required: true,
    min: 0
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true
});

// Compound index for fast lookups and uniqueness
// This index can be used for queries on shop alone (leftmost prefix)
pricingSchema.index({ shop: 1, paperSize: 1, colorType: 1 }, { unique: true });

export default mongoose.model('Pricing', pricingSchema);

