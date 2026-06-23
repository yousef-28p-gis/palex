'use client';

import { useState, useEffect } from 'react';
import { Tooltip } from './Tooltip';
import { userApi } from '@/lib/api';
import { getSocket, initializeSocket } from '@/lib/socket';

interface OnlineIndicatorProps {
  userId: string;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function OnlineIndicator({ userId, showTooltip = true, size = 'sm' }: OnlineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tooltipText, setTooltipText] = useState('');

  useEffect(() => {
    // ✅ 1. جلب الحالة الحالية فوراً
    fetchPresence();

    // ✅ 2. استماع WebSocket للتحديثات الفورية
    const socket = initializeSocket();
    socket.on('user:presence', (data: { userId: string; isActive: boolean; timestamp: string }) => {
      if (data.userId === userId) {
        setIsOnline(data.isActive);
        setTooltipText(data.isActive ? '🟢 نشط الآن' : '🔴 غير متصل');
      }
    });

    // تحديث كل 30 ثانية كنسخ احتياطي
    const interval = setInterval(fetchPresence, 30000);

    return () => {
      clearInterval(interval);
      socket.off('user:presence');
    };
  }, [userId]);

  const fetchPresence = async () => {
    try {
      const { data } = await userApi.getPresence(userId);
      
      setIsOnline(data.isOnline);
      setLastSeen(data.lastSeenAt);
      
      if (data.isOnline) {
        setTooltipText('🟢 نشط الآن');
      } else if (data.lastSeenAt) {
        const lastSeenDate = new Date(data.lastSeenAt);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / 60000);
        if (diffMinutes < 60) {
          setTooltipText(`🟡 آخر ظهور منذ ${diffMinutes} دقيقة`);
        } else {
          setTooltipText(`🟡 آخر ظهور: ${lastSeenDate.toLocaleTimeString('ar')}`);
        }
      } else {
        setTooltipText('🔴 غير متصل');
      }
    } catch (error) {
      console.warn('Failed to fetch presence:', error);
      setTooltipText('🔴 غير متصل');
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const indicator = (
    <div className="relative">
      <div
        className={`${sizeClasses[size]} rounded-full ${
          isOnline ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-500'
        }`}
      />
      {isLoading && (
        <div className="absolute inset-0 rounded-full bg-gray-800 animate-pulse" />
      )}
    </div>
  );

  if (!showTooltip) return indicator;

  return (
    <Tooltip content={tooltipText}>
      {indicator}
    </Tooltip>
  );
}
