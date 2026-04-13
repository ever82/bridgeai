import { api } from './client';
import {
  Coupon,
  CouponStatus,
  CreateCouponParams,
  CreateRatingParams,
  CouponRating,
  CouponStatistics,
  CouponTransaction,
} from '../../types/promoCode';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  coupons: T;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const promoCodeApi = {
  // Create a new coupon
  createCoupon: (params: CreateCouponParams): Promise<ApiResponse<Coupon>> =>
    api.post('/v1/promo-codes', params),

  // Get coupon by ID
  getCoupon: (couponId: string): Promise<ApiResponse<Coupon>> =>
    api.get(`/v1/promo-codes/${couponId}`),

  // Get coupon by code
  getCouponByCode: (code: string): Promise<ApiResponse<Coupon>> =>
    api.get(`/v1/promo-codes/code/${code}`),

  // Get consumer's coupons
  getConsumerCoupons: (
    status?: CouponStatus,
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<PaginatedResponse<Coupon[]>>> =>
    api.get('/v1/promo-codes/consumer/my-coupons', {
      params: { status, page, limit },
    }),

  // Get merchant's coupons
  getMerchantCoupons: (
    status?: CouponStatus,
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<PaginatedResponse<Coupon[]>>> =>
    api.get('/v1/promo-codes/merchant/my-coupons', {
      params: { status, page, limit },
    }),

  // Validate QR code (merchant)
  validateQRCode: (qrCodeData: string): Promise<ApiResponse<Coupon>> =>
    api.post('/v1/promo-codes/validate-qr', { qrCodeData }),

  // Redeem coupon (offline mode)
  redeemCoupon: (qrCodeData: string): Promise<ApiResponse<Coupon>> =>
    api.post('/v1/promo-codes/redeem', { qrCodeData }),

  // Use coupon online
  useCouponOnline: (
    couponId: string,
    paymentMethod: string,
    pointsUsed?: number
  ): Promise<ApiResponse<{ coupon: Coupon; transaction: CouponTransaction }>> =>
    api.post('/v1/promo-codes/use-online', {
      couponId,
      paymentMethod,
      pointsUsed,
    }),

  // Cancel coupon
  cancelCoupon: (couponId: string): Promise<ApiResponse<Coupon>> =>
    api.post(`/v1/promo-codes/${couponId}/cancel`),

  // Get online payment URL
  getOnlineUrl: (couponId: string): Promise<ApiResponse<{
    onlineUrl: string;
    couponCode: string;
    discountPrice: number;
    validUntil: string;
  }>> =>
    api.get(`/v1/promo-codes/${couponId}/online-url`),

  // Create rating
  createRating: (params: CreateRatingParams): Promise<ApiResponse<CouponRating>> =>
    api.post('/v1/promo-codes/ratings', params),

  // Get ratings for a coupon
  getCouponRatings: (couponId: string): Promise<ApiResponse<CouponRating[]>> =>
    api.get(`/v1/promo-codes/${couponId}/ratings`),

  // Get my ratings (as ratee)
  getMyRatings: (): Promise<ApiResponse<CouponRating[]>> =>
    api.get('/v1/promo-codes/ratings/my'),

  // Get coupon statistics (consumer)
  getStatistics: (): Promise<ApiResponse<CouponStatistics>> =>
    api.get('/v1/promo-codes/statistics'),

  // Get merchant coupon statistics
  getMerchantStatistics: (): Promise<ApiResponse<CouponStatistics>> =>
    api.get('/v1/promo-codes/merchant/statistics'),
};

export default promoCodeApi;
