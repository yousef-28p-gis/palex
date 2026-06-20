import { useEffect, useState, useCallback } from 'react';
import { initializeSocket, onTradeEvent, requestSellerConfirmation, confirmSellerPresence, getSocket } from '@/lib/socket';
import { useAuth } from './useAuth';

interface PendingTrade {
  pendingId: string;
  offerId: string;
  amount: number;
  buyerName: string;
  timeLeft: number;
}

export function useTradeWebSocket() {
  const { user, isAuthenticated } = useAuth();
  const [pendingTrade, setPendingTrade] = useState<PendingTrade | null>(null);
  const [isWaitingForSeller, setIsWaitingForSeller] = useState(false);
  const [notification, setNotification] = useState<{ title: string; message: string; type: string } | null>(null);

  // ✅ تهيئة WebSocket عند تسجيل الدخول
  useEffect(() => {
    if (isAuthenticated && user) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        initializeSocket(token);
      }
    }
  }, [isAuthenticated, user]);

  // ✅ الاستماع للأحداث (فقط إذا كان socket موجوداً)
  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      console.log('WebSocket not initialized, skipping event listeners');
      return;
    }
    
    const unsubscribe = onTradeEvent((data) => {
      console.log('📢 WebSocket event:', data);
      
      switch (data.type || Object.keys(data)[0]) {
        case 'trade:pending':
          setPendingTrade({
            pendingId: data.pendingId,
            offerId: data.offerId,
            amount: data.amount,
            buyerName: data.buyerName,
            timeLeft: data.countdown || 600,
          });
          setIsWaitingForSeller(true);
          setNotification({
            title: '🔔 طلب شراء جديد',
            message: data.message,
            type: 'pending',
          });
          break;
          
        case 'trade:ready':
          setIsWaitingForSeller(false);
          setPendingTrade(null);
          setNotification({
            title: '✅ البائع جاهز',
            message: data.message,
            type: 'success',
          });
          break;
          
        case 'trade:timeout':
          setIsWaitingForSeller(false);
          setPendingTrade(null);
          setNotification({
            title: '⏰ انتهت المهلة',
            message: data.message,
            type: 'error',
          });
          break;
          
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
      }
    });
    
    return () => unsubscribe();
  }, []); // ✅ يعتمد على socket فقط

  const requestConfirmation = useCallback(async (offerId: string, amount: number) => {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');
    
    setIsWaitingForSeller(true);
    try {
      const result = await requestSellerConfirmation(offerId, amount, user.id, user.fullName);
      return result;
    } catch (error) {
      setIsWaitingForSeller(false);
      throw error;
    }
  }, [user]);

  const confirmPresence = useCallback((pendingId: string, offerId: string) => {
    if (!user) return;
    confirmSellerPresence(pendingId, offerId, user.id);
    setIsWaitingForSeller(false);
    setPendingTrade(null);
  }, [user]);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return {
    pendingTrade,
    isWaitingForSeller,
    notification,
    requestConfirmation,
    confirmPresence,
    clearNotification,
  };
}