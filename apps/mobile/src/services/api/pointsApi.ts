/**
 * Points API client
 * Handles points wallet, transactions, and payment operations
 */

import { api } from './client';
import type {
  PointsAccountResponse,
  PointsTransactionListResponse,
  PointsTransaction,
  PointsStatistics,
} from '@visionshare/shared';

export interface PointsBalanceResponse {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  lastUpdatedAt: string;
}

export interface TransactionFilterParams {
  page?: number;
  pageSize?: number;
  type?: string;
  scene?: string;
  startDate?: string;
  endDate?: string;
}

export interface TransactionDetailResponse {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description?: string;
  scene?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PhotoPaymentRequest {
  photoId: string;
  photographerUserId: string;
  points: number;
}

export interface PhotoPaymentResponse {
  success: boolean;
  transactionId?: string;
  photoUrl?: string;
  unlockToken?: string;
  error?: string;
}

export interface BalanceCheckRequest {
  photoId: string;
}

export interface BalanceCheckResponse {
  sufficient: boolean;
  currentBalance: number;
  requiredPoints: number;
}

export interface PhotoUnlockRequest {
  photoId: string;
  transactionId: string;
}

export interface PhotoUnlockResponse {
  success: boolean;
  photoUrl: string;
  unlockToken: string;
  expiresAt: string;
}

export const pointsApi = {
  // ==================== Balance ====================

  /**
   * Get current user's points balance
   */
  getBalance: (): Promise<PointsBalanceResponse> =>
    api.get<PointsBalanceResponse>('/v1/points/balance').then((r) => r.data.data),

  // ==================== Transactions ====================

  /**
   * Get transaction history with filters
   */
  getTransactions: (params?: TransactionFilterParams): Promise<PointsTransactionListResponse> =>
    api
      .get<PointsTransactionListResponse>('/v1/points/transactions', { params })
      .then((r) => r.data.data),

  /**
   * Get single transaction detail
   */
  getTransaction: (id: string): Promise<TransactionDetailResponse> =>
    api.get<TransactionDetailResponse>(`/v1/points/transactions/${id}`).then((r) => r.data.data),

  /**
   * Get points statistics
   */
  getStats: (): Promise<PointsStatistics> =>
    api.get<PointsStatistics>('/v1/points/stats').then((r) => r.data.data),

  // ==================== VisionShare Payment ====================

  /**
   * Check if user has sufficient balance for photo payment
   */
  checkBalance: (params: BalanceCheckRequest): Promise<BalanceCheckResponse> =>
    api.get<BalanceCheckResponse>('/v1/points/vs/balance-check', { params }).then(
      (r) => r.data.data
    ),

  /**
   * Pay for a photo in VisionShare scene
   */
  payPhoto: (data: PhotoPaymentRequest): Promise<PhotoPaymentResponse> =>
    api.post<PhotoPaymentResponse>('/v1/points/vs/pay-photo', data).then((r) => r.data.data),

  /**
   * Unlock a photo after payment
   */
  unlockPhoto: (data: PhotoUnlockRequest): Promise<PhotoUnlockResponse> =>
    api.post<PhotoUnlockResponse>('/v1/points/vs/unlock-photo', data).then((r) => r.data.data),
};
