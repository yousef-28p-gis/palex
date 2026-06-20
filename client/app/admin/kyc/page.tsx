'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { adminApi } from '@/lib/api'; // ✅ تم التعديل - استخدام adminApi بدلاً من fetch
import { Button } from '@/components/ui/Button';
import { Loader2, CheckCircle, XCircle, RefreshCw, ArrowLeft, User, Mail, Phone, CreditCard, UserRound, Eye } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface KycRequest {
  id: string;
  fullName: string;
  nationalId: string;
  phone: string;
  bankName: string;
  userId: string;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  idFrontImage: string;
  createdAt: string;
}

function AdminKycContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<KycRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (user && !['super_admin', 'kyc_admin'].includes(user.role)) {
      router.push('/dashboard');
      return;
    }
    loadRequests();
  }, [user, page]);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      // ✅ استخدام adminApi بدلاً من fetch
      const res = await adminApi.getPendingKyc(page);
      setRequests(res.data.data || []);
      setTotal(res.data.meta.total);
      setTotalPages(res.data.meta.totalPages);
    } catch (error) {
      console.error(error);
      toast.error('فشل في تحميل الطلبات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      // ✅ استخدام adminApi بدلاً من fetch
      await adminApi.approveKyc(requestId);
      toast.success('تم قبول طلب التوثيق');
      loadRequests();
    } catch (error) {
      toast.error('فشل القبول');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt('✏️ سبب الرفض:');
    if (!reason) return;
    setProcessingId(requestId);
    try {
      // ✅ استخدام adminApi بدلاً من fetch
      await adminApi.rejectKyc(requestId, reason);
      toast.success('تم رفض الطلب');
      loadRequests();
    } catch (error) {
      toast.error('فشل الرفض');
    } finally {
      setProcessingId(null);
    }
  };

  const getImageUrl = (path: string) => {
    if (!path) return null;
    const cleanPath = path.replace(/\\/g, '/');
    return `http://localhost:4000/${cleanPath}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-8">
            <Link href="/admin/dashboard">
              <button className="p-2 hover:bg-white/10 rounded-xl transition">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            </Link>
            <h1 className="text-2xl font-bold text-white">📋 طلبات توثيق الهوية</h1>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 text-center border border-white/20">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-white text-lg">لا توجد طلبات معلقة</p>
            <p className="text-blue-200 text-sm mt-2">تمت مراجعة جميع الطلبات</p>
          </div>
        </div>
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
              <button className="p-2 hover:bg-white/10 rounded-xl transition">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">📋 طلبات توثيق الهوية</h1>
              <p className="text-blue-200 text-sm">
                <span className="font-semibold text-blue-400">{total}</span> طلب في قائمة الانتظار
              </p>
            </div>
          </div>
          <Button onClick={loadRequests} variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
            <RefreshCw className="w-4 h-4 ml-2" />
            تحديث
          </Button>
        </div>

        {/* قائمة الطلبات - تحت بعض */}
        <div className="space-y-6">
          {requests.map((request, index) => (
            <div key={request.id} className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
              {/* عنوان الطلب */}
              <div className="px-6 py-3 bg-white/5 border-b border-white/10">
                <h3 className="text-white font-semibold">
                  الطلب #{index + 1} - {request.fullName}
                </h3>
                <p className="text-blue-300 text-xs mt-1">
                  تاريخ التقديم: {new Date(request.createdAt).toLocaleDateString('ar')}
                </p>
              </div>

              {/* محتوى الطلب - ثلث معلومات + ثلثان صورة */}
              <div className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* الجانب الأيمن - معلومات مقدم الطلب (ثلث المساحة) */}
                  <div className="lg:w-1/3 space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center border-b border-white/10 pb-2">
                        <span className="text-blue-200 text-sm">الاسم الكامل</span>
                        <span className="text-white font-medium text-sm">{request.fullName}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/10 pb-2">
                        <span className="text-blue-200 text-sm">اسم صاحب الحساب</span>
                        <span className="text-white text-sm">{request.fullName}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/10 pb-2">
                        <span className="text-blue-200 text-sm">البريد الإلكتروني</span>
                        <span className="text-white text-sm">{request.user?.email}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/10 pb-2">
                        <span className="text-blue-200 text-sm">رقم الهوية</span>
                        <span className="text-white font-mono text-sm">{request.nationalId}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/10 pb-2">
                        <span className="text-blue-200 text-sm">رقم الجوال</span>
                        <span className="text-white text-sm">{request.phone}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-blue-200 text-sm">اسم البنك</span>
                        <span className="text-white text-sm">{request.bankName}</span>
                      </div>
                    </div>

                    {/* أزرار القبول/الرفض داخل معلومات مقدم الطلب */}
                    <div className="flex gap-3 pt-4 mt-2">
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={processingId === request.id}
                        className="flex-1 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {processingId === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        قبول
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={processingId === request.id}
                        className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {processingId === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        رفض
                      </button>
                    </div>
                  </div>

                  {/* الجانب الأيسر - صورة الهوية (ثلثي المساحة) */}
                  <div className="lg:w-2/3">
                    <div className="bg-black/20 rounded-xl overflow-hidden flex justify-center items-center min-h-[300px]">
                      {request.idFrontImage ? (
                        <img
                          src={getImageUrl(request.idFrontImage)!}
                          alt="صورة الهوية"
                          className="w-full h-auto max-h-[400px] object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=خطأ+في+تحميل+الصورة';
                          }}
                        />
                      ) : (
                        <p className="text-yellow-400 text-sm p-6">⚠️ لم يرفق المستخدم صورة الهوية</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

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

export default function AdminKycPage() {
  return (
    <ProtectedRoute requiredRoles={['super_admin', 'kyc_admin']}>
      <AdminKycContent />
    </ProtectedRoute>
  );
}