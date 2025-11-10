import express from 'express';
import { protect } from '../middleware/auth.js';
import { uploadFile } from '../middleware/upload.js';
import { countPages } from '../utils/pageCounter.js';

const router = express.Router();

// @route   POST /api/file/count-pages
// @desc    Count pages in an uploaded file (for preview before order creation)
// @access  Private
router.post('/count-pages', protect, uploadFile.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    const pageCount = await countPages(req.file.buffer, req.file.mimetype, req.file.originalname);
    
    res.json({
      totalPages: pageCount,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });
  } catch (error) {
    console.error('Error counting pages:', error);
    res.status(500).json({ message: 'Error counting pages', error: error.message });
  }
});

export default router;

