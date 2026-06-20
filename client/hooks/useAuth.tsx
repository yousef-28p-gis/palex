'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from 'react';
import { authApi, LoginData, RegisterData } from '@/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: string;
  kycStatus: string;
  trustLevel: string;
  totalTrades: number;
  successRate: number;
  averageRating: number;
  trc20Wallet?: string;
  bscWallet?: string;
  isSuspended: boolean;
  suspensionReason?: string;
  suspendedUntil?: string;
  createdAt: string;
  profileImageUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginData, redirectTo?: string) => Promise<void>;
  register: (data: RegisterData, redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const isFetchingRef = useRef(false);
  const initialFetchDone = useRef(false);

  // ✅ دالة جلب المستخدم - تُستدعى مرة واحدة فقط
  const fetchUser = useCallback(async (): Promise<User | null> => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setUser(null);
      return null;
    }
    
    if (isFetchingRef.current) {
      return user;
    }
    
    isFetchingRef.current = true;
    
    try {
      const response = await authApi.getMe();
      setUser(response.data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch user:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('accessToken');
        setUser(null);
      }
      if (error.response?.status === 403) {
        const errorMessage = error.response?.data?.message || 'حسابك موقوف';
        setUser({
          id: 'suspended',
          email: '',
          fullName: '',
          phone: '',
          role: 'user',
          kycStatus: 'none',
          trustLevel: 'new_trader',
          totalTrades: 0,
          successRate: 0,
          averageRating: 0,
          isSuspended: true,
          suspensionReason: errorMessage,
          createdAt: new Date().toISOString(),
        } as User);
        return null;
      }
      return user;
    } finally {
      isFetchingRef.current = false;
    }
  }, [user]);

  // ✅ التحميل الأولي - مرة واحدة فقط عند بدء التطبيق
  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
    
    const initAuth = async () => {
      setIsLoading(true);
      await fetchUser();
      setIsLoading(false);
    };
    initAuth();
  }, [fetchUser]);

  const login = async (data: LoginData, redirectTo?: string) => {
    setIsLoading(true);
    
    try {
      const response = await authApi.login(data);
      const { accessToken, user: userData } = response.data;
      
      if (userData.isSuspended) {
        toast.error(userData.suspensionReason || 'حسابك موقوف. لا يمكنك تسجيل الدخول.', {
          duration: 5000,
        });
        return;
      }
      
      localStorage.setItem('accessToken', accessToken);
      setUser(userData);
      
      toast.success('تم تسجيل الدخول بنجاح');
      
      const targetPath = redirectTo || '/dashboard';
      router.push(targetPath);
    } catch (error: any) {
      const message = error.response?.data?.message || 'فشل تسجيل الدخول';
      toast.error(message, { duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData, redirectTo?: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.register(data);
      const { accessToken, user: userData } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      setUser(userData);
      
      toast.success('تم إنشاء الحساب بنجاح');
      
      const targetPath = redirectTo || '/dashboard';
      router.push(targetPath);
    } catch (error: any) {
      const message = error.response?.data?.message || 'فشل إنشاء الحساب';
      toast.error(message, { duration: 5000 });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // تجاهل الخطأ
    }
    localStorage.removeItem('accessToken');
    setUser(null);
    toast.success('تم تسجيل الخروج');
    router.push('/');
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const isAuthenticated = !!user && !user.isSuspended;

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading, 
        isAuthenticated, 
        login, 
        register, 
        logout, 
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};