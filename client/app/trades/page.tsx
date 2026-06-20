'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { tradesApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate, formatUsdt, formatTimeLeft } from '@/lib/formatters';
import { 
  Search, Eye, Loader2, TrendingUp, ArrowUpDown, Calendar, 
  CheckCircle, Clock, XCircle, AlertCircle, RefreshCw,
  ShoppingBag, Shield, DollarSign, User, ArrowLeftRight
} from 'lucide-react';
import toast from 'react-hot-toast';

// أيقونة DollarSign مساعدة
const DollarSignIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" x2="12" y1="2" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

// ✅ أنواع الفلاتر
type FilterType = 'all' | 'waiting_seller_deposit' | 'active' | 'waiting_seller_confirmation' | 'completed' | 'dispute_opened';

// ✅ تكوين الفلاتر
const filters: { value: FilterType; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'الكل', icon: <TrendingUp className="w-3 h-3" /> },
  { value: 'waiting_seller_deposit', label: 'بانتظار إيداعي', icon: <Clock className="w-3 h-3" /> },
  { value: 'active', label: 'بانتظار دفعي', icon: <DollarSignIcon className="w-3 h-3" /> },
  { value: 'waiting_seller_confirmation', label: 'بانتظار تأكيدي', icon: <AlertCircle className="w-3 h-3" /> },
  { value: 'completed', label: 'مكتملة', icon: <CheckCircle className="w-3 h-3" /> },
  { value: 'dispute_opened', label: 'نزاعات', icon: <AlertCircle className="w-3 h-3" /> },
];

// مكون إحصائيات
function TradeStats({ stats }: { stats: any }) {
  const statsCards = [
    { title: 'إجمالي الصفقات', value: stats.totalTrades, icon: ArrowLeftRight, color: 'from-blue-500 to-blue-600' },
    { title: 'الصفقات المكتملة', value: stats.completedTrades, icon: CheckCircle, color: 'from-green-500 to-green-600' },
    { title: 'قيد التنفيذ', value: stats.pendingTrades, icon: Clock, color: 'from-yellow-500 to-yellow-600' },
    { title: 'حجم التداول', value: `${stats.totalVolume} USDT`, icon: DollarSignIcon, color: 'from-purple-500 to-purple-600' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {statsCards.map((stat, index) => (
        <div key={index} className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20 hover:bg-white/15 transition">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center shadow-md`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-blue-200 text-sm mb-1">{stat.title}</p>
          <p className="text-2xl font-bold text-white">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

// المحتوى الرئيسي
function TradesContent() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    totalTrades: 0,
    completedTrades: 0,
    pendingTrades: 0,
    totalVolume: 0,
  });

  useEffect(() => {
    loadTrades();
  }, [filter, page]);

  const loadTrades = async () => {
    setIsLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (filter !== 'all') params.status = filter;
      
      const response = await tradesApi.getUserTrades(params);
      const tradesData = response.data.data || [];
      setTrades(tradesData);
      setTotalPages(response.data.meta?.totalPages || 1);
      
      const completed = tradesData.filter((t: any) => t.status === 'completed');
      const pending = tradesData.filter((t: any) => 
        ['active', 'waiting_seller_deposit', 'waiting_seller_confirmation'].includes(t.status)
      );
      const totalVolume = completed.reduce((sum: number, t: any) => sum + Number(t.amountUsdt), 0);
      
      setStats({
        totalTrades: tradesData.length,
        completedTrades: completed.length,
        pendingTrades: pending.length,
        totalVolume: totalVolume,
      });
    } catch (error) {
      console.error('Failed to load trades:', error);
      toast.error('فشل في تحميل الصفقات');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ فلترة إضافية للبحث
  const filteredTrades = trades.filter(trade => {
    if (search && !trade.tradeReference?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ✅ حساب الوقت المتبقي للصفقة
  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const remaining = new Date(expiresAt).getTime() - Date.now();
    if (remaining <= 0) return 'انتهت';
    return formatTimeLeft(remaining);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">صفقاتي</h1>
            <p className="text-blue-200 text-sm mt-1">إدارة ومتابعة جميع صفقاتك</p>
          </div>
          
          <div className="flex gap-3">
            {/* Refresh Button */}
            <button
              onClick={() => {
                loadTrades();
                toast.success('جاري تحديث الصفقات...');
              }}
              className="p-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
              title="تحديث"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="بحث برقم الصفقة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full md:w-64 pr-10 pl-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <TradeStats stats={stats} />

        {/* ✅ Filters - مدمجة (تشمل pending-deposit) */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-1 mb-6">
          <div className="flex flex-wrap gap-1">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition flex items-center gap-1.5 ${
                  filter === f.value
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-blue-200 hover:text-white hover:bg-white/10'
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-blue-200">
            <span className="font-semibold text-white">{filteredTrades.length}</span> صفقة
          </p>
          <div className="flex items-center gap-2 text-xs text-blue-300">
            <TrendingUp className="w-3 h-3" />
            <span>آخر الصفقات أولاً</span>
          </div>
        </div>

        {/* Trades List */}
        {filteredTrades.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 text-center border border-white/20">
            <ShoppingBag className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-1">لا توجد صفقات</h3>
            <p className="text-blue-200 text-sm">لم تقم بأي صفقة بعد</p>
            <Link href="/marketplace">
              <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition">
                ابدأ أول صفقة لك
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTrades.map((trade) => {
              const isBuyer = trade.buyerId === user?.id;
              const currencySymbol = trade.fiatCurrency === 'ils' ? '₪' : '$';
              const timeRemaining = getTimeRemaining(trade.expiresAt);
              const isExpired = timeRemaining === 'انتهت';
              
              return (
                <Link href={`/trades/${trade.id}`} key={trade.id}>
                  <div className={`bg-white/10 backdrop-blur-xl rounded-2xl border p-5 hover:bg-white/15 transition cursor-pointer ${
                    isExpired ? 'border-red-500/50 bg-red-500/5' : 'border-white/20'
                  }`}>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <span className="font-mono text-sm font-semibold text-blue-300">
                            {trade.tradeReference}
                          </span>
                          {/* ✅ استخدام StatusBadge الموحد */}
                          <StatusBadge status={trade.status} size="sm" />
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            isBuyer 
                              ? 'bg-green-500/20 text-green-300' 
                              : 'bg-orange-500/20 text-orange-300'
                          }`}>
                            {isBuyer ? 'شراء' : 'بيع'}
                          </span>
                          {timeRemaining && trade.status !== 'completed' && trade.status !== 'cancelled' && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              isExpired ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'
                            }`}>
                              ⏰ {timeRemaining}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div>
                            <span className="text-blue-300 text-xs">المبلغ:</span>
                            <span className="font-medium text-white mr-1">{trade.amountUsdt} USDT</span>
                          </div>
                          <div>
                            <span className="text-blue-300 text-xs">السعر:</span>
                            <span className="text-white mr-1">{trade.pricePerUsdt} {currencySymbol}</span>
                          </div>
                          <div>
                            <span className="text-blue-300 text-xs">الإجمالي:</span>
                            <span className="font-medium text-white mr-1">{trade.totalFiat} {currencySymbol}</span>
                          </div>
                          <div>
                            <span className="text-blue-300 text-xs">الطرف الآخر:</span>
                            <span className="text-white mr-1">
                              {isBuyer ? trade.seller?.fullName : trade.buyer?.fullName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-blue-300" />
                            <span className="text-blue-300 text-xs">
                              {formatDate(trade.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-blue-400">
                        <Eye className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition disabled:opacity-50"
            >
              السابق
            </button>
            <span className="px-4 py-2 text-white">
              صفحة {page} من {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TradesPage() {
  return (
    <ProtectedRoute>
      <TradesContent />
    </ProtectedRoute>
  );
}