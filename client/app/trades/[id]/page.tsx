'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { tradesApi, ratesApi, reviewsApi } from '@/lib/api';
import { Button, ConfirmModal } from '@/components/ui';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTradeWebSocket } from '@/hooks/useTradeWebSocket';
import { onTradeEvent } from '@/lib/socket';
import { useSoundNotification } from '@/components/ui/SoundNotification';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Clock, CheckCircle, AlertTriangle, 
  Copy, Check, User, Banknote, Image, Loader2,
  ArrowLeft, Shield, DollarSign, Calendar, XCircle, Upload,
  Wallet, TrendingUp, Percent, Info, Star, MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

function TradeDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const tradeId = params.id as string;
  
  const [trade, setTrade] = useState<any>(null);
  const [offer, setOffer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [bankName, setBankName] = useState('');
  const [last4Digits, setLast4Digits] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remainingTime, setRemainingTime] = useState('');
  const [hasExpired, setHasExpired] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ✅ حالة ConfirmModal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    consequences?: string[];
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  
  const openConfirm = (config: Omit<typeof confirmModal, 'isOpen'>) => {
    setConfirmModal({ ...config, isOpen: true });
  };
  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));
  
  const [currentNetworkFee, setCurrentNetworkFee] = useState<number | null>(null);
  const [feesLoading, setFeesLoading] = useState(true);

  // ✅ حالة التقييم
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [existingReview, setExistingReview] = useState<any>(null);
  const [hasExistingReview, setHasExistingReview] = useState(false);

  // WebSocket للإشعارات الفورية
  const { notification: wsNotification, clearNotification: clearWsNotification } = useTradeWebSocket();
  const { showNotification, NotificationComponent, clearNotification } = useSoundNotification();
  const queryClient = useQueryClient();

  // عرض إشعارات WebSocket
  useEffect(() => {
    if (wsNotification) {
      showNotification(
        wsNotification.type as any,
        wsNotification.message,
        wsNotification.title,
      );
      clearWsNotification();
    }
  }, [wsNotification, showNotification, clearWsNotification]);

  // 🔄 إعادة تحميل الصفقة تلقائياً عند استقبال حدث WebSocket خاص بهذه الصفقة
  useEffect(() => {
    if (!tradeId) return;
    
    const unsubscribe = onTradeEvent((data) => {
      if (data.tradeId !== tradeId) return;
      
      const refreshEvents = ['trade:deposit', 'trade:proof', 'trade:confirmed', 'trade:update', 'trade:ready'];
      if (refreshEvents.includes(data._eventType)) {
        console.log(`🔄 Auto-refreshing trade ${tradeId} due to ${data._eventType}`);
        loadTrade();
      }
    });
    
    return () => unsubscribe();
  }, [tradeId]);

  useEffect(() => {
    loadTrade();
  }, [tradeId]);

  useEffect(() => {
    if (trade) {
      // ✅ القيمة الحالية موجودة بالفعل في trade.networkFee
      setCurrentNetworkFee(Number(trade.networkFee) || 0);
      setFeesLoading(false);
    }
  }, [trade]);

  useEffect(() => {
    if (!trade?.expiresAt) return;
    
    const interval = setInterval(() => {
      const remaining = new Date(trade.expiresAt).getTime() - Date.now();
      if (remaining <= 0) {
        setRemainingTime('انتهت المهلة');
        setHasExpired(true);
        clearInterval(interval);
      } else {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setRemainingTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        setHasExpired(false);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [trade?.expiresAt]);

  const loadTrade = async () => {
    setIsLoading(true);
    try {
      // ✅ استخدام tradesApi بدلاً من fetch
      const response = await tradesApi.get(tradeId);
      const tradeData = response.data;
      
      setTrade(tradeData);
      
      // ✅ استخدام offer المرفق مع trade مباشرة (بدون طلب API منفصل)
      if (tradeData.offer) {
        setOffer(tradeData.offer);
      }
      
      // ✅ التحقق من وجود تقييم مسبق لهذه الصفقة
      try {
        const reviewRes = await reviewsApi.getTradeReview(tradeId);
        if (reviewRes.data) {
          setExistingReview(reviewRes.data);
          setHasExistingReview(true);
        }
      } catch (err) {
        // لا يوجد تقييم - هذا طبيعي
        setHasExistingReview(false);
        setExistingReview(null);
      }
    } catch (error: any) {
      // ✅ إذا الصفقة مش موجودة → نوجه بصمت بدون رسالة خطأ
      if (error.response?.status === 404) {
        router.push('/trades');
        return;
      }
      toast.error(error.response?.data?.message || 'فشل في تحميل الصفقة');
      router.push('/trades');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('تم النسخ');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, image: 'حجم الملف يتجاوز 5 ميجابايت' }));
      return;
    }
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, image: 'نوع الملف غير مدعوم (JPG, PNG فقط)' }));
      return;
    }
    
    setErrors(prev => ({ ...prev, image: '' }));
    const preview = URL.createObjectURL(file);
    setProofPreview(preview);
    setProofImage(file);
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!proofImage) newErrors.image = 'صورة الإثبات مطلوبة';
    if (!transactionRef.trim()) newErrors.transactionRef = 'رقم العملية البنكية مطلوب';
    if (!bankName.trim()) newErrors.bankName = 'اسم البنك مطلوب';
    if (!last4Digits.trim()) newErrors.last4Digits = 'آخر 4 أرقام مطلوبة';
    if (last4Digits.length !== 4) newErrors.last4Digits = 'آخر 4 أرقام يجب أن تكون 4 أرقام';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitProof = async () => {
    if (hasExpired) {
      toast.error('انتهت المهلة! لا يمكنك رفع إثبات الدفع.');
      return;
    }
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('image', proofImage!);
    formData.append('transactionRef', transactionRef);
    formData.append('bankName', bankName);
    formData.append('last4Digits', last4Digits);
    
    try {
      // ✅ إرسال multipart مباشرة عبر الـ API (FormData + axios = multipart تلقائياً)
      const token = localStorage.getItem('accessToken');
      const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/trades/${tradeId}/payment-proof`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      
      if (uploadResponse.ok) {
        toast.success('تم رفع إثبات الدفع بنجاح');
        loadTrade();
        setProofImage(null);
        setProofPreview(null);
        setTransactionRef('');
        setBankName('');
        setLast4Digits('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        const data = await uploadResponse.json();
        toast.error(data.message || 'فشل في رفع الإثبات');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في رفع الإثبات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (hasExpired) {
      toast.error('انتهت المهلة! لا يمكنك تأكيد الدفع.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // ✅ استخدام tradesApi بدلاً من fetch
      await tradesApi.confirmPayment(tradeId);
      toast.success('تم تأكيد استلام المبلغ وإتمام الصفقة');
      loadTrade();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في تأكيد الدفع');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReceipt = async () => {
    closeConfirm();
    if (hasExpired) {
      toast.error('انتهت المهلة!');
      return;
    }
    setIsSubmitting(true);
    try {
      await tradesApi.confirmReceipt(tradeId);
      toast.success('تم تأكيد استلام USDT 🎉');
      loadTrade();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في تأكيد الاستلام');
    } finally {
      setIsSubmitting(false);
    }
  };

  const promptConfirmReceipt = () => {
    openConfirm({
      title: '✅ تأكيد استلام USDT',
      message: 'هل استلمت USDT في محفظتك؟',
      consequences: [
        'سيتم إتمام الصفقة نهائياً',
        'لن تتمكن من فتح نزاع بعد التأكيد',
      ],
      confirmText: 'نعم، استلمت USDT',
      variant: 'info',
      onConfirm: handleConfirmReceipt,
    });
  };

  // ✅ موافقة البائع على الصفقة
  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const res = await tradesApi.approve(trade.id);
      toast.success(res.data?.message || 'تمت الموافقة على الصفقة ✅');
      loadTrade();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في الموافقة');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ رفض البائع للصفقة
  const handleReject = async () => {
    closeConfirm();
    setIsSubmitting(true);
    try {
      const res = await tradesApi.reject(trade.id);
      toast.success((res as any).data?.message || 'تم رفض الصفقة');
      loadTrade();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في الرفض');
    } finally {
      setIsSubmitting(false);
    }
  };

  const promptReject = () => {
    openConfirm({
      title: '⚠️ رفض الصفقة',
      message: 'هل أنت متأكد من رفض هذه الصفقة؟',
      consequences: [
        'سيتم إلغاء الصفقة نهائياً',
        'لا يمكن التراجع عن هذا الإجراء',
      ],
      confirmText: 'نعم، رفض الصفقة',
      variant: 'danger',
      onConfirm: handleReject,
    });
  };

  // ✅ إرسال التقييم
  const handleSubmitReview = async () => {
    if (reviewRating === 0) {
      toast.error('يرجى اختيار تقييم');
      return;
    }
    setIsSubmittingReview(true);
    try {
      const res = await reviewsApi.create({
        tradeId,
        rating: reviewRating,
        comment: reviewComment,
      });
      // ✅ استخدام التقييم من الاستجابة مباشرة (بدون إعادة تحميل الصفقة)
      if (res.data?.review) {
        setExistingReview(res.data.review);
        setHasExistingReview(true);
      }
      // ✅ تحديث تقييم البائع في المتجر فوراً
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      toast.success('تم إرسال تقييمك ✅');
      setShowReviewForm(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في إرسال التقييم');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return { label: 'مكتملة', color: 'bg-green-500/20 text-green-300', icon: <CheckCircle className="w-4 h-4" /> };
      case 'cancelled':
        return { label: 'ملغاة', color: 'bg-red-500/20 text-red-300', icon: <XCircle className="w-4 h-4" /> };
      case 'active':
        return { label: 'في انتظار دفع المشتري', color: 'bg-blue-500/20 text-blue-300', icon: <Clock className="w-4 h-4" /> };
      case 'waiting_seller_deposit':
        return { label: 'في انتظار إيداع البائع', color: 'bg-yellow-500/20 text-yellow-300', icon: <Clock className="w-4 h-4" /> };
      case 'pending_seller_approval':
        return { label: 'بانتظار موافقة البائع', color: 'bg-purple-500/20 text-purple-300', icon: <Clock className="w-4 h-4" /> };
      case 'waiting_seller_confirmation':
        return { label: 'في انتظار تأكيد البائع', color: 'bg-orange-500/20 text-orange-300', icon: <Clock className="w-4 h-4" /> };
      case 'waiting_buyer_confirm':
        return { label: 'بانتظار تأكيد المشتري', color: 'bg-teal-500/20 text-teal-300', icon: <CheckCircle className="w-4 h-4" /> };
      case 'dispute_opened':
        return { label: 'نزاع مفتوح', color: 'bg-red-500/20 text-red-300', icon: <AlertTriangle className="w-4 h-4" /> };
      default:
        return { label: status, color: 'bg-gray-500/20 text-gray-300', icon: <Clock className="w-4 h-4" /> };
    }
  };

  const getImageUrl = (path: string) => {
    if (!path) return null;
    const cleanPath = path.replace(/\\\\/g, '/');
    return `/api/${cleanPath}`;
  };

  const getUploadUrl = (path: string) => {
    if (!path) return null;
    const cleanPath = path.replace(/\\/g, '/');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
    return cleanPath.startsWith('/') ? `${baseUrl}${cleanPath}` : `${baseUrl}/${cleanPath}`;
  };

  if (isLoading || feesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 border border-white/20">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">الصفقة غير موجودة</h2>
            <Link href="/trades"><Button className="mt-4">العودة إلى الصفقات</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  if (!currentNetworkFee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 text-center border border-white/20">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500 mx-auto mb-4" />
          <p className="text-white">جاري تحميل رسوم الشبكة...</p>
        </div>
      </div>
    );
  }

  const isBuyer = trade.buyerId === user?.id;
  const isSeller = trade.sellerId === user?.id;
  const currencySymbol = trade.fiatCurrency === 'ils' ? '₪' : '$';
  const canSubmitProof = isBuyer && trade.status === 'active';
  const canConfirmPayment = isSeller && trade.status === 'waiting_seller_confirmation';
  const canConfirmReceipt = isBuyer && trade.status === 'waiting_buyer_confirm';
  const status = getStatusBadge(trade.status);
  const canOpenDispute = isSeller && trade.status === 'waiting_seller_confirmation' && !trade.dispute;

  const amount = Number(trade.amountUsdt);
  const platformFee = amount * 0.01;
  const networkFee = currentNetworkFee;
  const netAmount = amount - platformFee - networkFee;
  const totalFiat = amount * Number(trade.pricePerUsdt);
  const premiumPercent = offer?.premiumPercent || 0;
  const baseRate = trade.pricePerUsdt / (1 + premiumPercent / 100);
  const escrowAddress = trade.network === 'bep20' ? trade.bscEscrowAddress : trade.escrowAddress;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {NotificationComponent}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/trades">
              <button className="p-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">{trade.tradeReference}</h1>
              <p className="text-blue-200 text-sm mt-1">{isBuyer ? 'شراء' : 'بيع'} - {amount} USDT</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${status.color}`}>
              {status.icon}{status.label}
            </span>
            {canOpenDispute && (
              <Link href={`/disputes/new?tradeId=${trade.id}`}>
                <Button variant="danger" size="sm"><AlertTriangle className="w-4 h-4 ml-2" />فتح نزاع</Button>
              </Link>
            )}
          </div>
        </div>

        <div className="mb-6 text-center">
          <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl ${
            hasExpired ? 'bg-red-500/30 border border-red-500/50' : 'bg-yellow-500/20 border border-yellow-500/30'
          }`}>
            <Clock className={`w-5 h-5 ${hasExpired ? 'text-red-400' : 'text-yellow-400'}`} />
            <span className={`font-bold text-lg ${hasExpired ? 'text-red-400' : 'text-yellow-400'}`}>
              {hasExpired ? 'انتهت المهلة' : `الوقت المتبقي: ${remainingTime}`}
            </span>
          </div>
          <p className="text-blue-300 text-xs mt-2">
            {trade.status === 'pending_seller_approval' ? 'مهلة الموافقة 10 دقائق' : 'مهلة الدفع 30 دقيقة'}
          </p>
        </div>

        {trade.status === 'pending_seller_approval' && (
          <div className="bg-purple-500/10 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-6 mb-6 text-center">
            {isSeller ? (
              <>
                <h2 className="text-xl font-bold text-white mb-2">🆕 صفقة جديدة</h2>
                <p className="text-purple-300 mb-4">يريد المشتري شراء <strong className="text-white">{amount} USDT</strong></p>
                <div className="flex gap-4 justify-center">
                  <button onClick={handleApprove} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-lg transition-all">
                    ✅ قبول
                  </button>
                  <button onClick={promptReject} className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-lg transition-all">
                    ❌ رفض
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white mb-2">⏳ بانتظار موافقة البائع</h2>
                <p className="text-purple-300">يرجى الانتظار حتى يوافق البائع على الصفقة</p>
              </>
            )}
          </div>
        )}

        {isSeller && trade.status === 'waiting_seller_deposit' && (
          <div className="bg-yellow-500/10 backdrop-blur-xl rounded-2xl border border-yellow-500/30 p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">📤 إرسال USDT إلى الضمان</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-black/30 rounded-xl p-4 text-center">
                  <p className="text-blue-300 text-sm">المبلغ المطلوب إرساله (شامل رسوم الشبكة)</p>
                  <p className="text-3xl font-bold text-yellow-400">
                    {(amount + networkFee).toFixed(6)} USDT
                  </p>
                  <p className="text-xs text-blue-400 mt-1">
                    (المبلغ: {amount} USDT + رسوم الشبكة: {networkFee.toFixed(6)} USDT)
                  </p>
                </div>
                <div className={`rounded-xl p-3 text-center ${trade.network === 'trc20' ? 'bg-blue-500/20' : 'bg-green-500/20'}`}>
                  <p className="text-sm">🌐 الشبكة: <strong>{trade.network?.toUpperCase()}</strong></p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-blue-300 text-sm mb-2">عنوان الضمان</p>
                  <div className="flex flex-wrap gap-2">
                    <code className="flex-1 px-4 py-3 rounded-xl bg-black/50 border border-white/20 text-white text-sm break-all">{escrowAddress}</code>
                    <button onClick={() => handleCopy(escrowAddress)} className="px-4 py-3 bg-white/10 rounded-xl hover:bg-white/20"><Copy className="w-5 h-5" /></button>
                  </div>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                  <p className="text-red-300 text-sm">⚠️ استخدم شبكة <strong>{trade.network?.toUpperCase()}</strong> فقط</p>
                </div>
              </div>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <button onClick={async () => { try { await tradesApi.mockDeposit(trade.id); toast.success('تم محاكاة الإيداع'); loadTrade(); } catch (e: any) { toast.error(e.response?.data?.message || 'فشلت محاكاة الإيداع'); } }} className="w-full mt-4 py-2 bg-purple-600 text-white rounded-xl">🔧 محاكاة: تم إيداع USDT</button>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-blue-400" />تفاصيل الدفع</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-white/10 pb-2"><span className="text-blue-300">💰 المبلغ الإجمالي</span><span className="text-white font-medium">{amount} USDT</span></div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2"><span className="text-blue-300">📊 سعر الصرف الأساسي</span><span className="text-white">{baseRate.toFixed(4)} {currencySymbol}</span></div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2"><span className="text-blue-300">📈 نسبة البائع</span><span className={premiumPercent > 0 ? 'text-red-400' : 'text-green-400'}>{premiumPercent > 0 ? `+${premiumPercent}%` : `${premiumPercent}%`}</span></div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2"><span className="text-blue-300">💵 السعر النهائي</span><span className="text-white font-bold">{trade.pricePerUsdt} {currencySymbol}</span></div>
              <div className="flex justify-between items-center pt-2"><span className="text-blue-300 text-lg">🏦 إجمالي المبلغ المطلوب تحويله</span><span className="text-white font-bold text-xl">{totalFiat.toFixed(2)} {currencySymbol}</span></div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Percent className="w-5 h-5 text-yellow-400" />الرسوم والصافي</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-white/10 pb-2"><span className="text-blue-300">🌐 رسوم الشبكة ({trade.network?.toUpperCase()})</span><span className="text-yellow-300">{networkFee.toFixed(6)} USDT</span></div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2"><span className="text-blue-300">🏢 عمولة المنصة (1%)</span><span className="text-yellow-300">{platformFee.toFixed(2)} USDT</span></div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2"><span className="text-blue-300">📉 إجمالي الخصومات</span><span className="text-orange-300">{(platformFee + networkFee).toFixed(6)} USDT</span></div>
              <div className="flex justify-between items-center pt-2"><span className="text-white font-semibold text-lg">✅ صافي ما تستلمه</span><span className="text-green-400 font-bold text-xl">{netAmount.toFixed(6)} USDT</span></div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5 mb-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><User className="w-4 h-4 text-purple-400" />أطراف الصفقة</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div><span className="text-blue-300">البائع:</span> <span className="text-white mr-2">{trade.seller?.fullName}</span></div>
            <div><span className="text-blue-300">المشتري:</span> <span className="text-white mr-2">{trade.buyer?.fullName}</span></div>
            <div><span className="text-blue-300">تاريخ الإنشاء:</span> <span className="text-white mr-2">{new Date(trade.createdAt).toLocaleDateString('ar')}</span></div>
            <div><span className="text-blue-300">الشبكة:</span> <span className={`font-medium mr-2 ${trade.network === 'trc20' ? 'text-blue-400' : 'text-green-400'}`}>{trade.network?.toUpperCase()}</span></div>
          </div>
        </div>

        {canSubmitProof && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 mb-6">
            {hasExpired ? (
              <div className="bg-red-500/20 rounded-xl p-4 text-center mb-4">
                <p className="text-red-400 font-semibold">⚠️ انتهت المهلة! لا يمكنك رفع إثبات الدفع.</p>
              </div>
            ) : (
              <>
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-red-400" />
                      <span className="text-red-400 font-semibold">الوقت المتبقي للدفع:</span>
                    </div>
                    <span className="text-2xl font-bold text-yellow-400">{remainingTime}</span>
                  </div>
                  <p className="text-red-300/80 text-xs mt-3">
                    ⏰ يجب عليك تحويل <span className="font-bold text-white">{totalFiat.toFixed(2)} {currencySymbol}</span> إلى حساب البائع خلال المهلة المتبقية.
                  </p>
                </div>

                <h2 className="text-xl font-bold text-white mb-4">رفع إثبات الدفع</h2>
                
                <div className="bg-blue-500/10 rounded-xl p-4 mb-4">
                  <h3 className="text-white font-semibold mb-2">🏦 معلومات التحويل البنكي للبائع</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                    <div><span className="text-blue-300">اسم البنك:</span> <span className="text-white mr-2">{offer?.bankName || trade.offer?.bankName || 'غير محدد'}</span></div>
                    <div><span className="text-blue-300">اسم صاحب الحساب:</span> <span className="text-white mr-2">{trade.seller?.fullName}</span></div>
                    <div><span className="text-blue-300">رقم الجوال:</span> <span className="text-white mr-2">{trade.seller?.phone}</span>
                      <button onClick={() => handleCopy(trade.seller?.phone)} className="p-1 hover:bg-white/10 rounded mr-1"><Copy className="w-3 h-3 text-blue-400 inline" /></button>
                    </div>
                  </div>
                  
                  {offer?.paymentInstructions && (
                    <div className="mt-3 pt-3 border-t border-blue-500/30">
                      <p className="text-blue-300 text-sm mb-1">📝 تعليمات الدفع:</p>
                      <div className="bg-white/5 rounded-lg p-3 text-white text-sm whitespace-pre-wrap">
                        {offer.paymentInstructions}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-yellow-400 text-xs mt-2">⚠️ تأكد من أن رقم الحساب المحول إليه يطابق اسم البائع</div>
                </div>

                <div className="bg-green-500/10 rounded-xl p-3 mb-4 text-center border border-green-500/30">
                  <p className="text-green-300 text-sm">🏦 المبلغ المطلوب تحويله: 
                    <span className="font-bold text-white text-xl mr-2">{totalFiat.toFixed(2)} {currencySymbol}</span>
                  </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-blue-200 mb-2">صورة الإثبات *</label>
                    <div className={`border-2 border-dashed rounded-xl p-4 text-center transition h-36 flex items-center justify-center ${errors.image ? 'border-red-500' : 'border-white/20 hover:border-blue-500'}`}>
                      {proofPreview ? (
                        <div className="relative inline-block"><img src={proofPreview} className="max-h-28 mx-auto rounded-lg" /><button onClick={() => { setProofPreview(null); setProofImage(null); }} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs">✕</button></div>
                      ) : (
                        <label className="cursor-pointer block text-center"><input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" /><Upload className="w-8 h-8 mx-auto text-gray-400 mb-1" /><span className="text-xs text-gray-400">اضغط لرفع الصورة</span><p className="text-xs text-gray-500">JPG, PNG - 5MB</p></label>
                      )}
                    </div>
                    {errors.image && <p className="mt-1 text-sm text-red-400">{errors.image}</p>}
                  </div>

                  <div className="flex-[2] space-y-3">
                    <div><input type="text" placeholder="رقم العملية البنكية *" value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} className={`w-full px-4 py-2 rounded-xl bg-white/10 border ${errors.transactionRef ? 'border-red-500' : 'border-white/20'} text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500`} />{errors.transactionRef && <p className="mt-1 text-sm text-red-400">{errors.transactionRef}</p>}</div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><input type="text" placeholder="اسم البنك الذي حولت منه *" value={bankName} onChange={(e) => setBankName(e.target.value)} className={`w-full px-4 py-2 rounded-xl bg-white/10 border ${errors.bankName ? 'border-red-500' : 'border-white/20'} text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500`} />{errors.bankName && <p className="mt-1 text-sm text-red-400">{errors.bankName}</p>}</div>
                      <div><input type="text" placeholder="آخر 4 أرقام *" maxLength={4} value={last4Digits} onChange={(e) => setLast4Digits(e.target.value)} className={`w-full px-4 py-2 rounded-xl bg-white/10 border ${errors.last4Digits ? 'border-red-500' : 'border-white/20'} text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500`} />{errors.last4Digits && <p className="mt-1 text-sm text-red-400">{errors.last4Digits}</p>}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/20 text-gray-400 text-sm flex items-center gap-2"><Calendar className="w-4 h-4" /> التاريخ: {new Date().toLocaleDateString('ar')}</div>
                      <Button onClick={handleSubmitProof} loading={isSubmitting} className="flex-1" disabled={hasExpired}>
                        <Upload className="w-4 h-4 ml-2" />إرسال
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {canConfirmPayment && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">تأكيد استلام الدفع</h2>
            {hasExpired ? (
              <div className="bg-red-500/20 rounded-xl p-4 text-center mb-4">
                <p className="text-red-400 font-semibold">⚠️ انتهت المهلة! لا يمكنك تأكيد الدفع.</p>
              </div>
            ) : (
              <>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4">
                  <p className="text-yellow-300 text-sm">⏰ الوقت المتبقي للتأكيد: <span className="font-bold">{remainingTime}</span></p>
                </div>
                {trade.paymentProof && (
                  <div className="bg-white/5 rounded-xl p-4 mb-4">
                    <h3 className="text-white font-semibold mb-3">📎 إثبات الدفع المرفوع</h3>
                    <div className="flex flex-col md:flex-row gap-4">
                      {trade.paymentProof.imageUrl && <img src={getUploadUrl(trade.paymentProof.imageUrl)} className="rounded-lg max-h-48 object-contain" />}
                      <div className="space-y-2 text-sm flex-1">
                        <p><span className="text-blue-300">رقم العملية:</span> {trade.paymentProof.transactionRef}</p>
                        <p><span className="text-blue-300">البنك:</span> {trade.paymentProof.bankName}</p>
                        <p><span className="text-blue-300">آخر 4 أرقام:</span> {trade.paymentProof.last4Digits}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-4"><p className="text-green-300 text-sm">✅ تأكد من استلام المبلغ في حسابك البنكي قبل التأكيد</p></div>
                <Button onClick={handleConfirmPayment} loading={isSubmitting} className="w-full">تأكيد استلام الدفع</Button>
              </>
            )}
          </div>
        )}

        {/* ✅ قسم تأكيد استلام USDT - للمشتري فقط بعد تحرير USDT */}
        {canConfirmReceipt && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">تأكيد استلام USDT</h2>
            
            {hasExpired ? (
              <div className="bg-red-500/20 rounded-xl p-4 text-center mb-4">
                <p className="text-red-400 font-semibold">⚠️ انتهت المهلة!</p>
              </div>
            ) : (
              <>
                <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-3 mb-4">
                  <p className="text-teal-300 text-sm">⏰ الوقت المتبقي لتأكيد الاستلام: <span className="font-bold">{remainingTime}</span></p>
                </div>
                
                {trade.releaseTxHash && (
                  <div className="bg-white/5 rounded-xl p-4 mb-4">
                    <p className="text-blue-300 text-xs mb-1">رقم المعاملة على البلوكشين:</p>
                    <p className="text-white text-xs font-mono break-all">{trade.releaseTxHash}</p>
                  </div>
                )}

                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-4">
                  <p className="text-green-300 text-sm">✅ تم تحرير {Number(trade.netAmountToBuyer).toFixed(2)} USDT إلى محفظتك. يرجى التأكد من استلامها.</p>
                </div>
                
                <Button onClick={promptConfirmReceipt} loading={isSubmitting} className="w-full">
                  <CheckCircle className="w-4 h-4 ml-2" />تأكيد استلام USDT
                </Button>
              </>
            )}
          </div>
        )}

        {/* ✅ قسم التقييم - يظهر للمشتري بعد إتمام الصفقة */}
        {trade.status === 'completed' && isBuyer && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 mb-6">
            {hasExistingReview && existingReview ? (
              // ✅ تم التقييم مسبقاً
              <>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  تقييمك للبائع
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-6 h-6 ${
                        star <= existingReview.rating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-500'
                      }`}
                    />
                  ))}
                  <span className="text-white mr-3 font-semibold">{existingReview.rating}/5</span>
                </div>
                {existingReview.comment && (
                  <p className="text-blue-200 text-sm">"{existingReview.comment}"</p>
                )}
                <p className="text-green-400 text-xs mt-3">✅ تم تقييم هذه الصفقة</p>
              </>
            ) : showReviewForm ? (
              // ✅ نموذج التقييم
              <>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  تقييم البائع
                </h3>
                
                {/* اختيار النجوم */}
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= (hoverRating || reviewRating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-500'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-white mr-3">
                    {reviewRating > 0 ? `${reviewRating}/5` : 'اختر تقييم'}
                  </span>
                </div>
                
                {/* تعليق اختياري */}
                <textarea
                  placeholder="أكتب تعليقاً (اختياري)..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none mb-4"
                />
                
                <div className="flex gap-3">
                  <Button
                    onClick={handleSubmitReview}
                    loading={isSubmittingReview}
                    className="flex-1"
                  >
                    <Star className="w-4 h-4 ml-2 fill-current" />
                    إرسال التقييم
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowReviewForm(false)}
                    className="bg-white/5 border border-white/20 hover:bg-white/10"
                  >
                    إلغاء
                  </Button>
                </div>
              </>
            ) : (
              // ✅ زر فتح التقييم
              <div className="text-center py-2">
                <p className="text-blue-200 text-sm mb-4">
                  هل تريد تقييم تجربتك مع البائع {trade.seller?.fullName}؟
                </p>
                <Button onClick={() => setShowReviewForm(true)}>
                  <Star className="w-4 h-4 ml-2" />
                  تقييم البائع
                </Button>
              </div>
            )}
          </div>
        )}

        {isBuyer && trade.seller?.bankAccount && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Banknote className="w-4 h-4 text-green-400" />بيانات البائع البنكية</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><span className="text-blue-300">البنك:</span> <span className="text-white mr-2">{trade.seller.bankAccount.bankName}</span></div>
              <div><span className="text-blue-300">اسم المستفيد:</span> <span className="text-white mr-2">{trade.seller.bankAccount.accountHolderName}</span></div>
              <div><span className="text-blue-300">رقم الحساب:</span> <span className="text-white font-mono mr-2">{trade.seller.bankAccount.accountNumber}</span><button onClick={() => handleCopy(trade.seller.bankAccount.accountNumber)} className="p-1 hover:bg-white/10 rounded"><Copy className="w-3 h-3 text-blue-400 inline" /></button></div>
            </div>
          </div>
        )}
      </div>
      
      {/* ✅ ConfirmModal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        consequences={confirmModal.consequences}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        isLoading={isSubmitting}
      />
    </div>
  );
}

export default function TradeDetailPage() {
  return (
    <ProtectedRoute>
      <TradeDetailContent />
    </ProtectedRoute>
  );
}