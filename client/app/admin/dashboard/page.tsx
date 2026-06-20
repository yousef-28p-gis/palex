'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { adminApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Users, CheckCircle, XCircle, Clock, TrendingUp, 
  DollarSign, Shield, Eye, Search, Loader2, 
  Ban, RefreshCw, Filter, ArrowUpDown, Download,
  ArrowLeft
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
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const statCards = [
    { title: 'إجمالي المستخدمين', value: stats.totalUsers, icon: Users, color: 'from-blue-500 to-blue-600', link: '/admin/users' },
    { title: 'صفقات اليوم', value: stats.totalTradesToday, icon: TrendingUp, color: 'from-green-500 to-green-600', link: '/admin/trades' },
    { title: 'حجم التداول اليوم (USDT)', value: stats.totalVolumeToday, icon: DollarSign, color: 'from-yellow-500 to-yellow-600', link: '/admin/trades' },
    { title: 'نزاعات مفتوحة', value: stats.openDisputes, icon: Shield, color: 'from-red-500 to-red-600', link: '/admin/disputes' },
  ];

  const quickLinks = [
    { title: 'المستخدمين', value: stats.totalUsers, icon: Users, href: '/admin/users', color: 'bg-blue-500' },
    { title: 'صفقات نشطة', value: stats.activeTrades, icon: Clock, href: '/admin/trades', color: 'bg-blue-500' },
    { title: 'طلبات KYC معلقة', value: stats.pendingKyc, icon: Shield, href: '/admin/kyc', color: 'bg-purple-500' },
    { title: 'USDT في الضمان', value: stats.usdtInEscrow.toLocaleString(), icon: DollarSign, href: '#', color: 'bg-green-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                لوحة تحكم الأدمن
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                مرحباً {user?.fullName} 👋
              </p>
            </div>
            <Button onClick={loadStats} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 ml-2" />
              تحديث
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <Link key={index} href={stat.link}>
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {quickLinks.map((item, index) => (
            <Link key={index} href={item.href}>
              <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-4 text-white hover:opacity-90 transition cursor-pointer">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-300 text-sm">{item.title}</p>
                    <p className="text-2xl font-bold mt-1">{item.value}</p>
                  </div>
                  <item.icon className="w-8 h-8 text-gray-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/admin/users">
            <Card className="hover:shadow-md transition">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">إدارة المستخدمين</h3>
                  <p className="text-sm text-gray-500">عرض، تجميد، وحذف المستخدمين</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/kyc">
            <Card className="hover:shadow-md transition">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">طلبات التوثيق (KYC)</h3>
                  <p className="text-sm text-gray-500">مراجعة وقبول طلبات التوثيق</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/trades">
            <Card className="hover:shadow-md transition">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">مراقبة الصفقات</h3>
                  <p className="text-sm text-gray-500">عرض جميع صفقات المنصة</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/disputes">
            <Card className="hover:shadow-md transition">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold">النزاعات</h3>
                  <p className="text-sm text-gray-500">مراقبة وحل نزاعات المستخدمين</p>
                </div>
              </div>
            </Card>
          </Link>

          <Card className="hover:shadow-md transition">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold">سعر الصرف</h3>
                <p className="text-sm text-gray-500">تحديث سعر صرف الدولار</p>
              </div>
            </div>
          </Card>

          <Link href="/admin/audit">
            <Card className="hover:shadow-md transition">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Eye className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold">سجل التدقيق</h3>
                  <p className="text-sm text-gray-500">عرض سجل إجراءات الأدمن</p>
                </div>
              </div>
            </Card>
          </Link>
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