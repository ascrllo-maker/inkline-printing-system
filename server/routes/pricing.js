import express from 'express';
import Pricing from '../models/Pricing.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/pricing/:shop
// @desc    Get pricing for a specific shop (public endpoint for students)
// @access  Private (students can access)
router.get('/:shop', protect, async (req, res) => {
  try {
    const { shop } = req.params;
    
    if (!['IT', 'SSC'].includes(shop)) {
      return res.status(400).json({ message: 'Invalid shop name' });
    }

    // Get all pricing for this shop
    const pricing = await Pricing.find({ shop })
      .select('shop paperSize colorType pricePerCopy')
      .lean()
      .sort({ paperSize: 1, colorType: 1 });

    res.json(pricing);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

