'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { getSocket, initializeSocket } from '@/lib/socket';

export function usePresence() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!user?.id) return;

    // ✅ تهيئة اتصال WebSocket
    const socket = initializeSocket();

    // ✅ إرسال heartbeat فوراً عند تحميل الصفحة
    socket.emit('user:heartbeat', { userId: user.id });

    // ✅ إرسال heartbeat كل 30 ثانية
    intervalRef.current = setInterval(() => {
      if (socket.connected) {
        socket.emit('user:heartbeat', { userId: user.id });
      }
    }, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user?.id]);
}
