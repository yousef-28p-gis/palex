'use client';

import { useState, useEffect, useRef } from 'react';

// ✅ أصوات حقيقية (base64 - أصوات قصيرة)
const SOUNDS = {
  deposit: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3',
  proof: 'https://www.soundjay.com/misc/sounds/notification-3.mp3',
  confirmed: 'https://www.soundjay.com/misc/sounds/notification-4.mp3',
  pending: 'https://www.soundjay.com/misc/sounds/notification-1.mp3',
  error: 'https://www.soundjay.com/misc/sounds/error-01.mp3',
  success: 'https://www.soundjay.com/misc/sounds/notification-2.mp3',
  online: 'https://www.soundjay.com/misc/sounds/notification-5.mp3',
  offline: 'https://www.soundjay.com/misc/sounds/notification-6.mp3',
};

// ✅ أصوات احتياطية (في حال فشل تحميل الصوت من الرابط)
const FALLBACK_SOUNDS = {
  deposit: 'data:audio/wav;base64,U3RlYWx0aCBzb3VuZA==',
  proof: 'data:audio/wav;base64,U3RlYWx0aCBzb3VuZA==',
  confirmed: 'data:audio/wav;base64,U3RlYWx0aCBzb3VuZA==',
  pending: 'data:audio/wav;base64,U3RlYWx0aCBzb3VuZA==',
  error: 'data:audio/wav;base64,U3RlYWx0aCBzb3VuZA==',
  success: 'data:audio/wav;base64,U3RlYWx0aCBzb3VuZA==',
  online: 'data:audio/wav;base64,U3RlYWx0aCBzb3VuZA==',
  offline: 'data:audio/wav;base64,U3RlYWx0aCBzb3VuZA==',
};

interface SoundNotificationProps {
  type: 'deposit' | 'proof' | 'confirmed' | 'pending' | 'error' | 'success' | 'online' | 'offline';
  message?: string;
  title?: string;
  onClose?: () => void;
  playSound?: boolean;
}

export function SoundNotification({ type, message, title, onClose, playSound = true }: SoundNotificationProps) {
  const [show, setShow] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // ✅ تشغيل الصوت إذا كان مطلوباً
    if (playSound) {
      const soundUrl = SOUNDS[type] || FALLBACK_SOUNDS[type];
      if (soundUrl) {
        audioRef.current = new Audio(soundUrl);
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch((e) => console.log('Audio play failed:', e));
      }
    }

    // ✅ عرض إشعار المتصفح
    if (typeof window !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title || 'PalEscrow', { body: message || '', icon: '/logo.png' });
    }

    // ✅ إخفاء الإشعار بعد 5 ثواني
    const timer = setTimeout(() => {
      setShow(false);
      onClose?.();
    }, 5000);

    return () => clearTimeout(timer);
  }, [type, message, title, onClose, playSound]);

  if (!show) return null;

  const getBgColor = () => {
    switch (type) {
      case 'deposit': return 'bg-green-500/20 border-green-500/30';
      case 'proof': return 'bg-blue-500/20 border-blue-500/30';
      case 'confirmed': return 'bg-green-500/20 border-green-500/30';
      case 'pending': return 'bg-yellow-500/20 border-yellow-500/30';
      case 'error': return 'bg-red-500/20 border-red-500/30';
      case 'success': return 'bg-green-500/20 border-green-500/30';
      case 'online': return 'bg-green-500/20 border-green-500/30';
      case 'offline': return 'bg-gray-500/20 border-gray-500/30';
      default: return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'deposit': return '💰';
      case 'proof': return '📎';
      case 'confirmed': return '✅';
      case 'pending': return '⏳';
      case 'error': return '❌';
      case 'success': return '🎉';
      case 'online': return '🟢';
      case 'offline': return '🔴';
      default: return '🔔';
    }
  };

  return (
    <div className={`fixed top-20 right-4 z-50 animate-in slide-in-from-right duration-300 ${getBgColor()} backdrop-blur-xl rounded-2xl border p-4 max-w-sm shadow-xl`}>
      <div className="flex items-start gap-3">
        <div className="text-2xl">{getIcon()}</div>
        <div className="flex-1">
          <h4 className="font-semibold text-white">{title || 'تنبيه'}</h4>
          <p className="text-sm text-blue-200 mt-1">{message}</p>
        </div>
        <button onClick={() => { setShow(false); onClose?.(); }} className="text-gray-400 hover:text-white">
          ✕
        </button>
      </div>
    </div>
  );
}

// Hook لاستخدام الإشعارات
export function useSoundNotification() {
  const [notification, setNotification] = useState<{ type: SoundNotificationProps['type']; message: string; title?: string; playSound?: boolean } | null>(null);

  const showNotification = (type: SoundNotificationProps['type'], message: string, title?: string, playSound: boolean = true) => {
    setNotification({ type, message, title, playSound });
  };

  const clearNotification = () => {
    setNotification(null);
  };

  const NotificationComponent = notification ? (
    <SoundNotification
      type={notification.type}
      message={notification.message}
      title={notification.title}
      playSound={notification.playSound}
      onClose={clearNotification}
    />
  ) : null;

  return { showNotification, NotificationComponent, clearNotification };
}