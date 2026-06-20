'use client';

import { useState, useEffect } from 'react';
import { Tooltip } from './Tooltip';

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
    fetchPresence();
    const interval = setInterval(fetchPresence, 30000); // تحديث كل 30 ثانية
    return () => clearInterval(interval);
  }, [userId]);

  const fetchPresence = async () => {
    try {
      const res = await fetch(`http://localhost:4000/api/users/${userId}/presence`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = await res.json();
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
        setTooltipText('⚫ غير متصل');
      }
    } catch (error) {
      console.error('Failed to fetch presence:', error);
      setTooltipText('⚫ غير متصل');
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
          isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
        }`}
      />
    </div>
  );

  if (!showTooltip) return indicator;

  return (
    <Tooltip content={tooltipText}>
      {indicator}
    </Tooltip>
  );
}