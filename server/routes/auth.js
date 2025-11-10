import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { uploadId } from '../middleware/upload.js';
import { protect } from '../middleware/auth.js';
import { sendWelcomeEmail } from '../utils/email.js';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', uploadId.single('idImage'), async (req, res) => {
  try {
    const { fullName, email, password, isBSIT } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'This email address is already registered. Please use a different email or try logging in instead.' });
    }

    // Create user object
    const userData = {
      fullName,
      email,
      password,
      isBSIT: isBSIT === 'true' || isBSIT === true
    };

    // If BSIT student, set status to pending and save ID image to GridFS
    if (userData.isBSIT) {
      userData.accountStatus = 'pending';
      
      if (!req.file) {
        return res.status(400).json({ message: 'ID image is required for BSIT students' });
      }

      // Store ID image in GridFS for persistence
      let idImageGridFSId = null;
      let idImagePath = `/uploads/ids/${req.file.originalname}`;
      
      if (mongoose.connection.readyState === 1 && req.file.buffer) {
        try {
          const gridFSBucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const filename = `id-${uniqueSuffix}${path.extname(req.file.originalname)}`;
          
          const uploadStream = gridFSBucket.openUploadStream(filename, {
            metadata: {
              originalName: req.file.originalname,
              mimetype: req.file.mimetype,
              uploadedBy: 'signup',
              fileType: 'id_image'
            }
          });
          
          uploadStream.end(req.file.buffer);
          
          await new Promise((resolve, reject) => {
            uploadStream.on('finish', () => {
              idImageGridFSId = uploadStream.id;
              // Store relative path (without /api prefix) since frontend API client adds it
              idImagePath = `/admin/id-image/${idImageGridFSId}`;
              console.log('ID image stored in GridFS:', idImageGridFSId, filename);
              resolve();
            });
            uploadStream.on('error', reject);
          });
        } catch (gridfsError) {
          console.error('Error storing ID image in GridFS, falling back to local storage:', gridfsError);
          // Fallback: save to local filesystem (for development)
          const idsDir = path.join(__dirname, '../../uploads/ids');
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const filename = `id-${uniqueSuffix}${path.extname(req.file.originalname)}`;
          const filePath_local = path.join(idsDir, filename);
          
          if (!fs.existsSync(idsDir)) {
            fs.mkdirSync(idsDir, { recursive: true });
          }
          
          fs.writeFileSync(filePath_local, req.file.buffer);
          // Store relative path (without /api prefix) since frontend API client adds it
          idImagePath = `/admin/id-image/file/${filename}`;
        }
      }

      userData.idImage = idImagePath;
      userData.idImageGridFSId = idImageGridFSId;
    } else {
      userData.accountStatus = 'approved';
    }

    const user = await User.create(userData);

    // Send welcome email to the student
    try {
      await sendWelcomeEmail(user.email, user.fullName, userData.isBSIT);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Continue even if email fails - account creation should still succeed
    }

    // If BSIT student (pending approval), create notifications for IT admins
    if (userData.isBSIT) {
      try {
        const itAdmins = await User.find({ role: 'it_admin' });
        
        for (const admin of itAdmins) {
          await Notification.create({
            userId: admin._id,
            title: 'New Account Pending Approval',
            message: `New BSIT student account from ${user.fullName} (${user.email}) is waiting for approval.`,
            type: 'account_status'
          });
        }

        // Emit socket event to notify IT admins in real-time
        const io = req.app.get('io');
        if (io) {
          io.to('IT_admins').emit('notification', { type: 'new_pending_account' });
          io.to('IT_admins').emit('new_pending_account', {
            userId: user._id,
            fullName: user.fullName,
            email: user.email
          });
        }
      } catch (notifError) {
        console.error('Error creating admin notifications:', notifError);
        // Continue even if notification creation fails
      }
    }

    // If non-BSIT, send token immediately
    if (!userData.isBSIT) {
      const token = generateToken(user._id);
      res.status(201).json({
        message: 'Account created successfully',
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          isBSIT: user.isBSIT,
          accountStatus: user.accountStatus,
          role: user.role,
          bannedFrom: user.bannedFrom
        }
      });
    } else {
      res.status(201).json({
        message: 'Account created. Waiting for admin approval.',
        accountStatus: 'pending'
      });
    }
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if account is pending approval
    if (user.accountStatus === 'pending') {
      return res.status(403).json({ message: 'Account is still pending for approval' });
    }

    // Check if account was declined
    if (user.accountStatus === 'declined') {
      return res.status(403).json({ message: 'Account was declined by admin' });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        isBSIT: user.isBSIT,
        accountStatus: user.accountStatus,
        role: user.role,
        bannedFrom: user.bannedFrom
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        fullName: req.user.fullName,
        email: req.user.email,
        isBSIT: req.user.isBSIT,
        accountStatus: req.user.accountStatus,
        role: req.user.role,
        bannedFrom: req.user.bannedFrom
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

