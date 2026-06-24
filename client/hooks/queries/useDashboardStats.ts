import { useQuery } from '@tanstack/react-query';
import { tradesApi, userApi } from '@/lib/api';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const [profileRes, tradesRes] = await Promise.all([
        userApi.getProfile(),
        tradesApi.getUserTrades({ page: 1, limit: 100 })
      ]);

      const userData = profileRes.data;
      const userTrades = tradesRes.data.data || [];
      
      const completedTrades = userTrades.filter((t: any) => t.status === 'completed');
      const pendingTrades = userTrades.filter((t: any) => 
        ['active', 'waiting_seller_deposit', 'waiting_seller_confirmation'].includes(t.status)
      );
      
      const totalVolume = completedTrades.reduce((sum: number, t: any) => sum + Number(t.amountUsdt), 0);
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthTrades = userTrades.filter((t: any) => new Date(t.createdAt) >= startOfMonth);
      
      const completedCount = userData.totalTrades || completedTrades.length;
      let currentLevel = 'مستجد';
      let nextLevel = 'موثوق';
      let tradesToNextLevel = 50;
      
      if (completedCount >= 200) {
        currentLevel = 'تاجر نخبة';
        nextLevel = 'لا يوجد';
        tradesToNextLevel = 0;
      } else if (completedCount >= 100) {
        currentLevel = 'تاجر محترف';
        nextLevel = 'تاجر نخبة';
        tradesToNextLevel = 200 - completedCount;
      } else if (completedCount >= 50) {
        currentLevel = 'موثوق';
        nextLevel = 'تاجر محترف';
        tradesToNextLevel = 100 - completedCount;
      } else {
        currentLevel = 'مستجد';
        nextLevel = 'موثوق';
        tradesToNextLevel = 50 - completedCount;
      }

      return {
        user: userData,
        trades: userTrades,
        stats: {
          totalTrades: userData.totalTrades || completedTrades.length,
          successRate: userData.successRate || 0,
          averageRating: userData.averageRating || 0,
          totalVolume,
          pendingTrades: pendingTrades.length,
          completedThisMonth: thisMonthTrades.length,
        },
      };
    },
  });
}