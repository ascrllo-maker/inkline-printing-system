import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directories if they don't exist (for local storage fallback)
const uploadsDir = path.join(__dirname, '../../uploads');
const idsDir = path.join(uploadsDir, 'ids');
const filesDir = path.join(uploadsDir, 'files');

[uploadsDir, idsDir, filesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Get GridFS bucket
const getGridFSBucket = () => {
  if (mongoose.connection.readyState === 1) {
    return new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
  }
  return null;
};

// Memory storage for GridFS (stores file in memory, then uploads to GridFS)
const memoryStorage = multer.memoryStorage();

// Storage configuration for ID images - use memory storage for GridFS
const idStorage = memoryStorage;

// Storage configuration for print files - use memory storage for GridFS
const fileStorage = memoryStorage;

// File filter for images (ID verification)
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// File filter for documents (printing)
const documentFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'text/plain'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not supported for printing!'), false);
  }
};

export const uploadId = multer({
  storage: idStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export const uploadFile = multer({
  storage: fileStorage,
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

