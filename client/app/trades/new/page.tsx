'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { tradesApi, offersApi, ratesApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Loader2, Shield, AlertTriangle, ArrowLeft, RefreshCw, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function NewTradeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const offerId = searchParams.get('offerId');
  
  const [offer, setOffer] = useState<any>(null);
  const [networkFee, setNetworkFee] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [error, setError] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    if (!offerId) {
      toast.error('رقم العرض غير موجود');
      router.push('/marketplace');
      return;
    }
    loadOffer();
  }, [offerId]);

  const loadOffer = async () => {
    setIsLoading(true);
    setError('');
    try {
      // جلب بيانات العرض
      const response = await offersApi.getOne(offerId);
      setOffer(response.data);
      
      // ✅ جلب جميع الأسعار من API
      const ratesResponse = await ratesApi.getAllRates();
      const ratesData = ratesResponse.data?.data;
      
      if (!ratesData?.fees) {
        throw new Error('لم يتم جلب رسوم الشبكة');
      }
      
      const fee = response.data.network === 'trc20' 
        ? ratesData.fees.trc20?.fee
        : ratesData.fees.bep20?.fee;
      
      if (!fee || fee <= 0) {
        throw new Error(`رسوم الشبكة ${response.data.network} غير متوفرة`);
      }
      
      setNetworkFee(fee);
      
    } catch (error: any) {
      console.error('Failed to load offer:', error);
      setError(error.message || 'فشل في تحميل بيانات العرض');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!amount || amount < offer?.minAmount || amount > offer?.maxAmount) {
      toast.error(`المبلغ يجب أن يكون بين ${offer?.minAmount} و ${offer?.maxAmount} USDT`);
      return;
    }
    
    // ✅ التحقق من عنوان المحفظة حسب الشبكة
    if (offer?.network === 'trc20' && !user?.trc20Wallet) {
      toast.custom((t) => (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-lg max-w-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-800 mb-1">⚠️ عنوان TRC20 مطلوب</h4>
              <p className="text-sm text-yellow-700 mb-3">
                للشراء عبر شبكة TRC20، يرجى إضافة عنوان محفظة TRC20 أولاً.
              </p>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  router.push('/profile?tab=wallets');
                }}
                className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700 transition"
              >
                إضافة عنوان TRC20
              </button>
            </div>
          </div>
        </div>
      ), { duration: 10000 });
      return;
    }
    
    if (offer?.network === 'bep20' && !user?.bscWallet) {
      toast.custom((t) => (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-lg max-w-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-800 mb-1">⚠️ عنوان BEP20 مطلوب</h4>
              <p className="text-sm text-yellow-700 mb-3">
                للشراء عبر شبكة BEP20، يرجى إضافة عنوان محفظة BEP20 أولاً.
              </p>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  router.push('/profile?tab=wallets');
                }}
                className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700 transition"
              >
                إضافة عنوان BEP20
              </button>
            </div>
          </div>
        </div>
      ), { duration: 10000 });
      return;
    }
    
    setShowConfirmDialog(false);
    setIsSubmitting(true);
    try {
      const response = await tradesApi.start({
        offerId: offerId!,
        amountUsdt: amount,
      });
      toast.success('تم بدء الصفقة بنجاح');
      router.push(`/trades/${response.data.trade.id}`);
    } catch (error: any) {
      console.error('Start trade error:', error);
      toast.error(error.response?.data?.message || 'فشل في بدء الصفقة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showConfirmation = () => {
    if (!amount || amount < offer?.minAmount || amount > offer?.maxAmount) {
      toast.error(`المبلغ يجب أن يكون بين ${offer?.minAmount} و ${offer?.maxAmount} USDT`);
      return;
    }
    if (!networkFee) {
      toast.error('جاري تحميل رسوم الشبكة... يرجى الانتظار');
      return;
    }
    setShowConfirmDialog(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 text-center border border-white/20">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">عذراً</h2>
            <p className="text-blue-200 mb-6">{error || 'العرض غير موجود'}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={loadOffer} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"><RefreshCw className="w-4 h-4" />إعادة المحاولة</button>
              <Link href="/marketplace"><Button className="bg-gray-600 hover:bg-gray-700">العودة إلى المتجر</Button></Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!networkFee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 text-center border border-white/20">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500 mx-auto mb-4" />
          <p className="text-white">جاري تحميل رسوم الشبكة...</p>
        </div>
      </div>
    );
  }

  const currencySymbol = offer.fiatCurrency === 'ils' ? '₪' : '$';
  const totalFiat = amount * offer.price;
  const platformFee = amount * 0.01;
  const netAmount = amount - platformFee - networkFee;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/marketplace">
          <button className="flex items-center gap-2 text-blue-300 hover:text-white mb-6 transition">
            <ArrowLeft className="w-4 h-4" />
            العودة إلى المتجر
          </button>
        </Link>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white mb-2">بدء صفقة جديدة</h1>
            <p className="text-blue-200 text-sm mb-6">
              قم بشراء USDT من {offer.seller?.fullName || 'البائع'}
            </p>

            {/* ✅ تنبيه عن المحفظة المطلوبة */}
            {offer.network === 'trc20' && !user?.trc20Wallet && (
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-3 mb-4">
                <p className="text-yellow-300 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  ⚠️ يجب إضافة عنوان محفظة TRC20 لاستلام USDT
                </p>
              </div>
            )}
            
            {offer.network === 'bep20' && !user?.bscWallet && (
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-3 mb-4">
                <p className="text-yellow-300 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  ⚠️ يجب إضافة عنوان محفظة BEP20 لاستلام USDT
                </p>
              </div>
            )}

            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-blue-300 text-xs mb-1">السعر النهائي</p>
                  <p className={`font-semibold ${offer.premiumPercent > 0 ? 'text-red-400' : offer.premiumPercent < 0 ? 'text-green-400' : 'text-white'}`}>
                    {offer.price} {currencySymbol}
                  </p>
                </div>
                <div>
                  <p className="text-blue-300 text-xs mb-1">الشبكة</p>
                  <p className="text-white font-semibold">{offer.network?.toUpperCase() || 'TRC20'}</p>
                </div>
                <div>
                  <p className="text-blue-300 text-xs mb-1">الحدود</p>
                  <p className="text-white font-semibold">{offer.minAmount} - {offer.maxAmount} USDT</p>
                </div>
                <div>
                  <p className="text-blue-300 text-xs mb-1">نسبة البائع</p>
                  <p className={offer.premiumPercent > 0 ? 'text-red-400 font-semibold' : offer.premiumPercent < 0 ? 'text-green-400 font-semibold' : 'text-white'}>
                    {offer.premiumPercent > 0 ? `+${offer.premiumPercent}%` : `${offer.premiumPercent}%`}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-blue-200 mb-2">المبلغ (USDT)</label>
              <input
                type="number"
                min={offer.minAmount}
                max={offer.maxAmount}
                step={1}
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                placeholder={`${offer.minAmount} - ${offer.maxAmount}`}
              />
              <p className="text-blue-300 text-xs mt-1">
                الحد الأدنى: {offer.minAmount} USDT | الحد الأقصى: {offer.maxAmount} USDT
              </p>
            </div>

            {amount >= offer.minAmount && (
              <div className="bg-white/5 rounded-xl p-4 mb-6">
                <h3 className="text-white font-semibold mb-3">تفاصيل الدفع</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-blue-300">💰 المبلغ الإجمالي:</span>
                    <span className="text-white font-medium">{amount} USDT</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-blue-300">📊 سعر الصرف الأساسي:</span>
                    <span className="text-white">
                      {offer.baseRate?.toFixed(4) || (offer.price / (1 + (offer.premiumPercent || 0)/100)).toFixed(4)} {currencySymbol}
                    </span>
                  </div>
                  {offer.premiumPercent !== 0 && (
                    <div className="flex justify-between border-b border-white/10 pb-2">
                      <span className="text-blue-300">📈 نسبة البائع:</span>
                      <span className={offer.premiumPercent > 0 ? 'text-red-400 font-semibold' : 'text-green-400 font-semibold'}>
                        {offer.premiumPercent > 0 ? `+${offer.premiumPercent}%` : `${offer.premiumPercent}%`} {offer.premiumPercent > 0 ? '(زيادة)' : '(خصم)'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-blue-300">💵 السعر النهائي:</span>
                    <span className={offer.premiumPercent > 0 ? 'text-red-400 font-bold' : offer.premiumPercent < 0 ? 'text-green-400 font-bold' : 'text-white'}>
                      {offer.price} {currencySymbol}
                    </span>
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
                    <span className="text-yellow-300">{networkFee.toFixed(6)} USDT</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-blue-300">📉 إجمالي الخصومات:</span>
                    <span className="text-orange-300">{(platformFee + networkFee).toFixed(6)} USDT</span>
                  </div>
                  <div className="flex justify-between pt-2 mt-2">
                    <span className="text-white font-semibold">✅ صافي ما تستلمه:</span>
                    <span className="text-green-400 font-bold text-lg">{netAmount.toFixed(6)} USDT</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-400">تنبيه مهم</p>
                  <p className="text-sm text-yellow-300/80 mt-1">
                    بعد تأكيد الشراء، سيتم إنشاء عنوان ضمان خاص بك. يجب على البائع إيداع USDT خلال 30 دقيقة.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Link href="/marketplace" className="flex-1">
                <Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10">
                  إلغاء
                </Button>
              </Link>
              <Button 
                onClick={showConfirmation} 
                disabled={!amount || amount < offer.minAmount || amount > offer.maxAmount || !networkFee}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                تأكيد الشراء
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-white">تأكيد الشراء</h2>
              </div>
              
              <div className="space-y-3 mb-6">
                <p className="text-white">✅ أنت على وشك شراء <span className="font-bold text-blue-400">{amount} USDT</span></p>
                <p className="text-white">💰 ستدفع: <span className="font-bold text-green-400">{totalFiat.toFixed(2)} {currencySymbol}</span></p>
                <p className="text-white">📦 <span className="font-semibold">صافي ما تستلمه:</span> <span className="font-bold text-green-400">{netAmount.toFixed(6)} USDT</span></p>
                
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-3">
                  <p className="text-red-300 text-sm font-semibold">⚠️ تنبيه مهم:</p>
                  <p className="text-red-300 text-sm mt-1">بعد إيداع البائع USDT في الضمان، لديك 30 دقيقة فقط لرفع صورة التحويل البنكي.</p>
                  <p className="text-red-300 text-sm font-semibold">إذا انتهت المدة:</p>
                  <ul className="text-red-300 text-sm mt-2 list-disc list-inside">
                    <li>تُلغى الصفقة</li>
                    <li>يُحظر حسابك نهائياً</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirmDialog(false)} 
                  className="flex-1 px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition"
                >
                  إلغاء
                </button>
                <button 
                  onClick={handleSubmit} 
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
                >
                  تأكيد الشراء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewTradePage() {
  return (
    <ProtectedRoute>
      <NewTradeContent />
    </ProtectedRoute>
  );
}