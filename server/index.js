import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import authRoutes from './routes/auth.js';
import printerRoutes from './routes/printer.js';
import orderRoutes from './routes/order.js';
import adminRoutes from './routes/admin.js';
import notificationRoutes from './routes/notification.js';
import violationRoutes from './routes/violation.js';
import pricingRoutes from './routes/pricing.js';
import testRoutes from './routes/test.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// CORS configuration - support multiple origins for development and production
const allowedOrigins = process.env.CLIENT_URL 
  ? process.env.CLIENT_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173'];

const io = new Server(httpServer, {
  cors: {
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // In production, allow requests from same origin (relative URLs)
      if (process.env.NODE_ENV === 'production') {
        return callback(null, true);
      }
      
      // In development, check allowed origins
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    transports: ['websocket', 'polling'] // Support both transports
  },
  // Add ping timeout and ping interval for better connection stability
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static('uploads'));

// Health check endpoint for Render and Cloud Run
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: dbStatus,
    uptime: process.uptime()
  });
});

// Root endpoint - responds quickly for Render health checks
// This must be defined BEFORE the static file serving
app.get('/', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    // In production, serve the React app
    const clientBuildPath = path.join(__dirname, '../client/dist');
    const indexPath = path.join(clientBuildPath, 'index.html');
    
    // Check if index.html exists
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // Fallback if build doesn't exist yet
      res.json({ 
        message: 'InkLine API Server',
        status: 'running',
        environment: 'production',
        note: 'Client build not found. Please check build process.',
        timestamp: new Date().toISOString()
      });
    }
  } else {
    res.json({ 
      message: 'InkLine API Server',
      status: 'running',
      environment: 'development',
      timestamp: new Date().toISOString()
    });
  }
});

// MongoDB Connection - Non-blocking, server starts even if DB is not ready
console.log('🔄 Connecting to MongoDB...');
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  })
    .then(() => {
      console.log('✅ Connected to MongoDB');
      console.log('   Database:', mongoose.connection.name);
      console.log('   Host:', mongoose.connection.host);
    })
    .catch(err => {
      console.error('❌ MongoDB connection error:', err.message);
      console.warn('⚠️ Server will continue without database connection');
      console.warn('⚠️ Some features may not work until database is connected');
    });

  // MongoDB connection event handlers
  mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected');
  });
} else {
  console.warn('⚠️ MONGODB_URI not set. Database features will not work.');
}

// Socket.IO
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);
  
  // Join user's personal room
  socket.on('join_user_room', (userId) => {
    socket.join(userId.toString());
    console.log(`👤 User ${userId} joined their room`);
  });

  // Join admin room
  socket.on('join_admin_room', (room) => {
    socket.join(room);
    console.log(`👤 Admin joined room: ${room}`);
  });

  // Leave admin room
  socket.on('leave_admin_room', (room) => {
    socket.leave(room);
    console.log(`👤 Admin left room: ${room}`);
  });
  
  socket.on('disconnect', () => {
    console.log('👤 User disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/printers', printerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/violations', violationRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/test', testRoutes);

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../client/dist');
  
  // Check if dist folder exists
  if (fs.existsSync(clientBuildPath)) {
    console.log('✅ Serving static files from:', clientBuildPath);
    app.use(express.static(clientBuildPath));
    
    // Serve React app for all non-API routes (after root route)
    // Note: Root route is already handled above, so this catches other routes
    app.get('*', (req, res, next) => {
      // Don't serve React app for API routes
      if (req.path.startsWith('/api')) {
        return next();
      }
      // Don't serve React app for health check or root (already handled)
      if (req.path === '/health' || req.path === '/') {
        return next();
      }
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
  } else {
    console.warn('⚠️ Client build folder not found:', clientBuildPath);
    console.warn('⚠️ Make sure to run: npm run build');
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Error handlers
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  // Don't exit in production, let the server continue
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

console.log('🔄 Starting server...');
console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔌 Port: ${PORT}`);
console.log(`🌐 Host: ${HOST}`);
console.log(`💾 Database: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured'}`);
console.log(`📧 Email: ${process.env.SENDGRID_API_KEY ? 'SendGrid' : process.env.EMAIL_USER ? 'Gmail' : 'Not configured'}`);

httpServer.listen(PORT, HOST, () => {
  console.log('');
  console.log('════════════════════════════════════════');
  console.log('🚀 Server is running!');
  console.log(`   URL: http://${HOST}:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('════════════════════════════════════════');
  console.log('');
  
  if (process.env.CLIENT_URL) {
    console.log(`🌐 Client URL: ${process.env.CLIENT_URL}`);
  }
  
  // Health check info
  console.log(`💚 Health check: http://${HOST}:${PORT}/health`);
  console.log('');
});

