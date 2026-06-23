import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

export const initializeSocket = () => {
  // ✅ إذا في socket متصل — نرجعه
  if (socket?.connected) {
    return socket;
  }
  
  // ✅ إذا في socket بس مش متصل — نمسكه وننشئ جديد
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
  
  socket = io(wsUrl ? `${wsUrl}/trades` : '/trades', {
    // ✅ دالة auth تُستدعى في كل اتصال/إعادة اتصال — تقرأ التوكن الجديد من localStorage
    auth: (cb: any) => cb({ token: localStorage.getItem('accessToken') }),
    path: '/api/ws',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
  });

  socket.on('connect', () => {
    console.log('🔌 WebSocket connected');
    reconnectAttempts = 0;
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 WebSocket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.warn('🔌 WebSocket error (falling back to polling):', error.message);
    reconnectAttempts++;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      // ✅ بعد المحاولات الفاشلة — نجبر إعادة تحميل التوكن
      const token = localStorage.getItem('accessToken');
      if (token) {
        // نطلب /auth/me عشان نجبر الـ interceptor على تجديد التوكن
        fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(() => {
          reconnectAttempts = 0;
        }).catch(() => {
          reconnectAttempts = 0;
        });
      }
    }
  });

  socket.on('error', () => {});

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// ==================== أحداث WebSocket ====================

export const onTradeEvent = (callback: (data: any) => void) => {
  const sock = getSocket();
  if (!sock) {
    console.warn('WebSocket not initialized, events will not be received');
    return () => {};
  }
  
  const events = [
    'trade:pending',
    'trade:ready',
    'trade:timeout',
    'trade:deposit',
    'trade:proof',
    'trade:confirmed',
    'trade:update',
    'trade:error',
    'user:presence',
  ];
  
  // ✅ نخزّن الـ wrappers عشان نقدر نعمل off بعدين
  const wrappers = new Map<string, (data: any) => void>();
  
  events.forEach((event) => {
    const wrapper = (data: any) => {
      callback({ ...data, _eventType: event });
    };
    wrappers.set(event, wrapper);
    sock.on(event, wrapper);
  });
  
  return () => {
    events.forEach((event) => {
      const wrapper = wrappers.get(event);
      if (wrapper) {
        sock.off(event, wrapper);
      }
    });
  };
};

// ✅ إرسال نبضات القلب (heartbeat) للحفاظ على حالة النشاط
export const sendHeartbeat = (userId: string) => {
  const sock = getSocket();
  if (sock && sock.connected) {
    sock.emit('user:heartbeat', { userId });
  }
};

// ✅ الاستماع لأحداث التواجد
export const onUserPresence = (callback: (data: { userId: string; isActive: boolean }) => void) => {
  const sock = getSocket();
  if (!sock) {
    console.warn('WebSocket not initialized');
    return () => {};
  }
  
  sock.on('user:presence', callback);
  
  return () => {
    sock.off('user:presence', callback);
  };
};
