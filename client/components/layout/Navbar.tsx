'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Menu, X, ChevronDown, User, LogOut, Settings, Shield, Wallet, 
  Home, ShoppingBag, LayoutDashboard, ListOrdered, AlertTriangle, Clock
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';

const publicLinks = [
  { href: '/', label: 'الرئيسية', icon: Home },
  { href: '/marketplace', label: 'المتجر', icon: ShoppingBag },
];

const privateLinks = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/trades', label: 'صفقاتي', icon: ListOrdered },
  { href: '/disputes', label: 'النزاعات', icon: AlertTriangle },
];

export function Navbar() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ تحميل الصورة الشخصية من localStorage
  useEffect(() => {
    const loadProfileImage = () => {
      const savedImage = localStorage.getItem('profileImage');
      if (savedImage) {
        setProfileImage(savedImage);
      }
    };
    loadProfileImage();
    
    // الاستماع للتغييرات في localStorage
    window.addEventListener('storage', loadProfileImage);
    return () => window.removeEventListener('storage', loadProfileImage);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/');
    setIsProfileOpen(false);
  };

  const isLoggedIn = !!user;
  const isSuspended = user?.isSuspended === true;
  const isAdmin = user && ['super_admin', 'kyc_admin', 'support_admin', 'finance_admin'].includes(user.role);

  const navLinks = (isLoggedIn && !isSuspended) ? [...publicLinks, ...privateLinks] : publicLinks;

  // الحصول على أول حرف من الاسم
  const getInitial = () => {
    return user?.fullName?.charAt(0) || 'م';
  };

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-slate-900/95 backdrop-blur-md shadow-lg border-b border-white/10' 
        : 'bg-slate-900/80 backdrop-blur-sm border-b border-white/10'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
              PALEX
            </span>
          </Link>

          {/* Desktop Navigation - وسط - مع تمرير أفقي */}
          <div className="hidden md:flex items-center gap-1 absolute left-1/2 transform -translate-x-1/2 overflow-x-auto max-w-[35%] lg:max-w-[50%] xl:max-w-none no-scrollbar">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  px-2 lg:px-3 py-2 rounded-xl font-medium transition-all duration-200 flex items-center gap-1 text-xs lg:text-sm whitespace-nowrap
                  ${pathname === link.href
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }
                `}
              >
                <link.icon className="w-3 h-3 lg:w-4 lg:h-4" />
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side - User Menu */}
          <div className="flex items-center gap-3 shrink-0">
            {isLoading ? (
              <div className="flex gap-2">
                <Link href="/login" prefetch={false}>
                  <button className="px-4 py-2 text-gray-300 hover:text-white font-medium">دخول</button>
                </Link>
                <Link href="/register" prefetch={false}>
                  <button className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:shadow-lg transition shadow-md">
                    إنشاء حساب
                  </button>
                </Link>
              </div>
            ) : isLoggedIn ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => !isSuspended && setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-xl hover:bg-white/20 transition border border-white/10"
                >
                  {/* ✅ صورة المستخدم أو الحرف الأول */}
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md overflow-hidden">
                    {profileImage ? (
                      <img 
                        src={profileImage} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-sm font-bold">
                        {getInitial()}
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-white whitespace-nowrap">
                      {user.fullName?.split(' ')[0]}
                    </p>
                    <p className="text-xs text-blue-300 truncate max-w-[120px]">
                      {user.email}
                    </p>
                  </div>
                  {!isSuspended && <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />}
                </button>

                {!isSuspended && isProfileOpen && (
                  <div className="absolute left-0 top-full mt-2 w-64 bg-slate-800 rounded-2xl shadow-xl border border-white/10 overflow-hidden z-50">
                    {/* رأس القائمة المنسدلة مع الصورة */}
                    <div className="p-4 border-b border-white/10 bg-gradient-to-r from-slate-800 to-slate-800/50 flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md overflow-hidden">
                        {profileImage ? (
                          <img 
                            src={profileImage} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white text-lg font-bold">
                            {getInitial()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{user.fullName}</p>
                        <p className="text-xs text-blue-400">{user.email}</p>
                      </div>
                    </div>
                    <div className="p-2">
                      <Link href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition text-gray-300 hover:text-white" onClick={() => setIsProfileOpen(false)}>
                        <User className="w-4 h-4" />
                        <span className="text-sm">الملف الشخصي</span>
                      </Link>
                      <Link href="/profile?tab=wallets" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition text-gray-300 hover:text-white" onClick={() => setIsProfileOpen(false)}>
                        <Wallet className="w-4 h-4" />
                        <span className="text-sm">المحافظ</span>
                      </Link>
                      <Link href="/kyc" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition text-gray-300 hover:text-white" onClick={() => setIsProfileOpen(false)}>
                        <Shield className="w-4 h-4" />
                        <span className="text-sm">توثيق الهوية</span>
                      </Link>
                      <Link href="/profile?tab=preferences" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition text-gray-300 hover:text-white" onClick={() => setIsProfileOpen(false)}>
                        <Settings className="w-4 h-4" />
                        <span className="text-sm">الإعدادات</span>
                      </Link>

                      {isAdmin && (
                        <>
                          <div className="border-t border-white/10 my-2" />
                          <Link href="/admin/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition text-gray-300 hover:text-white" onClick={() => setIsProfileOpen(false)}>
                            <Shield className="w-4 h-4" />
                            <span className="text-sm">لوحة الأدمن</span>
                          </Link>
                        </>
                      )}

                      <div className="border-t border-white/10 my-2" />
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 transition text-red-400">
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm">تسجيل الخروج</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" prefetch={false}>
                  <button className="px-4 py-2 text-gray-300 hover:text-white font-medium">دخول</button>
                </Link>
                <Link href="/register" prefetch={false}>
                  <button className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:shadow-lg transition shadow-md">
                    إنشاء حساب
                  </button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2 rounded-lg hover:bg-white/10 transition text-white">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && !isLoading && (
          <div className="md:hidden py-4 border-t border-white/10">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition
                  ${pathname === link.href
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }
                `}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
            {isLoggedIn && !isSuspended && (
              <>
                <div className="border-t border-white/10 my-2 pt-2">
                  <Link href="/profile" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-white/10 hover:text-white" onClick={() => setIsOpen(false)}>
                    <User className="w-4 h-4" />
                    الملف الشخصي
                  </Link>
                  <Link href="/kyc" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-white/10 hover:text-white" onClick={() => setIsOpen(false)}>
                    <Shield className="w-4 h-4" />
                    توثيق الهوية
                  </Link>
                </div>
                <button onClick={() => { handleLogout(); setIsOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition">
                  <LogOut className="w-4 h-4" />
                  تسجيل الخروج
                </button>
              </>
            )}
            {!isLoggedIn && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <Link href="/login" prefetch={false} onClick={() => setIsOpen(false)} className="block px-4 py-3 text-center text-gray-300 hover:bg-white/10 rounded-xl">دخول</Link>
                <Link href="/register" prefetch={false} onClick={() => setIsOpen(false)} className="block mt-2 px-4 py-3 text-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">إنشاء حساب</Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS لإخفاء شريط التمرير */}
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </nav>
  );
}