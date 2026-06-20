import axios from 'axios';
import toast from 'react-hot-toast';
import { fetchRatesWithCache, getCachedRates, clearRatesCache } from './rateCache';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 30000,
});

// إضافة التوكن إلى كل طلب
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ إعدادات إعادة المحاولة
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

// ✅ دالة تأخير (sleep)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ✅ دالة التحقق مما إذا كان الخطأ يستحق إعادة المحاولة
const isRetryableError = (error: any): boolean => {
  if (!error.response) return true; // Network error
  return RETRY_CONFIG.retryableStatuses.includes(error.response.status);
};

// ✅ معالج الردود مع إعادة المحاولة
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // ✅ منع إعادة المحاولة لـ 429 (حد الطلبات) - لأننا نحلها بالكاش
    if (error.response?.status === 429) {
      console.warn('Rate limit reached, using cached data if available');
      return Promise.reject(error);
    }
    
    // ✅ إعدادات إعادة المحاولة
    if (!originalRequest._retryCount) {
      originalRequest._retryCount = 0;
    }
    
    // ✅ التحقق مما إذا كان يجب إعادة المحاولة
    if (
      originalRequest._retryCount < RETRY_CONFIG.maxRetries &&
      isRetryableError(error) &&
      error.response?.status !== 429 // لا نعيد المحاولة لـ 429
    ) {
      originalRequest._retryCount += 1;
      
      // ✅ تأخير متزايد (exponential backoff)
      const delay = RETRY_CONFIG.retryDelay * Math.pow(2, originalRequest._retryCount - 1);
      console.log(`🔄 Retrying request (${originalRequest._retryCount}/${RETRY_CONFIG.maxRetries}) after ${delay}ms`);
      
      await sleep(delay);
      return api(originalRequest);
    }
    
    // ✅ معالجة أخطاء 401 (انتهت صلاحية التوكن)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // ✅ محاولة تجديد التوكن
        const refreshToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('refreshToken='))
          ?.split('=')[1];
        
        if (!refreshToken) {
          throw new Error('No refresh token');
        }
        
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { withCredentials: true }
        );
        
        const newAccessToken = response.data.accessToken;
        localStorage.setItem('accessToken', newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        
        // ✅ استخدام axios مباشرة لتجنب الحلقات
        return axios(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        toast.error('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    
    // ✅ معالجة أخطاء الشبكة
    if (error.code === 'ERR_NETWORK') {
      toast.error('لا يمكن الاتصال بالخادم. يرجى التأكد من تشغيل الخادم الخلفي.');
      return Promise.reject(error);
    }
    
    // ✅ معالجة انتهاء المهلة
    if (error.code === 'ECONNABORTED') {
      toast.error('انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.');
      return Promise.reject(error);
    }
    
    // ✅ معالجة أخطاء الردود
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.message || data?.error || 'حدث خطأ غير متوقع';
      
      switch (status) {
        case 400:
          toast.error(message);
          break;
        case 401:
          if (!message.includes('token') && !message.includes('expired')) {
            toast.error(message || 'غير مصرح. يرجى تسجيل الدخول.');
          }
          break;
        case 403:
          toast.error(message);
          break;
        case 404:
          toast.error('العنصر المطلوب غير موجود.');
          break;
        case 409:
          toast.error('هذا العنصر موجود مسبقاً.');
          break;
        case 429:
          toast.error('لقد تجاوزت الحد المسموح من الطلبات. يرجى المحاولة بعد دقيقة.');
          break;
        case 500:
          toast.error('حدث خطأ في الخادم. يرجى المحاولة لاحقاً.');
          break;
        default:
          toast.error(message);
      }
    } else if (error.request) {
      toast.error('لم يتم استلام رد من الخادم. يرجى المحاولة مرة أخرى.');
    } else {
      toast.error('حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.');
    }
    
    return Promise.reject(error);
  }
);

// ============ Auth API ============
export const authApi = {
  register: (data: RegisterData) => api.post('/auth/register', data),
  login: async (data: LoginData) => {
    const response = await api.post('/auth/login', data);
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
    }
    return response;
  },
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) => api.post('/auth/reset-password', { token, newPassword }),
  resetKycStatus: () => api.post('/auth/kyc/reset'),
  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }),
  resendVerification: (email: string) => api.post('/auth/resend-verification', { email }),
};

// ============ KYC API ============
export const kycApi = {
  submit: (formData: FormData) => api.post('/kyc/submit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getStatus: () => api.get('/kyc/status'),
  getStatusByUserId: (userId: string) => api.get(`/kyc/status?userId=${userId}`),
};

// ============ Admin API ============
export const adminApi = {
  getStats: () => api.get('/admin/dashboard/stats'),
  getUsers: (page: number, search?: string) => api.get('/admin/users', { params: { page, search } }),
  getUserById: (userId: string) => api.get(`/admin/users/${userId}`),
  suspendUser: (userId: string, reason: string, days: number) => api.post(`/admin/users/${userId}/suspend`, { reason, days }),
  unsuspendUser: (userId: string) => api.post(`/admin/users/${userId}/unsuspend`),
  deleteUser: (userId: string) => api.delete(`/admin/users/${userId}`),
  getPendingKyc: (page?: number) => api.get('/admin/kyc/pending', { params: { page } }),
  getKycRequestById: (id: string) => api.get(`/admin/kyc/${id}`),
  approveKyc: (requestId: string) => api.post(`/admin/kyc/${requestId}/approve`),
  rejectKyc: (requestId: string, reason: string) => api.post(`/admin/kyc/${requestId}/reject`, { reason }),
  getTrades: (page: number, status?: string) => api.get('/admin/trades', { params: { page, status } }),
  getTradeById: (id: string) => api.get(`/admin/trades/${id}`),
  getDisputes: (page: number) => api.get('/admin/disputes', { params: { page } }),
  getDisputeById: (id: string) => api.get(`/admin/disputes/${id}`),
  getAuditLogs: (page: number) => api.get('/admin/audit-logs', { params: { page } }),
  updateExchangeRate: (usdToIls: number) => api.post('/admin/exchange-rate', { usdToIls }),
  resolveDispute: (disputeId: string, data: { resolution: string; resolutionNotes?: string }) => 
    api.put(`/admin/disputes/${disputeId}/resolve`, data),
  getNetworkFees: () => api.get('/admin/fees'),
  getNetworkFee: (network: string) => api.get(`/admin/fees/${network}`),
  updateNetworkFee: (network: string, fee: number) => api.post(`/admin/fees/${network}`, { fee }),
};

// ============ User API ============
export const userApi = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: { fullName: string; phone: string; governorate?: string }) => api.put('/users/profile', data),
  updateWallets: (trc20Wallet: string, bscWallet: string) => api.post('/users/wallets', { trc20Wallet, bscWallet }),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.post('/users/change-password', data),
  getSessions: () => api.get('/users/sessions'),
  logoutSession: (sessionId: string) => api.post(`/users/sessions/${sessionId}/logout`),
  logoutAllSessions: () => api.post('/users/sessions/logout-all'),
  uploadProfileImage: (formData: FormData) => api.post('/users/profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteProfileImage: () => api.delete('/users/profile-image'),
  // ✅ دوال ساعات العمل
  getWorkHours: () => api.get('/users/work-hours'),
  updateWorkHours: (data: { workHoursStart: string; workHoursEnd: string; workDays: number[] }) => 
    api.put('/users/work-hours', data),
};

// ============ Offer API ============
export const offersApi = {
  getAll: (params: OfferFilters) => api.get('/offers', { params }),
  getOne: (id: string) => api.get(`/offers/${id}`),
  getMyOffers: () => api.get('/offers/my'),
  create: (data: CreateOfferData) => api.post('/offers', data),
  update: (id: string, data: UpdateOfferData) => api.put(`/offers/${id}`, data),
  delete: (id: string) => api.delete(`/offers/${id}`),
};

// ============ Trade API ============
export const tradesApi = {
  start: (data: StartTradeData) => api.post('/trades', data),
  get: (id: string) => api.get(`/trades/${id}`),
  getUserTrades: (params?: { page?: number; status?: string; limit?: number }) => api.get('/trades/user', { params }),
  submitProof: (id: string, data: SubmitProofData) => api.post(`/trades/${id}/payment-proof`, data),
  confirmPayment: (id: string) => api.post(`/trades/${id}/confirm-payment`),
  cancel: (id: string) => api.post(`/trades/${id}/cancel`),
  requestSellerConfirmation: (offerId: string, amount: number) => api.post('/trades/request-confirmation', { offerId, amount }),
  confirmSellerPresence: (pendingId: string, offerId: string) => api.post('/trades/confirm-presence', { pendingId, offerId }),
};

// ============ Dispute API ============
export const disputesApi = {
  open: (data: OpenDisputeData) => api.post('/disputes', data),
  get: (id: string) => api.get(`/disputes/${id}`),
  addEvidence: (id: string, data: AddEvidenceData) => api.post(`/disputes/${id}/evidence`, data),
  getUserDisputes: (page?: number) => api.get('/disputes/user', { params: { page } }),
};

// ============ Blockchain API ============
export const blockchainApi = {
  getNetworkFee: (network: string) => api.get(`/blockchain/fee/${network}`),
};

// ============ Rates API ============
export const ratesApi = {
  // ✅ الدوال الأساسية
  getAllRates: () => api.get('/rates/all'),
  getExchangeRate: () => api.get('/rates/exchange'),
  getTrc20Fee: () => api.get('/rates/trc20-fee'),
  getBep20Fee: () => api.get('/rates/bep20-fee'),
  
  // ✅ دوال بديلة (للتطوير)
  getAll: async () => {
    try {
      const [exchange, trc20, bep20] = await Promise.all([
        api.get('/rates/exchange'),
        api.get('/rates/trc20-fee'),
        api.get('/rates/bep20-fee'),
      ]);
      return {
        data: {
          exchange: exchange.data,
          fees: {
            trc20: trc20.data,
            bep20: bep20.data,
          },
        },
      };
    } catch (error) {
      console.error('Failed to fetch all rates:', error);
      throw error;
    }
  },
  
  // ✅ دوال جديدة مع الكاش (لحل مشكلة 429)
  getRatesWithCache: (forceRefresh?: boolean) => fetchRatesWithCache(forceRefresh),
  getCachedRates: () => getCachedRates(),
  clearRatesCache: () => clearRatesCache(),
  
  // ✅ دوال مبسطة للحصول على قيم محددة من الكاش
  getExchangeRateFromCache: (): number | null => {
    const cached = getCachedRates();
    return cached?.exchange.usdToIls || null;
  },
  
  getNetworkFeeFromCache: (network: 'trc20' | 'bep20'): number | null => {
    const cached = getCachedRates();
    if (!cached) return null;
    return network === 'trc20' ? cached.fees.trc20.fee : cached.fees.bep20.fee;
  },
};

// ============ Types ============
export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface OfferFilters {
  fiatCurrency?: 'ils' | 'usd';
  network?: 'trc20' | 'bep20';
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export interface CreateOfferData {
  fiatCurrency: 'ils' | 'usd';
  premiumPercent: number;
  minAmount: number;
  maxAmount: number;
  network: 'trc20' | 'bep20';
  paymentInstructions: string;
  bankName: string;
}

export interface UpdateOfferData {
  premiumPercent?: number;
  minAmount?: number;
  maxAmount?: number;
  paymentInstructions?: string;
  status?: string;
}

export interface StartTradeData {
  offerId: string;
  amountUsdt: number;
}

export interface SubmitProofData {
  imageUrl: string;
  transactionRef: string;
  transferTime: string;
  bankName: string;
  last4Digits: string;
}

export interface OpenDisputeData {
  tradeId: string;
  reason: string;
  description: string;
  evidenceUrls?: string[];
}

export interface AddEvidenceData {
  evidenceUrls: string[];
}