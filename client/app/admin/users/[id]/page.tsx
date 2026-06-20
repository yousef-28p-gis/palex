'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { adminApi, kycApi, userApi } from '@/lib/api'; // ✅ تم التعديل
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { 
  ArrowLeft, User, Mail, Phone, MapPin, Wallet, Shield, 
  CheckCircle, Ban, Loader2, Calendar, TrendingUp, Star,
  Eye, Image as ImageIcon, FileText, Trash2
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function AdminUserDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const userId = params.id as string;
  
  const [user, setUser] = useState<any>(null);
  const [kycRequest, setKycRequest] = useState<any>(null);
  const [bankAccount, setBankAccount] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageTitle, setSelectedImageTitle] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (currentUser && !['super_admin', 'kyc_admin', 'support_admin', 'finance_admin'].includes(currentUser.role)) {
      router.push('/dashboard');
      return;
    }
    loadUserDetails();
  }, [currentUser, userId]);

  const loadUserDetails = async () => {
    setIsLoading(true);
    try {
      // ✅ استخدام adminApi بدلاً من fetch
      const userData = await adminApi.getUserById(userId);
      setUser(userData.data);

      // ✅ استخدام kycApi بدلاً من fetch
      try {
        const kycData = await kycApi.getStatusByUserId(userId);
        if (kycData.data?.request) setKycRequest(kycData.data.request);
      } catch (error) {
        console.error('Failed to load KYC:', error);
      }

      // ✅ استخدام adminApi بدلاً من fetch
      try {
        const bankData = await adminApi.getUserById(userId);
        if (bankData.data?.bankAccount) setBankAccount(bankData.data.bankAccount);
      } catch (error) {
        console.error('Failed to load bank account:', error);
      }

      // ✅ استخدام adminApi بدلاً من fetch
      try {
        const tradesData = await adminApi.getTrades(1);
        const userTrades = tradesData.data.data?.filter((t: any) => t.buyerId === userId || t.sellerId === userId) || [];
        setTrades(userTrades.slice(0, 10));
      } catch (error) {
        console.error('Failed to load trades:', error);
      }
    } catch (error) {
      console.error(error);
      toast.error('فشل في تحميل بيانات المستخدم');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!user) return;
    const days = prompt('عدد أيام التجميد:', '7');
    const reason = prompt('سبب التجميد:', '');
    if (days && reason) {
      try {
        await adminApi.suspendUser(userId, reason, parseInt(days));
        toast.success('تم تجميد المستخدم');
        loadUserDetails();
      } catch (error) {
        toast.error('فشل التجميد');
      }
    }
  };

  const handleUnsuspend = async () => {
    try {
      await adminApi.unsuspendUser(userId);
      toast.success('تم رفع التجميد');
      loadUserDetails();
    } catch (error) {
      toast.error('فشل رفع التجميد');
    }
  };

  const handleDeleteUser = async () => {
    if (!confirm(`⚠️ تحذير!\n\nهل أنت متأكد من حذف المستخدم "${user?.fullName}" نهائياً؟\n\nهذا الإجراء لا يمكن التراجع عنه!`)) {
      return;
    }
    
    setDeleting(true);
    try {
      await adminApi.deleteUser(userId);
      toast.success('تم حذف المستخدم بنجاح');
      router.push('/admin/users');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل حذف المستخدم');
    } finally {
      setDeleting(false);
    }
  };

  const getImageUrl = (path: string) => {
    if (!path) return null;
    const cleanPath = path.replace(/\\/g, '/');
    if (cleanPath.startsWith('uploads/')) {
      return `http://localhost:4000/${cleanPath}`;
    }
    if (cleanPath.startsWith('/uploads/')) {
      return `http://localhost:4000${cleanPath}`;
    }
    return `http://localhost:4000/${cleanPath}`;
  };

  const openImageModal = (imageUrl: string, title: string) => {
    setSelectedImage(imageUrl);
    setSelectedImageTitle(title);
  };

  const closeModal = () => {
    setSelectedImage(null);
    setSelectedImageTitle('');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">المستخدم غير موجود</p>
        <Link href="/admin/users">
          <Button className="mt-4">العودة إلى القائمة</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/users">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">تفاصيل المستخدم</h1>
              <p className="text-gray-500 text-sm mt-1">{user.fullName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* معلومات شخصية وإحصائيات */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="المعلومات الشخصية">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">الاسم الكامل:</span>
                  <span>{user.fullName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">البريد الإلكتروني:</span>
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">رقم الجوال:</span>
                  <span>{user.phone || 'غير مضاف'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">المحافظة:</span>
                  <span>{user.governorate || 'غير مضاف'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">تاريخ التسجيل:</span>
                  <span>{new Date(user.createdAt).toLocaleDateString('ar')}</span>
                </div>
              </div>
            </Card>

            <Card title="المحافظ الرقمية">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 mb-1">محفظة TRC20 (Tron)</p>
                  <code className="text-xs bg-gray-100 p-2 rounded block break-all">
                    {user.trc20Wallet || 'لم يضف بعد'}
                  </code>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">محفظة BEP20 (BSC)</p>
                  <code className="text-xs bg-gray-100 p-2 rounded block break-all">
                    {user.bscWallet || 'لم يضف بعد'}
                  </code>
                </div>
              </div>
            </Card>

            <Card title="إحصائيات التداول">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{user.totalTrades || 0}</p>
                  <p className="text-xs text-gray-500">إجمالي الصفقات</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-xl">
                  <Star className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{user.successRate || 0}%</p>
                  <p className="text-xs text-gray-500">نسبة النجاح</p>
                </div>
              </div>
            </Card>

            <Card title="آخر الصفقات">
              {trades.length === 0 ? (
                <p className="text-gray-500 text-center py-4">لا توجد صفقات</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-right">
                        <th className="px-3 py-2">رقم الصفقة</th>
                        <th className="px-3 py-2">المبلغ</th>
                        <th className="px-3 py-2">الحالة</th>
                        <th className="px-3 py-2">التاريخ</th>
                      </td>
                    </thead>
                    <tbody>
                      {trades.map((t: any) => (
                        <tr key={t.id} className="border-t">
                          <td className="px-3 py-2 font-mono text-xs">{t.tradeReference}</td>
                          <td className="px-3 py-2">{t.amountUsdt} USDT</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              t.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {t.status}
                            </span>
                           </td>
                          <td className="px-3 py-2 text-xs">{new Date(t.createdAt).toLocaleDateString('ar')}</td>
                        </td>
                      ))}
                    </tbody>
                   </table>
                </div>
              )}
            </Card>
          </div>

          {/* الشريط الجانبي */}
          <div className="space-y-6">
            <Card title="حالة الحساب">
              <div className="text-center">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 ${
                  user.isSuspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  {user.isSuspended ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  <span>{user.isSuspended ? 'موقوف' : 'نشط'}</span>
                </div>
                {user.isSuspended && user.suspensionReason && (
                  <p className="text-sm text-gray-600 mt-2">السبب: {user.suspensionReason}</p>
                )}
                {user.isSuspended ? (
                  <Button onClick={handleUnsuspend} variant="outline" className="w-full mt-3">
                    رفع التجميد
                  </Button>
                ) : (
                  <Button onClick={handleSuspend} variant="danger" className="w-full mt-3">
                    تجميد الحساب
                  </Button>
                )}
                {currentUser?.role === 'super_admin' && (
                  <button
                    onClick={handleDeleteUser}
                    disabled={deleting}
                    className="w-full mt-2 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    حذف المستخدم نهائياً
                  </button>
                )}
              </div>
            </Card>

            {/* مستندات KYC */}
            <Card title="مستندات توثيق الهوية">
              {kycRequest ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">حالة الطلب:</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      kycRequest.status === 'approved' ? 'bg-green-100 text-green-700' : 
                      kycRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {kycRequest.status === 'approved' ? 'موثق' : 
                       kycRequest.status === 'pending' ? 'قيد المراجعة' : 'مرفوض'}
                    </span>
                  </div>
                  {kycRequest.idFrontImage && (
                    <div>
                      <p className="text-sm font-medium mb-1">صورة الهوية (الجهة الأمامية)</p>
                      <button 
                        onClick={() => openImageModal(getImageUrl(kycRequest.idFrontImage)!, 'صورة الهوية (الجهة الأمامية)')} 
                        className="w-full p-2 border rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50"
                      >
                        <ImageIcon className="w-4 h-4" /> عرض الصورة
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">لم يقدم المستخدم طلب توثيق بعد</p>
              )}
            </Card>

            {/* مستندات الحساب البنكي */}
            {bankAccount && bankAccount.proofImageUrl && (
              <Card title="إثبات الحساب البنكي">
                <div>
                  <p className="text-sm text-gray-500">البنك: {bankAccount.bankName}</p>
                  <p className="text-sm text-gray-500">رقم الحساب: {bankAccount.accountNumber}</p>
                  <button 
                    onClick={() => openImageModal(getImageUrl(bankAccount.proofImageUrl)!, 'إثبات الحساب البنكي')} 
                    className="w-full mt-3 p-2 border rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50"
                  >
                    <FileText className="w-4 h-4" /> عرض الإثبات
                  </button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* نافذة عرض الصورة */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="relative max-w-4xl w-full bg-white rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold">{selectedImageTitle}</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
            </div>
            <div className="p-4 flex justify-center">
              <img src={selectedImage} alt={selectedImageTitle} className="max-w-full max-h-[70vh] object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminUserDetailPage() {
  return (
    <ProtectedRoute requiredRoles={['super_admin', 'kyc_admin', 'support_admin', 'finance_admin']}>
      <AdminUserDetailContent />
    </ProtectedRoute>
  );
}