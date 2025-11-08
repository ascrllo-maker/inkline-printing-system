import express from 'express';
import Violation from '../models/Violation.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/violations/my-violations
// @desc    Get all violations for current user
// @access  Private
router.get('/my-violations', protect, async (req, res) => {
  try {
    const violations = await Violation.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.json(violations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

