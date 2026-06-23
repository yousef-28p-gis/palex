import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { offersApi, OfferFilters, CreateOfferData } from '@/lib/api';
import { getCachedRates } from '@/lib/rateCache';
import { Offer } from '@/types';
import toast from 'react-hot-toast';

// ✅ دالة مساعدة لجلب سعر الصرف من الكاش
const getExchangeRate = async (): Promise<number> => {
  // محاولة الحصول من الكاش أولاً
  const cachedRates = getCachedRates();
  if (cachedRates?.exchange?.usdToIls) {
    return cachedRates.exchange.usdToIls;
  }
  
  // إذا لم يوجد كاش، نجلب من API مباشرة
  try {
    const response = await fetch('/api/rates/exchange');
    const data = await response.json();
    return data.rate || 3.5;
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error);
    return 3.5; // قيمة افتراضية
  }
};

export function useOffers(filters: OfferFilters) {
  return useQuery({
    queryKey: ['offers', filters],
    queryFn: async () => {
      // ✅ الحصول على سعر الصرف من الكاش أولاً
      let exchangeRate = await getExchangeRate();
      
      const response = await offersApi.getAll(filters);
      const responseData = response.data;
      
      // إضافة سعر الصرف الحي إلى كل عرض
      const offersWithLivePrice = (responseData.data || []).map((offer: any) => {
        const premiumPercent = offer.premiumPercent || 0;
        let livePrice: number;
        
        if (offer.fiatCurrency === 'usd') {
          livePrice = 1 * (1 + premiumPercent / 100);
        } else {
          livePrice = exchangeRate * (1 + premiumPercent / 100);
        }
        
        return {
          ...offer,
          price: parseFloat(livePrice.toFixed(4)),
          baseRate: offer.fiatCurrency === 'usd' ? 1 : exchangeRate,
        };
      });
      
      return {
        offers: offersWithLivePrice,
        meta: responseData.meta || { totalPages: 1, currentPage: 1, total: 0 },
        fees: responseData.fees || { trc20: 0, bep20: 0 },
      };
    },
    staleTime: 60 * 1000,          // دقيقة واحدة — تحديث سريع للتقييمات
    gcTime: 5 * 60 * 1000,         // 5 دقائق للـ GC (يحتفظ بالبيانات في الخلفية)
    refetchOnWindowFocus: true,    // تحديث عند العودة للمتصفح
    refetchOnMount: true,          // تحديث عند فتح الصفحة من البداية
    retry: 1,
  });
}

// ✅ جلب عروض المستخدم
export function useMyOffers() {
  return useQuery({
    queryKey: ['myOffers'],
    queryFn: async () => {
      const { data } = await offersApi.getMyOffers();
      return data;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

// ✅ إنشاء عرض جديد
export function useCreateOffer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateOfferData) => offersApi.create(data),
    onSuccess: () => {
      // ✅ إبطال الكاش لوجوب تحديث البيانات
      queryClient.invalidateQueries({ queryKey: ['myOffers'] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      toast.success('تم إنشاء العرض بنجاح');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل في إنشاء العرض');
    },
  });
}

// ✅ حذف عرض
export function useDeleteOffer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => offersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myOffers'] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      toast.success('تم حذف العرض بنجاح');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل في حذف العرض');
    },
  });
}

// ✅ جلب عرض محدد
export function useOffer(id: string) {
  return useQuery({
    queryKey: ['offer', id],
    queryFn: async () => {
      const exchangeRate = await getExchangeRate();
      const { data } = await offersApi.getOne(id);
      
      // حساب السعر الحي
      const premiumPercent = data.premiumPercent || 0;
      let livePrice: number;
      
      if (data.fiatCurrency === 'usd') {
        livePrice = 1 * (1 + premiumPercent / 100);
      } else {
        livePrice = exchangeRate * (1 + premiumPercent / 100);
      }
      
      return {
        ...data,
        price: parseFloat(livePrice.toFixed(4)),
        baseRate: data.fiatCurrency === 'usd' ? 1 : exchangeRate,
      };
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}