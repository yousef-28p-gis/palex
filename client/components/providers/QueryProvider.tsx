'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: (failureCount, error: any) => {
          // ✅ لا تعيد المحاولة لـ 429
          if (error?.response?.status === 429) {
            return false;
          }
          // ✅ للمسارات العامة، محاولة واحدة فقط
          if (error?.config?.url?.includes('/rates/')) {
            return false;
          }
          // ✅ لطلبات المصادقة، محاولة واحدة فقط
          if (error?.config?.url?.includes('/auth/')) {
            return false;
          }
          return failureCount < 1;
        },
        retryDelay: 5000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}