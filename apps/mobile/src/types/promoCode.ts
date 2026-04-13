export enum CouponStatus {
  ACTIVE = 'ACTIVE',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  DISABLED = 'DISABLED',
}

export interface Merchant {
  id: string;
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
}

export interface Offer {
  id: string;
  title: string;
  description?: string;
  images?: string[];
}

export interface Coupon {
  id: string;
  code: string;
  offerId: string;
  merchantId: string;
  consumerId: string;
  originalPrice: number;
  discountPrice: number;
  discountAmount: number;
  status: CouponStatus;
  maxUsageCount: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  usedAt?: string;
  qrCodeData?: string;
  onlineUrl?: string;
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations
  merchant: Merchant;
  offer: Offer;
}

export interface CouponTransaction {
  id: string;
  couponId: string;
  consumerId: string;
  merchantId: string;
  amount: number;
  pointsUsed: number;
  paymentMethod: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  completedAt?: string;
  createdAt: string;
}

export interface CouponRating {
  id: string;
  couponId: string;
  raterId: string;
  rateeId: string;
  raterType: 'CONSUMER' | 'MERCHANT';
  score: number;
  comment?: string;
  createdAt: string;
}

export interface CreateCouponParams {
  offerId: string;
  merchantId: string;
  originalPrice: number;
  discountPrice: number;
  validHours?: number;
  maxUsageCount?: number;
  negotiationId?: string;
  onlineUrl?: string;
}

export interface CreateRatingParams {
  couponId: string;
  rateeId: string;
  raterType: 'CONSUMER' | 'MERCHANT';
  score: number;
  comment?: string;
}

export interface CouponStatistics {
  totalCoupons: number;
  activeCoupons: number;
  usedCoupons: number;
  expiredCoupons: number;
  totalDiscount: number;
  totalTransactions: number;
  conversionRate: number;
}
