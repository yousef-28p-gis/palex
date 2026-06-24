'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');

  useEffect(() => {
    setToken(searchParams.get('token') || '');
  }, [searchParams]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!token) { setError('❌ رابط إعادة التعيين غير صالح'); return; }
    if (password.length < 6) { setError('❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    if (password !== confirmPassword) { setError('❌ كلمة المرور غير متطابقة'); return; }
    if (!/[A-Z]/.test(password)) { setError('❌ يجب أن تحتوي على حرف كبير (A-Z)'); return; }
    if (!/[a-z]/.test(password)) { setError('❌ يجب أن تحتوي على حرف صغير (a-z)'); return; }
    if (!/[0-9]/.test(password)) { setError('❌ يجب أن تحتوي على رقم (0-9)'); return; }

    setError('');
    setIsLoading(true);
    try {
      const r = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const d = await r.json();
      if (d.success) {
        setSuccess(true);
        setTimeout(() => router.push('/login'), 3000);
      } else {
        setError(d.message || '❌ فشل إعادة تعيين كلمة المرور');
      }
    } catch {
      setError('❌ حدث خطأ في الاتصال');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">تم إعادة التعيين ✓</h2>
        <p className="text-blue-200">سيتم تحويلك إلى صفحة تسجيل الدخول...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white">إعادة تعيين كلمة المرور</h1>
        <p className="text-blue-200 text-sm mt-1">أدخل كلمة مرور جديدة لحسابك</p>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 text-red-200 text-sm text-center">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-blue-200 mb-1">كلمة المرور الجديدة</label>
        <div className="relative">
          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full pr-10 pl-10 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300">
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-blue-200 mb-1">تأكيد كلمة المرور</label>
        <div className="relative">
          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
        </div>
      </div>

      <button type="submit" disabled={isLoading}
        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : 'إعادة التعيين'}
      </button>

      <p className="text-center text-sm text-blue-200">
        <Link href="/login" prefetch={false} className="text-white font-semibold hover:underline">العودة لتسجيل الدخول</Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
            <Suspense fallback={<div className="text-center text-blue-200 py-8">جاري التحميل...</div>}>
              <ResetForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
