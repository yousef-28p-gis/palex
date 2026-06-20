'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { 
  AlertTriangle, Loader2, ArrowLeft, RefreshCw,
  CheckCircle, Clock, XCircle, User, Shield,
  DollarSign, Send, Link2, ImageIcon, Eye
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function AdminDisputeDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const disputeId = params.id as string;
  
  const [dispute, setDispute] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (user && !['super_admin', 'support_admin'].includes(user.role)) {
      router.push('/dashboard');
      return;
    }
    loadDispute();
  }, [disputeId]);

  const loadDispute = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminApi.getDisputes(1);
      const allDisputes = response.data.data || [];
      const foundDispute = allDisputes.find((d: any) => d.id === disputeId);
      
      if (foundDispute) {
        setDispute(foundDispute);
      } else {
        setError('النزاع غير موجود');
      }
    } catch (error: any) {
      setError('فشل في تحميل بيانات النزاع');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!resolution) {
      toast.error('يرجى اختيار قرار الحل');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await adminApi.resolveDispute(disputeId, { resolution, resolutionNotes });
      toast.success('تم حل النزاع بنجاح');
      loadDispute();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في حل النزاع');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'opened':
        return { label: 'مفتوح', color: 'bg-yellow-500/20 text-yellow-300', icon: <AlertTriangle className="w-4 h-4" /> };
      case 'resolved':
        return { label: 'تم الحل', color: 'bg-green-500/20 text-green-300', icon: <CheckCircle className="w-4 h-4" /> };
      default:
        return { label: status, color: 'bg-gray-500/20 text-gray-300', icon: <Clock className="w-4 h-4" /> };
    }
  };

  // استخدام tradeSnapshot (البيانات المخزنة عند فتح النزاع)
  const trade = dispute?.trade;
  const seller = trade?.seller;
  const buyer = trade?.buyer;
  
  const amount = Number(trade?.amountUsdt) || 0;
  const pricePerUsdt = Number(trade?.pricePerUsdt) || 0;
  const currencySymbol = trade?.fiatCurrency === 'ils' ? '₪' : '$';
  const platformFee = amount * 0.01;
  const networkFee = 1.5;
  const netAmount = amount - platformFee - networkFee;
  const totalFiat = amount * pricePerUsdt;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !dispute) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/admin/disputes">
              <button className="p-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <h1 className="text-2xl font-bold text-white">تفاصيل النزاع</h1>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 text-center border border-white/20">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-white mb-2">{error || 'النزاع غير موجود'}</p>
            <button onClick={loadDispute} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    );
  }

  const status = getStatusBadge(dispute.status);
  const isResolved = dispute.status === 'resolved';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin/disputes">
              <button className="p-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">{trade?.tradeReference || 'غير معروف'}</h1>
              <p className="text-blue-200 text-sm mt-1">
                {amount} USDT - {status.label}
              </p>
            </div>
          </div>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${status.color}`}>
            {status.icon}
            {status.label}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* تفاصيل الدفع */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">تفاصيل الدفع</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-blue-300">💰 المبلغ الإجمالي:</span>
                  <span className="text-white font-medium">{amount} USDT</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-blue-300">💵 السعر:</span>
                  <span className="text-white">{pricePerUsdt} {currencySymbol}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-blue-300">🏦 إجمالي المبلغ المطلوب تحويله:</span>
                  <span className="text-white font-bold">{totalFiat.toFixed(2)} {currencySymbol}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-blue-300">🏢 عمولة المنصة (1%):</span>
                  <span className="text-yellow-300">{platformFee.toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-blue-300">🌐 رسوم الشبكة:</span>
                  <span className="text-yellow-300">{networkFee} USDT</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-white font-semibold">✅ صافي ما تستلمه:</span>
                  <span className="text-green-400 font-bold">{netAmount.toFixed(2)} USDT</span>
                </div>
              </div>
            </div>

            {/* تفاصيل النزاع */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">تفاصيل النزاع</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-blue-300 text-sm mb-1">سبب النزاع</p>
                  <p className="text-white">{dispute.reason || 'غير محدد'}</p>
                </div>
                <div>
                  <p className="text-blue-300 text-sm mb-1">الوصف</p>
                  <p className="text-white">{dispute.description || 'لا يوجد وصف'}</p>
                </div>
                <div className="pt-2 text-sm text-blue-400">
                  <p>تاريخ الفتح: {new Date(dispute.createdAt).toLocaleString('ar')}</p>
                </div>
              </div>
            </div>

            {/* الأدلة المرفوعة */}
            {dispute.evidenceUrls && dispute.evidenceUrls.length > 0 && (
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-purple-400" />
                  الأدلة المرفوعة
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {dispute.evidenceUrls.map((url: string, index: number) => {
                    let imageUrl = url;
                    if (url && (url.startsWith('/uploads/') || url.startsWith('uploads/'))) {
                      imageUrl = `http://localhost:4000/${url.replace(/^\/+/, '')}`;
                    }
                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(imageUrl)}
                        className="relative group cursor-pointer"
                      >
                        <img
                          src={imageUrl}
                          alt={`Evidence ${index + 1}`}
                          className="w-full h-32 object-cover rounded-xl border border-white/20 hover:border-blue-500 transition"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/400x200?text=خطأ+في+تحميل+الصورة';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <Eye className="w-6 h-6 text-white" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* حل النزاع */}
            {!isResolved && (
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
                <h2 className="text-xl font-bold text-white mb-4">حل النزاع</h2>
                <div className="space-y-4">
                  <select
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  >
                    <option value="" className="bg-gray-800">اختر القرار</option>
                    <option value="release_to_buyer" className="bg-gray-800">تحرير USDT للمشتري</option>
                    <option value="refund_to_seller" className="bg-gray-800">إعادة USDT إلى البائع</option>
                  </select>
                  <textarea
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 resize-none"
                    rows={3}
                    placeholder="ملاحظات الحل (اختياري)"
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                  />
                  <Button onClick={handleResolve} loading={isSubmitting} className="w-full">
                    <Send className="w-4 h-4 ml-2" />
                    تطبيق القرار
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - المستخدمين */}
          <div className="space-y-6">
            {/* البائع */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                البائع
              </h3>
              <Link href={`/admin/users/${seller?.id}`}>
                <div className="flex items-center gap-3 cursor-pointer hover:bg-white/5 rounded-xl p-2 transition">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white hover:text-green-400 transition">
                      {seller?.fullName || 'غير معروف'}
                    </p>
                    <p className="text-xs text-blue-400">{seller?.email || ''}</p>
                  </div>
                  <Link2 className="w-4 h-4 text-blue-400 mr-auto" />
                </div>
              </Link>
            </div>

            {/* المشتري */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                المشتري
              </h3>
              <Link href={`/admin/users/${buyer?.id}`}>
                <div className="flex items-center gap-3 cursor-pointer hover:bg-white/5 rounded-xl p-2 transition">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white hover:text-blue-400 transition">
                      {buyer?.fullName || 'غير معروف'}
                    </p>
                    <p className="text-xs text-blue-400">{buyer?.email || ''}</p>
                  </div>
                  <Link2 className="w-4 h-4 text-blue-400 mr-auto" />
                </div>
              </Link>
            </div>

            {/* مفتتح النزاع */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                مفتتح النزاع
              </h3>
              <Link href={`/admin/users/${dispute.openedBy?.id}`}>
                <div className="flex items-center gap-3 cursor-pointer hover:bg-white/5 rounded-xl p-2 transition">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white hover:text-yellow-400 transition">
                      {dispute.openedBy?.fullName || 'غير معروف'}
                    </p>
                    <p className="text-xs text-blue-400">{dispute.openedBy?.email || ''}</p>
                  </div>
                  <Link2 className="w-4 h-4 text-blue-400 mr-auto" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modal لعرض الصورة */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl w-full bg-white dark:bg-gray-800 rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
              <h3 className="font-semibold dark:text-white">صورة الدليل</h3>
              <button onClick={() => setSelectedImage(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl">&times;</button>
            </div>
            <div className="p-4 flex justify-center">
              <img src={selectedImage} alt="Evidence" className="max-w-full max-h-[70vh] object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDisputeDetailPage() {
  return (
    <ProtectedRoute requiredRoles={['super_admin', 'support_admin']}>
      <AdminDisputeDetailContent />
    </ProtectedRoute>
  );
}