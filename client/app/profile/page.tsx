'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { userApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { 
  User, Mail, Phone, Wallet, Shield, 
  Copy, Check, Eye, EyeOff, LogOut, Save, 
  Star, TrendingUp, Calendar, Globe, Fingerprint, Bell,
  Loader2, CheckCircle, AlertTriangle, Camera, Upload, X, Clock
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';

// استيراد دوال التحقق
import { 
  validateTrc20Address, 
  validateBep20Address, 
  validatePasswordStrength,
  validatePasswordMatch
} from '@/lib/validation';

function ProfileContent() {
  const { user: authUser, updateUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeSection, setActiveSection] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState(true);
  const [walletErrors, setWalletErrors] = useState<{ trc20?: string; bsc?: string }>({});
  
  // صورة المستخدم
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // ساعات العمل
  const [workHours, setWorkHours] = useState({
    start: '09:00',
    end: '21:00',
    days: [0, 1, 2, 3, 4, 5, 6] as number[],
  });
  const [isSavingHours, setIsSavingHours] = useState(false);

  const [userData, setUserData] = useState({
    fullName: '',
    email: '',
    phone: '',
    memberSince: '',
    totalTrades: 0,
    successRate: 0,
    averageRating: 0,
    kycStatus: '',
    trc20Wallet: '',
    bscWallet: '',
    profileImageUrl: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // أيام الأسبوع بالعربية
  const weekDays = [
    { value: 0, label: 'الأحد' },
    { value: 1, label: 'الإثنين' },
    { value: 2, label: 'الثلاثاء' },
    { value: 3, label: 'الأربعاء' },
    { value: 4, label: 'الخميس' },
    { value: 5, label: 'الجمعة' },
    { value: 6, label: 'السبت' },
  ];

  useEffect(() => {
    if (tabParam === 'wallets') {
      setActiveSection('wallets');
    } else if (tabParam === 'security') {
      setActiveSection('security');
    } else if (tabParam === 'preferences') {
      setActiveSection('preferences');
    } else if (tabParam === 'sessions') {
      setActiveSection('sessions');
    } else {
      setActiveSection('profile');
    }
  }, [tabParam]);

  useEffect(() => {
    loadUserProfile();
    loadSessions();
    loadProfileImage();
    loadWorkHours();
  }, []);

  const loadUserProfile = async () => {
    setIsLoading(true);
    try {
      const response = await userApi.getProfile();
      const user = response.data;

      const memberSince = user.createdAt 
        ? new Date(user.createdAt).toLocaleDateString('ar', { year: 'numeric', month: 'long' })
        : 'يناير 2025';

      setUserData({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        memberSince,
        totalTrades: user.totalTrades || 0,
        successRate: user.successRate || 0,
        averageRating: user.averageRating || 0,
        kycStatus: user.kycStatus || 'pending',
        trc20Wallet: user.trc20Wallet || '',
        bscWallet: user.bscWallet || '',
        profileImageUrl: user.profileImageUrl || '',
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('فشل في تحميل بيانات الملف الشخصي');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfileImage = async () => {
    try {
      const savedImage = localStorage.getItem('profileImage');
      if (savedImage) {
        setProfileImage(savedImage);
      }
    } catch (error) {
      console.error('Failed to load profile image:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await userApi.getSessions();
      setSessions(response.data || []);
    } catch (error) {
      console.error('Failed to load sessions', error);
      setSessions([]);
    }
  };

  const loadWorkHours = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/users/work-hours', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data) {
        setWorkHours({
          start: data.workHoursStart || '09:00',
          end: data.workHoursEnd || '21:00',
          days: data.workDays || [0, 1, 2, 3, 4, 5, 6],
        });
      }
    } catch (error) {
      console.error('Failed to load work hours:', error);
    }
  };

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast.success('تم النسخ');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImageError(null);
    
    if (file.size > 2 * 1024 * 1024) {
      setImageError('حجم الصورة يجب أن لا يتجاوز 2 ميجابايت');
      return;
    }
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setImageError('نوع المغير مدعوم (JPG, PNG, WEBP)');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImage(reader.result as string);
      setProfileImageFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadImage = async () => {
    if (!profileImageFile) return;
    
    setIsUploadingImage(true);
    setImageError(null);
    
    const formData = new FormData();
    formData.append('profileImage', profileImageFile);
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:4000/api/users/profile-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('profileImage', profileImage!);
        toast.success('تم تحديث الصورة الشخصية بنجاح');
        updateUser({ ...authUser!, profileImageUrl: profileImage! });
      } else {
        setImageError(data.message || 'فشل في رفع الصورة');
        toast.error(data.message || 'فشل في رفع الصورة');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setImageError('حدث خطأ في الاتصال بالخادم');
      toast.error('حدث خطأ في رفع الصورة');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    setProfileImage(null);
    setProfileImageFile(null);
    localStorage.removeItem('profileImage');
    
    try {
      const token = localStorage.getItem('accessToken');
      await fetch('http://localhost:4000/api/users/profile-image', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      toast.success('تم إزالة الصورة الشخصية');
    } catch (error) {
      console.error('Remove image error:', error);
    }
  };

  const handleUpdateWallets = async () => {
    const errors: { trc20?: string; bsc?: string } = {};
    
    if (userData.trc20Wallet && !validateTrc20Address(userData.trc20Wallet)) {
      errors.trc20 = 'عنوان TRC20 غير صحيح. يجب أن يبدأ بـ T ويتكون من 34 حرفاً';
    }
    
    if (userData.bscWallet && !validateBep20Address(userData.bscWallet)) {
      errors.bsc = 'عنوان BEP20 غير صحيح. يجب أن يبدأ بـ 0x ويتكون من 42 حرفاً';
    }
    
    setWalletErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      toast.error('يرجى تصحيح الأخطاء في عناوين المحافظ');
      return;
    }
    
    setIsLoading(true);
    try {
      await userApi.updateWallets(userData.trc20Wallet || null, userData.bscWallet || null);
      
      let successMessage = 'تم تحديث المحافظ';
      if (userData.trc20Wallet && !userData.bscWallet) {
        successMessage = 'تم تحديث محفظة TRC20';
      } else if (!userData.trc20Wallet && userData.bscWallet) {
        successMessage = 'تم تحديث محفظة BEP20';
      }
      toast.success(successMessage);
      
      updateUser({ ...authUser!, trc20Wallet: userData.trc20Wallet, bscWallet: userData.bscWallet });
    } catch (error: any) {
      console.error('Update wallets error:', error);
      toast.error(error.response?.data?.message || 'فشل في تحديث المحافظ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePasswordMatch(passwordData.newPassword, passwordData.confirmPassword)) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }
    
    const passwordValidation = validatePasswordStrength(passwordData.newPassword);
    if (!passwordValidation.isValid) {
      toast.error(passwordValidation.errors[0]);
      return;
    }
    
    setIsLoading(true);
    try {
      await userApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('تم تغيير كلمة المرور بنجاح');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في تغيير كلمة المرور');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveWorkHours = async () => {
    setIsSavingHours(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch('http://localhost:4000/api/users/work-hours', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workHoursStart: workHours.start,
          workHoursEnd: workHours.end,
          workDays: workHours.days,
        }),
      });
      toast.success('تم حفظ ساعات العمل بنجاح');
    } catch (error) {
      toast.error('فشل في حفظ ساعات العمل');
    } finally {
      setIsSavingHours(false);
    }
  };

  const toggleWorkDay = (day: number) => {
    setWorkHours(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day],
    }));
  };

  const logoutSession = async (sessionId: string) => {
    try {
      await userApi.logoutSession(sessionId);
      loadSessions();
      toast.success('تم تسجيل الخروج من هذا الجهاز');
    } catch (error) {
      toast.error('فشل في تسجيل الخروج');
    }
  };

  const logoutAllSessions = async () => {
    if (confirm('هل أنت متأكد من تسجيل الخروج من جميع الأجهزة؟')) {
      try {
        await userApi.logoutAllSessions();
        loadSessions();
        toast.success('تم تسجيل الخروج من جميع الأجهزة');
      } catch (error) {
        toast.error('فشل في تسجيل الخروج');
      }
    }
  };

  const toggleNotifications = () => {
    const newValue = !notifications;
    setNotifications(newValue);
    localStorage.setItem('notifications', String(newValue));
    toast.success(newValue ? 'تم تفعيل الإشعارات' : 'تم إيقاف الإشعارات');
  };

  const sections = [
    { id: 'profile', label: 'الملف الشخصي', icon: User },
    { id: 'wallets', label: 'المحافظ', icon: Wallet },
    { id: 'security', label: 'الأمان', icon: Shield },
    { id: 'sessions', label: 'الجلسات', icon: Globe },
    { id: 'preferences', label: 'الإعدادات', icon: Bell },
  ];

  const getInitials = () => {
    return userData.fullName?.charAt(0) || 'م';
  };

  if (isLoading && !userData.fullName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-3xl blur-3xl" />
          <div className="relative bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative group">
                <div 
                  className="w-28 h-28 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden cursor-pointer relative group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {profileImage ? (
                    <img 
                      src={profileImage} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-white">{getInitials()}</span>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 bg-blue-600 rounded-full p-1.5 shadow-lg hover:bg-blue-700 transition"
                  title="تغيير الصورة"
                >
                  <Camera className="w-4 h-4 text-white" />
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                
                {userData.kycStatus === 'approved' && (
                  <div className="absolute -bottom-2 -left-2 bg-green-500 rounded-full p-1">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              
              {profileImageFile && (
                <div className="flex gap-2">
                  <button
                    onClick={handleUploadImage}
                    disabled={isUploadingImage}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition flex items-center gap-1 disabled:opacity-50"
                  >
                    {isUploadingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    حفظ
                  </button>
                  <button
                    onClick={handleRemoveImage}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    حذف
                  </button>
                </div>
              )}
              
              {imageError && (
                <p className="text-red-400 text-xs mt-1">{imageError}</p>
              )}
              
              <div className="flex-1 text-center md:text-right">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">{userData.fullName}</h1>
                  {userData.kycStatus === 'approved' && (
                    <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                      <CheckCircle className="w-3 h-3" />
                      حساب موثق
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-blue-200 text-sm">
                  <div className="flex items-center gap-2"><Mail className="w-4 h-4" /><span>{userData.email}</span></div>
                  <div className="w-1 h-1 bg-blue-400 rounded-full hidden md:block" />
                  <div className="flex items-center gap-2"><Phone className="w-4 h-4" /><span>{userData.phone || 'غير مضاف'}</span></div>
                </div>
                <div className="mt-3 text-xs text-blue-400/70 flex items-center justify-center md:justify-start gap-1">
                  <Shield className="w-3 h-3" />
                  <span>المعلومات الشخصية موثقة ولا يمكن تغييرها</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20 text-center">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-2"><TrendingUp className="w-5 h-5 text-blue-400" /></div>
            <p className="text-2xl font-bold text-white">{userData.totalTrades}</p>
            <p className="text-xs text-blue-300">إجمالي الصفقات</p>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-sm rounded-2xl p-4 border border-green-500/20 text-center">
            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-2"><CheckCircle className="w-5 h-5 text-green-400" /></div>
            <p className="text-2xl font-bold text-white">{userData.successRate}%</p>
            <p className="text-xs text-blue-300">نسبة النجاح</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 backdrop-blur-sm rounded-2xl p-4 border border-yellow-500/20 text-center">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center mx-auto mb-2"><Star className="w-5 h-5 text-yellow-400" /></div>
            <p className="text-2xl font-bold text-white">{userData.averageRating}</p>
            <p className="text-xs text-blue-300">التقييم</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-sm rounded-2xl p-4 border border-purple-500/20 text-center">
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-2"><Calendar className="w-5 h-5 text-purple-400" /></div>
            <p className="text-2xl font-bold text-white">{userData.memberSince.split(' ')[0]}</p>
            <p className="text-xs text-blue-300">عضو منذ</p>
          </div>
        </div>

        {/* Main Content - Sidebar + Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-72">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sticky top-24">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right transition-all mb-1 ${
                    activeSection === section.id
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-blue-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <section.icon className={`w-5 h-5 ${activeSection === section.id ? 'text-white' : 'text-blue-400'}`} />
                  <span className="flex-1">{section.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            {/* Profile Section */}
            {activeSection === 'profile' && (
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><User className="w-5 h-5 text-blue-400" />المعلومات الشخصية</h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm text-blue-300 mb-1">الاسم الكامل</label>
                    <div className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white opacity-70">{userData.fullName}</div>
                  </div>
                  <div>
                    <label className="block text-sm text-blue-300 mb-1">البريد الإلكتروني</label>
                    <div className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white opacity-70">{userData.email}</div>
                  </div>
                  <div>
                    <label className="block text-sm text-blue-300 mb-1">رقم الجوال</label>
                    <div className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white opacity-70">{userData.phone || 'غير مضاف'}</div>
                  </div>
                  <div className="text-center text-xs text-blue-400/70 pt-2">
                    <p>للتواصل مع الدعم لتحديث المعلومات الشخصية</p>
                    <a href="https://wa.me/9705991234567" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 inline-flex items-center gap-1 mt-2">
                      <span>واتساب: +970 59 123 4567</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Wallets Section */}
            {activeSection === 'wallets' && (
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Wallet className="w-5 h-5 text-blue-400" />المحافظ الرقمية</h2>
                
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-400">⚠️ تنبيه مهم</p>
                      <p className="text-yellow-300/80 text-xs mt-1">
                        يمكنك إضافة عنوان واحد فقط أو كليهما. 
                        للشراء عبر شبكة TRC20، يجب إضافة عنوان TRC20.
                        للشراء عبر شبكة BEP20، يجب إضافة عنوان BEP20.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {/* TRC20 Wallet */}
                  <div className="bg-blue-500/5 rounded-xl p-5 border border-blue-500/20">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-400" />
                      محفظة TRC20 (Tron)
                      {userData.trc20Wallet && <span className="text-xs text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full">مفعلة</span>}
                      {!userData.trc20Wallet && <span className="text-xs text-yellow-400 bg-yellow-500/20 px-2 py-0.5 rounded-full">غير مفعلة</span>}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <input 
                        type="text" 
                        value={userData.trc20Wallet} 
                        onChange={(e) => setUserData({ ...userData, trc20Wallet: e.target.value })}
                        onBlur={() => {
                          if (userData.trc20Wallet && !validateTrc20Address(userData.trc20Wallet)) {
                            setWalletErrors({ ...walletErrors, trc20: 'عنوان TRC20 غير صحيح' });
                          } else {
                            setWalletErrors({ ...walletErrors, trc20: undefined });
                          }
                        }}
                        placeholder="أدخل عنوان محفظة TRC20 (يبدأ بـ T)" 
                        className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      />
                      {userData.trc20Wallet && (
                        <button onClick={() => handleCopy(userData.trc20Wallet, 'trc20')} className="px-4 py-3 bg-white/10 rounded-xl hover:bg-white/20">
                          {copied === 'trc20' ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-white" />}
                        </button>
                      )}
                    </div>
                    {walletErrors.trc20 && <p className="mt-2 text-sm text-red-400">{walletErrors.trc20}</p>}
                    <p className="text-xs text-blue-400 mt-2">مثال: TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX</p>
                    <p className="text-xs text-yellow-400 mt-1">
                      {userData.trc20Wallet ? '✅ يمكنك الشراء عبر شبكة TRC20' : '⚠️ يجب إضافة عنوان للشراء عبر TRC20'}
                    </p>
                  </div>

                  {/* BEP20 Wallet */}
                  <div className="bg-purple-500/5 rounded-xl p-5 border border-purple-500/20">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-purple-400" />
                      محفظة BEP20 (Binance Smart Chain)
                      {userData.bscWallet && <span className="text-xs text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full">مفعلة</span>}
                      {!userData.bscWallet && <span className="text-xs text-yellow-400 bg-yellow-500/20 px-2 py-0.5 rounded-full">غير مفعلة</span>}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <input 
                        type="text" 
                        value={userData.bscWallet} 
                        onChange={(e) => setUserData({ ...userData, bscWallet: e.target.value })}
                        onBlur={() => {
                          if (userData.bscWallet && !validateBep20Address(userData.bscWallet)) {
                            setWalletErrors({ ...walletErrors, bsc: 'عنوان BEP20 غير صحيح' });
                          } else {
                            setWalletErrors({ ...walletErrors, bsc: undefined });
                          }
                        }}
                        placeholder="أدخل عنوان محفظة BEP20 (يبدأ بـ 0x)" 
                        className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      />
                      {userData.bscWallet && (
                        <button onClick={() => handleCopy(userData.bscWallet, 'bsc')} className="px-4 py-3 bg-white/10 rounded-xl hover:bg-white/20">
                          {copied === 'bsc' ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-white" />}
                        </button>
                      )}
                    </div>
                    {walletErrors.bsc && <p className="mt-2 text-sm text-red-400">{walletErrors.bsc}</p>}
                    <p className="text-xs text-purple-400 mt-2">مثال: 0x...</p>
                    <p className="text-xs text-yellow-400 mt-1">
                      {userData.bscWallet ? '✅ يمكنك الشراء عبر شبكة BEP20' : '⚠️ يجب إضافة عنوان للشراء عبر BEP20'}
                    </p>
                  </div>

                  <Button onClick={handleUpdateWallets} loading={isLoading} className="w-full">حفظ المحافظ</Button>

                  <div className="bg-yellow-500/10 rounded-xl p-4 text-sm text-yellow-300 flex items-start gap-3">
                    <Shield className="w-5 h-5 shrink-0" />
                    <p>هذه هي المحافظ التي ستستلم عليها USDT بعد إتمام الصفقات. تأكد من صحة العناوين.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Security Section */}
            {activeSection === 'security' && (
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Shield className="w-5 h-5 text-blue-400" />الأمان</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-white mb-4">تغيير كلمة المرور</h3>
                    <div className="space-y-4">
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        placeholder="كلمة المرور الحالية" 
                        value={passwordData.currentPassword} 
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} 
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      />
                      <input 
                        type="password" 
                        placeholder="كلمة المرور الجديدة" 
                        value={passwordData.newPassword} 
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} 
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      />
                      <input 
                        type="password" 
                        placeholder="تأكيد كلمة المرور الجديدة" 
                        value={passwordData.confirmPassword} 
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} 
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      />
                      <button 
                        onClick={handleChangePassword} 
                        disabled={isLoading} 
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                      >
                        تغيير كلمة المرور
                      </button>
                    </div>
                  </div>
                  <div className="border-t border-white/10 pt-6">
                    <h3 className="font-semibold text-white mb-4">المصادقة الثنائية (2FA)</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                          <Fingerprint className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">حماية حسابك</p>
                          <p className="text-xs text-blue-300">أضف طبقة أمان إضافية</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20">تفعيل</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sessions Section */}
            {activeSection === 'sessions' && (
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Globe className="w-5 h-5 text-blue-400" />الجلسات النشطة</h2>
                {sessions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Globe className="w-8 h-8 text-blue-400" />
                    </div>
                    <p className="text-blue-300">لا توجد جلسات نشطة</p>
                  </div>
                ) : (
                  sessions.map((session, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10">
                          <Globe className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{session.device || 'جهاز غير معروف'}</p>
                          <p className="text-xs text-blue-300">IP: {session.ip || 'غير معروف'}</p>
                          <p className="text-xs text-blue-400">{new Date(session.lastActive).toLocaleDateString('ar')}</p>
                        </div>
                      </div>
                      <button onClick={() => logoutSession(session.id)} className="text-xs text-red-400 hover:text-red-300">إنهاء</button>
                    </div>
                  ))
                )}
                <button onClick={logoutAllSessions} className="w-full mt-4 px-4 py-3 border border-red-500/30 text-red-400 rounded-xl font-medium hover:bg-red-500/10 transition flex items-center justify-center gap-2">
                  <LogOut className="w-4 h-4" />
                  تسجيل الخروج من جميع الأجهزة
                </button>
              </div>
            )}

            {/* Preferences Section - مع ساعات العمل */}
            {activeSection === 'preferences' && (
              <div className="space-y-6">
                {/* الإشعارات */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Bell className="w-5 h-5 text-blue-400" />الإعدادات</h2>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10">
                        <Bell className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">الإشعارات</p>
                        <p className="text-xs text-blue-300">استلام إشعارات الصفقات والنزاعات</p>
                      </div>
                    </div>
                    <button onClick={toggleNotifications} className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${notifications ? 'bg-blue-600' : 'bg-white/20'}`}>
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${notifications ? 'left-1 translate-x-7' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-3 border-t border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10">
                        <Globe className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">اللغة</p>
                        <p className="text-xs text-blue-300">العربية</p>
                      </div>
                    </div>
                    <span className="text-sm text-blue-400">العربية</span>
                  </div>
                </div>

                {/* ساعات العمل */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-400" />
                    ساعات العمل
                  </h2>
                  
                  <div className="space-y-6">
                    {/* وقت البدء والانتهاء */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-blue-300 mb-2">وقت البدء</label>
                        <input
                          type="time"
                          value={workHours.start}
                          onChange={(e) => setWorkHours({ ...workHours, start: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-blue-300 mb-2">وقت الانتهاء</label>
                        <input
                          type="time"
                          value={workHours.end}
                          onChange={(e) => setWorkHours({ ...workHours, end: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    
                    {/* أيام العمل */}
                    <div>
                      <label className="block text-sm text-blue-300 mb-2">أيام العمل</label>
                      <div className="flex flex-wrap gap-2">
                        {weekDays.map((day) => (
                          <button
                            key={day.value}
                            onClick={() => toggleWorkDay(day.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm transition ${
                              workHours.days.includes(day.value)
                                ? 'bg-blue-600 text-white'
                                : 'bg-white/10 text-blue-200 hover:bg-white/20'
                            }`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* ملاحظة */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5" />
                        <p className="text-blue-300 text-xs">
                          سيظهر للمشترين أنك نشط فقط خلال ساعات العمل التي حددتها.
                          خارج هذه الساعات، سيظهر زر الشراء باللون الرمادي مع رسالة "البائع غير متوفر حالياً".
                        </p>
                      </div>
                    </div>
                    
                    {/* زر الحفظ */}
                    <Button onClick={handleSaveWorkHours} loading={isSavingHours} className="w-full">
                      <Save className="w-4 h-4 ml-2" />
                      حفظ ساعات العمل
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}