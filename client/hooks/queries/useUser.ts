import { useQuery } from '@tanstack/react-query';
import { userApi } from '@/lib/api';

export function useUserProfile() {
  return useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const { data } = await userApi.getProfile();
      return data;
    },
  });
}

export function useUserWallets() {
  return useQuery({
    queryKey: ['userWallets'],
    queryFn: async () => {
      const { data } = await userApi.getProfile();
      return {
        trc20Wallet: data.trc20Wallet,
        bscWallet: data.bscWallet,
      };
    },
  });
}