'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { 
  AlertTriangle, Eye, Loader2, RefreshCw, ArrowLeft,
  CheckCircle, Clock, XCircle, Filter, Search, Shield
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface Dispute {
  id: string;
  tradeId: string;
  trade: {
    tradeReference: string;
    amountUsdt: number;
  };
  reason: string;
  description: string;
  status: string;
  openedBy: {
    fullName: string;
    email: string;
  };
  createdAt: string;
  resolvedAt?: string;
}

function AdminDisputesContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (user && !['super_admin', 'support_admin'].includes(user.role)) {
      router.push('/dashboard');
      return;
    }
    loadDisputes();
  }, [user, page, filter]);

  const loadDisputes = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getDisputes(page);
      let disputesData = res.data.data || [];
      
      if (filter !== 'all') {
        disputesData = disputesData.filter((d: Dispute) => d.status === filter);
      }
      
      if (searchTerm) {
        disputesData = disputesData.filter((d: Dispute) => 
          d.trade?.tradeReference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.openedBy?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setDisputes(disputesData);
      setTotal(res.data.meta.total);
      setTotalPages(res.data.meta.totalPages);
    } catch (error) {
      console.error(error);
      toast.error('فشل في تحميل النزاعات');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'opened':
        return { label: 'مفتوح', color: 'bg-yellow-500/20 text-yellow-300', icon: <AlertTriangle className="w-3 h-3" /> };
      case 'under_review':
        return { label: 'قيد المراجعة', color: 'bg-blue-500/20 text-blue-300', icon: <Clock className="w-3 h-3" /> };
      case 'resolved':
        return { label: 'تم الحل', color: 'bg-green-500/20 text-green-300', icon: <CheckCircle className="w-3 h-3" /> };
      default:
        return { label: status, color: 'bg-gray-500/20 text-gray-300', icon: <XCircle className="w-3 h-3" /> };
    }
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
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard">
              <button className="p-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">إدارة النزاعات</h1>
              <p className="text-blue-200 text-sm mt-1">مراقبة وحل نزاعات المستخدمين</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button onClick={loadDisputes} className="p-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition">
              <RefreshCw className="w-5 h-5" />
            </button>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="بحث برقم الصفقة أو اسم المستخدم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-64 pr-10 pl-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20">
            <p className="text-blue-200 text-sm mb-1">إجمالي النزاعات</p>
            <p className="text-2xl font-bold text-white">{total}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20">
            <p className="text-blue-200 text-sm mb-1">نزاعات مفتوحة</p>
            <p className="text-2xl font-bold text-yellow-400">{disputes.filter(d => d.status === 'opened').length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20">
            <p className="text-blue-200 text-sm mb-1">نزاعات محلولة</p>
            <p className="text-2xl font-bold text-green-400">{disputes.filter(d => d.status === 'resolved').length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-blue-300" />
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm transition ${filter === 'all' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-200 hover:text-white hover:bg-white/10'}`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilter('opened')}
              className={`px-4 py-2 rounded-lg text-sm transition ${filter === 'opened' ? 'bg-yellow-600 text-white shadow-lg' : 'text-blue-200 hover:text-white hover:bg-white/10'}`}
            >
              مفتوحة
            </button>
            <button
              onClick={() => setFilter('resolved')}
              className={`px-4 py-2 rounded-lg text-sm transition ${filter === 'resolved' ? 'bg-green-600 text-white shadow-lg' : 'text-blue-200 hover:text-white hover:bg-white/10'}`}
            >
              محلولة
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-blue-200">
            <span className="font-semibold text-white">{disputes.length}</span> نزاع
          </p>
        </div>

        {/* Disputes List */}
        {disputes.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 text-center border border-white/20">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-1">لا توجد نزاعات</h3>
            <p className="text-blue-200 text-sm">جميع النزاعات محلولة</p>
          </div>
        ) : (
          <div className="space-y-4">
            {disputes.map((dispute) => {
              const status = getStatusBadge(dispute.status);
              return (
                <Link href={`/admin/disputes/${dispute.id}`} key={dispute.id}>
                  <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5 hover:bg-white/15 transition cursor-pointer">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <span className="font-mono text-sm text-blue-300">
                            {dispute.trade?.tradeReference || 'غير معروف'}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${status.color}`}>
                            {status.icon}
                            {status.label}
                          </span>
                        </div>
                        <p className="font-medium text-white">{dispute.reason}</p>
                        <p className="text-sm text-blue-300 line-clamp-1">{dispute.description}</p>
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-blue-400">
                          <span>فتح بواسطة: {dispute.openedBy?.fullName || 'غير معروف'}</span>
                          <span>التاريخ: {new Date(dispute.createdAt).toLocaleString('ar')}</span>
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
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition disabled:opacity-50">السابق</button>
            <span className="px-4 py-2 text-white">صفحة {page} من {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition disabled:opacity-50">التالي</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDisputesPage() {
  return (
    <ProtectedRoute requiredRoles={['super_admin', 'support_admin']}>
      <AdminDisputesContent />
    </ProtectedRoute>
  );
}