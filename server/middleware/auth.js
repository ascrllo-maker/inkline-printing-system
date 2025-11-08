import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized to access this route' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized to access this route' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

export const adminOnly = (shop) => {
  return (req, res, next) => {
    if (shop === 'IT' && req.user.role !== 'it_admin') {
      return res.status(403).json({ message: 'Access denied. IT Admin only.' });
    }
    
    if (shop === 'SSC' && req.user.role !== 'ssc_admin') {
      return res.status(403).json({ message: 'Access denied. SSC Admin only.' });
    }
    
    next();
  };
};

