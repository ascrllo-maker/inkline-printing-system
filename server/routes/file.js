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

    console.log('File upload received:', {
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      bufferType: req.file.buffer ? typeof req.file.buffer : 'null',
      isBuffer: req.file.buffer ? Buffer.isBuffer(req.file.buffer) : false,
      bufferLength: req.file.buffer ? req.file.buffer.length : 0
    });

    const pageCount = await countPages(req.file.buffer, req.file.mimetype, req.file.originalname);
    
    console.log(`Page count result for ${req.file.originalname}: ${pageCount} pages`);
    
    res.json({
      totalPages: pageCount,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });
  } catch (error) {
    console.error('Error counting pages:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Error counting pages', error: error.message });
  }
});

export default router;

