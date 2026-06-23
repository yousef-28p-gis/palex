// ==================== User Types ====================
export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: 'user' | 'support_admin' | 'kyc_admin' | 'finance_admin' | 'super_admin';
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected' | 'advanced' | 'pro';
  trustLevel: 'new_trader' | 'trusted_trader' | 'professional' | 'elite' | 'suspended';
  totalTrades: number;
  successRate: number;
  averageRating: number;
  trc20Wallet: string | null;
  bscWallet: string | null;
  isSuspended: boolean;
  createdAt: string;
  emailVerified: boolean;
}

// ==================== Offer Types ====================
export interface Offer {
  id: string;
  sellerId: string;
  seller: {
    id: string;
    fullName: string;
    averageRating: number;
    totalTrades: number;
    trustLevel: string;
    kycStatus: string;
    profileImageUrl?: string;
    workHoursStart?: string;
    workHoursEnd?: string;
    workDays?: number[];
    isActiveNow?: boolean;
    lastSeenAt?: string;
  };
  price: number;
  fiatCurrency: 'ils' | 'usd';
  minAmount: number;
  maxAmount: number;
  network: 'trc20' | 'bep20';
  paymentInstructions: string;
  status: 'active' | 'paused' | 'expired';
    premiumPercent?: number;  // ✅ أضف هذا
  escrowBalance: number;
  reservedBalance: number;
  availableBalance: number;
  createdAt: string;
}

// ==================== Trade Types ====================
export interface Trade {
  id: string;
  tradeReference: string;
  sellerId: string;
  buyerId: string;
  seller: {
    id: string;
    fullName: string;
    phone: string;
  };
  buyer: {
    id: string;
    fullName: string;
    phone: string;
  };
  offerId: string;
  amountUsdt: number;
  pricePerUsdt: number;
  totalFiat: number;
  fiatCurrency: 'ils' | 'usd';
  network: 'trc20' | 'bep20';
  status: 'waiting_seller_deposit' | 'active' | 'waiting_seller_confirmation' | 'completed' | 'cancelled' | 'dispute_opened' | 'expired';
  escrowAddress: string | null;
  platformFee: number;
  networkFee: number;
  netAmountToBuyer: number;
  sellerDepositTxHash: string | null;
  releaseTxHash: string | null;
  expiresAt: string | null;
  completedAt: string | null;
  createdAt: string;
  paymentProof?: PaymentProof;
  dispute?: Dispute;
}

// ==================== Payment Proof Types ====================
export interface PaymentProof {
  id: string;
  tradeId: string;
  imageUrl: string;
  transactionRef: string;
  bankName: string;
  last4Digits: string;
  createdAt: string;
}

export interface SubmitProofData {
  imageUrl: string;
  transactionRef: string;
  bankName: string;
  last4Digits: string;
}

// ==================== Dispute Types ====================
export interface Dispute {
  id: string;
  tradeId: string;
  openedByUserId: string;
  openedBy: {
    id: string;
    fullName: string;
  };
  reason: string;
  description: string;
  evidenceUrls: string[];
  status: 'opened' | 'under_review' | 'resolved';
  resolution: string | null;
  resolutionNotes: string | null;
  evidenceDeadline: string | null;
  resolvedBy: {
    id: string;
    fullName: string;
  } | null;
  resolvedAt: string | null;
  createdAt: string;
}

// ==================== KYC Types ====================
export interface KycRequest {
  id: string;
  fullName: string;
  nationalId: string;
  governorate: string;
  idFrontImage: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
}

// ==================== Dashboard Types ====================
export interface DashboardStats {
  totalTrades: number;
  successRate: number;
  averageRating: number;
  totalVolume: number;
  pendingTrades: number;
  completedThisMonth: number;
}

export interface TrustLevelInfo {
  currentLevel: string;
  nextLevel: string;
  tradesToNextLevel: number;
  currentTrades: number;
}

// ==================== API Response Types ====================
export interface ApiResponse<T> {
  success?: boolean;
  data: T;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==================== Session Types ====================
export interface Session {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
  ip: string;
}