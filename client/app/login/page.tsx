'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, Shield, Mail, Lock, LogIn, MessageCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectTo = searchParams.get('redirect');
  const message = searchParams.get('message');
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // ✅ حالة Modal نسيت كلمة المرور
  const [showResetModal, setShowResetModal] = useState(false);

  // ✅ عرض رسالة من middleware إذا وجدت
  useState(() => {
    if (message) {
      toast.error(message);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login({ email, password }, redirectTo || undefined);
      router.push(redirectTo || '/dashboard');
    } catch (err: any) {
      const message = err.response?.data?.message || 'فشل تسجيل الدخول';
      setError(message);
      console.error('Login error:', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 min-h-screen flex items-center justify-center">
        <div className="w-full max-w-4xl">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
            <div className="grid lg:grid-cols-2">
              {/* الجانب الأيمن - صورة وشعار */}
              <div className="hidden lg:flex flex-col justify-center items-center p-12 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                <div className="text-center">
                  <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Shield className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold mb-2">PalEscrow</h2>
                  <p className="text-blue-100">منصة التداول الآمنة</p>
                </div>
              </div>

              {/* الجانب الأيسر - نموذج تسجيل الدخول */}
              <div className="p-8 lg:p-12">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-white mb-2">تسجيل الدخول</h1>
                  <p className="text-blue-200">أدخل بياناتك للوصول إلى حسابك</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* ✅ رسالة الخطأ الثابتة */}
                  {error && (
                    <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 text-red-200 text-sm text-center">
                      {error}
                    </div>
                  )}

                  {/* البريد الإلكتروني */}
                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-1">
                      البريد الإلكتروني <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        placeholder="you@hotmail.com"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  {/* كلمة المرور */}
                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-1">
                      كلمة المرور <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pr-10 pl-10 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* ✅ نسيت كلمة المرور - تفتح Modal بدلاً من صفحة منفصلة */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowResetModal(true)}
                      className="text-sm text-blue-300 hover:text-white transition"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  </div>

                  {/* زر تسجيل الدخول */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        تسجيل الدخول
                        <LogIn className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* رابط إنشاء حساب */}
                  <p className="text-center text-sm text-blue-200">
                    ليس لديك حساب؟{' '}
                    <Link href="/register" className="text-white font-semibold hover:underline">
                      إنشاء حساب جديد
                    </Link>
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Modal نسيت كلمة المرور - مدمج بدلاً من صفحة منفصلة */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* الخلفية المعتمة */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowResetModal(false)}
          />
          
          {/* محتوى الـ Modal */}
          <div className="relative z-10 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-white/20 overflow-hidden">
            <div className="p-6">
              {/* رأس الـ Modal */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-yellow-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">إعادة تعيين كلمة المرور</h2>
                </div>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 transition text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* نص الـ Modal */}
              <div className="space-y-4">
                <p className="text-blue-200 text-sm leading-relaxed">
                  للتواصل مع الدعم الفني وإعادة تعيين كلمة المرور، يرجى التواصل معنا عبر واتساب:
                </p>
                
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-xs mb-2">📱 رقم واتساب الدعم الفني</p>
                  <a
                    href="https://wa.me/9705991234567?text=أحتاج%20مساعدة%20في%20إعادة%20تعيين%20كلمة%20المرور"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition text-sm font-semibold"
                  >
                    <MessageCircle className="w-4 h-4" />
                    +970 59 123 4567
                  </a>
                </div>
                
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-blue-300 text-xs">
                    💡 سيتم الرد عليك خلال 24 ساعة. يرجى تجهيز رقم هاتفك المسجل في المنصة.
                  </p>
                </div>
              </div>
              
              {/* أزرار الـ Modal */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition"
                >
                  إلغاء
                </button>
                <a
                  href="https://wa.me/9705991234567?text=أحتاج%20مساعدة%20في%20إعادة%20تعيين%20كلمة%20المرور"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition text-center"
                >
                  تواصل عبر واتساب
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  );
}