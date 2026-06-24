'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, Shield, Mail, Lock, LogIn, X, Send, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotErr, setForgotErr] = useState('');

  const handleForgotPassword = async () => {
    if (!forgotEmail) { setForgotErr('يرجى إدخال البريد الإلكتروني'); return; }
    setForgotErr('');
    setForgotLoading(true);
    try {
      const r = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const d = await r.json();
      if (d.success) {
        setForgotSent(true);
      } else {
        setForgotErr(d.message || 'فشل إرسال الإيميل');
      }
    } catch (err: any) {
      setForgotErr('حدث خطأ في الاتصال');
    } finally {
      setForgotLoading(false);
    }
  };

  const resetModal = () => {
    setShowResetModal(false);
    setForgotEmail('');
    setForgotSent(false);
    setForgotErr('');
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const email = emailRef.current?.value || '';
    const password = passwordRef.current?.value || '';
    if (!email || !password) return;
    
    setError('');
    setIsLoading(true);
    try {
      await login({ email, password }, '__skip_redirect__');
      // نجاح تسجيل الدخول → عرض رسالة
      setShowSuccessModal(true);
      // بعد 2 ثانية → تحويل
      let redirectTo: string | undefined;
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        redirectTo = params.get('redirect') || '/dashboard';
      }
      setTimeout(() => {
        setShowSuccessModal(false);
        router.push(redirectTo || '/dashboard');
      }, 2000);
    } catch (err: any) {
      const message = err.response?.data?.message || 'فشل تسجيل الدخول';
      setError(message);
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
              <div className="hidden lg:flex flex-col justify-center items-center p-12 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                <div className="text-center">
                  <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Shield className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold mb-2">PalEscrow</h2>
                  <p className="text-blue-100">منصة التداول الآمنة</p>
                </div>
              </div>

              <div className="p-8 lg:p-12">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-white mb-2">تسجيل الدخول</h1>
                  <p className="text-blue-200">أدخل بياناتك للوصول إلى حسابك</p>
                </div>

                <div className="space-y-6">
                  {error && (
                    <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 text-red-200 text-sm text-center">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-1">
                      البريد الإلكتروني <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        ref={emailRef}
                        type="email"
                        defaultValue=""
                        onKeyDown={(e) => { if (e.key === 'Enter' && !isLoading) handleSubmit(e); }}
                        className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        placeholder="you@hotmail.com"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-1">
                      كلمة المرور <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        ref={passwordRef}
                        type={showPassword ? 'text' : 'password'}
                        defaultValue=""
                        onKeyDown={(e) => { if (e.key === 'Enter' && !isLoading) handleSubmit(e); }}
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

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowResetModal(true)}
                      className="text-sm text-blue-300 hover:text-white transition"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmit}
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

                  <p className="text-center text-sm text-blue-200">
                    ليس لديك حساب؟{' '}
                    <Link href="/register" prefetch={false} className="text-white font-semibold hover:underline">
                      إنشاء حساب جديد
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={resetModal} />
          <div className="relative z-10 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-white/20 overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                    <Mail className="w-5 h-5 text-yellow-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">إعادة تعيين كلمة المرور</h2>
                </div>
                <button onClick={resetModal} className="p-1 rounded-lg hover:bg-white/10 transition text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {forgotSent ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">تم الإرسال ✓</h3>
                  <p className="text-blue-200 text-sm">
                    تم إرسال رابط إعادة تعيين كلمة المرور إلى <strong className="text-white">{forgotEmail}</strong>
                  </p>
                  <p className="text-gray-400 text-xs">تحقق من صندوق الوارد أو البريد المزعج (Spam)</p>
                  <button onClick={resetModal} className="px-6 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition text-sm">
                    حسناً
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-blue-200 text-sm leading-relaxed">أدخل بريدك الإلكتروني المسجل وسنرسل لك رابط إعادة تعيين كلمة المرور.</p>
                  
                  {forgotErr && (
                    <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-200 text-xs text-center">
                      {forgotErr}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-1">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !forgotLoading) handleForgotPassword(); }}
                        className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        placeholder="you@example.com"
                        autoComplete="email"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={resetModal} className="flex-1 px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition text-sm">
                      إلغاء
                    </button>
                    <button onClick={handleForgotPassword} disabled={forgotLoading} className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                      {forgotLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>إرسال <Send className="w-3.5 h-3.5" /></>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ رسالة نجاح تسجيل الدخول */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative z-10 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-sm w-full border border-white/20 overflow-hidden p-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">تم تسجيل الدخول ✓</h2>
            <p className="text-blue-200 text-sm">سيتم تحويلك إلى لوحة التحكم...</p>
            <div className="mt-4 flex justify-center">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
