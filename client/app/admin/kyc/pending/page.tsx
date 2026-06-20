'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { adminApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Eye, CheckCircle, XCircle, Loader2, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function AdminKycPendingContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && !['super_admin', 'kyc_admin'].includes(user.role)) {
      router.push('/dashboard');
      return;
    }
    loadRequests();
  }, [user]);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getPendingKyc();
      setRequests(res.data.data);
    } catch (error) {
      console.error(error);
      toast.error('فشل في تحميل الطلبات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await adminApi.approveKyc(requestId);
      toast.success('تم قبول الطلب');
      loadRequests();
    } catch (error) {
      toast.error('فشل القبول');
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt('سبب الرفض:', '');
    if (reason) {
      try {
        await adminApi.rejectKyc(requestId, reason);
        toast.success('تم رفض الطلب');
        loadRequests();
      } catch (error) {
        toast.error('فشل الرفض');
      }
    }
  };

  const getImageUrl = (path: string) => {
    if (!path) return null;
    const cleanPath = path.replace(/\\/g, '/');
    return `http://localhost:4000/${cleanPath}`;
  };

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
              <h1 className="text-2xl font-bold text-gray-800">طلبات توثيق الهوية</h1>
              <p className="text-gray-500 text-sm mt-1">الطلبات المعلقة: {requests.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-end mb-4">
          <Button onClick={loadRequests} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 ml-2" />
            تحديث
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : requests.length === 0 ? (
          <Card className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500">لا توجد طلبات توثيق معلقة</p>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {requests.map((req) => (
              <div key={req.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{req.fullName}</h3>
                      <p className="text-sm text-gray-500">{req.user?.email}</p>
                    </div>
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">قيد المراجعة</span>
                  </div>
                  <div className="space-y-2 text-sm mb-4">
                    <p><span className="text-gray-500">رقم الهوية:</span> {req.nationalId}</p>
                    <p><span className="text-gray-500">المحافظة:</span> {req.governorate}</p>
                    <p><span className="text-gray-500">تاريخ التقديم:</span> {new Date(req.createdAt).toLocaleDateString('ar')}</p>
                  </div>
                  <div className="flex gap-2 mb-4">
                    {req.idFrontImage && (
                      <button
                        onClick={() => window.open(getImageUrl(req.idFrontImage)!, '_blank')}
                        className="flex-1 py-2 border rounded-lg text-sm flex items-center justify-center gap-1 hover:bg-gray-50"
                      >
                        <Eye className="w-4 h-4" /> صورة الهوية
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleApprove(req.id)} className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" /> قبول
                    </button>
                    <button onClick={() => handleReject(req.id)} className="flex-1 py-2 border border-red-500 text-red-600 rounded-lg hover:bg-red-50 flex items-center justify-center gap-2">
                      <XCircle className="w-4 h-4" /> رفض
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminKycPendingPage() {
  return (
    <ProtectedRoute requiredRoles={['super_admin', 'kyc_admin']}>
      <AdminKycPendingContent />
    </ProtectedRoute>
  );
}