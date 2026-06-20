'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOffers } from '@/hooks/useOffers';
import { offersApi } from '@/lib/api';
import { fetchRatesWithCache, getCachedRates } from '@/lib/rateCache';
import { Button } from '@/components/ui';
import { Search, Filter, Loader2, TrendingUp, Plus, Shield, ShoppingBag, RefreshCw, AlertTriangle, Trash2 } from 'lucide-react';
import CreateOfferModal from '@/components/marketplace/CreateOfferModal';
import { useTradeWebSocket } from '@/hooks/useTradeWebSocket';
import { useSoundNotification } from '@/components/ui/SoundNotification';
import { getSocket, initializeSocket } from '@/lib/socket';
import { OnlineIndicator } from '@/components/ui/OnlineIndicator';
import { usePresence } from '@/hooks/usePresence';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

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
  const [isWaitingForSeller, setIsWaitingForSeller] = useState(false);
  const [pendingTrade, setPendingTrade] = useState<any>(null);
  const [countdown, setCountdown] = useState(0);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  
  // ✅ حالات عروضي (my-offers)
  const [myOffers, setMyOffers] = useState<any[]>([]);
  const [isLoadingMyOffers, setIsLoadingMyOffers] = useState(false);
  const [deletingOfferId, setDeletingOfferId] = useState<string | null>(null);
  
  // ✅ حالة توفر البائعين
  const [sellerAvailability, setSellerAvailability] = useState<Record<string, boolean>>({});
  
  const [networkFees, setNetworkFees] = useState<{ trc20: number; bep20: number }>({ trc20: 1.5, bep20: 0.5 });
  const [feesLoading, setFeesLoading] = useState(true);
  const [feesError, setFeesError] = useState(false);

  // WebSocket للإشعارات
  const { pendingTrade: wsPendingTrade, isWaitingForSeller: wsIsWaiting, requestConfirmation, confirmPresence } = useTradeWebSocket();
  const { showNotification, NotificationComponent, clearNotification } = useSoundNotification();

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

  // ✅ التحقق من توفر البائع
  const checkSellerAvailability = async (sellerId: string): Promise<boolean> => {
    if (sellerAvailability[sellerId] !== undefined) {
      return sellerAvailability[sellerId];
    }
    
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/users/${sellerId}/presence`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const isAvailable = data.isOnline === true;
      setSellerAvailability(prev => ({ ...prev, [sellerId]: isAvailable }));
      return isAvailable;
    } catch (error) {
      console.error('Failed to check seller availability:', error);
      return false;
    }
  };

  // ✅ تحميل العروض عند التبديل إلى تبويب "عروضي"
  useEffect(() => {
    if (activeTab === 'myOffers' && isAuthenticated) {
      loadMyOffers();
    }
  }, [activeTab, isAuthenticated]);

  // تحديث حالة انتظار البائع
  useEffect(() => {
    if (wsPendingTrade) {
      setPendingTrade(wsPendingTrade);
      setIsWaitingForSeller(true);
      setCountdown(wsPendingTrade.timeLeft || 600);
    }
  }, [wsPendingTrade]);

  useEffect(() => {
    if (!isWaitingForSeller || !pendingTrade) return;
    
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsWaitingForSeller(false);
          setPendingTrade(null);
          showNotification('error', 'انتهت المهلة، لم يؤكد البائع وجوده', '⏰ انتهت المهلة');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isWaitingForSeller, pendingTrade, showNotification]);

  // ✅ تحميل الأسعار من الكاش (بدلاً من API مباشر)
  useEffect(() => {
    const loadFees = async () => {
      try {
        setFeesLoading(true);
        setFeesError(false);
        
        // ✅ استخدام الكاش أولاً (بدلاً من طلب API مباشر)
        const ratesData = await fetchRatesWithCache();
        
        if (ratesData) {
          setNetworkFees({
            trc20: ratesData.fees.trc20.fee,
            bep20: ratesData.fees.bep20.fee,
          });
          console.log('✅ Fees loaded from cache:', ratesData.fees);
        } else {
          throw new Error('No rates data available');
        }
      } catch (error) {
        console.error('Failed to load network fees:', error);
        setFeesError(true);
        toast.error('فشل تحميل رسوم الشبكة، سيتم استخدام القيم الافتراضية مؤقتاً');
        // قيم افتراضية في حالة الفشل التام
        setNetworkFees({ trc20: 1.5, bep20: 0.5 });
      } finally {
        setFeesLoading(false);
      }
    };
    
    loadFees();
  }, []);

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
  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العرض؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }
    
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

  // ✅ دالة شراء USDT مع التحقق من توفر البائع
  const handleBuyClick = async (offerId: string) => {
    const offer = offers.find(o => o.id === offerId);
    if (!offer) {
      toast.error('العرض غير موجود');
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
    
    // ✅ التحقق من توفر البائع
    setIsLoadingAction(true);
    const isAvailable = await checkSellerAvailability(offer.seller?.id);
    setIsLoadingAction(false);
    
    if (!isAvailable) {
      toast.custom((t) => (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-lg max-w-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800">⚠️ البائع غير متوفر حالياً</p>
              <p className="text-sm text-yellow-700 mt-1">
                البائع ليس ضمن ساعات العمل أو غير متصل.
                يمكنك المحاولة خلال ساعات العمل المحددة.
              </p>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="mt-2 text-sm text-yellow-800 font-medium hover:underline"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      ), { duration: 5000 });
      return;
    }
    
    // ✅ طلب إدخال المبلغ من المستخدم
    const userAmount = prompt(
      `أدخل المبلغ المطلوب شراؤه (USDT)\nالحد الأدنى: ${offer.minAmount}\nالحد الأقصى: ${offer.maxAmount}`,
      offer.minAmount.toString()
    );
    
    if (!userAmount) return;
    
    const amountNum = parseFloat(userAmount);
    if (isNaN(amountNum)) {
      toast.error('يرجى إدخال رقم صحيح');
      return;
    }
    
    if (amountNum < offer.minAmount) {
      toast.error(`الحد الأدنى للشراء هو ${offer.minAmount} USDT`);
      return;
    }
    
    if (amountNum > offer.maxAmount) {
      toast.error(`الحد الأقصى للشراء هو ${offer.maxAmount} USDT`);
      return;
    }
    
    // ✅ التحقق من WebSocket
    const socket = getSocket();
    if (!socket || !socket.connected) {
      toast.error('جاري الاتصال بالخادم، يرجى المحاولة مرة أخرى بعد ثوانٍ');
      const token = localStorage.getItem('accessToken');
      if (token) {
        initializeSocket(token);
        setTimeout(() => {
          toast.success('تم إعادة الاتصال، يرجى المحاولة مرة أخرى');
        }, 1000);
      }
      return;
    }
    
    setIsLoadingAction(true);
    try {
      await requestConfirmation(offerId, amountNum);
      showNotification('pending', 'جاري البحث عن البائع لتأكيد وجوده...', '⏳ انتظار البائع', true);
    } catch (error: any) {
      console.error('Request confirmation error:', error);
      toast.error(error?.message || 'فشل في طلب تأكيد البائع');
    } finally {
      setIsLoadingAction(false);
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
    try {
      const ratesData = await fetchRatesWithCache(true);
      if (ratesData) {
        setNetworkFees({
          trc20: ratesData.fees.trc20.fee,
          bep20: ratesData.fees.bep20.fee,
        });
        toast.success('تم تحديث الأسعار بنجاح');
      }
    } catch (error) {
      toast.error('فشل تحديث الأسعار');
    } finally {
      setFeesLoading(false);
    }
  };

  if (feesError && !feesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 text-center border border-white/20 max-w-md">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-white mb-2">فشل تحميل رسوم الشبكة</p>
          <p className="text-blue-200 text-sm mb-4">يرجى التحقق من اتصال الخادم</p>
          <button onClick={handleRefreshRates} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || feesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {NotificationComponent}
      
      {isWaitingForSeller && pendingTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">جاري البحث عن البائع</h2>
              <p className="text-blue-200 text-sm mb-4">
                ننتظر تأكيد البائع لوجوده...
              </p>
              <div className="text-2xl font-bold text-yellow-400 mb-4">
                {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
              </div>
              <p className="text-blue-300 text-xs">
                سيتم إلغاء الطلب تلقائياً إذا لم يؤكد البائع وجوده خلال 10 دقائق
              </p>
              {user?.role !== 'user' && (
                <button
                  onClick={() => confirmPresence(pendingTrade.pendingId, pendingTrade.offerId)}
                  className="mt-4 px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition"
                >
                  أنا موجود (للبائع)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* ✅ تبويبات الصفحة */}
        <div className="flex gap-2 mb-6 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-1 w-fit">
          <button
            onClick={() => setActiveTab('buy')}
            className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'buy'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            شراء USDT
          </button>
          <button
            onClick={() => setActiveTab('myOffers')}
            className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'myOffers'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Plus className="w-4 h-4" />
            عروض البيع الخاصة بي
          </button>
        </div>

        {/* ==================== تبويب شراء USDT ==================== */}
        {activeTab === 'buy' && (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">المتجر</h1>
                <p className="text-blue-200 text-sm mt-1">اختر عرض من عروض البائعين الموثوقين</p>
              </div>
              <div className="flex gap-3">
                <button onClick={handleRefreshRates} className="p-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition" title="تحديث الأسعار">
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button onClick={() => refetchAll()} className="p-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition" title="تحديث العروض">
                  <RefreshCw className="w-5 h-5" />
                </button>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="بحث باسم البائع..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-64 pr-10 pl-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <div className="flex bg-white/10 rounded-xl p-1">
                    <button onClick={() => { setSelectedCurrency('ALL'); setPage(1); refetchAll(); }} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 ${selectedCurrency === 'ALL' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-200 hover:text-white'}`}>🌍 الكل</button>
                    <button onClick={() => { setSelectedCurrency('ILS'); setPage(1); refetchAll(); }} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 ${selectedCurrency === 'ILS' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-200 hover:text-white'}`}><Image src="https://flagcdn.com/w20/ps.png" alt="شيكل" width={16} height={12} className="w-4 h-3" />شيكل</button>
                    <button onClick={() => { setSelectedCurrency('USD'); setPage(1); refetchAll(); }} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 ${selectedCurrency === 'USD' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-200 hover:text-white'}`}><Image src="https://flagcdn.com/w20/us.png" alt="دولار" width={16} height={12} className="w-4 h-3" />دولار</button>
                  </div>
                  <div className="flex bg-white/10 rounded-xl p-1">
                    <button onClick={() => { setSelectedNetwork('all'); setPage(1); refetchAll(); }} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${selectedNetwork === 'all' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-200 hover:text-white'}`}>الكل</button>
                    <button onClick={() => { setSelectedNetwork('TRC20'); setPage(1); refetchAll(); }} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 ${selectedNetwork === 'TRC20' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-200 hover:text-white'}`}>
                      <Image src="https://cryptologos.cc/logos/tether-usdt-logo.svg" alt="USDT" width={16} height={16} className="w-4 h-4" />
                      TRC20
                    </button>
                    <button onClick={() => { setSelectedNetwork('BEP20'); setPage(1); refetchAll(); }} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 ${selectedNetwork === 'BEP20' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-200 hover:text-white'}`}>
                      <Image src="https://cryptologos.cc/logos/bnb-bnb-logo.svg" alt="BNB" width={16} height={16} className="w-4 h-4" />
                      BEP20
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateOffer} className="bg-green-600 hover:bg-green-700 shadow-lg"><Plus className="w-4 h-4 ml-2" />بيع USDT</Button>
                  <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-200 bg-white/10 rounded-xl hover:bg-white/20 transition"><Filter className="w-4 h-4" />{showFilters ? 'إخفاء الفلتر' : 'فلتر متقدم'}</button>
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
              <p className="text-sm text-blue-200"><span className="font-semibold text-white">{filteredOffers.length}</span> عرض متاح</p>
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
                  
                  return (
                    <div key={offer.id} className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden hover:bg-white/15 transition hover:border-blue-500/50">
                      <div className="p-5">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md overflow-hidden">
                                {offer.seller?.profileImageUrl ? (
                                  <img 
                                    src={`http://localhost:4000${offer.seller.profileImageUrl}`} 
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
                                  {/* ✅ أيقونة النشاط */}
                                  <OnlineIndicator userId={offer.seller?.id} size="sm" showTooltip={true} />
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
                              </div>
                            </div>
                          </div>
                          <div className="text-center md:text-left">
                            <div className={`text-2xl font-bold flex items-center justify-center md:justify-start gap-1 ${isPremiumPositive ? 'text-red-400' : isPremiumNegative ? 'text-green-400' : 'text-blue-400'}`}>
                              {offer.price} {offer.fiatCurrency === 'ils' ? '₪' : '$'}
                            </div>
                            <div className="text-xs text-blue-300">لكل 1 USDT</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/10">
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
                        
                        <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/10">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-300 text-xs">رسوم الشبكة:</span>
                            <span className="text-yellow-400 text-sm font-medium">
                              {isTrc20 ? `${trc20Fee.toFixed(6)} USDT` : `${bep20Fee.toFixed(6)} USDT`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-blue-300 text-xs">عمولة المنصة:</span>
                            <span className="text-purple-400 text-sm font-medium">1%</span>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <button 
                            onClick={() => handleBuyClick(offer.id)} 
                            disabled={isLoadingAction}
                            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                          >
                            {isLoadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : 'شراء USDT'}
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
    </div>
  );
}

export default function MarketplacePage() {
  return <MarketplaceContent />;
}