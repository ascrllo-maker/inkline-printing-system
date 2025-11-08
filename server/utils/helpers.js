// Generate random 4-digit order number
export const generateOrderNumber = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Emit socket event to specific user
export const emitToUser = (io, userId, event, data) => {
  io.to(userId.toString()).emit(event, data);
};

// Emit socket event to all admins
export const emitToAdmins = (io, shop, event, data) => {
  io.to(`${shop}_admins`).emit(event, data);
};

// Emit socket event to all users
export const emitToAll = (io, event, data) => {
  io.emit(event, data);
};

