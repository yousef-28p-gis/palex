'use client';

import { CheckCircle, Clock, XCircle, AlertTriangle, RefreshCw, Shield, Hourglass } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

// ✅ خريطة الحالات إلى النصوص والألوان والأيقونات
const statusConfig: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}> = {
  // حالات الصفقات
  completed: {
    label: 'مكتملة',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  active: {
    label: 'قيد التنفيذ',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: <Clock className="w-3 h-3" />,
  },
  waiting_seller_deposit: {
    label: 'انتظار إيداع البائع',
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: <Hourglass className="w-3 h-3" />,
  },
  waiting_seller_confirmation: {
    label: 'انتظار تأكيد البائع',
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: <Clock className="w-3 h-3" />,
  },
  cancelled: {
    label: 'ملغاة',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <XCircle className="w-3 h-3" />,
  },
  dispute_opened: {
    label: 'نزاع مفتوح',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  expired: {
    label: 'منتهية',
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-700/30',
    icon: <XCircle className="w-3 h-3" />,
  },
  refunded: {
    label: 'تم الاسترداد',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: <RefreshCw className="w-3 h-3" />,
  },
  
  // حالات النزاعات
  opened: {
    label: 'مفتوح',
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  under_review: {
    label: 'قيد المراجعة',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: <Clock className="w-3 h-3" />,
  },
  resolved: {
    label: 'تم الحل',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  
  // حالات العروض
  active_offer: {
    label: 'نشط',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  paused: {
    label: 'موقوف',
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  
  // حالات KYC
  kyc_approved: {
    label: 'موثق',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <Shield className="w-3 h-3" />,
  },
  kyc_pending: {
    label: 'قيد المراجعة',
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: <Clock className="w-3 h-3" />,
  },
  kyc_rejected: {
    label: 'مرفوض',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <XCircle className="w-3 h-3" />,
  },
  kyc_none: {
    label: 'غير موثق',
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-700/30',
    icon: <Shield className="w-3 h-3" />,
  },
  
  // حالات المستخدم
  suspended: {
    label: 'موقوف',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  active_user: {
    label: 'نشط',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <CheckCircle className="w-3 h-3" />,
  },
};

// ✅ دالة مساعدة لتحويل حالة الصفقة إلى المفتاح المناسب
const getConfigKey = (status: string): string => {
  // حالات KYC
  if (status === 'approved') return 'kyc_approved';
  if (status === 'pending') return 'kyc_pending';
  if (status === 'rejected') return 'kyc_rejected';
  if (status === 'none') return 'kyc_none';
  
  // حالات المستخدم
  if (status === 'suspended') return 'suspended';
  if (status === 'active') return 'active_user';
  
  // حالات العروض
  if (status === 'active_offer') return 'active_offer';
  
  // باقي الحالات ترجع كما هي
  return status;
};

// ✅ أحجام النص
const sizeClasses = {
  sm: 'text-xs px-2 py-0.5 rounded-full',
  md: 'text-sm px-2.5 py-1 rounded-full',
  lg: 'text-base px-3 py-1.5 rounded-full',
};

export function StatusBadge({ status, size = 'sm', showIcon = true, className = '' }: StatusBadgeProps) {
  const configKey = getConfigKey(status);
  const config = statusConfig[configKey] || statusConfig.active; // fallback to active config
  
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium
        ${config.bgColor}
        ${config.color}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {showIcon && config.icon}
      {config.label}
    </span>
  );
}

// ✅ نسخة مبسطة للاستخدام السريع (بدون أيقونة، حجم صغير)
export const SimpleStatusBadge = ({ status }: { status: string }) => {
  const configKey = getConfigKey(status);
  const config = statusConfig[configKey] || statusConfig.active;
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
      {config.label}
    </span>
  );
};

// ✅ نسخة للحالات النشطة/غير النشطة
export const ActiveInactiveBadge = ({ isActive }: { isActive: boolean }) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        isActive
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
          : 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300'
      }`}
    >
      {isActive ? 'نشط' : 'غير نشط'}
    </span>
  );
};

// ✅ نسخة للصلاحيات
export const RoleBadge = ({ role }: { role: string }) => {
  const roleConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    super_admin: {
      label: 'سوبر أدمن',
      color: 'text-red-800 dark:text-red-300',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
    kyc_admin: {
      label: 'أدمن KYC',
      color: 'text-purple-800 dark:text-purple-300',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    support_admin: {
      label: 'أدمن دعم',
      color: 'text-blue-800 dark:text-blue-300',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    finance_admin: {
      label: 'أدمن مالي',
      color: 'text-green-800 dark:text-green-300',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    user: {
      label: 'مستخدم',
      color: 'text-gray-800 dark:text-gray-300',
      bgColor: 'bg-gray-100 dark:bg-gray-700/30',
    },
  };
  
  const config = roleConfig[role] || roleConfig.user;
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
      {config.label}
    </span>
  );
};