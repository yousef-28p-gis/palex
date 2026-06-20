'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { getSocket, initializeSocket } from '@/lib/socket';

export function usePresence() {
  const { user, isAuthenticated } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // تهيئة WebSocket
    const token = localStorage.getItem('accessToken');
    if (token) {
      initializeSocket(token);
    }

    const socket = getSocket();
    if (!socket) return;

    // إرسال إشارة النشاط عند الاتصال
    const updatePresence = async (isActive: boolean) => {
      try {
        await fetch('http://localhost:4000/api/users/presence', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isActive }),
        });
      } catch (error) {
        console.error('Failed to update presence:', error);
      }
    };

    // تحديث الحالة إلى نشط عند الاتصال
    updatePresence(true);

    // إرسال إشارة "نشط" كل 30 ثانية
    intervalRef.current = setInterval(() => {
      if (socket.connected) {
        socket.emit('user:heartbeat', { userId: user.id });
        updatePresence(true);
      }
    }, 30000);

    // عند إغلاق الصفحة أو المغادرة
    const handleBeforeUnload = () => {
      updatePresence(false);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      updatePresence(false);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, isAuthenticated]);
}