'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, AlertTriangle, Shield, Mail } from 'lucide-react';
import Link from 'next/link';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        const currentPath = window.location.pathname;
        router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) return null;

  // ✅ حساب موقوف - رسالة ثابتة
  if (user.isSuspended) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-500/10 backdrop-blur-xl rounded-2xl p-8 text-center border border-red-500/30 max-w-md mx-auto">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">🚫 حسابك موقوف</h1>
            <p className="text-red-300 mb-4">
              {user.suspensionReason || 'تم إيقاف حسابك من قبل إدارة المنصة.'}
            </p>
            {user.suspendedUntil && (
              <p className="text-yellow-400 text-sm mb-4">
                الحظر مستمر حتى: {new Date(user.suspendedUntil).toLocaleDateString('ar')}
              </p>
            )}
            <p className="text-gray-400 text-sm mb-6">
              إذا كنت تعتقد أن هذا خطأ، يرجى مراجعة الدعم الفني.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  localStorage.removeItem('accessToken');
                  window.location.href = '/login';
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                تسجيل الخروج
              </button>
              <a href="mailto:support@palescrow.com">
                <button className="w-full px-4 py-2 bg-transparent border border-gray-500 text-gray-300 rounded-lg hover:bg-white/10 transition flex items-center justify-center gap-2">
                  <Mail className="w-4 h-4" />
                  مراجعة الدعم الفني
                </button>
              </a>
              <Link href="/">
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  العودة إلى الرئيسية
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ صلاحيات غير كافية
  if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-yellow-500/10 backdrop-blur-xl rounded-2xl p-8 text-center border border-yellow-500/30 max-w-md mx-auto">
            <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-10 h-10 text-yellow-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">⛔ غير مصرح</h1>
            <p className="text-yellow-300 mb-6">
              ليس لديك صلاحية للوصول إلى هذه الصفحة.
            </p>
            <Link href="/dashboard">
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                العودة إلى لوحة التحكم
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}