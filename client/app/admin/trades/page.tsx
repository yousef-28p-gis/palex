'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { adminApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Eye, Loader2, TrendingUp, Clock, CheckCircle, XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface Trade {
  id: string;
  tradeReference: string;
  amountUsdt: number;
  status: string;
  seller: { fullName: string };
  buyer: { fullName: string };
  createdAt: string;
}

function AdminTradesContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (user && !['super_admin', 'finance_admin'].includes(user.role)) {
      router.push('/dashboard');
    }
    loadTrades();
  }, [user, page, statusFilter]);

  const loadTrades = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getTrades(page, statusFilter !== 'all' ? statusFilter : undefined);
      const tradesData = response.data.data || [];
      setTrades(tradesData);
      setTotal(response.data.meta.total);
      setTotalPages(response.data.meta.totalPages);
    } catch (error) {
      console.error('Failed to load trades:', error);
      toast.error('فشل في تحميل الصفقات');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return { label: 'مكتملة', color: 'bg-green-100 text-green-700', icon: CheckCircle };
      case 'active':
        return { label: 'نشطة', color: 'bg-blue-100 text-blue-700', icon: Clock };
      case 'waiting_seller_deposit':
        return { label: 'انتظار إيداع', color: 'bg-yellow-100 text-yellow-700', icon: Clock };
      case 'waiting_seller_confirmation':
        return { label: 'انتظار تأكيد', color: 'bg-orange-100 text-orange-700', icon: Clock };
      case 'dispute_opened':
        return { label: 'نزاع', color: 'bg-red-100 text-red-700', icon: XCircle };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-700', icon: Clock };
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">مراقبة الصفقات</h1>
              <p className="text-gray-500 text-sm mt-1">إجمالي الصفقات: {total}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'active', 'completed', 'dispute_opened'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm transition ${
                statusFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter === 'all' ? 'الكل' : 
               filter === 'active' ? 'نشطة' :
               filter === 'completed' ? 'مكتملة' : 'نزاعات'}
            </button>
          ))}
          <Button onClick={loadTrades} variant="outline" size="sm" className="mr-auto">
            <RefreshCw className="w-4 h-4 ml-2" />
            تحديث
          </Button>
        </div>

        {trades.length === 0 ? (
          <Card className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">لا توجد صفقات</p>
          </Card>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-right">
                    <th className="px-6 py-3 text-sm font-medium text-gray-500">رقم الصفقة</th>
                    <th className="px-6 py-3 text-sm font-medium text-gray-500">المبلغ</th>
                    <th className="px-6 py-3 text-sm font-medium text-gray-500">البائع</th>
                    <th className="px-6 py-3 text-sm font-medium text-gray-500">المشتري</th>
                    <th className="px-6 py-3 text-sm font-medium text-gray-500">الحالة</th>
                    <th className="px-6 py-3 text-sm font-medium text-gray-500">التاريخ</th>
                    <th className="px-6 py-3 text-sm font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {trades.map((trade) => {
                    const status = getStatusBadge(trade.status);
                    return (
                      <tr key={trade.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-mono text-sm">{trade.tradeReference}</td>
                        <td className="px-6 py-4 font-medium">{trade.amountUsdt} USDT</td>
                        <td className="px-6 py-4">{trade.seller?.fullName || 'غير معروف'}</td>
                        <td className="px-6 py-4">{trade.buyer?.fullName || 'غير معروف'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${status.color}`}>
                            <status.icon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(trade.createdAt).toLocaleDateString('ar')}
                        </td>
                        <td className="px-6 py-4">
                          <Link href={`/admin/trades/${trade.id}`}>
                            <button className="text-blue-600 hover:text-blue-700">
                              <Eye className="w-5 h-5" />
                            </button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
                <p className="text-sm text-gray-500">صفحة {page} من {totalPages}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    السابق
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminTradesPage() {
  return (
    <ProtectedRoute requiredRoles={['super_admin', 'finance_admin']}>
      <AdminTradesContent />
    </ProtectedRoute>
  );
}