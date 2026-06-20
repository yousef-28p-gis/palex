'use client';

import { usePathname } from 'next/navigation';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AuthProvider } from '@/hooks/useAuth';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { RatesBar } from '@/components/ui/RatesBar';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/reset-password';
  
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-gray-50">
        <QueryProvider>
          <AuthProvider>
            <Navbar />
            {!isAuthPage && <RatesBar />}
            <main className="min-h-screen">
              {children}
            </main>
            <Footer />
            <WhatsAppButton />
            <Toaster position="top-center" />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}