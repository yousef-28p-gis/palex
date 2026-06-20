import { ratesApi } from './api';

export interface ExchangeRate {
  rate: number;
  lastUpdated: string;
  isLive?: boolean;
}

let cachedRate: ExchangeRate | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// ✅ دالة الحصول على سعر الصرف
export async function getExchangeRate(): Promise<ExchangeRate> {
  if (cachedRate && Date.now() - lastFetchTime < CACHE_DURATION) {
    return cachedRate;
  }

  try {
    const response = await ratesApi.getExchangeRate();
    cachedRate = {
      rate: response.data.rate,
      lastUpdated: response.data.lastUpdated,
      isLive: true,
    };
    lastFetchTime = Date.now();
    return cachedRate;
  } catch (error) {
    console.warn('⚠️ Failed to fetch exchange rate, using default');
    return {
      rate: 3.50,
      lastUpdated: new Date().toISOString(),
      isLive: false,
    };
  }
}

// ✅ دالة الحصول على عمولة TRC20
export async function getTrc20Fee(): Promise<number> {
  try {
    const response = await ratesApi.getTrc20Fee();
    return response.data.fee;
  } catch (error) {
    console.warn('⚠️ Failed to fetch TRC20 fee, using default');
    return 1.5;
  }
}

// ✅ دالة الحصول على عمولة BEP20
export async function getBep20Fee(): Promise<number> {
  try {
    const response = await ratesApi.getBep20Fee();
    return response.data.fee;
  } catch (error) {
    console.warn('⚠️ Failed to fetch BEP20 fee, using default');
    return 0.5;
  }
}