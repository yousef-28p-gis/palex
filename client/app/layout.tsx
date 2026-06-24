import './globals.css';
import { ClientLayout } from './ClientLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PALEX | منصة تداول P2P',
  description: 'منصة التداول الأولى في فلسطين — نظام Escrow يضمن حقوقك في كل صفقة',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="m-0 p-0 w-full bg-slate-900 overflow-x-hidden" suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
