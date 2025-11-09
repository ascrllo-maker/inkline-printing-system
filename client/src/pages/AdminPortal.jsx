import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAPI, printerAPI, notificationAPI } from '../services/api';
import { connectSocket, disconnectSocket, joinAdminRoom, leaveAdminRoom, getSocket } from '../services/socket';
import { Printer, Bell, LogOut, FileText, Users, AlertTriangle, CheckCircle, XCircle, Plus, Download, Ban, Unlock, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPortal({ shop }) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('ORDERS');
  const activeTabRef = useRef('ORDERS'); // Ref to track current tab without closure issues
  const [selectedPrinterTab, setSelectedPrinterTab] = useState(null);
  const [orders, setOrders] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [users, setUsers] = useState([]);
  const [pendingAccounts, setPendingAccounts] = useState([]);
  const [violations, setViolations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreatePrinter, setShowCreatePrinter] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState(null);
  const [loading, setLoading] = useState(false);

  const [printerForm, setPrinterForm] = useState({
    name: '',
    availablePaperSizes: ['A4', 'Letter', 'Legal'],
  });

  const isITAdmin = shop === 'IT';

  const tabs = [
    { id: 'ORDERS', label: 'ORDERS', icon: FileText },
    { id: 'COMPLETED', label: 'COMPLETED', icon: CheckCircle },
    { id: 'CANCELLED', label: 'CANCELLED', icon: XCircle },
    { id: 'USER VIOLATIONS', label: 'USER VIOLATIONS', icon: AlertTriangle },
    ...(isITAdmin ? [{ id: 'APPROVE ACCOUNTS', label: 'APPROVE ACCOUNTS', icon: Users }] : []),
    { id: 'STUDENT USERS', label: 'STUDENT USERS', icon: Users },
    { id: 'PRINTERS', label: 'PRINTERS', icon: Printer },
  ];

  // Update ref whenever activeTab changes
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    loadData();
    loadNotifications();
  }, [activeTab, shop]);

  const loadNotifications = async () => {
    try {
      const res = await notificationAPI.getNotifications();
      setNotifications(res.data || []);
    } catch (error) {
      // Silent fail
    }
  };

  // Open notification center (don't mark as read yet)
  const handleOpenNotifications = () => {
    setShowNotifications(true);
  };

  // Mark all notifications as read when closing the notification center
  const handleCloseNotifications = () => {
    // Check if there are unread notifications BEFORE closing
    const hasUnread = notifications.some(n => !n.read);
    
    // Update local state IMMEDIATELY (optimistic update) to remove red dots and count
    // This happens synchronously before closing
    if (hasUnread) {
      setNotifications(prev => {
        const updated = prev.map(n => ({ ...n, read: true }));
        return updated;
      });
    }
    
    // Close notification center
    setShowNotifications(false);
    
    // Mark as read on server in background (don't block UI)
    if (hasUnread) {
      notificationAPI.markAllRead().catch(error => {
        console.error('Failed to mark notifications as read:', error);
        // If API call fails, reload notifications to revert
        loadNotifications();
      });
    }
  };

  // Handle file download - opens file in new tab
  const handleDownloadFile = async (filePath, fileName) => {
    try {
      if (!filePath) {
        toast.error('File path not found');
        return;
      }

      // Get the token for authentication
      const token = localStorage.getItem('token');
      
      // Construct the full URL
      // In production, use relative path; in development, use full URL
      const API_URL = import.meta.env.VITE_API_URL || 
        (import.meta.env.PROD ? '' : 'http://localhost:5000');
      const fileUrl = `${API_URL}${filePath}`;
      
      // Fetch the file with authentication
      const response = await fetch(fileUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load file');
      }

      // Get the content type from response headers
      let contentType = response.headers.get('content-type') || 'application/octet-stream';
      
      // If content-type is generic or missing, try to infer from file extension
      if (contentType === 'application/octet-stream' || !contentType) {
        const extension = fileName.split('.').pop()?.toLowerCase();
        const mimeTypes = {
          'pdf': 'application/pdf',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'ppt': 'application/vnd.ms-powerpoint',
          'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'xls': 'application/vnd.ms-excel',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'txt': 'text/plain',
          'html': 'text/html',
          'htm': 'text/html'
        };
        if (extension && mimeTypes[extension]) {
          contentType = mimeTypes[extension];
        }
      }
      
      // Get the file as a blob
      const blob = await response.blob();
      
      // Create a new blob with the explicit content type to ensure browser renders it correctly
      const typedBlob = new Blob([blob], { type: contentType });
      
      // Create a temporary URL for the blob
      const blobUrl = window.URL.createObjectURL(typedBlob);
      
      // Open the file in a new tab
      const newWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
      
      // If popup was blocked, fall back to creating a link
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // Create a temporary anchor element to open in new tab
        const link = document.createElement('a');
        link.href = blobUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      // Clean up the blob URL after a delay to allow the new tab to load
      // Note: We wait 10 seconds to ensure the new tab has fully loaded the blob URL
      // The browser will clean up blob URLs when tabs are closed, but we revoke
      // to prevent memory leaks if many files are opened
      setTimeout(() => {
        try {
          window.URL.revokeObjectURL(blobUrl);
        } catch (e) {
          // Ignore errors if URL was already revoked
        }
      }, 10000);
      
      toast.success('File opened in new tab');
    } catch (error) {
      console.error('Error opening file:', error);
      toast.error('Failed to open file. Please try again.');
    }
  };

  // Socket.IO setup for real-time updates
  useEffect(() => {
    if (!user) return;

    const socket = connectSocket(user.id);
    
    // Join admin room
    joinAdminRoom(shop);

      // Listen for new orders
      socket.on('new_order', (order) => {
        if (order && order.shop === shop) {
          // Use ref to get current tab (avoids closure issues)
          const currentTab = activeTabRef.current;
          
          // Only show toast and reload if on ORDERS tab
          if (currentTab === 'ORDERS') {
            toast.success('New order received!');
            // Reload data to get the order with proper queue positions
            loadData();
          }
          // Reload notifications to show new order notification
          loadNotifications();
        }
      });

    // Listen for order updates
    socket.on('order_updated', (order) => {
      if (order && order.shop === shop) {
        // Use ref to get current tab (avoids closure issues)
        const currentTab = activeTabRef.current;
        
        // Update the order in the current orders list if it exists
        setOrders(prev => {
          const exists = prev.find(o => o._id === order._id);
          if (exists) {
            // Only update if the order's status matches the current tab filter
            if (currentTab === 'ORDERS' && ['In Queue', 'Printing', 'Ready for Pickup', 'Ready for Pickup & Payment'].includes(order.status)) {
              return prev.map(o => o._id === order._id ? order : o);
            } else if (currentTab === 'COMPLETED' && order.status === 'Completed') {
              return prev.map(o => o._id === order._id ? order : o);
            } else if (currentTab === 'CANCELLED' && order.status === 'Cancelled') {
              return prev.map(o => o._id === order._id ? order : o);
            } else {
              // Order status changed and no longer matches current tab, remove it
              return prev.filter(o => o._id !== order._id);
            }
          }
          return prev;
        });
        
        // Only reload data if we're on a tab that shows orders and needs queue updates
        // Don't reload for COMPLETED or CANCELLED tabs to avoid race conditions
        if (currentTab === 'ORDERS' || currentTab === 'PRINTERS') {
          loadData();
        }
      }
    });

    socket.on('order_cancelled', (order) => {
      if (order && order.shop === shop) {
        // Use ref to get current tab (avoids closure issues)
        const currentTab = activeTabRef.current;
        
        // If we're on the CANCELLED tab, add/update the cancelled order
        if (currentTab === 'CANCELLED') {
          setOrders(prev => {
            const exists = prev.find(o => o._id === order._id);
            if (!exists) {
              // Only add if it's actually cancelled
              if (order.status === 'Cancelled') {
                return [order, ...prev];
              }
            } else {
              // Update existing order
              return prev.map(o => o._id === order._id ? order : o);
            }
            return prev;
          });
        } else {
          // If we're on ORDERS tab, remove the cancelled order
          setOrders(prev => prev.filter(o => o._id !== order._id));
          // Reload data to update queue positions and printer counts
          if (currentTab === 'ORDERS' || currentTab === 'PRINTERS') {
            loadData();
          }
        }
        // Reload notifications to show cancelled order notification
        loadNotifications();
      }
    });

    // Listen for printer updates
    socket.on('printer_updated', (printer) => {
      if (printer && printer.shop === shop) {
        setPrinters(prev => prev.map(p => p._id === printer._id ? { ...printer, queueCount: printer.queueCount } : p));
        // Reload data to ensure orders list is updated with new queue counts
        if (activeTab === 'ORDERS' || activeTab === 'PRINTERS') {
          loadData();
        }
      }
    });

    socket.on('printer_created', (printer) => {
      if (printer && printer.shop === shop) {
        setPrinters(prev => {
          const exists = prev.find(p => p._id === printer._id);
          if (!exists) {
            return [...prev, printer];
          }
          return prev;
        });
        toast.success('New printer added!');
        if (activeTab === 'PRINTERS') {
          loadData();
        }
      }
    });

    socket.on('printer_deleted', ({ id }) => {
      setPrinters(prev => prev.filter(p => p._id !== id));
      if (activeTab === 'PRINTERS' || activeTab === 'ORDERS') {
        loadData();
      }
    });

    // Listen for account approval (IT Admin only)
    if (isITAdmin) {
      socket.on('account_approved', () => {
        if (activeTab === 'APPROVE ACCOUNTS') {
          loadData();
        }
        // Reload notifications when account is approved
        loadNotifications();
      });

      // Listen for new pending accounts
      socket.on('new_pending_account', () => {
        // Reload notifications to show new pending account notification
        loadNotifications();
        // Reload data if on APPROVE ACCOUNTS tab
        if (activeTab === 'APPROVE ACCOUNTS') {
          loadData();
        }
      });
    }

    // Listen for notifications
    socket.on('notification', () => {
      loadNotifications();
    });

    // Listen for violation updates
    socket.on('violation_created', (violation) => {
      if (violation && violation.shop === shop) {
        // Reload violations if on the violations tab
        if (activeTab === 'USER VIOLATIONS') {
          loadData();
        }
      }
    });

    socket.on('violation_settled', (data) => {
      if (data && data.shop === shop) {
        // Reload violations if on the violations tab
        if (activeTab === 'USER VIOLATIONS') {
          loadData();
        }
      }
    });

    return () => {
      leaveAdminRoom(shop);
      socket.off('new_order');
      socket.off('order_updated');
      socket.off('order_cancelled');
      socket.off('printer_updated');
      socket.off('printer_created');
      socket.off('printer_deleted');
      socket.off('notification');
      socket.off('violation_created');
      socket.off('violation_settled');
      if (isITAdmin) {
        socket.off('account_approved');
        socket.off('new_pending_account');
      }
    };
  }, [user, shop, activeTab, isITAdmin]);

  const loadData = async () => {
    try {
      // Use ref to get current tab (avoids closure issues)
      const currentTab = activeTabRef.current;
      
      if (currentTab === 'ORDERS') {
        const res = await adminAPI.getOrders(shop);
        // Double-check we're still on the ORDERS tab before updating state
        if (activeTabRef.current === 'ORDERS') {
          const filteredOrders = res.data.filter(o => ['In Queue', 'Printing', 'Ready for Pickup', 'Ready for Pickup & Payment'].includes(o.status));
          setOrders(filteredOrders);
        }
      } else if (currentTab === 'COMPLETED') {
        const res = await adminAPI.getOrders(shop);
        // Double-check we're still on the COMPLETED tab before updating state
        if (activeTabRef.current === 'COMPLETED') {
          const filteredOrders = res.data.filter(o => o.status === 'Completed');
          setOrders(filteredOrders);
        }
      } else if (currentTab === 'CANCELLED') {
        const res = await adminAPI.getOrders(shop);
        // Double-check we're still on the CANCELLED tab before updating state
        // Filter for cancelled orders only - be very explicit
        if (activeTabRef.current === 'CANCELLED') {
          const cancelledOrders = res.data.filter(o => {
            // Explicitly check status is exactly 'Cancelled'
            return o.status === 'Cancelled';
          });
          console.log('Loading cancelled orders:', cancelledOrders.length, 'out of', res.data.length, 'total orders');
          setOrders(cancelledOrders);
        }
      } else if (currentTab === 'PRINTERS') {
        const res = await printerAPI.getPrinters(shop);
        setPrinters(res.data);
      } else if (currentTab === 'STUDENT USERS') {
        const res = await adminAPI.getUsers(shop);
        setUsers(res.data);
      } else if (currentTab === 'APPROVE ACCOUNTS' && isITAdmin) {
        const res = await adminAPI.getPendingAccounts();
        setPendingAccounts(res.data);
      } else if (currentTab === 'USER VIOLATIONS') {
        const res = await adminAPI.getViolations(shop);
        setViolations(res.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await adminAPI.updateOrderStatus(orderId, status);
      toast.success('Order status updated');
      loadData();
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const handleApproveAccount = async (id) => {
    try {
      await adminAPI.approveAccount(id);
      toast.success('Account approved');
      loadData();
    } catch (error) {
      toast.error('Failed to approve account');
    }
  };

  const handleDeclineAccount = async (id) => {
    if (!confirm('Are you sure you want to decline this account? It will be permanently deleted.')) return;
    try {
      await adminAPI.declineAccount(id);
      toast.success('Account declined and deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to decline account');
    }
  };

  const handleBanUser = async (userId) => {
    // Optimistic update - immediately update UI
    setUsers(prevUsers => 
      prevUsers.map(u => 
        u._id === userId 
          ? { ...u, bannedFrom: [...(u.bannedFrom || []), shop] }
          : u
      )
    );
    
    try {
      await adminAPI.banUser(userId, shop);
      toast.success('User banned');
      // Reload data to ensure consistency (socket events will also update)
      loadData();
    } catch (error) {
      // Revert optimistic update on error
      loadData();
      toast.error('Failed to ban user');
    }
  };

  const handleUnbanUser = async (userId) => {
    // Optimistic update - immediately update UI
    setUsers(prevUsers => 
      prevUsers.map(u => 
        u._id === userId 
          ? { ...u, bannedFrom: (u.bannedFrom || []).filter(s => s !== shop) }
          : u
      )
    );
    
    try {
      await adminAPI.unbanUser(userId, shop);
      toast.success('Ban lifted');
      // Reload data to ensure consistency (socket events will also update)
      loadData();
    } catch (error) {
      // Revert optimistic update on error
      loadData();
      toast.error('Failed to lift ban');
    }
  };

  const handleCreatePrinter = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminAPI.createPrinter({
        name: printerForm.name,
        shop: shop,
        availablePaperSizes: printerForm.availablePaperSizes,
      });
      toast.success('Printer created successfully');
      setShowCreatePrinter(false);
      setPrinterForm({ name: '', availablePaperSizes: ['A4', 'Letter', 'Legal'] });
      loadData();
    } catch (error) {
      toast.error('Failed to create printer');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrinter = async (printerId, updates) => {
    try {
      await adminAPI.updatePrinter(printerId, updates);
      toast.success('Printer updated');
      loadData();
    } catch (error) {
      toast.error('Failed to update printer');
    }
  };

  const handleDeletePrinter = async (printerId, printerName) => {
    if (!window.confirm(`Are you sure you want to delete "${printerName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await adminAPI.deletePrinter(printerId);
      toast.success('Printer deleted successfully');
      loadData();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to delete printer';
      toast.error(errorMessage);
    }
  };

  const handleSendViolation = async (userId) => {
    // Find the user to check if they have active orders
    const user = users.find(u => u._id === userId);
    if (!user || !user.hasActiveOrders) {
      toast.error('Cannot send violation warning: Student must have active orders');
      return;
    }

    if (!confirm('Send violation warning to this user?')) return;
    try {
      // Set reason based on shop
      const reason = shop === 'IT' 
        ? 'You failed to claim your order for more than 24 hours already'
        : 'You failed to claim and pay for your order for more than 24 hours already';
      
      await adminAPI.sendViolation({
        userId,
        shop,
        reason,
      });
      toast.success('Violation warning sent');
      loadData();
    } catch (error) {
      toast.error('Failed to send violation warning');
    }
  };

  const handleSettleViolation = async (violationId) => {
    if (!confirm('Mark this violation as settled?')) return;
    try {
      await adminAPI.settleViolation(violationId);
      toast.success('Violation marked as settled');
      loadData();
    } catch (error) {
      toast.error('Failed to settle violation');
    }
  };

  const handleSendViolationFollowup = async (userId) => {
    if (!confirm('Send follow-up violation warning to this user?')) return;
    try {
      await adminAPI.sendViolationFollowup({
        userId,
        shop,
      });
      toast.success('Follow-up violation warning sent');
    } catch (error) {
      toast.error('Failed to send follow-up violation warning');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'In Queue': 'bg-yellow-100 text-yellow-800',
      'Printing': 'bg-blue-100 text-blue-800',
      'Ready for Pickup': 'bg-green-100 text-green-800',
      'Ready for Pickup & Payment': 'bg-purple-100 text-purple-800',
      'Completed': 'bg-gray-100 text-gray-800',
      'Cancelled': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Group orders by printer
  const groupedOrders = orders.reduce((acc, order) => {
    const printerName = order.printerId?.name || 'Unknown Printer';
    if (!acc[printerName]) {
      acc[printerName] = [];
    }
    acc[printerName].push(order);
    return acc;
  }, {});

  // Get list of printer names that have orders
  const printerTabs = Object.keys(groupedOrders).sort();

  // Set default selected printer tab when orders change
  useEffect(() => {
    if (activeTab === 'ORDERS') {
      if (printerTabs.length > 0 && !selectedPrinterTab) {
        // Set first printer as default
        setSelectedPrinterTab(printerTabs[0]);
      } else if (selectedPrinterTab && !printerTabs.includes(selectedPrinterTab)) {
        // If selected printer no longer has orders, select first available
        setSelectedPrinterTab(printerTabs[0] || null);
      } else if (printerTabs.length === 1 && !selectedPrinterTab) {
        // If only one printer, set it automatically
        setSelectedPrinterTab(printerTabs[0]);
      }
    } else {
      // Reset selected printer tab when switching away from ORDERS tab
      setSelectedPrinterTab(null);
    }
  }, [activeTab, printerTabs, selectedPrinterTab]);

  // Get orders for selected printer, sorted by queue position (ascending)
  const selectedPrinterOrders = selectedPrinterTab ? (groupedOrders[selectedPrinterTab] || []).sort((a, b) => {
    // Orders with queue positions come first, sorted ascending
    // Orders without queue positions (Ready for Pickup, etc.) go to the end
    const aQueue = a.queuePosition || 999999;
    const bQueue = b.queuePosition || 999999;
    return aQueue - bQueue;
  }) : [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo, InkLine Name, and Notification */}
            <div className="flex items-center space-x-3">
              <Printer className="w-8 h-8 text-white" />
              <h2 className="text-lg font-semibold text-white">
                InkLine (DVC)
              </h2>
            <button
              onClick={() => showNotifications ? handleCloseNotifications() : handleOpenNotifications()}
              className="relative p-2 text-white hover:text-white hover:bg-white/20 rounded-lg transition-all"
            >
              <Bell className="w-6 h-6" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
            </div>

            {/* Center: Portal Name */}
            <div className="flex-1 flex justify-center">
              <h1 className="text-xl font-bold text-white">{shop} Shop Admin Portal</h1>
            </div>

            {/* Right: Logout */}
            <div className="flex items-center">
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 rounded-lg transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Notification Overlay */}
      {showNotifications && (
        <div 
          className="notification-overlay"
          onClick={handleCloseNotifications}
        >
          <div 
            className="notification-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass-notification rounded-lg">
              <div className="notification-header">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-white">Notifications</h3>
                    <button 
                      onClick={handleCloseNotifications}
                      className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                      aria-label="Close notifications"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                </div>
              </div>
              <div className="notification-content">
                {notifications.length === 0 ? (
                  <p className="text-white/90 text-center py-4">No notifications</p>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notif) => (
                      <div
                        key={notif._id}
                        className="p-4 rounded-lg backdrop-blur-md bg-white/10 border border-white/20 shadow-lg hover:bg-white/15 transition-colors relative"
                      >
                        {!notif.read && (
                          <div className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full"></div>
                        )}
                        <p className="font-semibold text-sm text-white mb-1.5 drop-shadow-md pr-6">{notif.title}</p>
                        <p className="text-sm text-white leading-relaxed mb-2 drop-shadow-sm">{notif.message}</p>
                        <p className="text-xs text-white/80 mt-2 drop-shadow-sm">
                          {new Date(notif.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-white/20">
          <nav className="flex gap-2 pb-1 justify-center">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'text-white backdrop-blur-md bg-white/15 border border-white/20 rounded-t-lg shadow-lg'
                    : 'text-white/80 hover:text-white hover:bg-white/5 border border-transparent rounded-t-lg'
                } flex items-center space-x-2 py-3 px-5 font-medium text-sm transition-all flex-shrink-0`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="mt-6">
          {/* ORDERS Tab */}
          {activeTab === 'ORDERS' && (
            <div>
              <h2 className="text-2xl font-bold mb-4 text-white drop-shadow-md">Orders</h2>
              
              {/* Printer Tabs - Only show if there are multiple printers with orders */}
              {printerTabs.length > 1 && (
                <div className="mb-4 border-b border-white/20">
                  <nav className="flex gap-2 pb-1 justify-center">
                    {printerTabs.map((printerName) => (
                      <button
                        key={printerName}
                        onClick={() => setSelectedPrinterTab(printerName)}
                        className={`${
                          selectedPrinterTab === printerName
                            ? 'text-white backdrop-blur-md bg-white/15 border border-white/20 rounded-t-lg shadow-lg'
                            : 'text-white/80 hover:text-white hover:bg-white/5 border border-transparent rounded-t-lg'
                        } flex items-center space-x-2 py-2.5 px-4 font-medium text-sm transition-all flex-shrink-0`}
                      >
                        <Printer className="w-4 h-4" />
                        <span className="whitespace-nowrap">{printerName}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs glass text-white">
                          {groupedOrders[printerName]?.length || 0}
                        </span>
                      </button>
                    ))}
                  </nav>
                </div>
              )}

              {/* Orders Table */}
              {printerTabs.length === 0 ? (
                <div className="text-center py-12 glass-card rounded-lg">
                  <FileText className="w-12 h-12 text-white/60 mx-auto mb-4" />
                  <p className="text-white/90">No orders</p>
                </div>
              ) : (
                <div className="glass-table rounded-lg overflow-hidden">
                  {selectedPrinterTab && (
                    <div className="px-6 py-4 border-b border-white/20 glass">
                      <h3 className="text-lg font-semibold text-white">{selectedPrinterTab}</h3>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/20">
                      <thead className="glass">
                        <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Order #</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Queue Position</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">File</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Details</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {selectedPrinterOrders.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-6 py-12 text-center text-white/90">
                            No orders for this printer
                          </td>
                        </tr>
                      ) : (
                        selectedPrinterOrders.map((order) => (
                          <tr key={order._id} className="hover:bg-white/10 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-semibold text-white">#{order.orderNumber}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {order.queuePosition > 0 && order.status === 'In Queue' ? (
                                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-400/30 backdrop-blur-sm border border-green-300/40 text-white">
                                    #{order.queuePosition}
                                  </span>
                                ) : (
                                  <span className="text-sm text-white/60">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-white">{order.userId?.fullName || 'N/A'}</div>
                                <div className="text-sm text-white/80">{order.userId?.email || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-white">{order.fileName}</div>
                                <button
                                  onClick={() => handleDownloadFile(order.filePath, order.fileName)}
                                  className="inline-flex items-center space-x-2 text-blue-300 hover:text-blue-200 text-sm font-medium mt-2 px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 backdrop-blur-sm border border-blue-400/30 transition-all cursor-pointer"
                                >
                                  <Download className="w-4 h-4" />
                                  <span>Download</span>
                                </button>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-white">
                                  <div>{order.paperSize} • {order.orientation}</div>
                                  <div className="text-white/80">{order.colorType} • {order.copies} copies</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex flex-col space-y-2">
                                  <select
                                    value={order.status}
                                    onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)}
                                    className="glass-input border border-white/20 rounded-lg px-3 py-2 text-sm text-white backdrop-blur-md bg-white/10 hover:bg-white/15 focus:bg-white/15 transition-colors cursor-pointer"
                                  >
                                    <option value="In Queue" className="bg-gray-900 text-white">In Queue</option>
                                    <option value="Printing" className="bg-gray-900 text-white">Printing</option>
                                    {shop === 'IT' ? (
                                      <option value="Ready for Pickup" className="bg-gray-900 text-white">Ready for Pickup</option>
                                    ) : (
                                      <option value="Ready for Pickup & Payment" className="bg-gray-900 text-white">Ready for Pickup & Payment</option>
                                    )}
                                  </select>
                                  {(order.status === 'Ready for Pickup' || order.status === 'Ready for Pickup & Payment') && (
                                    <button
                                      onClick={() => handleUpdateOrderStatus(order._id, 'Completed')}
                                      className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                      <span>ORDER COMPLETED</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* COMPLETED Tab */}
          {activeTab === 'COMPLETED' && (
            <div>
              <h2 className="text-2xl font-bold mb-4 text-white drop-shadow-md">Completed Orders</h2>
              {orders.length === 0 ? (
                <div className="text-center py-12 glass-card rounded-lg">
                  <CheckCircle className="w-12 h-12 text-white/60 mx-auto mb-4" />
                  <p className="text-white/90">No completed orders</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order._id} className="glass-card rounded-lg p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-lg font-semibold text-white">Order #{order.orderNumber}</span>
                          <p className="text-sm text-white/90 mt-1">
                            User: {order.userId?.fullName || 'N/A'} ({order.userId?.email || 'N/A'})
                          </p>
                          <p className="text-sm text-white/90">{order.fileName}</p>
                          <div className="flex items-center space-x-4 text-sm text-white/80 mt-2">
                            <span>{order.paperSize}</span>
                            <span>•</span>
                            <span>{order.orientation}</span>
                            <span>•</span>
                            <span>{order.colorType}</span>
                            <span>•</span>
                            <span>{order.copies} copies</span>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-300/80 text-green-900">
                          Completed
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CANCELLED Tab */}
          {activeTab === 'CANCELLED' && (
            <div>
              <h2 className="text-2xl font-bold mb-4 text-white drop-shadow-md">Cancelled Orders</h2>
              {orders.length === 0 ? (
                <div className="text-center py-12 glass-card rounded-lg">
                  <XCircle className="w-12 h-12 text-white/60 mx-auto mb-4" />
                  <p className="text-white/90">No cancelled orders</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order._id} className="glass-card rounded-lg p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-lg font-semibold text-white">Order #{order.orderNumber}</span>
                          <p className="text-sm text-white/90 mt-1">
                            User: {order.userId?.fullName || 'N/A'} ({order.userId?.email || 'N/A'})
                          </p>
                          <p className="text-sm text-white/90">{order.fileName}</p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-300/80 text-red-900">
                          Cancelled
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* APPROVE ACCOUNTS Tab (IT Admin only) */}
          {activeTab === 'APPROVE ACCOUNTS' && isITAdmin && (
            <div>
              <h2 className="text-2xl font-bold mb-4 text-white drop-shadow-md">Pending Account Approvals</h2>
              {pendingAccounts.length === 0 ? (
                <div className="text-center py-12 glass-card rounded-lg">
                  <Users className="w-12 h-12 text-white/60 mx-auto mb-4" />
                  <p className="text-white/90">No pending accounts</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingAccounts.map((account) => (
                    <div key={account._id} className="glass-card rounded-lg p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white">{account.fullName}</h3>
                          <p className="text-sm text-white/90 mt-1">{account.email}</p>
                          {account.idImage && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-white mb-2">DVC School ID:</p>
                              <img
                                src={account.idImage}
                                alt="ID"
                                className="max-w-md rounded-lg border border-white/30"
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleApproveAccount(account._id)}
                            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                          >
                            <CheckCircle className="w-5 h-5" />
                            <span>APPROVE</span>
                          </button>
                          <button
                            onClick={() => handleDeclineAccount(account._id)}
                            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                          >
                            <XCircle className="w-5 h-5" />
                            <span>DECLINE</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STUDENT USERS Tab */}
          {activeTab === 'STUDENT USERS' && (
            <div>
              <h2 className="text-2xl font-bold mb-4 text-white drop-shadow-md">Student Users</h2>
              {users.length === 0 ? (
                <div className="text-center py-12 glass-card rounded-lg">
                  <Users className="w-12 h-12 text-white/60 mx-auto mb-4" />
                  <p className="text-white/90">No users</p>
                </div>
              ) : (
                <div className="glass-table rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-white/20">
                    <thead className="glass">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {users.map((u) => (
                        <tr key={u._id} className="hover:bg-white/10 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{u.fullName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white/90">{u.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              u.bannedFrom.includes(shop) ? 'bg-red-300/80 text-red-900' : 'bg-green-300/80 text-green-900'
                            }`}>
                              {u.bannedFrom.includes(shop) ? 'Banned' : 'Active'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center space-x-2">
                              {u.bannedFrom.includes(shop) ? (
                                <button
                                  onClick={() => handleUnbanUser(u._id)}
                                  className="flex items-center space-x-2 bg-green-600/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all font-semibold text-sm shadow-lg hover:shadow-xl"
                                >
                                  <Unlock className="w-5 h-5" />
                                  <span>LIFT THE BAN</span>
                                </button>
                              ) : (
                                <>
                                  {u.hasActiveOrders ? (
                                    <button
                                      onClick={() => handleSendViolation(u._id)}
                                      className="flex items-center space-x-2 bg-orange-600/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-all font-semibold text-sm shadow-lg hover:shadow-xl"
                                    >
                                      <AlertTriangle className="w-5 h-5" />
                                      <span>SEND VIOLATION WARNING</span>
                                    </button>
                                  ) : (
                                    <button
                                      disabled
                                      className="flex items-center space-x-2 bg-gray-500/50 backdrop-blur-sm text-white/50 px-4 py-2 rounded-lg cursor-not-allowed font-semibold text-sm"
                                      title="Student must have active orders to send violation warning"
                                    >
                                      <AlertTriangle className="w-5 h-5" />
                                      <span>SEND VIOLATION WARNING</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleBanUser(u._id)}
                                    className="flex items-center space-x-2 bg-red-600/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all font-semibold text-sm shadow-lg hover:shadow-xl"
                                  >
                                    <Ban className="w-5 h-5" />
                                    <span>BAN USER</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* PRINTERS Tab */}
          {activeTab === 'PRINTERS' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white drop-shadow-md">Printers</h2>
                <button
                  onClick={() => setShowCreatePrinter(true)}
                  className="glass-button flex items-center space-x-2 text-white px-4 py-2 rounded-lg"
                >
                  <Plus className="w-5 h-5" />
                  <span>Create New Printer</span>
                </button>
              </div>

              {printers.length === 0 ? (
                <div className="text-center py-12 glass-card rounded-lg">
                  <Printer className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-700">No printers</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {printers.map((printer) => (
                    <div key={printer._id} className="glass-card rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-white">{printer.name}</h3>
                          <div className="mt-2 flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-white/90">Queue:</span>
                              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-300/80 text-blue-900">
                                {printer.queueCount || 0}
                              </span>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              printer.status === 'Active'
                                ? 'bg-green-300/80 text-green-900'
                                : printer.status === 'Offline'
                                ? 'bg-gray-300/80 text-gray-900'
                                : 'bg-red-300/80 text-red-900'
                            }`}>
                              {printer.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleUpdatePrinter(printer._id, { status: 'Active' })}
                              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                printer.status === 'Active'
                                  ? 'bg-green-600 text-white'
                                  : 'glass text-white/80 hover:bg-white/20'
                              }`}
                            >
                              ACTIVE
                            </button>
                            <button
                              onClick={() => handleUpdatePrinter(printer._id, { status: 'Offline' })}
                              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                printer.status === 'Offline'
                                  ? 'bg-gray-600 text-white'
                                  : 'glass text-white/80 hover:bg-white/20'
                              }`}
                            >
                              OFFLINE
                            </button>
                            <button
                              onClick={() => handleUpdatePrinter(printer._id, { status: 'No Ink/Paper' })}
                              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                printer.status === 'No Ink/Paper'
                                  ? 'bg-red-600 text-white'
                                  : 'glass text-white/80 hover:bg-white/20'
                              }`}
                            >
                              NO INK/PAPER
                            </button>
                          </div>
                          <button
                            onClick={() => handleDeletePrinter(printer._id, printer.name)}
                            className="flex items-center space-x-1 px-4 py-2 rounded-lg text-sm font-medium bg-red-600/80 text-white hover:bg-red-700 transition-colors"
                            title="Delete Printer"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>DELETE PRINTER</span>
                          </button>
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-sm font-medium text-white mb-2">Available Paper Sizes:</p>
                        <div className="flex flex-wrap gap-2">
                          {printer.availablePaperSizes.map((ps, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                const updated = printer.availablePaperSizes.map((p, i) =>
                                  i === idx ? { ...p, enabled: !p.enabled } : p
                                );
                                handleUpdatePrinter(printer._id, { availablePaperSizes: updated });
                              }}
                              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                ps.enabled
                                  ? 'bg-blue-600 text-white'
                                  : 'glass text-white/80 hover:bg-white/20'
                              }`}
                            >
                              {ps.size} {ps.enabled ? 'ON' : 'OFF'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* USER VIOLATIONS Tab */}
          {activeTab === 'USER VIOLATIONS' && (
            <div>
              <h2 className="text-2xl font-bold mb-4 text-white drop-shadow-md">User Violations</h2>
              {violations.length === 0 ? (
                <div className="text-center py-12 glass-card rounded-lg">
                  <AlertTriangle className="w-12 h-12 text-white/60 mx-auto mb-4" />
                  <p className="text-white/90">No violations</p>
                </div>
              ) : (
                <div className="glass-table rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-white/20">
                    <thead className="glass">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Reason</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {violations.map((violation) => (
                        <tr key={violation._id} className="hover:bg-white/10 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                            {violation.userId?.fullName || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white/90">
                            {violation.userId?.email || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-white">
                            {violation.reason || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white/90">
                            {new Date(violation.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              violation.resolved 
                                ? 'bg-green-300/80 text-green-900' 
                                : 'bg-orange-300/80 text-orange-900'
                            }`}>
                              {violation.resolved ? 'Resolved' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleSettleViolation(violation._id)}
                                className="flex items-center space-x-1 bg-green-600/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>ALREADY SETTLED</span>
                              </button>
                              {violation.userId && (
                                <button
                                  onClick={() => handleSendViolationFollowup(violation.userId._id)}
                                  className="flex items-center space-x-1 bg-orange-600/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                  <span>SEND VIOLATION WARNING</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Printer Modal */}
      {showCreatePrinter && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
          onClick={() => {
            setShowCreatePrinter(false);
            setPrinterForm({ name: '', availablePaperSizes: ['A4', 'Letter', 'Legal'] });
          }}
        >
          <div 
            className="glass-card rounded-2xl max-w-md w-full p-6 shadow-2xl animate-slideDown"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white drop-shadow-md">Create New Printer</h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreatePrinter(false);
                  setPrinterForm({ name: '', availablePaperSizes: ['A4', 'Letter', 'Legal'] });
                }}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <form onSubmit={handleCreatePrinter} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2 drop-shadow-sm">Printer Name</label>
                <input
                  type="text"
                  value={printerForm.name}
                  onChange={(e) => setPrinterForm({ ...printerForm, name: e.target.value })}
                  required
                  className="glass-input w-full border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/50 backdrop-blur-md bg-white/10 focus:bg-white/15 transition-colors"
                  placeholder="Enter printer name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-3 drop-shadow-sm">Available Paper Sizes</label>
                <div className="space-y-3">
                  {['A4', 'Letter', 'Legal', 'Long'].map((size) => (
                    <label key={size} className="flex items-center space-x-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={printerForm.availablePaperSizes.includes(size)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPrinterForm({
                              ...printerForm,
                              availablePaperSizes: [...printerForm.availablePaperSizes, size],
                            });
                          } else {
                            setPrinterForm({
                              ...printerForm,
                              availablePaperSizes: printerForm.availablePaperSizes.filter(s => s !== size),
                            });
                          }
                        }}
                        className="custom-checkbox"
                      />
                      <span className="text-white drop-shadow-sm group-hover:text-white/90 transition-colors">{size}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex space-x-4 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="glass-button flex-1 text-white py-2.5 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? 'Creating...' : 'Create Printer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreatePrinter(false);
                    setPrinterForm({ name: '', availablePaperSizes: ['A4', 'Letter', 'Legal'] });
                  }}
                  className="glass flex-1 text-white/90 py-2.5 rounded-lg font-semibold hover:bg-white/20 hover:text-white border border-white/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
