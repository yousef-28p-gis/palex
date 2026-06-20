'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, Shield, CheckCircle, AlertCircle, User, Mail, Phone, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  
  const [valid, setValid] = useState({
    fullName: false,
    email: false,
    phone: false,
    password: false,
    confirmPassword: false,
  });

  const validateFullName = (name: string) => {
    if (!name) return 'الاسم الكامل مطلوب';
    if (name.length < 3) return 'الاسم الكامل يجب أن يكون 3 أحرف على الأقل';
    return '';
  };

  const validateEmail = (email: string) => {
    if (!email) return 'البريد الإلكتروني مطلوب';
    const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
    if (!emailRegex.test(email)) return 'البريد الإلكتروني غير صالح';
    return '';
  };

  const validatePhone = (phone: string) => {
    if (!phone) return 'رقم الجوال مطلوب';
    const phoneRegex = /^05[0-9]{8}$/;
    if (!phoneRegex.test(phone)) return 'رقم الجوال غير صالح (يبدأ بـ 05)';
    return '';
  };

  const validatePassword = (password: string) => {
    if (!password) return 'كلمة المرور مطلوبة';
    if (password.length < 6) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    if (!/[A-Z]/.test(password)) return 'يجب أن تحتوي على حرف كبير';
    if (!/[a-z]/.test(password)) return 'يجب أن تحتوي على حرف صغير';
    if (!/[0-9]/.test(password)) return 'يجب أن تحتوي على رقم';
    return '';
  };

  const validateConfirmPassword = (password: string, confirm: string) => {
    if (!confirm) return 'تأكيد كلمة المرور مطلوب';
    if (password !== confirm) return 'كلمتا المرور غير متطابقتين';
    return '';
  };

  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
    
    let error = '';
    let isValid = false;
    switch (field) {
      case 'fullName':
        error = validateFullName(value);
        isValid = error === '';
        setErrors({ ...errors, fullName: error });
        setValid({ ...valid, fullName: isValid });
        break;
      case 'email':
        error = validateEmail(value);
        isValid = error === '';
        setErrors({ ...errors, email: error });
        setValid({ ...valid, email: isValid });
        break;
      case 'phone':
        error = validatePhone(value);
        isValid = error === '';
        setErrors({ ...errors, phone: error });
        setValid({ ...valid, phone: isValid });
        break;
      case 'password':
        error = validatePassword(value);
        isValid = error === '';
        setErrors({ ...errors, password: error });
        setValid({ ...valid, password: isValid });
        if (form.confirmPassword) {
          const confirmError = validateConfirmPassword(value, form.confirmPassword);
          setErrors({ ...errors, confirmPassword: confirmError });
          setValid({ ...valid, confirmPassword: confirmError === '' });
        }
        break;
      case 'confirmPassword':
        error = validateConfirmPassword(form.password, value);
        isValid = error === '';
        setErrors({ ...errors, confirmPassword: error });
        setValid({ ...valid, confirmPassword: isValid });
        break;
    }
  };

  const isFormValid = () => {
    const fullNameError = validateFullName(form.fullName);
    const emailError = validateEmail(form.email);
    const phoneError = validatePhone(form.phone);
    const passwordError = validatePassword(form.password);
    const confirmError = validateConfirmPassword(form.password, form.confirmPassword);
    
    setErrors({
      fullName: fullNameError,
      email: emailError,
      phone: phoneError,
      password: passwordError,
      confirmPassword: confirmError,
    });
    
    return !fullNameError && !emailError && !phoneError && !passwordError && !confirmError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) {
      toast.error('يرجى تصحيح الأخطاء في النموذج');
      return;
    }
    
    setLoading(true);
    try {
      await registerUser({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 min-h-screen flex items-center justify-center">
        <div className="w-full max-w-6xl">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
            <div className="grid lg:grid-cols-2">
              {/* الجانب الأيمن - الصورة والنص */}
              <div className="hidden lg:flex flex-col justify-center items-center p-12 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                <div className="text-center">
                  <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Shield className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold mb-4">مرحباً بك في PalEscrow</h2>
                  <p className="text-blue-100 mb-8">منصة التداول الآمنة الأولى في فلسطين</p>
                  <div className="space-y-4 text-right">
                    <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                      <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                      <span className="text-sm">تداول USDT بأمان عبر التحويل البنكي المحلي</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                      <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                      <span className="text-sm">نظام Escrow لحماية أموالك</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                      <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                      <span className="text-sm">دعم فني على مدار الساعة</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* الجانب الأيسر - نموذج التسجيل */}
              <div className="p-8 lg:p-12">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-white mb-2">إنشاء حساب جديد</h1>
                  <p className="text-blue-200">انضم إلى آلاف المتداولين الموثوقين</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* الاسم الكامل */}
                    <div>
                      <label className="block text-sm font-medium text-blue-200 mb-1">
                        الاسم الكامل <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={form.fullName}
                          onChange={(e) => handleChange('fullName', e.target.value)}
                          className={`w-full pr-10 pl-4 py-2.5 rounded-xl bg-white/10 border text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                            errors.fullName ? 'border-red-500' : valid.fullName ? 'border-green-500' : 'border-white/20'
                          }`}
                          placeholder="محمد أحمد علي"
                          autoComplete="name"
                        />
                      </div>
                      {errors.fullName && <p className="mt-1 text-sm text-red-400">{errors.fullName}</p>}
                    </div>

                    {/* البريد الإلكتروني */}
                    <div>
                      <label className="block text-sm font-medium text-blue-200 mb-1">
                        البريد الإلكتروني <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          className={`w-full pr-10 pl-4 py-2.5 rounded-xl bg-white/10 border text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                            errors.email ? 'border-red-500' : valid.email ? 'border-green-500' : 'border-white/20'
                          }`}
                          placeholder="example@domain.com"
                          autoComplete="email"
                        />
                      </div>
                      {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* رقم الجوال */}
                    <div>
                      <label className="block text-sm font-medium text-blue-200 mb-1">
                        رقم الجوال <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => handleChange('phone', e.target.value)}
                          className={`w-full pr-10 pl-4 py-2.5 rounded-xl bg-white/10 border text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                            errors.phone ? 'border-red-500' : valid.phone ? 'border-green-500' : 'border-white/20'
                          }`}
                          placeholder="0598765432"
                          autoComplete="off"
                        />
                      </div>
                      {errors.phone && <p className="mt-1 text-sm text-red-400">{errors.phone}</p>}
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
                          value={form.password}
                          onChange={(e) => handleChange('password', e.target.value)}
                          className={`w-full pr-10 pl-10 py-2.5 rounded-xl bg-white/10 border text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                            errors.password ? 'border-red-500' : valid.password ? 'border-green-500' : 'border-white/20'
                          }`}
                          placeholder="••••••••"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
                    </div>
                  </div>

                  {/* تأكيد كلمة المرور */}
                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-1">
                      تأكيد كلمة المرور <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="password"
                        value={form.confirmPassword}
                        onChange={(e) => handleChange('confirmPassword', e.target.value)}
                        className={`w-full pr-10 pl-4 py-2.5 rounded-xl bg-white/10 border text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                          errors.confirmPassword ? 'border-red-500' : valid.confirmPassword ? 'border-green-500' : 'border-white/20'
                        }`}
                        placeholder="••••••••"
                        autoComplete="off"
                      />
                    </div>
                    {errors.confirmPassword && <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>}
                  </div>

                  {/* شروط الاستخدام */}
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="terms" className="w-4 h-4 rounded border-white/20 bg-white/10 checked:bg-blue-600" />
                    <label htmlFor="terms" className="text-sm text-blue-200">
                      أوافق على{' '}
                      <a href="#" className="text-white hover:underline">شروط الاستخدام</a>
                      {' '}و{' '}
                      <a href="#" className="text-white hover:underline">سياسة الخصوصية</a>
                    </label>
                  </div>

                  {/* زر التسجيل */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        إنشاء حساب
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* رابط تسجيل الدخول */}
                  <p className="text-center text-sm text-blue-200">
                    لديك حساب بالفعل؟{' '}
                    <Link href="/login" className="text-white font-semibold hover:underline">
                      تسجيل الدخول
                    </Link>
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}