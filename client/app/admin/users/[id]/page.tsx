'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { adminApi, kycApi, userApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, User, Mail, Phone, MapPin, Wallet, Shield, CheckCircle, Ban, Loader2, Calendar, TrendingUp, Star, Eye, ImageIcon, FileText, Trash2 } from 'lucide-react';
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
  const [suspending, setSuspending] = useState(false);
  const [unsuspending, setUnsuspending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const fetchData = async () => {
      try {
        const [userRes, kycRes] = await Promise.all([
          adminApi.getUserById(userId),
          kycApi.getStatusByUserId(userId),
        ]);
        setUser(userRes.data);
        setKycRequest(kycRes.data);
      } catch (error: any) {
        if (error.response?.status === 404) setUser(null);
        else toast.error('فشل في تحميل بيانات المستخدم');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  const handleSuspendUser = async () => {
    const reason = prompt('سبب التجميد:');
    if (!reason) return;
    const days = parseInt(prompt('مدة التجميد (بالأيام):') || '0', 10);
    if (!days) return;
    setSuspending(true);
    try {
      await adminApi.suspendUser(userId, reason, days);
      toast.success('تم تجميد المستخدم بنجاح');
      const res = await adminApi.getUserById(userId);
      setUser(res.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل تجميد المستخدم');
    } finally {
      setSuspending(false);
    }
  };

  const handleUnsuspendUser = async () => {
    setUnsuspending(true);
    try {
      await adminApi.unsuspendUser(userId);
      toast.success('تم رفع التجميد عن المستخدم');
      const res = await adminApi.getUserById(userId);
      setUser(res.data);
    } catch (error: any) {
      toast.error('فشل رفع التجميد');
    } finally {
      setUnsuspending(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirm(`⚠️ تحذير!\n\nهل أنت متأكد من حذف المستخدم "${user?.fullName}" نهائياً؟\n\nهذا الإجراء لا يمكن التراجع عنه!`)) return;
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

  const getImageUrl = (path: string): string => {
    if (!path) return '';
    const cleanPath = path.replace(/\\/g, '/');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
    if (cleanPath.startsWith('uploads/')) return `${baseUrl}/${cleanPath}`;
    if (cleanPath.startsWith('/uploads/')) return `${baseUrl}${cleanPath}`;
    return `${baseUrl}/${cleanPath}`;
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

      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{user.fullName}</h2>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm mt-2 ${
                      user.role === 'admin' ? 'bg-red-100 text-red-700' :
                      user.kycStatus === 'verified' ? 'bg-green-100 text-green-700' :
                      user.kycStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                      user.kycStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {user.role === 'admin' ? 'مشرف' :
                       user.kycStatus === 'verified' ? 'موثق' :
                       user.kycStatus === 'rejected' ? 'مرفوض' :
                       user.kycStatus === 'pending' ? 'قيد المراجعة' : 'غير موثق'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">البريد الإلكتروني</p>
                      <p className="font-medium">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">رقم الهاتف</p>
                      <p className="font-medium">{user.phone || 'غير محدد'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">المحافظة</p>
                      <p className="font-medium">{user.governorate || 'غير محدد'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Wallet className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">المحفظة (TRC20)</p>
                      <p className="font-medium text-sm">{user.trc20Wallet || 'غير محدد'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h3 className="text-lg font-bold mb-4">إحصائيات التداول</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-600">{user.totalTrades || 0}</p>
                    <p className="text-sm text-gray-500">إجمالي الصفقات</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">{user.successRate || 0}%</p>
                    <p className="text-sm text-gray-500">معدل النجاح</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <Star className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-yellow-600">{user.averageRating || 0}</p>
                    <p className="text-sm text-gray-500">التقييم</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Calendar className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-purple-600 mt-2">
                      {new Date(user.createdAt).toLocaleDateString('ar-EG')}
                    </p>
                    <p className="text-sm text-gray-500">تاريخ التسجيل</p>
                  </div>
                </div>
              </div>
            </Card>

            {kycRequest && (
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-bold mb-4">مستندات KYC</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium">الوثائق المرفوعة</p>
                          <p className="text-sm text-gray-500">الحالة: {
                            kycRequest.status === 'approved' ? 'مقبولة' :
                            kycRequest.status === 'rejected' ? 'مرفوضة' : 'قيد المراجعة'
                          }</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {kycRequest.idFrontUrl && (
                          <button onClick={() => openImageModal(getImageUrl(kycRequest.idFrontUrl)!, 'الوجه الأمامي للهوية')}
                            className="p-2 hover:bg-gray-200 rounded-lg transition">
                            <ImageIcon className="w-5 h-5 text-blue-600" />
                          </button>
                        )}
                        {kycRequest.idBackUrl && (
                          <button onClick={() => openImageModal(getImageUrl(kycRequest.idBackUrl), 'الوجه الخلفي للهوية')}
                            className="p-2 hover:bg-gray-200 rounded-lg transition">
                            <Eye className="w-5 h-5 text-blue-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-bold mb-4">الإجراءات</h3>
                <div className="space-y-3">
                  {user.suspended ? (
                    <Button onClick={handleUnsuspendUser} disabled={unsuspending} className="w-full bg-green-600 hover:bg-green-700">
                      {unsuspending ? 'جاري رفع التجميد...' : '🔓 رفع التجميد'}
                    </Button>
                  ) : (
                    <Button onClick={handleSuspendUser} disabled={suspending} className="w-full bg-red-600 hover:bg-red-700">
                      {suspending ? 'جاري التجميد...' : '🔒 تجميد المستخدم'}
                    </Button>
                  )}
                  <Button onClick={handleDeleteUser} disabled={deleting} className="w-full bg-gray-600 hover:bg-gray-700">
                    {deleting ? 'جاري الحذف...' : '🗑️ حذف المستخدم'}
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h3 className="text-lg font-bold mb-4">معلومات الأمان</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Shield className={`w-5 h-5 ${user.twoFactorEnabled ? 'text-green-500' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-sm text-gray-500">المصادقة الثنائية</p>
                      <p className={`font-medium ${user.twoFactorEnabled ? 'text-green-600' : 'text-gray-600'}`}>
                        {user.twoFactorEnabled ? 'مفعلة' : 'غير مفعلة'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Ban className={`w-5 h-5 ${user.suspended ? 'text-red-500' : 'text-green-500'}`} />
                    <div>
                      <p className="text-sm text-gray-500">حالة التجميد</p>
                      <p className={`font-medium ${user.suspended ? 'text-red-600' : 'text-green-600'}`}>
                        {user.suspended ? `مجمّد حتى ${new Date(user.suspendedUntil).toLocaleDateString('ar-EG')}` : 'غير مجمّد'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="relative max-w-3xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button onClick={closeModal} className="absolute -top-10 right-0 text-white hover:text-gray-300 text-lg">
              ✕ إغلاق
            </button>
            <h3 className="text-white text-lg mb-2">{selectedImageTitle}</h3>
            <img src={selectedImage} alt={selectedImageTitle} className="max-w-full max-h-[80vh] rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminUserDetailPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <AdminUserDetailContent />
    </ProtectedRoute>
  );
}
