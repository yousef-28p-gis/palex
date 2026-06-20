// ===== FILE: c:\Users\PC\Desktop\p2p-frontend-only\next.config.js =====
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
  },
});

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['flagcdn.com', 'cryptologos.cc', 'localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cryptologos.cc',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // إلغاء i18n مؤقتاً لتجنب أي تعقيد (يمكن إعادته لاحقاً)
  // i18n: {
  //   locales: ['ar', 'en'],
  //   defaultLocale: 'ar',
  //   localeDetection: false,
  // },
};

module.exports = nextConfig;

module.exports = withBundleAnalyzer(withPWA(nextConfig));