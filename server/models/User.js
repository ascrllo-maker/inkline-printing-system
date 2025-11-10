import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  isBSIT: {
    type: Boolean,
    default: false
  },
  idImage: {
    type: String, // Path to uploaded ID image (legacy - for backward compatibility)
    default: null
  },
  idImageGridFSId: {
    type: mongoose.Schema.Types.ObjectId, // GridFS file ID for ID image
    default: null
  },
  accountStatus: {
    type: String,
    enum: ['pending', 'approved', 'declined'],
    default: 'approved' // Default approved for non-BSIT students
  },
  role: {
    type: String,
    enum: ['student', 'it_admin', 'ssc_admin'],
    default: 'student'
  },
  bannedFrom: {
    type: [String], // Array of shop names: 'IT', 'SSC'
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);

