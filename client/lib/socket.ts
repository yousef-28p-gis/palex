import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export const initializeSocket = (token: string) => {
  if (socket?.connected) {
    console.log('🔌 WebSocket already connected');
    return socket;
  }

  socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000', {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('🔌 WebSocket connected');
    reconnectAttempts = 0;
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 WebSocket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error.message);
    reconnectAttempts++;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
    }
  });

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

export const requestSellerConfirmation = (
  offerId: string,
  amount: number,
  buyerId: string,
  buyerName: string,
): Promise<{ success: boolean; pendingId: string }> => {
  return new Promise((resolve, reject) => {
    const sock = getSocket();
    if (!sock) {
      reject(new Error('WebSocket not connected'));
      return;
    }
    sock.emit('trade:request', { offerId, amount, buyerId, buyerName }, (response: any) => {
      if (response?.success) {
        resolve(response);
      } else {
        reject(new Error(response?.message || 'فشل في طلب تأكيد البائع'));
      }
    });
  });
};

export const confirmSellerPresence = (pendingId: string, offerId: string, sellerId: string) => {
  const sock = getSocket();
  if (sock) {
    sock.emit('trade:confirm', { pendingId, offerId, sellerId });
  }
};

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
  
  events.forEach((event) => {
    sock.on(event, callback);
  });
  
  return () => {
    events.forEach((event) => {
      sock.off(event, callback);
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