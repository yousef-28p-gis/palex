'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { 
  Search, Loader2, Ban, CheckCircle, Eye, RefreshCw, 
  ArrowLeft, Trash2, UserPlus, Filter
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface UserData {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: string;
  kycStatus: string;
  totalTrades: number;
  isSuspended: boolean;
  createdAt: string;
}

function AdminUsersContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);

  useEffect(() => {
    if (user && !['super_admin', 'kyc_admin', 'support_admin', 'finance_admin'].includes(user.role)) {
      router.push('/dashboard');
      return;
    }
    loadUsers();
  }, [user, page, searchTerm]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getUsers(page, searchTerm);
      setUsers(res.data.data);
      setTotal(res.data.meta.total);
      setTotalPages(res.data.meta.totalPages);
    } catch (error) {
      console.error(error);
      toast.error('فشل في تحميل المستخدمين');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspend = async (userId: string, currentStatus: boolean, userName: string) => {
    if (currentStatus) {
      if (!confirm(`هل أنت متأكد من رفع التجميد عن المستخدم "${userName}"؟`)) return;
      setSuspendingId(userId);
      try {
        await adminApi.unsuspendUser(userId);
        toast.success('تم رفع التجميد عن المستخدم');
        loadUsers();
      } catch (error) {
        toast.error('فشل رفع التجميد');
      } finally {
        setSuspendingId(null);
      }
    } else {
      const days = prompt('عدد أيام التجميد:', '7');
      const reason = prompt('سبب التجميد:', '');
      if (days && reason) {
        setSuspendingId(userId);
        try {
          await adminApi.suspendUser(userId, reason, parseInt(days));
          toast.success(`تم تجميد المستخدم لمدة ${days} أيام`);
          loadUsers();
        } catch (error) {
          toast.error('فشل التجميد');
        } finally {
          setSuspendingId(null);
        }
      }
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`⚠️ تحذير!\n\nهل أنت متأكد من حذف المستخدم "${userName}" نهائياً؟\n\nهذا الإجراء لا يمكن التراجع عنه وسيتم حذف جميع بيانات المستخدم.`)) {
      return;
    }
    
    setDeletingId(userId);
    try {
      await adminApi.deleteUser(userId);
      toast.success('تم حذف المستخدم بنجاح');
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل حذف المستخدم');
    } finally {
      setDeletingId(null);
    }
  };

  const getKycBadge = (status: string) => {
    switch (status) {
      case 'approved': return { label: 'موثق', color: 'bg-green-100 text-green-700' };
      case 'pending': return { label: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-700' };
      default: return { label: 'غير موثق', color: 'bg-gray-100 text-gray-600' };
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin': return { label: 'سوبر أدمن', color: 'bg-red-100 text-red-700' };
      case 'kyc_admin': return { label: 'أدمن KYC', color: 'bg-purple-100 text-purple-700' };
      case 'support_admin': return { label: 'أدمن دعم', color: 'bg-blue-100 text-blue-700' };
      case 'finance_admin': return { label: 'أدمن مالي', color: 'bg-green-100 text-green-700' };
      default: return { label: 'مستخدم', color: 'bg-gray-100 text-gray-600' };
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">إدارة المستخدمين</h1>
              <p className="text-gray-500 text-sm mt-1">إجمالي المستخدمين: {total}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="بحث بالاسم أو البريد الإلكتروني..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button onClick={loadUsers} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 ml-2" />
              تحديث
            </Button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-right">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500">المستخدم</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500">البريد الإلكتروني</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500">الدور</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500">حالة KYC</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500">عدد الصفقات</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500">الحالة</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => {
                  const kycBadge = getKycBadge(u.kycStatus);
                  const roleBadge = getRoleBadge(u.role);
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link href={`/admin/users/${u.id}`} className="text-blue-600 hover:underline font-medium">
                          {u.fullName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${roleBadge.color}`}>
                          {roleBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${kycBadge.color}`}>
                          {kycBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{u.totalTrades || 0}</td>
                      <td className="px-6 py-4">
                        {u.isSuspended ? (
                          <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">موقوف</span>
                        ) : (
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">نشط</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSuspend(u.id, u.isSuspended, u.fullName)}
                            disabled={suspendingId === u.id}
                            className={u.isSuspended ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'}
                            title={u.isSuspended ? 'رفع التجميد' : 'تجميد'}
                          >
                            {suspendingId === u.id ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                              u.isSuspended ? <CheckCircle className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                          </button>
                          <Link href={`/admin/users/${u.id}`}>
                            <Eye className="w-5 h-5 text-blue-600 cursor-pointer hover:text-blue-700" />
                          </Link>
                          {user?.role === 'super_admin' && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.fullName)}
                              disabled={deletingId === u.id}
                              className="text-red-600 hover:text-red-700 disabled:opacity-50"
                              title="حذف المستخدم نهائياً"
                            >
                              {deletingId === u.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                            </button>
                          )}
                        </div>
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
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <ProtectedRoute requiredRoles={['super_admin', 'kyc_admin', 'support_admin', 'finance_admin']}>
      <AdminUsersContent />
    </ProtectedRoute>
  );
}