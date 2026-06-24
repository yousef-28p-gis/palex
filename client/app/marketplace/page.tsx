'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOffers } from '@/hooks/useOffers';
import { offersApi, tradesApi } from '@/lib/api';
import { fetchRatesWithCache } from '@/lib/rateCache';
import { Button, ConfirmModal } from '@/components/ui';
import { Search, Filter, Loader2, TrendingUp, Plus, Shield, ShoppingBag, RefreshCw, AlertTriangle, Trash2 } from 'lucide-react';
import CreateOfferModal from '@/components/marketplace/CreateOfferModal';
import { useSoundNotification } from '@/components/ui/SoundNotification';
import { OnlineIndicator } from '@/components/ui/OnlineIndicator';
import { BuyAmountModal } from '@/components/marketplace/BuyAmountModal';
import { usePresence } from '@/hooks/usePresence';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

// ✅ تبويبات الصفحة
type TabType = 'buy' | 'myOffers';

function MarketplaceContent() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ✅ تفعيل تتبع تواجد المستخدم
  usePresence();
  
  // ✅ التبويب النشط
  const [activeTab, setActiveTab] = useState<TabType>('buy');
  
  // ✅ حالات المتجر (الشراء)
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<'ALL' | 'ILS' | 'USD'>('ALL');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [buyingOfferId, setBuyingOfferId] = useState<string | null>(null);
  const [buyModalOffer, setBuyModalOffer] = useState<any | null>(null);
  
  // ✅ حالات عروضي (my-offers)
  const [myOffers, setMyOffers] = useState<any[]>([]);
  const [isLoadingMyOffers, setIsLoadingMyOffers] = useState(false);
  const [deletingOfferId, setDeletingOfferId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{isOpen: boolean; offerId: string | null}>({isOpen: false, offerId: null});
  
  // ✅ روابط الصفقات النشطة للبائع (أيقونة الواتساب)
  const [activeTradeLinks, setActiveTradeLinks] = useState<Record<string, string>>({});
  
  const [networkFees, setNetworkFees] = useState<{ trc20: number; bep20: number }>({ trc20: 2.5, bep20: 0.5 });
  const [usdToIls, setUsdToIls] = useState(3);
  const [feesLoading, setFeesLoading] = useState(true);
  
  // ✅ عدد إجمالي الصفقات النشطة (للزر العائم)
  const activeTradeCount = Object.keys(activeTradeLinks).length;

  // ✅ إشعارات صوتية
  const { showNotification, NotificationComponent } = useSoundNotification();

  // ✅ جلب عروضي (my-offers)
  const loadMyOffers = async () => {
    setIsLoadingMyOffers(true);
    try {
      const response = await offersApi.getMyOffers();
      setMyOffers(response.data || []);
    } catch (error) {
      console.error('Failed to load my offers:', error);
      toast.error('فشل في تحميل عروضك');
    } finally {
      setIsLoadingMyOffers(false);
    }
  };

  // ✅ التحقق من حالة المستخدم (تسجيل الدخول / KYC)
  useEffect(() => {
    if (activeTab === 'myOffers' && isAuthenticated) {
      loadMyOffers();
    }
  }, [activeTab, isAuthenticated]);

  // ✅ تحميل رسوم الشبكة
  useEffect(() => {
    const loadFees = async () => {
      setFeesLoading(true);
      const ratesData = await fetchRatesWithCache();
      setNetworkFees({
        trc20: ratesData.fees.trc20.fee,
        bep20: ratesData.fees.bep20.fee,
      });
      setUsdToIls(ratesData.exchange.usdToIls || 3);
      setFeesLoading(false);
    };
    loadFees();
  }, []);

  // ✅ جلب روابط الصفقات النشطة للبائع
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    
    const loadActiveTradeLinks = async () => {
      try {
        const { data: trades } = await offersApi.getMyActiveTradeLinks();
        const links: Record<string, string> = {};
        (Array.isArray(trades) ? trades : []).forEach((t: any) => {
          if (t.offerId && t.id) {
            links[t.offerId] = t.id;
          }
        });
        setActiveTradeLinks(links);
      } catch (error) {
        console.warn('Failed to load active trade links:', error);
      }
    };
    
    loadActiveTradeLinks();
    // تحديث كل 30 ثانية
    const interval = setInterval(loadActiveTradeLinks, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user?.id]);

  const { data: ilsData, isLoading: ilsLoading, refetch: ilsRefetch } = useOffers({
    fiatCurrency: 'ils',
    network: selectedNetwork !== 'all' ? selectedNetwork.toLowerCase() as 'trc20' | 'bep20' : undefined,
    minPrice: priceRange[0],
    maxPrice: priceRange[1],
    page,
    limit: 100,
  });

  const { data: usdData, isLoading: usdLoading, refetch: usdRefetch } = useOffers({
    fiatCurrency: 'usd',
    network: selectedNetwork !== 'all' ? selectedNetwork.toLowerCase() as 'trc20' | 'bep20' : undefined,
    minPrice: priceRange[0],
    maxPrice: priceRange[1],
    page,
    limit: 100,
  });

  let offers: any[] = [];
  let isLoading = false;

  if (selectedCurrency === 'ALL') {
    offers = [...(ilsData?.offers || []), ...(usdData?.offers || [])];
    isLoading = ilsLoading || usdLoading;
    offers.sort((a, b) => a.price - b.price);
  } else if (selectedCurrency === 'ILS') {
    offers = ilsData?.offers || [];
    isLoading = ilsLoading;
  } else {
    offers = usdData?.offers || [];
    isLoading = usdLoading;
  }

  const totalPages = Math.max(1, Math.ceil(offers.length / 12));
  const trc20Fee = networkFees.trc20;
  const bep20Fee = networkFees.bep20;

  const refetchAll = () => {
    if (selectedCurrency === 'ALL') {
      ilsRefetch();
      usdRefetch();
    } else if (selectedCurrency === 'ILS') {
      ilsRefetch();
    } else {
      usdRefetch();
    }
  };

  useEffect(() => {
    const checkAuthAfterReturn = async () => {
      const redirect = searchParams.get('redirect');
      if (redirect === '/marketplace') {
        router.replace('/marketplace');
      }
    };
    checkAuthAfterReturn();
  }, [searchParams, router]);

  const canSell = () => {
    if (!isAuthenticated) return 'not_logged_in';
    if (user?.kycStatus !== 'approved') return 'kyc_required';
    return 'allowed';
  };

  const canBuy = () => {
    if (!isAuthenticated) return 'not_logged_in';
    if (user?.kycStatus !== 'approved') return 'kyc_required';
    return 'allowed';
  };

  const handleCreateOffer = () => {
    const sellStatus = canSell();
    if (sellStatus === 'not_logged_in') {
      toast.error('يرجى تسجيل الدخول أولاً');
      router.push('/login?redirect=/marketplace');
      return;
    }
    if (sellStatus === 'kyc_required') {
      toast.error('يرجى إكمال توثيق الهوية أولاً');
      router.push('/kyc');
      return;
    }
    setShowCreateModal(true);
  };

  // ✅ حذف عرض (لتبويب عروضي)
  const handleDeleteOffer = (offerId: string) => {
    setConfirmDelete({isOpen: true, offerId});
  };

  const closeConfirmDelete = () => {
    setConfirmDelete({isOpen: false, offerId: null});
  };

  const handleDeleteConfirmed = async () => {
    const offerId = confirmDelete.offerId;
    if (!offerId) return;
    closeConfirmDelete();
    setDeletingOfferId(offerId);
    try {
      await offersApi.delete(offerId);
      toast.success('تم حذف العرض بنجاح');
      loadMyOffers();
      refetchAll();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في حذف العرض');
    } finally {
      setDeletingOfferId(null);
    }
  };

  // ✅ شراء مباشر — إظهار مودال إدخال المبلغ
  const handleBuyClick = async (offerId: string) => {
    const offer = offers.find(o => o.id === offerId);
    if (!offer) {
      toast.error('العرض غير موجود');
      return;
    }

    // 🛑 منع البائع من شراء طلبه الخاص
    if (user && offer.seller?.id === user.id) {
      toast.error('لا يمكنك شراء طلب البيع الخاص بك');
      return;
    }

    const buyStatus = canBuy();
    if (buyStatus === 'not_logged_in') {
      toast.error('يرجى تسجيل الدخول أولاً');
      router.push(`/login?redirect=/marketplace&offerId=${offerId}`);
      return;
    }
    if (buyStatus === 'kyc_required') {
      toast.error('يرجى إكمال توثيق الهوية أولاً');
      router.push('/kyc');
      return;
    }

    // ✅ التحقق من وجود محفظة للمشتري تناسب شبكة العرض
    if (offer.network === 'bep20' && !user?.bscWallet) {
      toast.custom((t) => (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-lg max-w-md" dir="rtl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-800">⚠️ محفظة غير موجودة</p>
              <p className="text-sm text-red-700 mt-1">
                هذا العرض يستخدم شبكة BSC (BEP20). يجب إضافة محفظة BSC (BEP20) أولاً
                لاستلام USDT على شبكة BEP20.
              </p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => { toast.dismiss(t.id); router.push('/profile'); }} className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg font-semibold hover:bg-red-700 transition">
                  🏦 الذهاب للمحفظة
                </button>
                <button onClick={() => toast.dismiss(t.id)} className="px-3 py-2 bg-red-100 text-red-800 text-sm rounded-lg font-semibold hover:bg-red-200 transition">
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      ), { duration: 10000 });
      return;
    }
    if (offer.network === 'trc20' && !user?.trc20Wallet) {
      toast.custom((t) => (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-lg max-w-md" dir="rtl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-800">⚠️ محفظة غير موجودة</p>
              <p className="text-sm text-red-700 mt-1">
                هذا العرض يستخدم شبكة TRC20. يجب إضافة محفظة TRC20 أولاً
                لاستلام USDT على شبكة TRC20.
              </p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => { toast.dismiss(t.id); router.push('/profile'); }} className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg font-semibold hover:bg-red-700 transition">
                  🏦 الذهاب للمحفظة
                </button>
                <button onClick={() => toast.dismiss(t.id)} className="px-3 py-2 bg-red-100 text-red-800 text-sm rounded-lg font-semibold hover:bg-red-200 transition">
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      ), { duration: 10000 });
      return;
    }

    // ✅ إظهار مودال اختيار المبلغ
    setBuyModalOffer(offer);
  };

  // ✅ تنفيذ الشراء بعد تأكيد المبلغ
  const executeBuy = async (amountNum: number) => {
    const offer = buyModalOffer;
    if (!offer) return;

    setBuyModalOffer(null);
    setIsBuying(true);
    setBuyingOfferId(offer.id);

    try {
      const response = await tradesApi.start({ offerId: offer.id, amountUsdt: amountNum });
      const tradeData = response.data.trade;

      if (!tradeData || !tradeData.id) {
        throw new Error('لم يتم استلام بيانات الصفقة');
      }

      // ✅ التوجيه فوراً
      router.push(`/trades/${tradeData.id}`);

      // ✅ إشعار بعد التوجيه
      setTimeout(() => {
        toast.success('تم فتح الصفقة بنجاح 🎉');
      }, 100);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'فشل إنشاء الصفقة';
      toast.error(message, { duration: 6000 });
      console.warn('Trade create error:', message);
    } finally {
      setIsBuying(false);
      setBuyingOfferId(null);
    }
  };

  const handleResetFilters = () => {
    setSelectedCurrency('ALL');
    setSelectedNetwork('all');
    setPriceRange([0, 100000]);
    setSearchTerm('');
    setPage(1);
    refetchAll();
    toast.success('تم إعادة ضبط الفلتر');
  };

  const filteredOffers = searchTerm ? offers.filter(o => o.seller?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())) : offers;

  // ✅ دالة الحصول على حالة العرض
  const getOfferStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'نشط', color: 'bg-green-500/20 text-green-300' };
      case 'paused':
        return { label: 'موقوف', color: 'bg-yellow-500/20 text-yellow-300' };
      default:
        return { label: status, color: 'bg-gray-500/20 text-gray-300' };
    }
  };

  // ✅ دالة تحديث الأسعار يدوياً
  const handleRefreshRates = async () => {
    setFeesLoading(true);
    const ratesData = await fetchRatesWithCache(true);
    setNetworkFees({
      trc20: ratesData.fees.trc20.fee,
      bep20: ratesData.fees.bep20.fee,
    });
    setUsdToIls(ratesData.exchange.usdToIls || 3);
    toast.success('تم تحديث الأسعار بنجاح');
    setFeesLoading(false);
  };

  // ✅ فقط أول تحميل — نعرض full-screen loader
  // ✅ أول تحميل فقط — نعرض loader كامل، بعدين spinner صغير
  const initialLoadDone = useRef(false);
  if (!isLoading && !feesLoading) initialLoadDone.current = true;
  const showFullLoader = !initialLoadDone.current && (isLoading || feesLoading);
  
  if (showFullLoader) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {NotificationComponent}

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* ✅ تبويبات الصفحة */}
        <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 bg-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/20 p-1 w-full">
          <button
            onClick={() => setActiveTab('buy')}
            className={`flex-1 px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 text-xs sm:text-sm ${
              activeTab === 'buy'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            شراء USDT
          </button>
          <button
            onClick={() => setActiveTab('myOffers')}
            className={`flex-1 px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 text-xs sm:text-sm ${
              activeTab === 'myOffers'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            عروضي
          </button>
        </div>

        {/* ==================== تبويب شراء USDT ==================== */}
        {activeTab === 'buy' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">المتجر</h1>
                <p className="text-blue-200 text-xs sm:text-sm mt-0.5 sm:mt-1">اختر عرض من عروض البائعين الموثوقين</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { 
                    handleRefreshRates(); 
                    refetchAll(); 
                    toast.success('جاري تحديث البيانات...');
                  }} 
                  className="p-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition shrink-0" 
                  title="تحديث"
                >
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="بحث..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-48 md:w-64 pr-9 sm:pr-10 pl-3 sm:pl-4 py-1.5 sm:py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/20 p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  <div className="flex bg-white/10 rounded-lg sm:rounded-xl p-0.5 sm:p-1 w-full sm:w-auto">
                    <button onClick={() => { setSelectedCurrency('ALL'); setPage(1); refetchAll(); }} className={`flex-1 px-2 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-lg text-[10px] sm:text-sm font-medium transition flex items-center justify-center gap-1 ${selectedCurrency === 'ALL' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-200 hover:text-white'}`}>🌍 الكل</button>
                    <button onClick={() => { setSelectedCurrency('ILS'); setPage(1); refetchAll(); }} className={`flex-1 px-2 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-lg text-[10px] sm:text-sm font-medium transition flex items-center justify-center gap-1 ${selectedCurrency === 'ILS' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-200 hover:text-white'}`}><Image src="https://flagcdn.com/w20/ps.png" alt="شيكل" width={16} height={12} className="w-3 h-2 sm:w-4 sm:h-3" />شيكل</button>
                    <button onClick={() => { setSelectedCurrency('USD'); setPage(1); refetchAll(); }} className={`flex-1 px-2 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-lg text-[10px] sm:text-sm font-medium transition flex items-center justify-center gap-1 ${selectedCurrency === 'USD' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-200 hover:text-white'}`}><Image src="https://flagcdn.com/w20/us.png" alt="دولار" width={16} height={12} className="w-3 h-2 sm:w-4 sm:h-3" />دولار</button>
                  </div>
                  <div className="flex bg-white/10 rounded-lg sm:rounded-xl p-0.5 sm:p-1 w-full sm:w-auto">
                    <button onClick={() => { setSelectedNetwork('all'); setPage(1); refetchAll(); }} className={`flex-1 px-2 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-lg text-[10px] sm:text-sm font-medium transition ${selectedNetwork === 'all' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-200 hover:text-white'}`}>الكل</button>
                    <button onClick={() => { setSelectedNetwork('TRC20'); setPage(1); refetchAll(); }} className={`flex-1 px-2 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-lg text-[10px] sm:text-sm font-medium transition flex items-center justify-center gap-1 ${selectedNetwork === 'TRC20' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-200 hover:text-white'}`}>
                      <Image src="https://cryptologos.cc/logos/tether-usdt-logo.svg" alt="USDT" width={16} height={16} className="w-3 h-3 sm:w-4 sm:h-4" />
                      TRC20
                    </button>
                    <button onClick={() => { setSelectedNetwork('BEP20'); setPage(1); refetchAll(); }} className={`flex-1 px-2 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-lg text-[10px] sm:text-sm font-medium transition flex items-center justify-center gap-1 ${selectedNetwork === 'BEP20' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-200 hover:text-white'}`}>
                      <Image src="https://cryptologos.cc/logos/bnb-bnb-logo.svg" alt="BNB" width={16} height={16} className="w-3 h-3 sm:w-4 sm:h-4" />
                      BEP20
                    </button>
                  </div>
                </div>
                <div className="flex gap-1.5 sm:gap-2">
                  <Button onClick={handleCreateOffer} className="bg-blue-600 hover:bg-blue-700 shadow-lg !px-3 !py-1.5 sm:!px-4 sm:!py-2 !text-xs sm:!text-sm"><Plus className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />تقديم طلب بيع</Button>
                  <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1 px-2 sm:px-4 py-1 sm:py-2 text-[10px] sm:text-sm font-medium text-blue-200 bg-white/10 rounded-lg sm:rounded-xl hover:bg-white/20 transition shrink-0"><Filter className="w-3 h-3 sm:w-4 sm:h-4" />{showFilters ? 'إخفاء' : 'فلتر'}</button>
                </div>
              </div>
              {showFilters && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-white">فلتر متقدم</h3><button onClick={handleResetFilters} className="text-xs text-red-400 hover:text-red-300">إعادة ضبط</button></div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><label className="block text-sm text-blue-200 mb-2">نطاق السعر</label><div className="flex gap-3 items-center"><input type="number" step="0.01" value={priceRange[0]} onChange={(e) => setPriceRange([parseFloat(e.target.value) || 0, priceRange[1]])} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="الحد الأدنى" /><span className="text-gray-400">—</span><input type="number" step="0.01" value={priceRange[1]} onChange={(e) => setPriceRange([priceRange[0], parseFloat(e.target.value) || 100000])} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="الحد الأقصى" /></div></div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-blue-200 flex items-center gap-2">
                <span className="font-semibold text-white">{filteredOffers.length}</span> عرض متاح
                {isLoading && filteredOffers.length > 0 && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                )}
              </p>
              <div className="flex items-center gap-2 text-xs text-blue-300"><TrendingUp className="w-3 h-3" /><span>أفضل الأسعار حالياً</span></div>
            </div>

            {filteredOffers.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 text-center border border-white/20">
                <ShoppingBag className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-1">لا توجد عروض</h3>
                <p className="text-blue-200 text-sm">لا توجد عروض حالياً</p>
                <div className="mt-4 flex gap-3 justify-center"><button onClick={handleResetFilters} className="px-4 py-2 bg-white/20 text-white rounded-lg text-sm hover:bg-white/30 transition">إعادة ضبط الفلتر</button></div>
              </div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-4">
                {filteredOffers.map((offer) => {
                  const isTrc20 = offer.network === 'trc20';
                  const premiumPercent = offer.premiumPercent || 0;
                  const isPremiumPositive = premiumPercent > 0;
                  const isPremiumNegative = premiumPercent < 0;
                  const isThisBuying = isBuying && buyingOfferId === offer.id;
                  
                  return (
                    <div key={offer.id} className="bg-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/20 overflow-hidden hover:bg-white/15 transition hover:border-blue-500/50">
                      <div className="p-3 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md overflow-hidden shrink-0">
                                {offer.seller?.profileImageUrl ? (
                                  <img 
                                    src={`/api${offer.seller.profileImageUrl}`} 
                                    alt={offer.seller?.fullName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      const parent = (e.target as HTMLImageElement).parentElement;
                                      if (parent) {
                                        const span = parent.querySelector('span');
                                        if (span) span.style.display = 'flex';
                                      }
                                    }}
                                  />
                                ) : null}
                                <span 
                                  className="text-white font-bold text-lg" 
                                  style={{ display: offer.seller?.profileImageUrl ? 'none' : 'flex' }}
                                >
                                  {offer.seller?.fullName?.charAt(0) || 'ب'}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-white text-base">{offer.seller?.fullName || 'بائع'}</span>
                                  <OnlineIndicator userId={offer.seller?.id} size="sm" showTooltip={true} />
                                  {/* ✅ أيقونة الواتساب للصفقات النشطة */}
                                  {user?.id && offer.sellerId === user.id && activeTradeLinks[offer.id] && (
                                    <a
                                      href={`/trades/${activeTradeLinks[offer.id]}`}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        router.push(`/trades/${activeTradeLinks[offer.id]}`);
                                      }}
                                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30 transition cursor-pointer"
                                      title="فتح الصفقة"
                                    >
                                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12.072 2.007c-5.512 0-10 4.488-10 10 0 1.774.463 3.44 1.274 4.904L2.03 21.562a.417.417 0 00.515.515l4.647-1.31a9.94 9.94 0 004.88 1.24c5.513 0 10-4.488 10-10s-4.487-10-10-10zm0 18.583a8.574 8.574 0 01-4.468-1.28.416.416 0 00-.347-.05l-3.42.965 1.024-3.336a.416.416 0 00-.048-.36A8.55 8.55 0 013.49 12.007c0-4.74 3.842-8.584 8.582-8.584s8.584 3.844 8.584 8.584-3.844 8.583-8.584 8.583z"/>
                                        <path d="M17.644 14.22c-.284-.14-1.673-.826-1.93-.922-.258-.095-.447-.142-.635.142-.188.285-.73.922-.894 1.11-.163.19-.327.214-.61.072-.283-.143-1.196-.44-2.277-1.406-.843-.753-1.41-1.68-1.575-1.964-.164-.284-.018-.438.124-.58.128-.127.285-.332.427-.498.142-.166.19-.284.285-.475.094-.19.047-.358-.024-.5-.07-.143-.635-1.53-.87-2.096-.23-.562-.462-.458-.635-.468-.163-.01-.35-.01-.537-.01-.188 0-.49.07-.746.354-.258.285-.983.96-.983 2.343 0 1.383 1.007 2.72 1.148 2.908.14.19 1.983 3.026 4.803 4.244.672.292 1.196.466 1.605.618.673.25 1.286.214 1.77.13.54-.094 1.673-.684 1.91-1.346.236-.662.236-1.23.165-1.348-.07-.12-.258-.19-.542-.332z"/>
                                      </svg>
                                      صفقة
                                    </a>
                                  )}
                                  {offer.seller?.kycStatus === 'approved' && (
                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                                      <Shield className="w-3 h-3" /> موثق
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-yellow-400 text-sm">★</span>
                                    <span className="font-medium text-white text-sm">{offer.seller?.averageRating || 0}</span>
                                    <span className="text-blue-300 text-xs">({offer.seller?.totalTrades || 0})</span>
                                  </div>
                                  {premiumPercent !== 0 && (
                                    <div className={`text-xs px-2 py-0.5 rounded-full ${isPremiumPositive ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                      {isPremiumPositive ? `+${premiumPercent}% زيادة` : `${premiumPercent}% خصم`}
                                    </div>
                                  )}
                                </div>
                                {/* ساعات العمل */}
                                {offer.seller?.workHoursStart && offer.seller?.workHoursEnd && (
                                  <div className="flex items-center gap-1 mt-1 text-xs text-blue-300">
                                    <span>⏰</span>
                                    <span>{offer.seller.workHoursStart} - {offer.seller.workHoursEnd}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-center sm:text-left">
                          <div className={`text-xl sm:text-2xl font-bold flex items-center justify-center sm:justify-start gap-1 ${isPremiumPositive ? 'text-red-400' : isPremiumNegative ? 'text-green-400' : 'text-blue-400'}`}>
                          {offer.price} {offer.fiatCurrency === 'ils' ? '₪' : '$'}
                          </div>
                          <div className="text-[10px] sm:text-xs text-blue-300">لكل 1 USDT</div>
                          </div>
                          </div>
                        
                          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-3 sm:mt-5 pt-3 sm:pt-4 border-t border-white/10">
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-blue-300 text-xs mb-1">الحد الأدنى</div>
                            <p className="text-white font-semibold text-sm">{offer.minAmount} USDT</p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-blue-300 text-xs mb-1">الحد الأقصى</div>
                            <p className="text-white font-semibold text-sm">{offer.maxAmount} USDT</p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-blue-300 text-xs mb-1">
                              {isTrc20 ? (
                                <Image src="https://cryptologos.cc/logos/tether-usdt-logo.svg" alt="USDT" width={16} height={16} className="w-4 h-4" />
                              ) : (
                                <Image src="https://cryptologos.cc/logos/bnb-bnb-logo.svg" alt="BNB" width={16} height={16} className="w-4 h-4" />
                              )}
                              الشبكة
                            </div>
                            <p className={`font-semibold text-sm ${isTrc20 ? 'text-blue-400' : 'text-green-400'}`}>
                              {offer.network.toUpperCase()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-white/10">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="text-blue-300 text-[10px] sm:text-xs">رسوم الشبكة:</span>
                            <span className="text-yellow-400 text-xs sm:text-sm font-medium">
                              {isTrc20 ? `${trc20Fee.toFixed(2)}` : `${bep20Fee.toFixed(2)}`} USDT
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="text-blue-300 text-[10px] sm:text-xs">العمولة:</span>
                            <span className="text-purple-400 text-xs sm:text-sm font-medium">1%</span>
                          </div>
                        </div>
                        
                        <div className="mt-3 sm:mt-4">
                          <button 
                            onClick={() => handleBuyClick(offer.id)} 
                            disabled={isBuying}
                            className="w-full py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg sm:rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 text-xs sm:text-sm"
                          >
                            {isThisBuying ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> جاري فتح الصفقة...</>
                            ) : (
                              'شراء USDT'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition disabled:opacity-50">السابق</button>
                <span className="px-4 py-2 text-white">صفحة {page} من {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition disabled:opacity-50">التالي</button>
              </div>
            )}
          </>
        )}

        {/* ==================== تبويب عروض البيع الخاصة بي ==================== */}
        {activeTab === 'myOffers' && (
          <>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">عروض البيع الخاصة بي</h1>
                <p className="text-blue-200 text-sm mt-1">إدارة عروض البيع الخاصة بك</p>
              </div>
              <Button onClick={handleCreateOffer} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 ml-2" />
                إنشاء عرض جديد
              </Button>
            </div>

            {isLoadingMyOffers ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : myOffers.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 text-center border border-white/20">
                <Shield className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-1">لا توجد عروض</h3>
                <p className="text-blue-200 text-sm">لم تقم بإنشاء أي عروض بيع بعد</p>
                <Button onClick={handleCreateOffer} className="mt-4">إنشاء عرض جديد</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {myOffers.map((offer) => {
                  const statusBadge = getOfferStatusBadge(offer.status);
                  const currencySymbol = offer.fiatCurrency === 'ils' ? '₪' : '$';
                  
                  return (
                    <div key={offer.id} className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5 hover:bg-white/15 transition">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${statusBadge.color}`}>
                              {statusBadge.label}
                            </span>
                            <span className="text-xs text-blue-400">
                              تاريخ الإنشاء: {new Date(offer.createdAt).toLocaleDateString('ar')}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div>
                              <span className="text-blue-300">السعر:</span>
                              <span className="text-white font-medium mr-1">
                                {offer.price} {currencySymbol}
                              </span>
                            </div>
                            <div>
                              <span className="text-blue-300">الحدود:</span>
                              <span className="text-white mr-1">
                                {offer.minAmount} - {offer.maxAmount} USDT
                              </span>
                            </div>
                            <div>
                              <span className="text-blue-300">الشبكة:</span>
                              <span className={`font-medium mr-1 ${offer.network === 'trc20' ? 'text-blue-400' : 'text-green-400'}`}>
                                {offer.network.toUpperCase()}
                              </span>
                            </div>
                            {offer.premiumPercent !== 0 && (
                              <div>
                                <span className="text-blue-300">نسبة السعر:</span>
                                <span className={offer.premiumPercent > 0 ? 'text-red-400' : 'text-green-400'}>
                                  {offer.premiumPercent > 0 ? `+${offer.premiumPercent}%` : `${offer.premiumPercent}%`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {/* ✅ أيقونة الصفقة النشطة */}
                          {activeTradeLinks[offer.id] && (
                            <button
                              onClick={() => router.push(`/trades/${activeTradeLinks[offer.id]}`)}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition flex items-center gap-2"
                              title="فتح الصفقة"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.072 2.007c-5.512 0-10 4.488-10 10 0 1.774.463 3.44 1.274 4.904L2.03 21.562a.417.417 0 00.515.515l4.647-1.31a9.94 9.94 0 004.88 1.24c5.513 0 10-4.488 10-10s-4.487-10-10-10zm0 18.583a8.574 8.574 0 01-4.468-1.28.416.416 0 00-.347-.05l-3.42.965 1.024-3.336a.416.416 0 00-.048-.36A8.55 8.55 0 013.49 12.007c0-4.74 3.842-8.584 8.582-8.584s8.584 3.844 8.584 8.584-3.844 8.583-8.584 8.583z"/>
                                <path d="M17.644 14.22c-.284-.14-1.673-.826-1.93-.922-.258-.095-.447-.142-.635.142-.188.285-.73.922-.894 1.11-.163.19-.327.214-.61.072-.283-.143-1.196-.44-2.277-1.406-.843-.753-1.41-1.68-1.575-1.964-.164-.284-.018-.438.124-.58.128-.127.285-.332.427-.498.142-.166.19-.284.285-.475.094-.19.047-.358-.024-.5-.07-.143-.635-1.53-.87-2.096-.23-.562-.462-.458-.635-.468-.163-.01-.35-.01-.537-.01-.188 0-.49.07-.746.354-.258.285-.983.96-.983 2.343 0 1.383 1.007 2.72 1.148 2.908.14.19 1.983 3.026 4.803 4.244.672.292 1.196.466 1.605.618.673.25 1.286.214 1.77.13.54-.094 1.673-.684 1.91-1.346.236-.662.236-1.23.165-1.348-.07-.12-.258-.19-.542-.332z"/>
                              </svg>
                              صفقة
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteOffer(offer.id)}
                            disabled={deletingOfferId === offer.id}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition flex items-center gap-2 disabled:opacity-50"
                          >
                            {deletingOfferId === offer.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                            حذف
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      <CreateOfferModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSuccess={() => { 
        setShowCreateModal(false); 
        refetchAll(); 
        setPage(1);
        if (activeTab === 'myOffers') {
          loadMyOffers();
        }
      }} />

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={closeConfirmDelete}
        onConfirm={handleDeleteConfirmed}
        title="🗑️ حذف العرض"
        message="هل أنت متأكد من حذف هذا العرض؟"
        consequences={['سيتم حذف العرض نهائياً', 'لا يمكن التراجع عن هذا الإجراء', 'إذا كان هناك صفقات نشطة على هذا العرض، فلن يتم حذفه']}
        confirmText="نعم، حذف العرض"
        cancelText="إلغاء"
        variant="danger"
        isLoading={deletingOfferId !== null}
      />

      {/* ✅ مودال شراء USDT — إدخال المبلغ */}
      <BuyAmountModal
        isOpen={buyModalOffer !== null}
        onClose={() => setBuyModalOffer(null)}
        offer={buyModalOffer || { id: '', minAmount: 0, maxAmount: 0, price: 0, fiatCurrency: 'usd', network: 'trc20' }}
        networkFee={buyModalOffer?.network === 'bep20' ? bep20Fee : trc20Fee}
        usdToIls={usdToIls}
        onConfirm={executeBuy}
        isLoading={isBuying}
      />

      {/* ✅ زر الصفقات النشطة - مُنقل إلى layout.tsx ليكون فوق زر الواتساب */}
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MarketplaceContent />
    </Suspense>
  );
}
