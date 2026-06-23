'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { tradesApi } from '@/lib/api';

const ACTIVE_STATUSES = ['pending_seller_approval', 'waiting_seller_deposit', 'active', 'waiting_seller_confirmation'];

export function FloatingTradesButton() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [activeTrades, setActiveTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActiveTrades = useCallback(async () => {
    if (!isAuthenticated) {
      setActiveTrades([]);
      return;
    }
    setLoading(true);
    try {
      const res = await tradesApi.getUserTrades({ limit: 100 });

      // ✅ نجيب المصفوفة بنفس طريقة صفحة الصفقات
      const rawData = res.data?.data ?? res.data ?? [];
      const trades: any[] = Array.isArray(rawData) ? rawData : [];

      // ✅ الصفقات النشطة فقط
      const active = trades.filter((t: any) => {
        if (!t?.status) return false;
        return ACTIVE_STATUSES.includes(t.status);
      });

      setActiveTrades(active);
    } catch {
      setActiveTrades([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchActiveTrades();
    const interval = setInterval(fetchActiveTrades, 30000);
    return () => clearInterval(interval);
  }, [fetchActiveTrades, pathname]);

  const handleClick = () => {
    if (activeTrades.length === 1) {
      // ✅ صفقة واحدة → روح مباشر لصفحتها
      router.push(`/trades/${activeTrades[0].id}`);
    } else {
      // ✅ أكثر من صفقة → روح لقائمة الصفقات
      router.push('/trades');
    }
  };

  if (!isAuthenticated || (activeTrades.length === 0 && !loading)) return null;

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-24 left-6 z-50 flex items-center gap-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white pl-4 pr-5 py-3 rounded-full shadow-2xl hover:from-blue-500 hover:to-blue-600 transition-all hover:scale-105 active:scale-95 border border-white/20"
      title={activeTrades.length === 1 ? 'الذهاب إلى الصفقة' : 'الصفقات النشطة'}
    >
      <div className="relative">
        <ShoppingBag className="w-5 h-5" />
        {activeTrades.length > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[20px] h-5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1 shadow-md">
            {activeTrades.length}
          </span>
        )}
      </div>
      <span className="text-sm font-semibold">صفقاتي</span>
    </button>
  );
}
