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
const RETRY_DURATION = 30 * 1000; // 30 ثانية لإعادة المحاولة عند فشل API

// القيم الافتراضية عند فشل API
const DEFAULT_VALUES = {
  usdToIls: 3,
  trc20Fee: 2.5,
  bep20Fee: 0.5,
};

/**
 * الحصول على الأسعار المخزنة في LocalStorage (غير منتهية فقط)
 */
export const getCachedRates = (): CachedRates | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CachedRates = JSON.parse(cached);

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
 * الحصول على الأسعار المخزنة حتى لو منتهية الصلاحية (للفشل الاحتياطي)
 */
const getStaleCachedRates = (): CachedRates | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch {
    return null;
  }
};

/**
 * حفظ الأسعار في LocalStorage
 * expiresAt محسوب من lastUpdated (السيرفر) وليس من Date.now()
 */
export const setCachedRates = (data: { exchange: any; fees: any }): void => {
  try {
    const lastUpdated = data.exchange.lastUpdated;
    const lastUpdatedTime = new Date(lastUpdated).getTime();
    const expiresAt = lastUpdatedTime + CACHE_DURATION;

    const cacheData: CachedRates = {
      exchange: {
        usdToIls: data.exchange.usdToIls,
        lastUpdated,
      },
      fees: {
        trc20: { fee: data.fees.trc20.fee },
        bep20: { fee: data.fees.bep20.fee },
      },
      savedAt: Date.now(),
      expiresAt,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Failed to cache rates:', error);
  }
};

/**
 * حفظ القيم الافتراضية مع صلاحية قصيرة (30 ثانية) لإعادة المحاولة
 */
const setDefaultRates = (): CachedRates => {
  const now = Date.now();
  const cacheData: CachedRates = {
    exchange: {
      usdToIls: DEFAULT_VALUES.usdToIls,
      lastUpdated: new Date(now).toISOString(),
    },
    fees: {
      trc20: { fee: DEFAULT_VALUES.trc20Fee },
      bep20: { fee: DEFAULT_VALUES.bep20Fee },
    },
    savedAt: now,
    expiresAt: now + RETRY_DURATION,
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  return cacheData;
};

/**
 * حفظ الكاش القديم مع صلاحية قصيرة (30 ثانية) لإعادة المحاولة
 */
const setRetryRates = (stale: CachedRates): CachedRates => {
  const now = Date.now();
  const cacheData: CachedRates = {
    ...stale,
    savedAt: now,
    expiresAt: now + RETRY_DURATION,
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  return cacheData;
};

/**
 * مسح الكاش (للتطوير أو التحديث اليدوي)
 */
export const clearRatesCache = (): void => {
  localStorage.removeItem(CACHE_KEY);
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
 *
 * المنطق:
 *   1. إذا الكاش ساري (expiresAt = lastUpdated + 30min) ← استخدمه
 *   2. إذا منتهي أو forceRefresh ← اتصل بـ /api/rates/all
 *   3. إذا API نجح ← احفظ مع expiresAt = lastUpdated + 30min
 *   4. إذا API فشل ←
 *      أ. حاول استخدام الكاش القديم ← احفظ مع expiresAt = now + 30s (إعادة محاولة)
 *      ب. إذا ما في كاش ← قيم افتراضية مع expiresAt = now + 30s
 *   5. fetchRatesWithCache لا يرمي خطأً أبداً، دائمًا يرجع بيانات
 */
export const fetchRatesWithCache = async (forceRefresh = false): Promise<CachedRates> => {
  // 1. محاولة جلب من الكاش أولاً
  if (!forceRefresh) {
    const cached = getCachedRates();
    if (cached) {
      return cached;
    }
  }

  // 2. الكاش منتهي أو forceRefresh، جلب من API
  try {
    const response = await fetch('/api/rates/all');

    if (!response.ok) {
      throw new Error(`Failed to fetch rates: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error('Invalid response from server');
    }

    // 3. حفظ البيانات الجديدة في الكاش مع expiresAt = lastUpdated + 30min
    setCachedRates(result.data);

    const lastUpdated = result.data.exchange.lastUpdated;
    const lastUpdatedTime = new Date(lastUpdated).getTime();

    return {
      exchange: {
        usdToIls: result.data.exchange.usdToIls,
        lastUpdated,
      },
      fees: {
        trc20: { fee: result.data.fees.trc20.fee },
        bep20: { fee: result.data.fees.bep20.fee },
      },
      savedAt: Date.now(),
      expiresAt: lastUpdatedTime + CACHE_DURATION,
    };
  } catch (error) {
    // 4. API فشل → استخدام الكاش القديم أو القيم الافتراضية
    console.error('❌ Failed to fetch rates from API, trying fallback:', error);

    // 4أ. محاولة استخدام الكاش القديم (حتى لو منتهي)
    const stale = getStaleCachedRates();
    if (stale) {
      console.log('📦 Using expired cache as fallback, retrying in 30s');
      return setRetryRates(stale);
    }

    // 4ب. لا يوجد كاش → استخدام القيم الافتراضية
    console.log('⚠️ No cache available, using default values (3 ILS, 2.5 TRC20, 0.5 BEP20)');
    return setDefaultRates();
  }
};
