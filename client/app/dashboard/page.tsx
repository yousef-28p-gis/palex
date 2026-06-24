'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { tradesApi, userApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { 
  Loader2, TrendingUp, Shield, Star, DollarSign, ArrowLeftRight, 
  Eye, Activity, Settings, CheckCircle, AlertCircle, ShoppingBag, 
  Wallet, User, LogOut, RefreshCw, Clock, XCircle 
} from 'lucide-react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import toast from 'react-hot-toast';

function DashboardContent() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [trades, setTrades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTrades: 0,
    successRate: 0,
    averageRating: 0,
    totalVolume: 0,
    pendingTrades: 0,
  });
  const initialLoadDone = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isAuthRefreshing, setIsAuthRefreshing] = useState(true);

  // ✅ جلب أحدث بيانات المستخدم عند فتح الصفحة
  useEffect(() => {
    const refreshAuth = async () => {
      try {
        await refreshUser();
      } catch (err) {
        console.error('فشل تحديث بيانات المستخدم:', err);
      } finally {
        setIsAuthRefreshing(false);
      }
    };
    refreshAuth();
  }, []);

  // ✅ إعادة جلب البيانات عند العودة من صفحة الصفقة
  useEffect(() => {
    const updated = searchParams.get('updated');
    if (updated === 'true') {
      loadDashboardData();
      router.replace('/dashboard');
    }
  }, [searchParams, router]);

  // ✅ التحميل الأولي (مرة واحدة فقط)
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  // ✅ تحديث البيانات كل 5 دقائق (بدلاً من 30 ثانية)
  useEffect(() => {
    if (!user) return;
    
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = setInterval(() => {
      loadDashboardData();
    }, 5 * 60 * 1000); // 5 دقائق
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const profileRes = await userApi.getProfile();
      const userData = profileRes.data;
      
      const tradesRes = await tradesApi.getUserTrades({ page: 1, limit: 100 });
      const userTrades = tradesRes.data.data || [];
      setTrades(userTrades);
      
      const completedTrades = userTrades.filter((t: any) => t.status === 'completed');
      const pendingTrades = userTrades.filter((t: any) => 
        ['active', 'waiting_seller_deposit', 'waiting_seller_confirmation'].includes(t.status)
      );
      const totalVolume = completedTrades.reduce((sum: number, t: any) => sum + Number(t.amountUsdt), 0);
      
      const completedCount = userData.totalTrades || completedTrades.length;
      
      setStats({
        totalTrades: userData.totalTrades || completedTrades.length,
        successRate: userData.successRate || 0,
        averageRating: userData.averageRating || 0,
        totalVolume: totalVolume,
        pendingTrades: pendingTrades.length,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTrade = () => {
    if (user?.kycStatus === 'pending') {
      toast.custom((t) => (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-lg max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800">طلب التوثيق قيد المراجعة</p>
              <p className="text-sm text-yellow-700 mt-1">يرجى الانتظار حتى تتم المراجعة</p>
              <button onClick={() => router.push('/kyc')} className="mt-3 text-sm text-yellow-800 font-medium hover:underline">عرض حالة الطلب</button>
            </div>
          </div>
        </div>
      ), { duration: 5000 });
      return;
    }
    if (user?.kycStatus === 'rejected') {
      toast.custom((t) => (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-lg max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">تم رفض طلب التوثيق</p>
              <p className="text-sm text-red-700 mt-1">يرجى إعادة تقديم الطلب</p>
              <button onClick={() => router.push('/kyc')} className="mt-3 text-sm text-red-800 font-medium hover:underline">إعادة التقديم</button>
            </div>
          </div>
        </div>
      ), { duration: 5000 });
      return;
    }
    if (user?.kycStatus === 'none') {
      toast.custom((t) => (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-lg max-w-md">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-800">يرجى توثيق هويتك أولاً</p>
              <p className="text-sm text-blue-700 mt-1">لبدء التداول، يجب إكمال عملية التوثيق</p>
              <button onClick={() => router.push('/kyc')} className="mt-3 text-sm text-blue-800 font-medium hover:underline">اذهب إلى التوثيق</button>
            </div>
          </div>
        </div>
      ), { duration: 5000 });
      return;
    }
    router.push('/marketplace');
  };

  const getTradeStatus = (status: string) => {
    switch (status) {
      case 'completed':
        return { label: 'مكتملة', color: 'bg-green-500/20 text-green-300', icon: <CheckCircle className="w-3 h-3" /> };
      case 'cancelled':
        return { label: 'ملغاة', color: 'bg-red-500/20 text-red-300', icon: <XCircle className="w-3 h-3" /> };
      case 'active':
        return { label: 'نشطة', color: 'bg-blue-500/20 text-blue-300', icon: <Clock className="w-3 h-3" /> };
      case 'waiting_seller_deposit':
        return { label: 'انتظار إيداع', color: 'bg-yellow-500/20 text-yellow-300', icon: <Clock className="w-3 h-3" /> };
      case 'waiting_seller_confirmation':
        return { label: 'انتظار تأكيد', color: 'bg-orange-500/20 text-orange-300', icon: <Clock className="w-3 h-3" /> };
      case 'dispute_opened':
        return { label: 'نزاع', color: 'bg-red-500/20 text-red-300', icon: <AlertCircle className="w-3 h-3" /> };
      default:
        return { label: status, color: 'bg-gray-500/20 text-gray-300', icon: <Clock className="w-3 h-3" /> };
    }
  };

  // ✅ انتظار تحديث بيانات المستخدم أولاً
  if (isAuthRefreshing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const firstName = user?.fullName?.split(' ')[0] || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">

        {/* ===== الهيدر ===== */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-8 border border-white/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">مرحباً {firstName}! 👋</h1>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-blue-200 text-xs sm:text-sm">لديك {stats.pendingTrades} صفقة قيد التنفيذ</span>
                {user?.kycStatus === 'approved' && (
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">
                    <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> موثق
                  </span>
                )}
                {user?.kycStatus === 'pending' && (
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">
                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> قيد التوثيق
                  </span>
                )}
                {user?.kycStatus === 'none' && (
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-300">
                    <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> غير موثق
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadDashboardData()}
                className="p-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition shrink-0"
                title="تحديث"
              >
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={handleStartTrade}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition shadow-lg flex items-center gap-2 justify-center text-sm sm:text-base"
              >
                <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ابدأ صفقة جديدة
              </button>
            </div>
          </div>
        </div>

        {/* ===== إحصائيات ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-5 mb-4 sm:mb-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-white/20">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-3">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-500/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                <ArrowLeftRight className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400" />
              </div>
              <p className="text-blue-200 text-[10px] sm:text-sm">إجمالي الصفقات</p>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-white">{stats.totalTrades}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-white/20">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-3">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-500/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-green-400" />
              </div>
              <p className="text-blue-200 text-[10px] sm:text-sm">نسبة النجاح</p>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-white">{stats.successRate}%</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-white/20">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-3">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-yellow-500/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-400" />
              </div>
              <p className="text-blue-200 text-[10px] sm:text-sm">التقييم</p>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-white">{stats.averageRating}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-white/20">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-3">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-purple-500/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-purple-400" />
              </div>
              <p className="text-blue-200 text-[10px] sm:text-sm">حجم التداول</p>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-white">{stats.totalVolume} USDT</p>
          </div>
        </div>

        {/* ===== إحصائيات سريعة + إجراءات ===== */}
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-6 mb-4 sm:mb-8">
          <div className="flex-1 bg-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-semibold text-white text-sm sm:text-base">إحصائيات سريعة</h3>
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-300" />
            </div>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between items-center border-b border-white/10 pb-1.5 sm:pb-2">
                <span className="text-blue-200 text-xs sm:text-sm">صفقات قيد التنفيذ</span>
                <span className="font-semibold text-white text-xs sm:text-sm">{stats.pendingTrades}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-1.5 sm:pb-2">
                <span className="text-blue-200 text-xs sm:text-sm">نسبة الإكمال</span>
                <span className="font-semibold text-green-400 text-xs sm:text-sm">{stats.successRate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-200 text-xs sm:text-sm">متوسط التقييم</span>
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-white text-xs sm:text-sm">{stats.averageRating}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20">
            <h3 className="font-semibold text-white mb-3 sm:mb-4 text-sm sm:text-base">إجراءات سريعة</h3>
            <div className="grid grid-cols-4 sm:grid-cols-2 gap-2 sm:gap-3">
              <Link href="/marketplace">
                <div className="p-2 sm:p-3 bg-blue-500/20 rounded-xl text-center hover:bg-blue-500/30 transition cursor-pointer min-h-[68px] sm:min-h-[88px] flex flex-col items-center justify-center">
                  <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 mx-auto mb-0.5 sm:mb-1" />
                  <p className="text-[10px] sm:text-xs text-white">شراء USDT</p>
                </div>
              </Link>
              <Link href="/trades">
                <div className="p-2 sm:p-3 bg-green-500/20 rounded-xl text-center hover:bg-green-500/30 transition cursor-pointer min-h-[68px] sm:min-h-[88px] flex flex-col items-center justify-center">
                  <ArrowLeftRight className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mx-auto mb-0.5 sm:mb-1" />
                  <p className="text-[10px] sm:text-xs text-white">صفقاتي</p>
                </div>
              </Link>
              <Link href="/kyc">
                <div className="p-2 sm:p-3 bg-purple-500/20 rounded-xl text-center hover:bg-purple-500/30 transition cursor-pointer min-h-[68px] sm:min-h-[88px] flex flex-col items-center justify-center">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 mx-auto mb-0.5 sm:mb-1" />
                  <p className="text-[10px] sm:text-xs text-white">توثيق الهوية</p>
                </div>
              </Link>
              <Link href="/profile">
                <div className="p-2 sm:p-3 bg-gray-500/20 rounded-xl text-center hover:bg-gray-500/30 transition cursor-pointer min-h-[68px] sm:min-h-[88px] flex flex-col items-center justify-center">
                  <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mx-auto mb-0.5 sm:mb-1" />
                  <p className="text-[10px] sm:text-xs text-white">الإعدادات</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* ===== آخر الصفقات — كروت للجوال / جدول للديسكتوب ===== */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/20 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 flex justify-between items-center">
            <h3 className="font-semibold text-white text-sm sm:text-base">آخر الصفقات</h3>
            <Link href="/trades" className="text-xs sm:text-sm text-blue-400 hover:text-blue-300 transition">
              عرض الكل
            </Link>
          </div>
          {trades.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <p className="text-blue-200 text-sm">لا توجد صفقات حتى الآن</p>
              <Link href="/marketplace">
                <button className="mt-3 sm:mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">ابدأ أول صفقة</button>
              </Link>
            </div>
          ) : (
            <>
              {/* === كروت للجوال === */}
              <div className="block sm:hidden divide-y divide-white/10">
                {trades.slice(0, 5).map((trade) => {
                  const isBuyer = trade.buyerId === user?.id;
                  const status = getTradeStatus(trade.status);
                  return (
                    <Link key={trade.id} href={`/trades/${trade.id}`} className="block px-4 py-3 hover:bg-white/5 transition">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs text-blue-300">{trade.tradeReference}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${status.color}`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${isBuyer ? 'bg-green-500/20 text-green-300' : 'bg-orange-500/20 text-orange-300'}`}>
                            {isBuyer ? 'شراء' : 'بيع'}
                          </span>
                          <span className="text-sm font-medium text-white">{trade.amountUsdt} USDT</span>
                        </div>
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                    </Link>
                  );
                })}
              </div>
              {/* === جدول للديسكتوب === */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr className="text-right">
                      <th className="px-4 lg:px-6 py-3 text-xs font-medium text-blue-300">رقم الصفقة</th>
                      <th className="px-4 lg:px-6 py-3 text-xs font-medium text-blue-300">النوع</th>
                      <th className="px-4 lg:px-6 py-3 text-xs font-medium text-blue-300">المبلغ</th>
                      <th className="px-4 lg:px-6 py-3 text-xs font-medium text-blue-300">الحالة</th>
                      <th className="px-4 lg:px-6 py-3 text-xs font-medium text-blue-300"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {trades.slice(0, 5).map((trade) => {
                      const isBuyer = trade.buyerId === user?.id;
                      const status = getTradeStatus(trade.status);
                      return (
                        <tr key={trade.id} className="hover:bg-white/5 transition">
                          <td className="px-4 lg:px-6 py-4 text-sm font-mono text-blue-300">{trade.tradeReference}</td>
                          <td className="px-4 lg:px-6 py-4">
                            <span className={`text-xs px-2 py-1 rounded-full ${isBuyer ? 'bg-green-500/20 text-green-300' : 'bg-orange-500/20 text-orange-300'}`}>
                              {isBuyer ? 'شراء' : 'بيع'}
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4 text-sm font-medium text-white">{trade.amountUsdt} USDT</td>
                          <td className="px-4 lg:px-6 py-4">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${status.color}`}>
                              {status.icon}
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <Link href={`/trades/${trade.id}`}>
                              <Eye className="w-4 h-4 text-blue-400 hover:text-blue-300 cursor-pointer" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}