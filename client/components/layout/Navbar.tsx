'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Menu, X, ChevronDown, User, LogOut, Settings, Shield, Wallet, 
  Home, ShoppingBag, LayoutDashboard, ListOrdered, AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const publicLinks = [
  { href: '/', label: 'الرئيسية', icon: Home },
  { href: '/marketplace', label: 'المتجر', icon: ShoppingBag },
];

const privateLinks = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/trades', label: 'صفقاتي', icon: ListOrdered },
  { href: '/disputes', label: 'النزاعات', icon: AlertTriangle },
];

const authLinks = [
  { href: '/profile', label: 'الملف الشخصي', icon: User },
  { href: '/profile?tab=wallets', label: 'المحافظ', icon: Wallet },
  { href: '/kyc', label: 'توثيق الهوية', icon: Shield },
  { href: '/profile?tab=preferences', label: 'الإعدادات', icon: Settings },
];

export function Navbar() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  useEffect(() => {
    const load = () => {
      const saved = localStorage.getItem('profileImage');
      if (saved) setProfileImage(saved);
    };
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/');
    setIsProfileOpen(false);
    setIsMenuOpen(false);
  }, [logout, router]);

  const isLoggedIn = !!user;
  const isSuspended = user?.isSuspended === true;
  const isAdmin = user && ['super_admin', 'kyc_admin', 'support_admin', 'finance_admin'].includes(user.role);
  const navLinks = (isLoggedIn && !isSuspended) ? [...publicLinks, ...privateLinks] : publicLinks;

  const getInitial = () => user?.fullName?.charAt(0) || 'م';
  const isActive = (href: string) => pathname === href;

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      isScrolled
        ? 'bg-slate-900/95 backdrop-blur-md shadow-lg border-b border-white/10'
        : 'bg-slate-900/80 backdrop-blur-sm border-b border-white/10'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-14 md:h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img src="/images/palex-icon-32.png" alt="PALEX" className="w-8 h-8 md:w-9 md:h-9 object-contain rounded-lg" />
            <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
              PALEX
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-xl font-medium transition-all duration-200 flex items-center gap-1.5 text-sm whitespace-nowrap ${
                  isActive(link.href)
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2 shrink-0">
            {!isLoading && isLoggedIn ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => !isSuspended && setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-2 md:px-3 py-1.5 rounded-xl hover:bg-white/20 transition border border-white/10"
                >
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md overflow-hidden">
                    {profileImage || user?.profileImageUrl ? (
                      <img src={profileImage || user?.profileImageUrl || ''} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-xs font-bold">{getInitial()}</span>
                    )}
                  </div>
                  <span className="text-xs md:text-sm font-semibold text-white max-w-[60px] md:max-w-none truncate">{user.fullName?.split(' ')[0]}</span>
                  {!isSuspended && <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />}
                </button>

                {/* dropdown profile */}
                {!isSuspended && isProfileOpen && (
                  <div className="absolute left-0 top-full mt-2 w-56 bg-slate-800 rounded-2xl shadow-xl border border-white/10 overflow-hidden z-50">
                    <div className="p-3 border-b border-white/10 flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md overflow-hidden shrink-0">
                        {profileImage || user?.profileImageUrl ? (
                          <img src={profileImage || user?.profileImageUrl || ''} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white text-base font-bold">{getInitial()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{user.fullName}</p>
                        <p className="text-xs text-blue-400 truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="p-1.5">
                      {authLinks.map((link) => (
                        <Link key={link.href} href={link.href} onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition text-gray-300 hover:text-white">
                          <link.icon className="w-4 h-4" />
                          <span className="text-sm">{link.label}</span>
                        </Link>
                      ))}
                      {isAdmin && (
                        <>
                          <div className="border-t border-white/10 my-1.5" />
                          <Link href="/admin/dashboard" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition text-gray-300 hover:text-white">
                            <Shield className="w-4 h-4" />
                            <span className="text-sm">لوحة الأدمن</span>
                          </Link>
                        </>
                      )}
                      <div className="border-t border-white/10 my-1.5" />
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 transition text-red-400">
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm">تسجيل الخروج</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ⭐ دخول + إنشاء حساب — ظاهرين على كل الشاشات */
              <div className="flex gap-2">
                <Link href="/login" prefetch={false}>
                  <button className="px-3 md:px-4 py-2 text-gray-300 hover:text-white font-medium text-xs md:text-sm">دخول</button>
                </Link>
                <Link href="/register" prefetch={false}>
                  <button className="px-3 md:px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md text-xs md:text-sm font-medium hover:from-blue-500 hover:to-blue-600 transition-all">إنشاء حساب</button>
                </Link>
              </div>
            )}

            {/* همبرجر — داخل الناف بار */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition text-white"
              aria-label="القائمة"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-white/10 pb-4">
            {/* روابط التصفح */}
            <div className="pt-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm ${
                    isActive(link.href)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
            </div>

            {/* للمستخدم غير مسجل — إنشاء حساب جوا الهمبرجر */}
            {!isLoggedIn && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <Link href="/register" onClick={() => setIsMenuOpen(false)}>
                  <button className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md text-sm font-medium">
                    إنشاء حساب
                  </button>
                </Link>
              </div>
            )}

            {/* للمستخدم المسجل */}
            {isLoggedIn && !isSuspended && (
              <>
                <div className="border-t border-white/10 my-3" />
                <div className="space-y-1">
                  {authLinks.map((link) => (
                    <Link key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-white/10 hover:text-white transition text-sm">
                      <link.icon className="w-4 h-4" />
                      {link.label}
                    </Link>
                  ))}
                </div>
                <div className="border-t border-white/10 my-3" />
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition text-sm">
                  <LogOut className="w-4 h-4" />
                  تسجيل الخروج
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
