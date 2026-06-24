'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { adminApi } from '@/lib/api';
import { 
  Users, CheckCircle, Shield, TrendingUp, 
  DollarSign, Clock, Loader2, 
  RefreshCw, Filter, Eye, AlertCircle,
  UserCheck, Activity
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function AdminDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTradesToday: 0,
    activeTrades: 0,
    openDisputes: 0,
    pendingKyc: 0,
    totalVolumeToday: 0,
    usdtInEscrow: 0,
  });

  useEffect(() => {
    if (user && !['super_admin', 'kyc_admin', 'support_admin', 'finance_admin'].includes(user.role)) {
      router.push('/dashboard');
      return;
    }
    loadStats();
  }, [user]);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getStats();
      setStats(res.data);
    } catch (error) {
      console.error('Failed to load stats', error);
      toast.error('فشل في تحميل الإحصائيات');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const statCards = [
    { title: 'إجمالي المستخدمين', value: stats.totalUsers, icon: Users, color: 'from-blue-500 to-blue-600', link: '/admin/users' },
    { title: 'صفقات اليوم', value: stats.totalTradesToday, icon: TrendingUp, color: 'from-green-500 to-green-600', link: '/admin/trades' },
    { title: 'حجم التداول (USDT)', value: stats.totalVolumeToday.toLocaleString(), icon: DollarSign, color: 'from-yellow-500 to-yellow-600', link: '/admin/trades' },
    { title: 'نزاعات مفتوحة', value: stats.openDisputes, icon: Shield, color: 'from-red-500 to-red-600', link: '/admin/disputes' },
  ];

  const quickLinks = [
    { title: 'المستخدمين', value: stats.totalUsers, icon: Users, href: '/admin/users', color: 'blue' },
    { title: 'صفقات نشطة', value: stats.activeTrades, icon: Clock, href: '/admin/trades', color: 'green' },
    { title: 'KYC معلقة', value: stats.pendingKyc, icon: Shield, href: '/admin/kyc', color: 'purple' },
    { title: 'USDT في الضمان', value: stats.usdtInEscrow.toLocaleString(), icon: DollarSign, href: '#', color: 'yellow' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">

        {/* ===== الهيدر ===== */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-8 border border-white/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">لوحة تحكم الأدمن</h1>
              <p className="text-blue-200 text-xs sm:text-sm">مرحباً {user?.fullName} 👋</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadStats}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition shadow-lg flex items-center gap-2 justify-center text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                تحديث
              </button>
            </div>
          </div>
        </div>

        {/* ===== إحصائيات ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-5 mb-4 sm:mb-8">
          {statCards.map((stat, index) => (
            <Link key={index} href={stat.link}>
              <div className="bg-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-white/20 hover:bg-white/15 transition cursor-pointer">
                <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-3">
                  <div className={`w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r ${stat.color} rounded-lg sm:rounded-xl flex items-center justify-center shrink-0`}>
                    <stat.icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <p className="text-blue-200 text-[10px] sm:text-sm">{stat.title}</p>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-white">{stat.value}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* ===== روابط سريعة ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-8">
          {quickLinks.map((item, index) => (
            <Link key={index} href={item.href}>
              <div className={`bg-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-white/20 hover:bg-white/15 transition cursor-pointer min-h-[68px] sm:min-h-[88px] flex flex-col items-center justify-center text-center`}>
                <item.icon className={`w-5 h-5 sm:w-7 sm:h-7 mb-1 sm:mb-2 ${
                  item.color === 'blue' ? 'text-blue-400' :
                  item.color === 'green' ? 'text-green-400' :
                  item.color === 'purple' ? 'text-purple-400' :
                  'text-yellow-400'
                }`} />
                <p className="text-[10px] sm:text-xs text-blue-200">{item.title}</p>
                <p className="text-sm sm:text-lg font-bold text-white mt-0.5">{item.value}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* ===== بطاقات الإدارة ===== */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20">
          <h3 className="font-semibold text-white mb-4 text-sm sm:text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            لوحة الإدارة
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Link href="/admin/users">
              <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20 hover:bg-blue-500/20 transition cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">إدارة المستخدمين</h4>
                    <p className="text-xs text-blue-300">عرض، تجميد، وحذف</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/admin/kyc">
              <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20 hover:bg-purple-500/20 transition cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">طلبات KYC</h4>
                    <p className="text-xs text-blue-300">مراجعة وقبول التوثيق</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/admin/trades">
              <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20 hover:bg-green-500/20 transition cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">مراقبة الصفقات</h4>
                    <p className="text-xs text-blue-300">جميع صفقات المنصة</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/admin/disputes">
              <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20 hover:bg-red-500/20 transition cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">النزاعات</h4>
                    <p className="text-xs text-blue-300">حل نزاعات المستخدمين</p>
                  </div>
                </div>
              </div>
            </Link>

            <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20 hover:bg-yellow-500/20 transition cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm">سعر الصرف</h4>
                  <p className="text-xs text-blue-300">تحديث سعر الدولار</p>
                </div>
              </div>
            </div>

            <Link href="/admin/audit">
              <div className="bg-gray-500/10 rounded-xl p-4 border border-gray-500/20 hover:bg-gray-500/20 transition cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <Eye className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">سجل التدقيق</h4>
                    <p className="text-xs text-blue-300">سجل إجراءات الأدمن</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute requiredRoles={['super_admin', 'kyc_admin', 'support_admin', 'finance_admin']}>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
