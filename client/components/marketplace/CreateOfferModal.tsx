'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { offersApi, CreateOfferData, ratesApi } from '@/lib/api';
import { Button, Modal } from '@/components/ui';
import { Info, Loader2, Percent } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query'; // ✅ تمت الإضافة

interface CreateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateOfferModal({ isOpen, onClose, onSuccess }: CreateOfferModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient(); // ✅ تمت الإضافة
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [ilsRate, setIlsRate] = useState<number>(3.50);
  const [trc20Fee, setTrc20Fee] = useState<number>(2.1);
  const [bep20Fee, setBep20Fee] = useState<number>(0.05);
  const [premiumPercent, setPremiumPercent] = useState<number>(0);
  const [livePrice, setLivePrice] = useState<number>(0);
  
  const [formData, setFormData] = useState({
    fiatCurrency: 'usd' as 'ils' | 'usd',
    minAmount: 10,
    maxAmount: 10000,
    network: 'trc20' as 'trc20' | 'bep20',
    paymentInstructions: '',
    bankName: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const calculateLivePrice = (currency: string, percent: number, rate: number) => {
    if (currency === 'usd') return 1 * (1 + percent / 100);
    return rate * (1 + percent / 100);
  };

  // ✅ تحميل الأسعار من قاعدة البيانات عبر API واحد
  useEffect(() => {
    if (!isOpen) return;
    
    const loadRates = async () => {
      setIsLoadingRates(true);
      try {
        const response = await ratesApi.getAllRates();
        const data = response.data?.data;
        
        if (data?.exchange?.usdToIls) {
          setIlsRate(data.exchange.usdToIls);
        }
        if (data?.fees?.trc20?.fee) {
          setTrc20Fee(data.fees.trc20.fee);
        }
        if (data?.fees?.bep20?.fee) {
          setBep20Fee(data.fees.bep20.fee);
        }
        
        const price = calculateLivePrice(formData.fiatCurrency, premiumPercent, data?.exchange?.usdToIls || 3.5);
        setLivePrice(price);
        
      } catch (error) {
        console.error('Failed to load rates:', error);
        // قيم افتراضية
        setIlsRate(3.5);
        setTrc20Fee(2.1);
        setBep20Fee(0.05);
        const price = calculateLivePrice(formData.fiatCurrency, premiumPercent, 3.5);
        setLivePrice(price);
      } finally {
        setIsLoadingRates(false);
      }
    };
    
    loadRates();
  }, [isOpen, formData.fiatCurrency]);

  const handlePremiumChange = (percent: number) => {
    let newPercent = percent;
    if (newPercent > 5) newPercent = 5;
    if (newPercent < -5) newPercent = -5;
    setPremiumPercent(newPercent);
    const price = calculateLivePrice(formData.fiatCurrency, newPercent, ilsRate);
    setLivePrice(price);
  };

  const handleCurrencyChange = (currency: 'ils' | 'usd') => {
    setPremiumPercent(0);
    setFormData(prev => ({ ...prev, fiatCurrency: currency }));
    const price = calculateLivePrice(currency, 0, ilsRate);
    setLivePrice(price);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.minAmount || formData.minAmount < 10) newErrors.minAmount = 'الحد الأدنى يجب أن يكون 10 USDT على الأقل';
    if (!formData.maxAmount || formData.maxAmount <= formData.minAmount) newErrors.maxAmount = 'الحد الأقصى يجب أن يكون أكبر من الحد الأدنى';
    if (!formData.paymentInstructions.trim()) newErrors.paymentInstructions = 'تعليمات الدفع مطلوبة';
    if (!formData.bankName) newErrors.bankName = 'يرجى اختيار البنك';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      await offersApi.create({
        fiatCurrency: formData.fiatCurrency,
        premiumPercent: premiumPercent,
        minAmount: formData.minAmount,
        maxAmount: formData.maxAmount,
        network: formData.network,
        paymentInstructions: formData.paymentInstructions,
        bankName: formData.bankName,
      });
      
      // ✅ إبطال الكاش (invalidate queries) لتحديث العروض تلقائياً
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['myOffers'] });
      
      toast.success('تم إنشاء العرض بنجاح!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في إنشاء العرض');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إنشاء عرض بيع USDT جديد" size="lg">
      <div className="space-y-5">
        {/* عملة الدفع */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">عملة الدفع *</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleCurrencyChange('ils')}
              className={`flex-1 py-2 px-4 rounded-lg border ${
                formData.fiatCurrency === 'ils' 
                  ? 'border-blue-600 bg-blue-50 text-blue-600' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              🇵🇸 شيكل (ILS)
            </button>
            <button
              type="button"
              onClick={() => handleCurrencyChange('usd')}
              className={`flex-1 py-2 px-4 rounded-lg border ${
                formData.fiatCurrency === 'usd' 
                  ? 'border-blue-600 bg-blue-50 text-blue-600' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              🇺🇸 دولار (USD)
            </button>
          </div>
        </div>

        {/* السعر الأساسي */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {formData.fiatCurrency === 'ils' ? 'سعر الصرف الأساسي (لكل 1 USDT)' : 'السعر الأساسي (لكل 1 USDT)'}
          </label>
          {isLoadingRates ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري التحميل...</span>
            </div>
          ) : (
            <div className="w-full px-4 py-2 bg-gray-100 border rounded-lg font-semibold">
              {formData.fiatCurrency === 'ils' ? `${ilsRate} ₪` : '1.00 $'}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {formData.fiatCurrency === 'ils' ? 'يتم تحديث السعر تلقائياً كل 30 دقيقة' : 'سعر ثابت 1 USDT = 1 دولار'}
          </p>
        </div>
        
        {/* نسبة البائع */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">نسبة البائع (Premium)</label>
            <span className={`text-sm font-semibold ${
              premiumPercent > 0 ? 'text-green-600' : premiumPercent < 0 ? 'text-red-600' : 'text-gray-500'
            }`}>
              {premiumPercent > 0 ? '+' : ''}{premiumPercent}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="-5"
              max="5"
              step="0.1"
              value={premiumPercent}
              onChange={(e) => handlePremiumChange(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg"
            />
            <div className="relative w-20">
              <input
                type="number"
                min="-5"
                max="5"
                step="0.1"
                value={premiumPercent}
                onChange={(e) => handlePremiumChange(parseFloat(e.target.value))}
                className="w-full px-2 py-1 border rounded-lg text-center text-sm"
              />
              <Percent className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">يمكنك إضافة نسبة من -5% إلى +5% على سعر الصرف الأساسي</p>
        </div>

        {/* السعر النهائي */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">السعر النهائي (لكل 1 USDT)</label>
          <div className={`w-full px-4 py-2 rounded-lg border font-semibold text-lg ${
            premiumPercent > 0 
              ? 'bg-green-50 border-green-300 text-green-700' 
              : premiumPercent < 0 
                ? 'bg-red-50 border-red-300 text-red-700' 
                : 'bg-gray-100 border-gray-200 text-gray-800'
          }`}>
            {livePrice.toFixed(4)} {formData.fiatCurrency === 'ils' ? '₪' : '$'}
            {premiumPercent !== 0 && (
              <span className="text-xs mr-2">
                ({premiumPercent > 0 ? `+${premiumPercent}%` : `${premiumPercent}%`})
              </span>
            )}
          </div>
        </div>
        
        {/* الشبكة - TRC20 و BEP20 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الشبكة *</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, network: 'trc20' })}
              className={`flex-1 py-2 px-4 rounded-lg border ${
                formData.network === 'trc20' 
                  ? 'border-blue-600 bg-blue-50 text-blue-600' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              🟢 TRC20 (Tron)
              {isLoadingRates ? (
                <span className="text-xs text-gray-500 block">...</span>
              ) : (
                <span className="text-xs text-gray-500 block">رسوم ~{trc20Fee.toFixed(4)} USDT</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, network: 'bep20' })}
              className={`flex-1 py-2 px-4 rounded-lg border ${
                formData.network === 'bep20' 
                  ? 'border-green-600 bg-green-50 text-green-600' 
                  : 'border-gray-300 hover:border-green-400'
              }`}
            >
              🟢 BEP20 (Binance)
              {isLoadingRates ? (
                <span className="text-xs text-gray-500 block">...</span>
              ) : (
                <span className="text-xs text-green-500 block">رسوم ~{bep20Fee.toFixed(6)} USDT</span>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">يتم تحديث رسوم الشبكة تلقائياً كل 30 دقيقة</p>
        </div>
        
        {/* الحدود */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأدنى (USDT) *</label>
            <input
              type="number"
              min={10}
              value={formData.minAmount}
              onChange={(e) => setFormData({ ...formData, minAmount: parseInt(e.target.value) || 10 })}
              className={`w-full px-4 py-2 border rounded-lg ${errors.minAmount ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.minAmount && <p className="mt-1 text-sm text-red-500">{errors.minAmount}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأقصى (USDT) *</label>
            <input
              type="number"
              min={10}
              value={formData.maxAmount}
              onChange={(e) => setFormData({ ...formData, maxAmount: parseInt(e.target.value) || 1000 })}
              className={`w-full px-4 py-2 border rounded-lg ${errors.maxAmount ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.maxAmount && <p className="mt-1 text-sm text-red-500">{errors.maxAmount}</p>}
          </div>
        </div>

        {/* البنك */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            البنك الذي ستستقبل عليه التحويلات *
          </label>
          <select
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.bankName ? 'border-red-500' : 'border-gray-300'}`}
            value={formData.bankName}
            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
            required
          >
            <option value="">اختر البنك</option>
            <option value="بنك فلسطين">🏦 بنك فلسطين</option>
            <option value="البنك العربي">🏦 البنك العربي</option>
            <option value="بنك القدس">🏦 بنك القدس</option>
            <option value="البنك الإسلامي الفلسطيني">🏦 البنك الإسلامي الفلسطيني</option>
            <option value="البنك الوطني">🏦 البنك الوطني</option>
            <option value="بنك الاستثمار الفلسطيني">🏦 بنك الاستثمار الفلسطيني</option>
            <option value="بنك القاهرة عمان">🏦 بنك القاهرة عمان</option>
            <option value="البنك التجاري الفلسطيني">🏦 البنك التجاري الفلسطيني</option>
            <option value="بنك الإسكان">🏦 بنك الإسكان</option>
            <option value="بنك الأردن">🏦 بنك الأردن</option>
            <option value="بنك مصر فلسطين">🏦 بنك مصر فلسطين</option>
          </select>
          {errors.bankName && <p className="mt-1 text-sm text-red-500">{errors.bankName}</p>}
          <p className="text-xs text-gray-400 mt-1">سيظهر هذا البنك للمشتري ليحول إليه الأموال</p>
        </div>

        {/* تعليمات الدفع */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">تعليمات الدفع للمشتري *</label>
          <textarea
            className={`w-full px-4 py-2 border rounded-lg resize-none ${errors.paymentInstructions ? 'border-red-500' : 'border-gray-300'}`}
            rows={4}
            maxLength={2000}
            placeholder="مثال: يرجى التحويل إلى حساب بنك القدس رقم 123456789..."
            value={formData.paymentInstructions}
            onChange={(e) => setFormData({ ...formData, paymentInstructions: e.target.value })}
          />
          <div className="flex justify-between mt-1">
            {errors.paymentInstructions && <p className="text-sm text-red-500">{errors.paymentInstructions}</p>}
            <p className="text-xs text-gray-400">{formData.paymentInstructions.length}/2000 حرف</p>
          </div>
        </div>
        
        {/* ملاحظة أمنية */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800">ملاحظة أمنية</p>
              <p className="text-gray-600 text-xs mt-1">
                سيتم عرض تعليمات الدفع للمشتري فقط بعد بدء الصفقة. لا تشارك معلوماتك البنكية خارج المنصة.
              </p>
            </div>
          </div>
        </div>
        
        {/* أزرار */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            إلغاء
          </Button>
          <Button onClick={handleSubmit} loading={isLoading} className="flex-1">
            إنشاء العرض
          </Button>
        </div>
      </div>
    </Modal>
  );
}