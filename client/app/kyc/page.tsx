'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { kycApi, authApi } from '@/lib/api'; // ✅ تم التعديل - إضافة authApi
import { Button } from '@/components/ui/Button';
import { Shield, CheckCircle, AlertCircle, Camera, User, Phone, CreditCard, Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Link from 'next/link';

// ✅ دوال التحقق من صحة البيانات
const validatePhoneNumber = (phone: string): boolean => {
  return /^05[0-9]{8}$/.test(phone);
};

const validateNationalId = (nationalId: string): boolean => {
  return /^\d{9}$/.test(nationalId);
};

function KycContent() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    nationalId: '',
    phone: user?.phone || '',
    bankName: '',
  });
  
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState({
    fullName: '',
    nationalId: '',
    phone: '',
    bankName: '',
    idFrontImage: '',
  });

  const banks = [
    { value: 'بنك فلسطين', label: 'بنك فلسطين' },
    { value: 'البنك العربي', label: 'البنك العربي' },
    { value: 'بنك القدس', label: 'بنك القدس' },
    { value: 'البنك الإسلامي الفلسطيني', label: 'البنك الإسلامي الفلسطيني' },
    { value: 'البنك الوطني', label: 'البنك الوطني' },
    { value: 'بنك الاستثمار الفلسطيني', label: 'بنك الاستثمار الفلسطيني' },
    { value: 'بنك القاهرة عمان', label: 'بنك القاهرة عمان' },
    { value: 'البنك التجاري الفلسطيني', label: 'البنك التجاري الفلسطيني' },
    { value: 'بنك الإسكان', label: 'بنك الإسكان' },
    { value: 'بنك الأردن', label: 'بنك الأردن' },
    { value: 'بنك مصر فلسطين', label: 'بنك مصر فلسطين' },
    { value: 'محفظة بال باي', label: 'محفظة بال باي' },
  ];

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.fullName || prev.fullName,
        phone: user.phone || prev.phone,
      }));
    }
  }, [user]);

  const validateForm = () => {
    let isValid = true;
    const newErrors = { ...errors };
    
    if (!formData.fullName || formData.fullName.length < 3) {
      newErrors.fullName = 'اسم صاحب الحساب مطلوب';
      isValid = false;
    } else {
      newErrors.fullName = '';
    }
    
    if (!formData.nationalId || !validateNationalId(formData.nationalId)) {
      newErrors.nationalId = 'رقم الهوية مطلوب (9 أرقام)';
      isValid = false;
    } else {
      newErrors.nationalId = '';
    }
    
    if (!formData.phone || !validatePhoneNumber(formData.phone)) {
      newErrors.phone = 'رقم الجوال مطلوب (يبدأ بـ 05)';
      isValid = false;
    } else {
      newErrors.phone = '';
    }
    
    if (!formData.bankName) {
      newErrors.bankName = 'يرجى اختيار البنك';
      isValid = false;
    } else {
      newErrors.bankName = '';
    }
    
    if (!idFrontFile) {
      newErrors.idFrontImage = 'صورة الهوية مطلوبة';
      isValid = false;
    } else {
      newErrors.idFrontImage = '';
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الملف يتجاوز 5 ميجابايت');
      return;
    }
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('نوع الملف غير مدعوم (JPG, PNG فقط)');
      return;
    }
    
    const preview = URL.createObjectURL(file);
    if (idFrontPreview) URL.revokeObjectURL(idFrontPreview);
    setIdFrontPreview(preview);
    setIdFrontFile(file);
    setErrors(prev => ({ ...prev, idFrontImage: '' }));
  };

  const removeFile = () => {
    if (idFrontPreview) URL.revokeObjectURL(idFrontPreview);
    setIdFrontPreview(null);
    setIdFrontFile(null);
    setErrors(prev => ({ ...prev, idFrontImage: 'صورة الهوية مطلوبة' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    
    setIsSubmitting(true);
    
    const submitFormData = new FormData();
    submitFormData.append('fullName', formData.fullName);
    submitFormData.append('nationalId', formData.nationalId);
    submitFormData.append('phone', formData.phone);
    submitFormData.append('bankName', formData.bankName);
    submitFormData.append('idFrontImage', idFrontFile!);
    
    try {
      // ✅ استخدام kycApi بدلاً من fetch
      await kycApi.submit(submitFormData);
      toast.success('تم إرسال طلب التوثيق بنجاح!');
      await refreshUser();
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndRetry = async () => {
    setIsResetting(true);
    try {
      // ✅ استخدام authApi بدلاً من fetch
      await authApi.resetKycStatus();
      toast.success('تم إعادة تعيين الحالة، يمكنك الآن إعادة التقديم');
      const newUser = await refreshUser();
      if (newUser && newUser.kycStatus === 'none') {
        setFormData({
          fullName: user?.fullName || '',
          nationalId: '',
          phone: user?.phone || '',
          bankName: '',
        });
        setIdFrontFile(null);
        setIdFrontPreview(null);
      } else {
        window.location.reload();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل إعادة تعيين الحالة');
    } finally {
      setIsResetting(false);
    }
  };

  // حالة انتظار
  if (user?.kycStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">طلب التوثيق قيد المراجعة</h2>
          <p className="text-gray-500">تم استلام طلبك. سيتم مراجعته خلال 24 ساعة.</p>
          <button onClick={() => router.push('/dashboard')} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg">العودة</button>
        </div>
      </div>
    );
  }

  // حالة موثق
  if (user?.kycStatus === 'approved') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">حسابك موثق</h2>
          <p className="text-gray-500">يمكنك الآن إنشاء عروض بيع وبدء التداول.</p>
          <button onClick={() => router.push('/dashboard')} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg">الذهاب إلى لوحة التحكم</button>
        </div>
      </div>
    );
  }

  // حالة مرفوض
  if (user?.kycStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">تم رفض الطلب</h2>
          <p className="text-gray-500 mb-4">يرجى مراجعة البيانات وإعادة التقديم.</p>
          <button 
            onClick={handleResetAndRetry}
            disabled={isResetting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isResetting ? <Loader2 className="w-4 h-4 animate-spin inline ml-2" /> : null}
            إعادة التقديم
          </button>
        </div>
      </div>
    );
  }

  // نموذج التوثيق - تصميم أفقي على الشاشات الكبيرة
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header with Back Button */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">توثيق الهوية</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <form onSubmit={handleSubmit}>
            {/* تصميم أفقي - صفين على الشاشات الكبيرة */}
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              
              {/* القسم الأيمن - الحقول */}
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اسم صاحب الحساب <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className={`w-full pr-10 pl-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.fullName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="أدخل اسم صاحب الحساب"
                    />
                  </div>
                  {errors.fullName && <p className="mt-1 text-sm text-red-500">{errors.fullName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    رقم الهوية <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nationalId}
                    onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.nationalId ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="أدخل رقم الهوية (9 أرقام)"
                  />
                  {errors.nationalId && <p className="mt-1 text-sm text-red-500">{errors.nationalId}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    رقم الجوال <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={`w-full pr-10 pl-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="05xxxxxxxx"
                    />
                  </div>
                  {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    البنك <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className={`w-full pr-10 pl-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white ${
                        errors.bankName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">اختر البنك</option>
                      {banks.map(b => (
                        <option key={b.value} value={b.value}>{b.label}</option>
                      ))}
                    </select>
                  </div>
                  {errors.bankName && <p className="mt-1 text-sm text-red-500">{errors.bankName}</p>}
                </div>
              </div>

              {/* القسم الأيسر - صورة الهوية والأزرار */}
              <div className="p-6 flex flex-col justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    صورة الهوية <span className="text-red-500">*</span>
                  </label>
                  <div className={`border-2 border-dashed rounded-lg p-4 text-center transition ${
                    errors.idFrontImage ? 'border-red-500' : 'border-gray-300 hover:border-blue-400'
                  }`}>
                    {idFrontPreview ? (
                      <div className="relative inline-block">
                        <img src={idFrontPreview} className="max-h-40 mx-auto rounded" />
                        <button
                          type="button"
                          onClick={removeFile}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <Camera className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">اضغط لرفع صورة الهوية</span>
                        <p className="text-xs text-gray-400 mt-1">JPG, PNG - حد أقصى 5MB</p>
                      </label>
                    )}
                  </div>
                  {errors.idFrontImage && <p className="mt-1 text-sm text-red-500">{errors.idFrontImage}</p>}
                </div>

                <Button
                  type="submit"
                  loading={isSubmitting}
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold"
                >
                  إرسال طلب التوثيق
                </Button>

                <p className="text-xs text-gray-400 text-center mt-3">
                  سيتم مراجعة طلبك من قبل فريق الدعم خلال 24 ساعة
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function KycPage() {
  return (
    <ProtectedRoute>
      <KycContent />
    </ProtectedRoute>
  );
}