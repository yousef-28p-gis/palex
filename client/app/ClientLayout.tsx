'use client';

import { usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AuthProvider } from '@/hooks/useAuth';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { FloatingTradesButton } from '@/components/ui/FloatingTradesButton';
import { RatesBar } from '@/components/ui/RatesBar';
import { useEffect } from 'react';
import SoundManager from '@/lib/soundManager';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/reset-password';

  useEffect(() => {
    if (isAuthPage) return;
    SoundManager.preload();

    const unlock = () => SoundManager.unlock();
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });

    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, [isAuthPage]);

  return (
    <QueryProvider>
      <AuthProvider>
        <div className="relative">
          <Navbar />
        </div>
        {pathname !== '/' && !isAuthPage && <RatesBar />}
        <main className="m-0 p-0 w-full">
          {children}
        </main>
        <Footer />
        {!isAuthPage && (
          <>
            <FloatingTradesButton />
            <WhatsAppButton />
          </>
        )}
        <Toaster position="top-center" />
      </AuthProvider>
    </QueryProvider>
  );
}
