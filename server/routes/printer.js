import express from 'express';
import Printer from '../models/Printer.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/printers/:shop
// @desc    Get all printers for a specific shop
// @access  Private
router.get('/:shop', protect, async (req, res) => {
  try {
    const { shop } = req.params;
    
    if (!['IT', 'SSC'].includes(shop)) {
      return res.status(400).json({ message: 'Invalid shop name' });
    }

    // Use lean() for faster queries and ensure all fields are populated
    const printers = await Printer.find({ shop })
      .lean()
      .sort({ createdAt: 1 });
    
    // Ensure all printers have valid availablePaperSizes array
    const normalizedPrinters = printers.map(printer => ({
      ...printer,
      availablePaperSizes: Array.isArray(printer.availablePaperSizes) 
        ? printer.availablePaperSizes 
        : [],
      queueCount: printer.queueCount || 0
    }));
    
    res.json(normalizedPrinters);
  } catch (error) {
    console.error('Error fetching printers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/printers/single/:id
// @desc    Get a single printer by ID
// @access  Private
router.get('/single/:id', protect, async (req, res) => {
  try {
    const printer = await Printer.findById(req.params.id);
    
    if (!printer) {
      return res.status(404).json({ message: 'Printer not found' });
    }

    res.json(printer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

