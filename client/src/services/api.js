import axios from 'axios';

// Use relative URL in production (same origin), absolute in development
// In production on Render, client and server are on the same domain
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  signup: (data) => {
    const formData = new FormData();
    formData.append('fullName', data.fullName);
    formData.append('email', data.email);
    formData.append('password', data.password);
    formData.append('isBSIT', data.isBSIT);
    if (data.idImage) {
      formData.append('idImage', data.idImage);
    }
    // Use api instance to ensure relative URLs and proper baseURL handling
    return api.post('/auth/signup', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getMe: () => api.get('/auth/me'),
};

// Printer API
export const printerAPI = {
  getPrinters: (shop) => api.get(`/printers/${shop}`),
  getPrinter: (id) => api.get(`/printers/single/${id}`),
};

// Order API
export const orderAPI = {
  createOrder: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key !== 'file') {
        formData.append(key, data[key]);
      }
    });
    if (data.file) {
      formData.append('file', data.file);
    }
    return api.post('/orders/create', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getMyOrders: () => api.get('/orders/my-orders'),
  cancelOrder: (id) => api.put(`/orders/cancel/${id}`),
};

// Notification API
export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/mark-read/${id}`),
  markAllRead: () => api.put('/notifications/mark-all-read'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};

// Violation API
export const violationAPI = {
  getMyViolations: () => api.get('/violations/my-violations'),
};

// Admin API
export const adminAPI = {
  getPendingAccounts: () => api.get('/admin/pending-accounts'),
  approveAccount: (id) => api.put(`/admin/approve-account/${id}`),
  declineAccount: (id) => api.delete(`/admin/decline-account/${id}`),
  getOrders: (shop, status) => {
    const params = status ? { status } : {};
    return api.get(`/admin/orders/${shop}`, { params });
  },
  updateOrderStatus: (id, status) => api.put(`/admin/update-order-status/${id}`, { status }),
  getUsers: (shop) => api.get(`/admin/users/${shop}`),
  banUser: (id, shop) => api.put(`/admin/ban-user/${id}`, { shop }),
  unbanUser: (id, shop) => api.put(`/admin/unban-user/${id}`, { shop }),
  createPrinter: (data) => api.post('/admin/printers', data),
  updatePrinter: (id, data) => api.put(`/admin/printers/${id}`, data),
  deletePrinter: (id) => api.delete(`/admin/printers/${id}`),
  sendViolation: (data) => api.post('/admin/send-violation', data),
  sendViolationFollowup: (data) => api.post('/admin/send-violation-followup', data),
  getViolations: (shop) => api.get(`/admin/violations/${shop}`),
  settleViolation: (id) => api.put(`/admin/settle-violation/${id}`),
};

export default api;

