// أدوات مساعدة عامة

export const formatCurrency = (amount: number, currency: 'ILS' | 'USD' = 'ILS'): string => {
  return new Intl.NumberFormat('ar-PS', {
    style: 'currency',
    currency: currency === 'ILS' ? 'ILS' : 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('ar', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatDateTime = (date: string | Date): string => {
  return new Date(date).toLocaleString('ar', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const truncateAddress = (address: string, start = 6, end = 4): string => {
  if (!address) return '';
  if (address.length <= start + end) return address;
  return `${address.substring(0, start)}...${address.substring(address.length - end)}`;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    active: 'bg-blue-100 text-blue-700',
    waiting_seller_deposit: 'bg-yellow-100 text-yellow-700',
    waiting_seller_confirmation: 'bg-orange-100 text-orange-700',
    cancelled: 'bg-red-100 text-red-700',
    dispute_opened: 'bg-red-100 text-red-700',
    expired: 'bg-gray-100 text-gray-600',
    opened: 'bg-yellow-100 text-yellow-700',
    resolved: 'bg-green-100 text-green-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-600';
};

export const getStatusText = (status: string): string => {
  const texts: Record<string, string> = {
    completed: 'مكتملة',
    active: 'قيد التنفيذ',
    waiting_seller_deposit: 'انتظار إيداع البائع',
    waiting_seller_confirmation: 'انتظار تأكيد البائع',
    cancelled: 'ملغاة',
    dispute_opened: 'نزاع مفتوح',
    expired: 'منتهية',
    opened: 'مفتوح',
    resolved: 'تم الحل',
  };
  return texts[status] || status;
};