/**
 * ملف التنسيق (Formatters)
 * يحتوي على دوال تنسيق البيانات للعرض
 */

/**
 * تنسيق العملة
 * @param amount المبلغ
 * @param currency نوع العملة ('ILS' أو 'USD')
 * @returns النص المنسق
 * @example formatCurrency(100, 'ILS') // "₪100.00"
 * @example formatCurrency(50.5, 'USD') // "$50.50"
 */
export const formatCurrency = (amount: number, currency: 'ILS' | 'USD' = 'ILS'): string => {
  if (isNaN(amount)) return currency === 'ILS' ? '₪0.00' : '$0.00';
  
  return new Intl.NumberFormat('ar-PS', {
    style: 'currency',
    currency: currency === 'ILS' ? 'ILS' : 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * تنسيق التاريخ
 * @param date التاريخ (string أو Date)
 * @returns التاريخ المنسق
 * @example formatDate('2024-01-15') // "١٥ يناير ٢٠٢٤"
 */
export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleDateString('ar', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * تنسيق التاريخ والوقت
 * @param date التاريخ (string أو Date)
 * @returns التاريخ والوقت المنسق
 * @example formatDateTime('2024-01-15T14:30:00') // "١٥ يناير ٢٠٢٤، ٢:٣٠ م"
 */
export const formatDateTime = (date: string | Date): string => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleString('ar', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * تنسيق الوقت النسبي (منذ كم)
 * @param date التاريخ (string أو Date)
 * @returns النص المنسق
 * @example formatRelativeTime('2024-01-15T14:30:00') // "منذ ساعتين"
 */
export const formatRelativeTime = (date: string | Date): string => {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);
  
  if (diffSec < 60) return 'منذ لحظات';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHour < 24) return `منذ ${diffHour} ساعة`;
  if (diffDay < 30) return `منذ ${diffDay} يوم`;
  if (diffMonth < 12) return `منذ ${diffMonth} شهر`;
  return `منذ ${diffYear} سنة`;
};

/**
 * اختصار عنوان المحفظة
 * @param address عنوان المحفظة
 * @param start عدد الأحرف الأولى
 * @param end عدد الأحرف الأخيرة
 * @returns النص المختصر
 * @example truncateAddress('0x1234...5678') // "0x1234...5678"
 */
export const truncateAddress = (address: string, start: number = 6, end: number = 4): string => {
  if (!address) return '';
  if (address.length <= start + end) return address;
  return `${address.substring(0, start)}...${address.substring(address.length - end)}`;
};

/**
 * الحصول على نص حالة الصفقة
 * @param status حالة الصفقة
 * @returns النص بالعربية
 */
export const getTradeStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    completed: 'مكتملة',
    active: 'نشطة - قيد التنفيذ',
    waiting_seller_deposit: 'انتظار إيداع البائع',
    waiting_seller_confirmation: 'انتظار تأكيد البائع',
    cancelled: 'ملغاة',
    dispute_opened: 'نزاع مفتوح',
    expired: 'منتهية',
    refunded: 'تم الاسترداد',
  };
  return statusMap[status] || status;
};

/**
 * الحصول على لون حالة الصفقة (لـ Tailwind CSS)
 * @param status حالة الصفقة
 * @returns كلاس Tailwind
 */
export const getTradeStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    completed: 'bg-green-500/20 text-green-300',
    active: 'bg-blue-500/20 text-blue-300',
    waiting_seller_deposit: 'bg-yellow-500/20 text-yellow-300',
    waiting_seller_confirmation: 'bg-orange-500/20 text-orange-300',
    cancelled: 'bg-red-500/20 text-red-300',
    dispute_opened: 'bg-red-500/20 text-red-300',
    expired: 'bg-gray-500/20 text-gray-300',
    refunded: 'bg-purple-500/20 text-purple-300',
  };
  return colorMap[status] || 'bg-gray-500/20 text-gray-300';
};

/**
 * الحصول على أيقونة حالة الصفقة
 * @param status حالة الصفقة
 * @returns اسم الأيقونة (من lucide-react)
 */
export const getTradeStatusIcon = (status: string): string => {
  const iconMap: Record<string, string> = {
    completed: 'CheckCircle',
    active: 'Clock',
    waiting_seller_deposit: 'Clock',
    waiting_seller_confirmation: 'Clock',
    cancelled: 'XCircle',
    dispute_opened: 'AlertTriangle',
    expired: 'XCircle',
    refunded: 'RefreshCw',
  };
  return iconMap[status] || 'Clock';
};

/**
 * تنسيق المبلغ مع العملة
 * @param amount المبلغ بـ USDT
 * @returns النص المنسق
 * @example formatUsdt(100) // "100 USDT"
 */
export const formatUsdt = (amount: number): string => {
  if (isNaN(amount)) return '0 USDT';
  return `${amount.toLocaleString()} USDT`;
};

/**
 * تنسيق رقم الهاتف الفلسطيني
 * @param phone رقم الهاتف
 * @returns الرقم المنسق
 * @example formatPhoneNumber('0591234567') // "059 123 4567"
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  if (phone.length === 10) {
    return `${phone.substring(0, 3)} ${phone.substring(3, 6)} ${phone.substring(6, 10)}`;
  }
  return phone;
};

/**
 * تنسيق النسبة المئوية
 * @param percent النسبة
 * @returns النص المنسق
 * @example formatPercent(5.5) // "+5.5%"
 * @example formatPercent(-3.2) // "-3.2%"
 */
export const formatPercent = (percent: number): string => {
  if (isNaN(percent)) return '0%';
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(1)}%`;
};

/**
 * الحصول على لون النسبة المئوية (لـ Tailwind CSS)
 * @param percent النسبة
 * @returns كلاس Tailwind
 */
export const getPercentColor = (percent: number): string => {
  if (percent > 0) return 'text-red-400';
  if (percent < 0) return 'text-green-400';
  return 'text-gray-400';
};

/**
 * تنسيق رقم المعاملة (اختصار)
 * @param txHash هاش المعاملة
 * @returns النص المختصر
 */
export const formatTxHash = (txHash: string): string => {
  return truncateAddress(txHash, 10, 8);
};

/**
 * تنسيق الوقت المتبقي
 * @param milliseconds الوقت بالميلي ثانية
 * @returns النص المنسق
 * @example formatTimeLeft(125000) // "2:05"
 */
export const formatTimeLeft = (milliseconds: number): string => {
  if (milliseconds <= 0) return 'انتهت';
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};