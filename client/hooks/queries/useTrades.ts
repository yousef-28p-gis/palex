import { useQuery } from '@tanstack/react-query';
import { tradesApi } from '@/lib/api';

export function useUserTrades(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: ['userTrades', params],
    queryFn: async () => {
      const { data } = await tradesApi.getUserTrades(params);
      return {
        trades: data.data,
        meta: data.meta as { totalPages: number; currentPage: number; total: number },
      };
    },
  });
}

export function useTrade(tradeId: string) {
  return useQuery({
    queryKey: ['trade', tradeId],
    queryFn: async () => {
      const { data } = await tradesApi.get(tradeId);
      return data;
    },
    enabled: !!tradeId,
  });
}