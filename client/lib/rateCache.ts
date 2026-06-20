// lib/rateCache.ts

export interface CachedRates {
  exchange: {
    usdToIls: number;
    lastUpdated: string;
  };
  fees: {
    trc20: { fee: number };
    bep20: { fee: number };
  };
  savedAt: number;
  expiresAt: number;
}

const CACHE_KEY = 'p2p_exchange_rates';
const CACHE_DURATION = 30 * 60 * 1000; // 30 دقيقة

/**
 * الحصول على الأسعار المخزنة في LocalStorage
 * @returns البيانات المخزنة أو null إذا لم توجد أو انتهت صلاحيتها
 */
export const getCachedRates = (): CachedRates | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data: CachedRates = JSON.parse(cached);
    
    // التحقق من انتهاء الصلاحية
    if (Date.now() > data.expiresAt) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to get cached rates:', error);
    return null;
  }
};

/**
 * حفظ الأسعار في LocalStorage
 * @param data البيانات المراد تخزينها
 */
export const setCachedRates = (data: { exchange: any; fees: any }): void => {
  try {
    const now = Date.now();
    const cacheData: CachedRates = {
      exchange: {
        usdToIls: data.exchange.usdToIls,
        lastUpdated: data.exchange.lastUpdated,
      },
      fees: {
        trc20: { fee: data.fees.trc20.fee },
        bep20: { fee: data.fees.bep20.fee },
      },
      savedAt: now,
      expiresAt: now + CACHE_DURATION,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    console.log('📦 Rates cached until:', new Date(cacheData.expiresAt).toLocaleTimeString());
  } catch (error) {
    console.error('Failed to cache rates:', error);
  }
};

/**
 * مسح الكاش (للتطوير أو التحديث اليدوي)
 */
export const clearRatesCache = (): void => {
  localStorage.removeItem(CACHE_KEY);
  console.log('🗑️ Rates cache cleared');
};

/**
 * الحصول على الوقت المتبقي للكاش (بالثواني)
 */
export const getCacheTimeRemaining = (): number | null => {
  const cached = getCachedRates();
  if (!cached) return null;
  return Math.max(0, Math.floor((cached.expiresAt - Date.now()) / 1000));
};

/**
 * جلب الأسعار (من الكاش أو من API)
 * @param forceRefresh تجاهل الكاش وجلب بيانات جديدة
 */
export const fetchRatesWithCache = async (forceRefresh = false): Promise<CachedRates> => {
  // محاولة جلب من الكاش أولاً
  if (!forceRefresh) {
    const cached = getCachedRates();
    if (cached) {
      const timeLeft = Math.floor((cached.expiresAt - Date.now()) / 1000);
      console.log(`📦 Using cached rates (expires in ${Math.floor(timeLeft / 60)}m ${timeLeft % 60}s)`);
      return cached;
    }
  }
  
  // الكاش منتهي أو غير موجود، جلب من API
  console.log('🌐 Fetching fresh rates from API');
  const response = await fetch('http://localhost:4000/api/rates/all');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch rates: ${response.status}`);
  }
  
  const result = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error('Invalid response from server');
  }
  
  // حفظ البيانات الجديدة في الكاش
  setCachedRates(result.data);
  
  // إرجاع البيانات بالتنسيق المطلوب
  return {
    exchange: {
      usdToIls: result.data.exchange.usdToIls,
      lastUpdated: result.data.exchange.lastUpdated,
    },
    fees: {
      trc20: { fee: result.data.fees.trc20.fee },
      bep20: { fee: result.data.fees.bep20.fee },
    },
    savedAt: Date.now(),
    expiresAt: Date.now() + 30 * 60 * 1000,
  };
};