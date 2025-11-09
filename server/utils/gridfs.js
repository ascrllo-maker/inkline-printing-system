import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

let gfs;

// Initialize GridFS
export const initGridFS = () => {
  if (mongoose.connection.readyState === 1) {
    gfs = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads'
    });
    console.log('✅ GridFS initialized');
  }
};

// Initialize when MongoDB connects
mongoose.connection.on('connected', () => {
  initGridFS();
});

// Get GridFS instance
export const getGridFS = () => {
  if (!gfs && mongoose.connection.readyState === 1) {
    initGridFS();
  }
  return gfs;
};

// Upload file to GridFS
export const uploadToGridFS = (fileBuffer, filename, metadata = {}) => {
  return new Promise((resolve, reject) => {
    const gfs = getGridFS();
    if (!gfs) {
      return reject(new Error('GridFS not initialized'));
    }

    const uploadStream = gfs.openUploadStream(filename, {
      metadata: metadata
    });

    uploadStream.on('finish', () => {
      resolve(uploadStream.id);
    });

    uploadStream.on('error', (error) => {
      reject(error);
    });

    uploadStream.end(fileBuffer);
  });
};

// Download file from GridFS
export const downloadFromGridFS = (fileId) => {
  return new Promise((resolve, reject) => {
    const gfs = getGridFS();
    if (!gfs) {
      return reject(new Error('GridFS not initialized'));
    }

    const downloadStream = gfs.openDownloadStream(fileId);
    const chunks = [];

    downloadStream.on('data', (chunk) => {
      chunks.push(chunk);
    });

    downloadStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    downloadStream.on('error', (error) => {
      reject(error);
    });
  });
};

// Get file info from GridFS
export const getFileInfo = (fileId) => {
  return new Promise((resolve, reject) => {
    const gfs = getGridFS();
    if (!gfs) {
      return reject(new Error('GridFS not initialized'));
    }

    gfs.find({ _id: fileId }).toArray((err, files) => {
      if (err) {
        return reject(err);
      }
      if (files.length === 0) {
        return reject(new Error('File not found'));
      }
      resolve(files[0]);
    });
  });
};

// Delete file from GridFS
export const deleteFromGridFS = (fileId) => {
  return new Promise((resolve, reject) => {
    const gfs = getGridFS();
    if (!gfs) {
      return reject(new Error('GridFS not initialized'));
    }

    gfs.delete(fileId, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
};

// Create read stream from GridFS
export const createReadStream = (fileId) => {
  const gfs = getGridFS();
  if (!gfs) {
    throw new Error('GridFS not initialized');
  }
  return gfs.openDownloadStream(fileId);
};

