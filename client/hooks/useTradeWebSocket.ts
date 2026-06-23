import { useEffect, useState, useCallback } from 'react';
import { initializeSocket, onTradeEvent, getSocket } from '@/lib/socket';
import { useAuth } from './useAuth';

export function useTradeWebSocket() {
  const { user, isAuthenticated } = useAuth();
  const [notification, setNotification] = useState<{ title: string; message: string; type: string } | null>(null);

  // ✅ تهيئة WebSocket عند تسجيل الدخول
  useEffect(() => {
    if (isAuthenticated && user) {
      const token = localStorage.getItem('accessToken');
      if (token) {
      initializeSocket();
      }
    }
  }, [isAuthenticated, user]);

  // ✅ الاستماع للأحداث (يتابع حالة المصادقة لضمان تهيئة السوكيت)
  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      console.log('WebSocket not initialized, skipping event listeners');
      return;
    }
    
    const unsubscribe = onTradeEvent((data) => {
      console.log('📢 WebSocket event:', data);
      
      switch (data._eventType) {
        case 'trade:deposit':
          setNotification({
            title: '💰 إيداع USDT',
            message: data.message,
            type: 'deposit',
          });
          break;
          
        case 'trade:proof':
          setNotification({
            title: '📎 إثبات دفع',
            message: data.message,
            type: 'proof',
          });
          break;
          
        case 'trade:confirmed':
          setNotification({
            title: '✅ تأكيد الدفع',
            message: data.message,
            type: 'success',
          });
          break;

        case 'trade:update':
          setNotification({
            title: '📡 تحديث الصفقة',
            message: data.message,
            type: 'info',
          });
          break;
          
        case 'trade:error':
          setNotification({
            title: '❌ خطأ',
            message: data.message,
            type: 'error',
          });
          break;
      }
    });
    
    return () => unsubscribe();
  }, [isAuthenticated]);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return {
    notification,
    clearNotification,
  };
}
