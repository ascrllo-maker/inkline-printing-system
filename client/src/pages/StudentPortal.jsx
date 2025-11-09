import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { printerAPI, orderAPI, notificationAPI } from '../services/api';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { Printer, Bell, ArrowLeft, LogOut, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StudentPortal() {
  const { user, logout, refreshUser, loading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState('homepage'); // 'homepage' or 'shop'
  const [selectedShop, setSelectedShop] = useState(null); // 'IT' or 'SSC'
  const [printers, setPrinters] = useState([]);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeOrderTab, setActiveOrderTab] = useState('WAITING');
  const [loading, setLoading] = useState(false);

  const [orderForm, setOrderForm] = useState({
    printerId: '',
    shop: '',
    paperSize: 'A4',
    orientation: 'Portrait',
    colorType: 'Black and White',
    copies: 1,
    file: null,
  });

  const isBSITStudent = user?.isBSIT && user?.accountStatus === 'approved';
  // Safely check bannedFrom - handle both array and undefined/null cases
  const bannedFrom = user?.bannedFrom || [];
  const isBannedFromIT = Array.isArray(bannedFrom) && bannedFrom.includes('IT');
  const isBannedFromSSC = Array.isArray(bannedFrom) && bannedFrom.includes('SSC');

  useEffect(() => {
    // Defer notification loading to not block initial render
    const notificationTimer = setTimeout(() => {
      loadNotifications();
    }, 500); // Load after 500ms delay
    
    if (currentView === 'shop' && selectedShop) {
      try {
        loadShopData();
      } catch (error) {
        console.error('Error loading shop data:', error);
        toast.error('Failed to load shop data');
      }
    }
    
    return () => {
      clearTimeout(notificationTimer);
    };
  }, [currentView, selectedShop]);

  // Socket.IO setup for real-time updates
  useEffect(() => {
    if (!user) return;

    const socket = connectSocket(user.id);
    
    // Join user's personal room
    socket.emit('join_user_room', user.id);

    // Listen for printer updates
    socket.on('printer_updated', (printer) => {
      try {
        // Validate printer data structure
        if (!printer || !printer._id || !printer.shop) {
          console.warn('Invalid printer data received:', printer);
          return;
        }

        // Normalize printer data (same as API response)
        const normalizePrinter = (p) => {
          try {
            let plainPrinter;
            try {
              plainPrinter = p.toObject ? p.toObject() : { ...p };
            } catch {
              plainPrinter = {
                _id: p._id,
                name: p.name,
                shop: p.shop,
                status: p.status,
                availablePaperSizes: p.availablePaperSizes,
                queueCount: p.queueCount || 0,
                createdAt: p.createdAt
              };
            }
            
            // Normalize paper sizes
            if (!plainPrinter.availablePaperSizes || !Array.isArray(plainPrinter.availablePaperSizes)) {
              plainPrinter.availablePaperSizes = [];
            } else {
              plainPrinter.availablePaperSizes = plainPrinter.availablePaperSizes.map(ps => ({
                size: String(ps?.size || '').trim(),
                enabled: ps?.enabled !== false
              })).filter(ps => ps.size.length > 0);
            }
            
            plainPrinter.queueCount = plainPrinter.queueCount || 0;
            return plainPrinter;
          } catch (error) {
            console.error('Error normalizing printer from socket:', error);
            return p;
          }
        };

        const normalizedPrinter = normalizePrinter(printer);

        if (normalizedPrinter.shop === selectedShop) {
          setPrinters(prev => {
            const exists = prev.find(p => {
              const pId = String(p._id || '');
              const nId = String(normalizedPrinter._id || '');
              return pId === nId;
            });
            if (exists) {
              // Update existing printer
              return prev.map(p => {
                const pId = String(p._id || '');
                const nId = String(normalizedPrinter._id || '');
                return pId === nId ? normalizedPrinter : p;
              });
            } else {
              // Add printer if it doesn't exist (race condition fix)
              console.log('Adding new printer from socket update:', normalizedPrinter.name);
              return [...prev, normalizedPrinter];
            }
          });
          
          // Update selected printer if it's the one being updated
          setSelectedPrinter(prev => {
            if (prev) {
              const prevId = String(prev._id || '');
              const newId = String(normalizedPrinter._id || '');
              if (prevId === newId) {
                // If the current paper size is no longer available, reset to first available
                const availableSizes = normalizedPrinter.availablePaperSizes.filter(ps => ps && ps.enabled);
                if (availableSizes.length > 0) {
                  setOrderForm(currentForm => {
                    const currentSize = currentForm.paperSize;
                    const isCurrentSizeAvailable = availableSizes.some(ps => {
                      const psSize = String(ps.size || '').trim().toLowerCase();
                      const currSize = String(currentSize || '').trim().toLowerCase();
                      return psSize === currSize;
                    });
                    if (!isCurrentSizeAvailable) {
                      toast(`Paper size ${currentSize} is no longer available. Changed to ${availableSizes[0].size}`, {
                        icon: 'ℹ️',
                        duration: 3000
                      });
                      return {
                        ...currentForm,
                        paperSize: availableSizes[0].size
                      };
                    }
                    return currentForm;
                  });
                }
                return normalizedPrinter;
              }
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Error handling printer_updated socket event:', error);
      }
    });

    socket.on('printer_created', (printer) => {
      try {
        // Validate printer data structure
        if (!printer || !printer._id || !printer.shop) {
          console.warn('Invalid printer data received:', printer);
          return;
        }

        // Normalize printer data (same as API response)
        const normalizePrinter = (p) => {
          try {
            let plainPrinter;
            try {
              plainPrinter = p.toObject ? p.toObject() : { ...p };
            } catch {
              plainPrinter = {
                _id: p._id,
                name: p.name,
                shop: p.shop,
                status: p.status,
                availablePaperSizes: p.availablePaperSizes,
                queueCount: p.queueCount || 0,
                createdAt: p.createdAt
              };
            }
            
            // Normalize paper sizes
            if (!plainPrinter.availablePaperSizes || !Array.isArray(plainPrinter.availablePaperSizes)) {
              plainPrinter.availablePaperSizes = [];
            } else {
              plainPrinter.availablePaperSizes = plainPrinter.availablePaperSizes.map(ps => ({
                size: String(ps?.size || '').trim(),
                enabled: ps?.enabled !== false
              })).filter(ps => ps.size.length > 0);
            }
            
            plainPrinter.queueCount = plainPrinter.queueCount || 0;
            return plainPrinter;
          } catch (error) {
            console.error('Error normalizing printer from socket:', error);
            return p;
          }
        };

        const normalizedPrinter = normalizePrinter(printer);

        if (normalizedPrinter.shop === selectedShop) {
          setPrinters(prev => {
            const exists = prev.find(p => {
              const pId = String(p._id || '');
              const nId = String(normalizedPrinter._id || '');
              return pId === nId;
            });
            if (!exists) {
              console.log('Adding new printer from socket:', normalizedPrinter.name);
              return [...prev, normalizedPrinter];
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Error handling printer_created socket event:', error);
      }
    });

    socket.on('printer_deleted', ({ id }) => {
      setPrinters(prev => prev.filter(p => p._id !== id));
    });

    // Listen for order updates
    socket.on('order_updated', async (order) => {
      setOrders(prev => prev.map(o => o._id === order._id ? order : o));
      loadNotifications();
      // Reload orders to get updated queue positions
      try {
        const res = await orderAPI.getMyOrders();
        setOrders(res.data);
      } catch (error) {
        // Silent fail
      }
    });

    socket.on('order_created', async (order) => {
      // Only add if it's for the current shop
      if (order.shop === selectedShop) {
        setOrders(prev => {
          // Check if order already exists
          const exists = prev.find(o => o._id === order._id);
          if (!exists) {
            return [order, ...prev];
          }
          return prev;
        });
        loadNotifications();
        // Reload orders to get updated queue positions
        try {
          const res = await orderAPI.getMyOrders();
          setOrders(res.data.filter(o => o.shop === selectedShop));
        } catch (error) {
          // Silent fail
        }
      }
    });

    socket.on('order_cancelled', async (order) => {
      setOrders(prev => prev.map(o => o._id === order._id ? order : o));
      loadNotifications();
      // Reload orders to get updated queue positions
      try {
        const res = await orderAPI.getMyOrders();
        setOrders(res.data);
      } catch (error) {
        // Silent fail
      }
    });

    // Listen for queue position updates
    socket.on('order_queue_updated', ({ orderId, queuePosition }) => {
      setOrders(prev => prev.map(o => 
        o._id === orderId ? { ...o, queuePosition } : o
      ));
    });

    // Listen for violation warnings
    socket.on('violation_warning', () => {
      loadNotifications();
    });

    // Listen for violation settled
    socket.on('violation_settled', () => {
      loadNotifications();
      toast.success('Your violation has been settled!');
    });

    // Listen for account approval
    socket.on('account_approved', () => {
      loadNotifications();
      // Reload user data to update account status
      window.location.reload();
    });

      // Listen for user ban/unban
      socket.on('user_banned', ({ shop: bannedShop }) => {
        toast.error(`You have been banned from ${bannedShop} Printing Shop`);
        // If currently viewing the banned shop, redirect to homepage
        if (bannedShop === selectedShop) {
          setCurrentView('homepage');
          setSelectedShop(null);
          setSelectedPrinter(null);
        }
        // Refresh user data to update bannedFrom status
        refreshUser();
        // Reload notifications to show the ban notification
        loadNotifications();
      });

      socket.on('user_unbanned', async ({ shop: unbannedShop }) => {
        toast.success(`Your ban from ${unbannedShop} Printing Shop has been lifted`);
        // Refresh user data to update bannedFrom status
        await refreshUser();
        // Reload notifications to show the unban notification
        loadNotifications();
      });

      // Listen for notification events
      socket.on('notification', () => {
        loadNotifications();
      });

      return () => {
        socket.off('printer_updated');
        socket.off('printer_created');
        socket.off('printer_deleted');
        socket.off('order_updated');
        socket.off('order_created');
        socket.off('order_cancelled');
        socket.off('order_queue_updated');
        socket.off('violation_warning');
        socket.off('violation_settled');
        socket.off('account_approved');
        socket.off('user_banned');
        socket.off('user_unbanned');
        socket.off('notification');
      };
  }, [user, selectedShop]);

  const loadShopData = async () => {
    if (!selectedShop) {
      console.warn('loadShopData called without selectedShop');
      return;
    }
    try {
      setLoading(true);
      console.log('Loading shop data for:', selectedShop);
      
      const [printersRes, ordersRes] = await Promise.all([
        printerAPI.getPrinters(selectedShop),
        orderAPI.getMyOrders(),
      ]);
      
      // Validate and normalize printer data - convert to plain objects
      const printers = (printersRes.data || []).map(printer => {
        try {
          // Convert to plain object if it's a Mongoose document or has getters
          let plainPrinter;
          try {
            // Try to convert if it has toObject method (Mongoose document)
            plainPrinter = printer.toObject ? printer.toObject() : { ...printer };
          } catch {
            // Fallback: manually extract properties
            plainPrinter = {
              _id: printer._id,
              name: printer.name,
              shop: printer.shop,
              status: printer.status,
              availablePaperSizes: printer.availablePaperSizes,
              queueCount: printer.queueCount || 0,
              createdAt: printer.createdAt
            };
          }
          
          // Ensure all required fields exist
          if (!plainPrinter.availablePaperSizes || !Array.isArray(plainPrinter.availablePaperSizes)) {
            console.warn('Printer missing availablePaperSizes:', plainPrinter.name);
            plainPrinter.availablePaperSizes = [];
          }
          
          // Normalize paper sizes
          plainPrinter.availablePaperSizes = plainPrinter.availablePaperSizes.map(ps => ({
            size: String(ps?.size || '').trim(),
            enabled: ps?.enabled !== false
          })).filter(ps => ps.size.length > 0);
          
          plainPrinter.queueCount = plainPrinter.queueCount || 0;
          
          return plainPrinter;
        } catch (error) {
          console.error('Error normalizing printer:', error, printer);
          // Return a minimal valid printer object
          return {
            _id: printer?._id || 'unknown',
            name: printer?.name || 'Unknown Printer',
            shop: printer?.shop || selectedShop,
            status: printer?.status || 'Offline',
            availablePaperSizes: [],
            queueCount: 0
          };
        }
      });
      
      console.log('Loaded printers:', printers.length, printers.map(p => ({ name: p.name, status: p.status, id: p._id })));
      
      setPrinters(printers);
      setOrders((ordersRes.data || []).filter(o => o.shop === selectedShop));
    } catch (error) {
      console.error('Error loading shop data:', error);
      toast.error('Failed to load shop data');
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await notificationAPI.getNotifications();
      setNotifications(res.data);
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
    // Check if there are unread notifications
    const hasUnread = notifications.some(n => !n.read);
    
    if (hasUnread) {
      // Update notifications state to mark all as read
      // This will cause unreadCount to become 0 on next render
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
    
    // Close notification center (always close, regardless of unread status)
    setShowNotifications(false);
    
    // Mark as read on server in background (if there were unread notifications)
    if (hasUnread) {
      notificationAPI.markAllRead().catch(error => {
        console.error('Failed to mark notifications as read:', error);
        // On error, reload notifications to sync with server
        loadNotifications();
      });
    }
  };

  const handleShopClick = (shop) => {
    // Check if user is banned from this shop
    if (shop === 'IT' && isBannedFromIT) {
      toast.error('You are banned from IT Printing Shop');
      return;
    }
    if (shop === 'SSC' && isBannedFromSSC) {
      toast.error('You are banned from SSC Printing Shop');
      return;
    }

    // Set all state together - React will batch these updates
    setSelectedShop(shop);
    setCurrentView('shop');
    setSelectedPrinter(null);
    setOrderForm({
      printerId: '',
      shop: shop,
      paperSize: 'A4',
      orientation: 'Portrait',
      colorType: 'Black and White',
      copies: 1,
      file: null,
    });
  };

  const handlePrinterClick = (printer, event) => {
    // Prevent event bubbling
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    try {
      console.log('=== PRINTER CLICK DEBUG ===');
      console.log('Printer clicked:', printer?.name);
      console.log('Printer ID:', printer?._id);
      console.log('Printer status:', printer?.status);
      
      // Safely stringify printer data (handle circular references)
      try {
        const printerData = {
          _id: printer?._id,
          name: printer?.name,
          status: printer?.status,
          shop: printer?.shop,
          availablePaperSizes: printer?.availablePaperSizes,
          queueCount: printer?.queueCount
        };
        console.log('Printer data:', JSON.stringify(printerData, null, 2));
      } catch (stringifyError) {
        console.log('Printer data (safe view):', {
          _id: printer?._id,
          name: printer?.name,
          status: printer?.status,
          shop: printer?.shop,
          paperSizesCount: printer?.availablePaperSizes?.length || 0
        });
      }
      
      if (!printer) {
        console.error('❌ Printer is null or undefined');
        toast.error('Invalid printer data');
        return;
      }

      if (!printer._id) {
        console.error('❌ Printer missing _id');
        console.error('Printer keys:', Object.keys(printer || {}));
        toast.error('Invalid printer data: missing ID');
        return;
      }

      if (printer.status !== 'Active') {
        console.warn('⚠️ Printer not active:', printer.status);
        toast.error(`This printer is not available (Status: ${printer.status})`);
        return;
      }
      
      // Safely get available paper sizes for this printer
      // Handle cases where availablePaperSizes might be undefined, null, or not an array
      let paperSizes = [];
      try {
        paperSizes = printer.availablePaperSizes || [];
        if (!Array.isArray(paperSizes)) {
          console.warn('⚠️ availablePaperSizes is not an array:', typeof paperSizes, paperSizes);
          paperSizes = [];
        }
      } catch (paperSizeError) {
        console.error('❌ Error accessing availablePaperSizes:', paperSizeError);
        paperSizes = [];
      }
      
      const availableSizes = paperSizes
        .filter(ps => {
          try {
            return ps && ps.enabled !== false && ps.size && typeof ps.size === 'string';
          } catch {
            return false;
          }
        })
        .map(ps => ({
          size: String(ps.size).trim(),
          enabled: ps.enabled !== false
        }));
      
      console.log('Available paper sizes:', availableSizes.map(ps => ps.size));
      console.log('Paper sizes array length:', paperSizes.length);
      
      if (availableSizes.length === 0) {
        console.error('❌ Printer has no available paper sizes');
        console.error('Printer name:', printer.name);
        console.error('Printer ID:', printer._id);
        console.error('Paper sizes raw:', paperSizes);
        toast.error('This printer has no available paper sizes. Please contact the administrator.');
        return;
      }
      
      // Check if current paper size is available for this printer
      const currentSize = (orderForm.paperSize || 'A4').trim();
      const isCurrentSizeAvailable = availableSizes.some(ps => {
        try {
          const psSize = String(ps.size || '').trim().toLowerCase();
          const currSize = String(currentSize || '').trim().toLowerCase();
          return psSize === currSize && psSize.length > 0;
        } catch {
          return false;
        }
      });
      
      // If current paper size is not available, use the first available size
      const paperSizeToUse = isCurrentSizeAvailable && currentSize
        ? currentSize 
        : (availableSizes[0]?.size || 'A4');
      
      console.log('Paper size selection:');
      console.log('  Current:', currentSize);
      console.log('  Available:', isCurrentSizeAvailable);
      console.log('  Selected:', paperSizeToUse);
      
      // Show info message if paper size was changed
      if (!isCurrentSizeAvailable && currentSize && paperSizeToUse !== currentSize) {
        toast(`Paper size set to ${paperSizeToUse} (${currentSize} not available for this printer)`, {
          icon: 'ℹ️',
          duration: 3000
        });
      }
      
      // Ensure we have a valid printer ID
      let printerId;
      try {
        if (printer._id) {
          if (typeof printer._id === 'string') {
            printerId = printer._id;
          } else if (printer._id.toString) {
            printerId = printer._id.toString();
          } else if (printer._id._id) {
            // Handle nested _id (sometimes MongoDB returns this)
            printerId = String(printer._id._id);
          } else {
            printerId = String(printer._id);
          }
        } else {
          console.error('❌ Printer _id is missing or falsy');
          toast.error('Invalid printer ID. Please try again.');
          return;
        }
      } catch (idError) {
        console.error('❌ Error converting printer ID:', idError);
        toast.error('Invalid printer ID. Please try again.');
        return;
      }
      
      if (!printerId || printerId === 'undefined' || printerId === 'null') {
        console.error('❌ Invalid printer ID after conversion:', printerId);
        console.error('Original _id:', printer._id);
        console.error('Printer:', printer);
        toast.error('Invalid printer ID. Please try again.');
        return;
      }
      
      // Create a clean printer object for state (avoid circular references)
      const cleanPrinter = {
        _id: printerId,
        name: String(printer.name || ''),
        status: String(printer.status || ''),
        shop: String(printer.shop || ''),
        availablePaperSizes: availableSizes,
        queueCount: Number(printer.queueCount || 0)
      };
      
      setSelectedPrinter(cleanPrinter);
      setOrderForm(prevForm => ({
        ...prevForm,
        printerId: printerId,
        paperSize: paperSizeToUse,
      }));
      
      console.log('✅ Printer selected successfully:', printer.name);
      console.log('=== END PRINTER CLICK DEBUG ===');
    } catch (error) {
      console.error('❌ Error selecting printer:', error);
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      console.error('Printer name:', printer?.name);
      console.error('Printer ID:', printer?._id);
      console.error('Printer type:', typeof printer);
      console.error('Printer keys:', printer ? Object.keys(printer) : 'N/A');
      
      // More specific error message
      if (error?.message) {
        toast.error(`Failed to select printer: ${error.message}`);
      } else {
        toast.error('Failed to select printer. Please try again.');
      }
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!orderForm.file) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);
    try {
      const response = await orderAPI.createOrder(orderForm);
      // Order will be added via socket event, so we don't need to reload
      toast.success('Order created successfully!');
      setSelectedPrinter(null);
      setOrderForm({
        printerId: '',
        shop: selectedShop,
        paperSize: 'A4',
        orientation: 'Portrait',
        colorType: 'Black and White',
        copies: 1,
        file: null,
      });
      // Update printers to reflect new queue count
      try {
        const printersRes = await printerAPI.getPrinters(selectedShop);
        setPrinters(printersRes.data || []);
      } catch (error) {
        // Silent fail - socket will update it
      }
    } catch (error) {
      console.error('Order creation error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create order';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await orderAPI.cancelOrder(orderId);
      toast.success('Order cancelled');
      loadShopData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
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

  const getFilteredOrders = () => {
    if (!selectedShop) return [];
    const shopOrders = orders.filter(o => o.shop === selectedShop);
    
    if (activeOrderTab === 'WAITING') {
      return shopOrders.filter(o => ['In Queue', 'Printing', 'Ready for Pickup', 'Ready for Pickup & Payment'].includes(o.status));
    } else if (activeOrderTab === 'COMPLETED') {
      return shopOrders.filter(o => o.status === 'Completed');
    } else if (activeOrderTab === 'CANCELLED') {
      return shopOrders.filter(o => o.status === 'Cancelled');
    }
    return shopOrders;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Debug logging
  useEffect(() => {
    console.log('StudentPortal state:', { currentView, selectedShop, isBannedFromIT, isBannedFromSSC, user: user?.email });
  }, [currentView, selectedShop, isBannedFromIT, isBannedFromSSC, user]);

  // Shop View - Check if user is banned from this shop
  useEffect(() => {
    if (!user || !selectedShop || currentView !== 'shop') return;
    
    if (selectedShop === 'IT' && isBannedFromIT) {
      toast.error('You are banned from IT Printing Shop');
      setCurrentView('homepage');
      setSelectedShop(null);
      setSelectedPrinter(null);
    } else if (selectedShop === 'SSC' && isBannedFromSSC) {
      toast.error('You are banned from SSC Printing Shop');
      setCurrentView('homepage');
      setSelectedShop(null);
      setSelectedPrinter(null);
    }
  }, [selectedShop, isBannedFromIT, isBannedFromSSC, user, currentView]);

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // If no user, show loading (ProtectedRoute should handle redirect)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // Homepage View
  if (currentView === 'homepage') {
    return (
      <div className="min-h-screen">
        {/* Header */}
        <header className="glass-header sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Left: Logo and Name */}
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <Printer className="w-8 h-8 sm:w-10 sm:h-10 text-white flex-shrink-0" />
                <h1 className="text-sm sm:text-base md:text-xl font-bold text-white truncate">
                  <span className="hidden sm:inline">InkLine Smart Printing (DVC)</span>
                  <span className="sm:hidden">InkLine</span>
                </h1>
              </div>

              {/* Right: Notification, Hi Name, Logout */}
              <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                <button
                  onClick={() => showNotifications ? handleCloseNotifications() : handleOpenNotifications()}
                  className="relative p-2 sm:p-2.5 text-white hover:text-white hover:bg-white/20 rounded-lg touch-manipulation transition-all"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <span className="hidden sm:inline text-white text-sm md:text-base font-medium">Hi {user?.fullName}</span>
                <button
                  onClick={logout}
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-white/20 rounded-lg touch-manipulation transition-all"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
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

        {/* Main Content: Shop Buttons */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 sm:space-y-6 md:space-y-8">
            {isBSITStudent ? (
              <>
                <button
                  onClick={() => handleShopClick('IT')}
                  disabled={isBannedFromIT}
                  className={`w-full max-w-md text-white text-lg sm:text-xl md:text-2xl font-bold py-8 sm:py-10 md:py-12 px-6 sm:px-8 rounded-xl sm:rounded-2xl transition-all duration-200 touch-manipulation ${
                    isBannedFromIT
                      ? 'bg-gray-400/50 backdrop-blur-sm cursor-not-allowed opacity-60'
                      : 'glass-button active:scale-95 sm:hover:scale-105'
                  }`}
                >
                  IT Printing Shop
                  {isBannedFromIT && (
                    <span className="block text-xs sm:text-sm font-normal mt-2">(Banned)</span>
                  )}
                </button>
                <button
                  onClick={() => handleShopClick('SSC')}
                  disabled={isBannedFromSSC}
                  className={`w-full max-w-md text-white text-lg sm:text-xl md:text-2xl font-bold py-8 sm:py-10 md:py-12 px-6 sm:px-8 rounded-xl sm:rounded-2xl transition-all duration-200 touch-manipulation ${
                    isBannedFromSSC
                      ? 'bg-gray-400/50 backdrop-blur-sm cursor-not-allowed opacity-60'
                      : 'glass-button active:scale-95 sm:hover:scale-105'
                  }`}
                >
                  SSC Printing Shop
                  {isBannedFromSSC && (
                    <span className="block text-xs sm:text-sm font-normal mt-2">(Banned)</span>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={() => handleShopClick('SSC')}
                disabled={isBannedFromSSC}
                className={`w-full max-w-md text-white text-lg sm:text-xl md:text-2xl font-bold py-8 sm:py-10 md:py-12 px-6 sm:px-8 rounded-xl sm:rounded-2xl transition-all duration-200 touch-manipulation ${
                  isBannedFromSSC
                    ? 'bg-gray-400/50 backdrop-blur-sm cursor-not-allowed opacity-60'
                    : 'glass-button active:scale-95 sm:hover:scale-105'
                }`}
              >
                SSC Printing Shop
                {isBannedFromSSC && (
                  <span className="block text-xs sm:text-sm font-normal mt-2">(Banned)</span>
                )}
              </button>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Shop View
  if (currentView === 'shop') {
    // If no shop selected yet, wait for it to be set
    if (!selectedShop) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center glass-card p-6 rounded-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Loading shop...</p>
          </div>
        </div>
      );
    }
    
    // Check if banned from selected shop
    if ((selectedShop === 'IT' && isBannedFromIT) || (selectedShop === 'SSC' && isBannedFromSSC)) {
      // Banned from this shop, show redirecting message
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center glass-card p-6 rounded-xl">
            <p className="text-white text-lg">You are banned from this shop. Redirecting...</p>
          </div>
        </div>
      );
    }
    
    // Not banned, render shop view
    return (
      <div className="min-h-screen">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            {/* Left: Back Button */}
            <button
              onClick={() => {
                setCurrentView('homepage');
                setSelectedShop(null);
                setSelectedPrinter(null);
              }}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-white/20 rounded-lg touch-manipulation flex-shrink-0 transition-all"
              aria-label="Back to Homepage"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Homepage</span>
              <span className="sm:hidden">Back</span>
            </button>

            {/* Center: Logo and Name */}
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0 justify-center">
              <Printer className="w-8 h-8 sm:w-10 sm:h-10 text-white flex-shrink-0" />
              <h1 className="text-sm sm:text-base md:text-xl font-bold text-white truncate">
                <span className="hidden sm:inline">InkLine Smart Printing (DVC)</span>
                <span className="sm:hidden">InkLine</span>
              </h1>
            </div>

            {/* Right: Notification, Logout */}
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                <button
                  onClick={() => showNotifications ? handleCloseNotifications() : handleOpenNotifications()}
                  className="relative p-2 sm:p-2.5 text-white hover:text-white hover:bg-white/20 rounded-lg touch-manipulation transition-all"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
              <button
                onClick={logout}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-white/20 rounded-lg touch-manipulation transition-all"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Shop Name */}
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-white mb-4 sm:mb-6 md:mb-8 drop-shadow-lg">
          {selectedShop} Printing Shop
        </h2>

        {/* Printers Display */}
        <div className="mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-white drop-shadow-md">Available Printing Devices</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {printers.map((printer, index) => {
              // Safely get printer properties
              const printerId = printer?._id ? String(printer._id) : `printer-${index}`;
              const selectedId = selectedPrinter?._id ? String(selectedPrinter._id) : '';
              const isSelected = selectedId === printerId;
              const isActive = printer?.status === 'Active';
              
              // Validate printer has required fields
              if (!printer || !printerId || printerId === 'undefined' || printerId === 'null') {
                console.warn('Invalid printer in render:', printer, index);
                return null;
              }
              
              return (
                <div
                  key={printerId}
                  onClick={(e) => {
                    // Allow click on the entire card
                    if (isActive && printer) {
                      e.stopPropagation();
                      e.preventDefault();
                      handlePrinterClick(printer, e);
                    }
                  }}
                  className={`rounded-lg sm:rounded-xl p-4 sm:p-6 transition-all touch-manipulation relative ${
                    isActive ? 'cursor-pointer' : 'cursor-not-allowed'
                  } ${
                    isSelected
                      ? 'glass-strong border-2 sm:border-4 border-blue-400 shadow-2xl sm:scale-105 ring-2 sm:ring-4 ring-blue-300/50'
                      : isActive
                      ? 'glass-card border-2 border-transparent active:scale-[1.02] sm:hover:scale-105 sm:hover:border-blue-300/50'
                      : 'glass opacity-60 border-2 border-gray-300/30'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                    <h4 className={`text-base sm:text-lg font-semibold flex-1 min-w-0 ${isSelected ? 'text-white' : 'text-white'}`}>
                      <span className="truncate block">{printer?.name || 'Unknown Printer'}</span>
                      {isSelected && (
                        <span className="ml-0 sm:ml-2 text-blue-200 text-xs sm:text-sm block sm:inline mt-1 sm:mt-0 font-bold">✓ Selected</span>
                      )}
                    </h4>
                    <span
                      className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 pointer-events-none ${
                        printer?.status === 'Active'
                          ? 'bg-green-300/80 text-green-900'
                          : printer?.status === 'Offline'
                          ? 'bg-gray-300/80 text-gray-900'
                          : 'bg-red-300/80 text-red-900'
                      }`}
                    >
                      {printer?.status || 'Unknown'}
                    </span>
                  </div>
                  <div 
                    className={`rounded-lg p-3 sm:p-4 text-center glass pointer-events-none ${
                      isSelected ? '' : ''
                    }`}
                  >
                    <p className={`text-xs sm:text-sm mb-1 text-white/90`}>Queue</p>
                    <p className={`text-2xl sm:text-3xl font-bold text-white`}>
                      {printer?.queueCount || 0}
                    </p>
                  </div>
                </div>
              );
            }).filter(Boolean)}
          </div>
        </div>

        {/* Order Form (shown when printer is selected) */}
        {selectedPrinter && selectedPrinter.status === 'Active' && (
          <div className="glass-card rounded-lg sm:rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-white">
              <span className="hidden sm:inline">Print Order Form - {selectedPrinter.name}</span>
              <span className="sm:hidden">Order Form</span>
            </h3>
            <form onSubmit={handleCreateOrder} className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1.5 sm:mb-2">Paper Size</label>
                  <select
                    value={orderForm.paperSize}
                    onChange={(e) => setOrderForm({ ...orderForm, paperSize: e.target.value })}
                    required
                    className="glass-input w-full rounded-lg px-3 sm:px-4 py-2.5 sm:py-2 text-base touch-manipulation text-white border border-white/20 backdrop-blur-md bg-white/10 hover:bg-white/15 focus:bg-white/15 transition-colors cursor-pointer"
                  >
                    {selectedPrinter.availablePaperSizes
                      .filter(ps => ps.enabled)
                      .map((ps, idx) => (
                        <option key={idx} value={ps.size} className="bg-gray-900 text-white">{ps.size}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1.5 sm:mb-2">Orientation</label>
                  <select
                    value={orderForm.orientation}
                    onChange={(e) => setOrderForm({ ...orderForm, orientation: e.target.value })}
                    required
                    className="glass-input w-full rounded-lg px-3 sm:px-4 py-2.5 sm:py-2 text-base touch-manipulation text-white border border-white/20 backdrop-blur-md bg-white/10 hover:bg-white/15 focus:bg-white/15 transition-colors cursor-pointer"
                  >
                    <option value="Portrait" className="bg-gray-900 text-white">Portrait</option>
                    <option value="Landscape" className="bg-gray-900 text-white">Landscape</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1.5 sm:mb-2">Color Type</label>
                  <select
                    value={orderForm.colorType}
                    onChange={(e) => setOrderForm({ ...orderForm, colorType: e.target.value })}
                    required
                    className="glass-input w-full rounded-lg px-3 sm:px-4 py-2.5 sm:py-2 text-base touch-manipulation text-white border border-white/20 backdrop-blur-md bg-white/10 hover:bg-white/15 focus:bg-white/15 transition-colors cursor-pointer"
                  >
                    <option value="Black and White" className="bg-gray-900 text-white">Black and White</option>
                    <option value="Colored" className="bg-gray-900 text-white">Colored</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1.5 sm:mb-2">Number of Copies</label>
                  <input
                    type="number"
                    min="1"
                    value={orderForm.copies}
                    onChange={(e) => setOrderForm({ ...orderForm, copies: parseInt(e.target.value) })}
                    required
                    className="glass-input w-full rounded-lg px-3 sm:px-4 py-2.5 sm:py-2 text-base touch-manipulation text-white placeholder-white/50"
                    placeholder="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1.5 sm:mb-2">File</label>
                <input
                  type="file"
                  onChange={(e) => setOrderForm({ ...orderForm, file: e.target.files[0] })}
                  required
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                  className="glass-input w-full rounded-lg px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600/70 file:text-white hover:file:bg-blue-700/80 touch-manipulation"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="glass-button w-full text-white py-3 sm:py-3.5 rounded-lg font-semibold text-base sm:text-lg disabled:opacity-50 touch-manipulation"
              >
                {loading ? 'Processing...' : 'PRINT'}
              </button>
            </form>
          </div>
        )}

        {/* Order Tabs */}
        <div className="glass-card rounded-lg sm:rounded-xl">
          <div className="border-b border-white/20">
            <nav className="flex space-x-2 px-2 pt-2 pb-1 justify-center">
              {['WAITING', 'COMPLETED', 'CANCELLED'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveOrderTab(tab)}
                  className={`flex-1 py-3 sm:py-4 px-3 sm:px-6 text-center font-semibold text-xs sm:text-sm md:text-base transition-all touch-manipulation rounded-t-lg ${
                    activeOrderTab === tab
                      ? 'text-white backdrop-blur-md bg-white/15 border border-white/20 shadow-lg'
                      : 'text-white/80 active:bg-white/5 sm:hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {getFilteredOrders().length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <p className="text-white/80 text-sm sm:text-base">No {activeOrderTab.toLowerCase()} orders</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {getFilteredOrders().map((order) => (
                  <div key={order._id} className="glass rounded-lg p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-2">
                          <span className="text-base sm:text-lg font-semibold text-white">Order #{order.orderNumber}</span>
                          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                          {order.queuePosition > 0 && order.status === 'In Queue' && (
                            <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-green-400/30 backdrop-blur-sm border border-green-300/40 text-white">
                              Queue: #{order.queuePosition}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white/90 mb-1 truncate">{order.fileName}</p>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-white/80">
                          <span>{order.paperSize}</span>
                          <span>•</span>
                          <span>{order.orientation}</span>
                          <span>•</span>
                          <span>{order.colorType}</span>
                          <span>•</span>
                          <span>{order.copies} copies</span>
                        </div>
                        <p className="text-xs text-white/70 mt-2">
                          Created: {new Date(order.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {activeOrderTab === 'WAITING' && order.status !== 'Printing' && order.status !== 'Ready for Pickup' && order.status !== 'Ready for Pickup & Payment' && (
                        <button
                          onClick={() => handleCancelOrder(order._id)}
                          className="px-4 py-2.5 sm:py-2 bg-red-600/80 backdrop-blur-sm text-white rounded-lg active:bg-red-700 sm:hover:bg-red-700 text-xs sm:text-sm font-medium touch-manipulation w-full sm:w-auto transition-all shadow-lg hover:shadow-xl"
                        >
                          CANCEL ORDER
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      </div>
    );
  }

  // Default: show homepage (fallback)
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center glass-card p-6 rounded-xl">
        <p className="text-white">Loading...</p>
      </div>
    </div>
  );
}
