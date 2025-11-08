import { io } from 'socket.io-client';

// Use relative URL in production (same origin), absolute in development
// In production on Render, client and server are on the same domain
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
  (import.meta.env.PROD ? window.location.origin : 'http://localhost:5000');

let socket = null;

export const connectSocket = (userId) => {
  if (socket?.connected) {
    // If already connected, just join user room
    if (userId) {
      socket.emit('join_user_room', userId);
    }
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: {
      userId: userId,
    },
    transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    timeout: 20000,
    forceNew: false
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
    
    // Join user's personal room
    if (userId) {
      socket.emit('join_user_room', userId);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinAdminRoom = (shop) => {
  if (socket) {
    socket.emit('join_admin_room', `${shop}_admins`);
  }
};

export const leaveAdminRoom = (shop) => {
  if (socket) {
    socket.emit('leave_admin_room', `${shop}_admins`);
  }
};

export const getSocket = () => {
  return socket;
};

export default socket;

