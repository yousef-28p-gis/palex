'use client';

import { useState, useEffect } from 'react';
import { fetchRatesWithCache, getCacheTimeRemaining, CachedRates } from '@/lib/rateCache';

export function RatesBar() {
  const [rates, setRates] = useState<CachedRates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchRatesWithCache();
      setRates(data);
      
      // حساب الوقت المتبقي
      const remaining = getCacheTimeRemaining();
      setTimeRemaining(remaining);
      
    } catch (error) {
      console.error('Failed to load rates:', error);
      setError('فشل تحميل الأسعار');
    } finally {
      setIsLoading(false);
    }
  };

  // تحديث المؤقت كل ثانية
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getCacheTimeRemaining();
      setTimeRemaining(remaining);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadRates();
  }, []);

  // تنسيق الوقت المتبقي
  const formatTimeRemaining = (seconds: number | null) => {
    if (!seconds || seconds <= 0) return 'ينتهي الآن';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return `${minutes} دقيقة ${secs > 0 ? `و ${secs} ثانية` : ''}`;
    }
    return `${secs} ثانية`;
  };

  if (isLoading && !rates) {
    return (
      <div className="sticky top-16 z-40 bg-slate-900/90 backdrop-blur-md border-b border-white/10 py-3">
        <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
          <div className="inline-flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            جاري تحميل الأسعار...
          </div>
        </div>
      </div>
    );
  }

  if (error && !rates) {
    return (
      <div className="sticky top-16 z-40 bg-slate-900/90 backdrop-blur-md border-b border-white/10 py-3">
        <div className="container mx-auto px-4 text-center text-red-400 text-sm">
          ⚠️ {error}
          <button 
            onClick={loadRates} 
            className="mr-3 text-blue-400 hover:text-blue-300 underline"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (!rates) {
    return (
      <div className="sticky top-16 z-40 bg-slate-900/90 backdrop-blur-md border-b border-white/10 py-3">
        <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
          لا توجد بيانات
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-16 z-40 bg-slate-900/90 backdrop-blur-md border-b border-white/10 py-3">
      <div className="container mx-auto px-4">
        {/* للشاشات الكبيرة */}
        <div className="hidden sm:flex items-center justify-center gap-8">
          {/* سعر الشيكل */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <span className="text-blue-400 text-lg font-bold">₪</span>
            </div>
            <div>
              <p className="text-blue-300 text-xs">سعر الصرف</p>
              <p className="text-white font-semibold">{rates.exchange.usdToIls.toFixed(4)} شيكل</p>
            </div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          
          {/* رسوم TRC20 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <span className="text-yellow-400 text-lg font-bold">T</span>
            </div>
            <div>
              <p className="text-blue-300 text-xs">رسوم TRC20</p>
              <p className="text-white font-semibold">{rates.fees.trc20.fee.toFixed(4)} USDT</p>
            </div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          
          {/* رسوم BEP20 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <span className="text-green-400 text-lg font-bold">B</span>
            </div>
            <div>
              <p className="text-blue-300 text-xs">رسوم BEP20</p>
              <p className="text-white font-semibold">{rates.fees.bep20.fee.toFixed(6)} USDT</p>
            </div>
          </div>
          
          {/* آخر تحديث والوقت المتبقي */}
          <div className="flex items-center gap-2 mr-4">
            <div className="w-px h-8 bg-white/10" />
            <div className="text-right">
              <p className="text-blue-400/70 text-[10px] whitespace-nowrap">
                📅 آخر تحديث: {new Date(rates.exchange.lastUpdated).toLocaleTimeString('ar')}
              </p>
              <p className="text-blue-400/50 text-[9px] whitespace-nowrap">
                🔄 يتجدد تلقائياً بعد {formatTimeRemaining(timeRemaining)}
              </p>
            </div>
          </div>
        </div>

        {/* للشاشات الصغيرة */}
        <div className="flex sm:hidden flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <span className="text-blue-400 font-bold text-sm">₪</span>
              </div>
              <div>
                <p className="text-blue-300 text-[9px]">سعر الصرف</p>
                <p className="text-white text-sm font-semibold">{rates.exchange.usdToIls.toFixed(4)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <span className="text-yellow-400 font-bold text-sm">T</span>
              </div>
              <div>
                <p className="text-blue-300 text-[9px]">TRC20</p>
                <p className="text-white text-sm font-semibold">{rates.fees.trc20.fee.toFixed(4)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center">
                <span className="text-green-400 font-bold text-sm">B</span>
              </div>
              <div>
                <p className="text-blue-300 text-[9px]">BEP20</p>
                <p className="text-white text-sm font-semibold">{rates.fees.bep20.fee.toFixed(6)}</p>
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-blue-400/60 text-[9px]">
              🔄 يتجدد بعد {formatTimeRemaining(timeRemaining)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}