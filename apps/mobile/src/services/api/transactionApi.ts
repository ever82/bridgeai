/**
 * Transaction API Service
 * 交易记录与退款申诉 API
 */

import { api } from './client';

export interface TransactionItem {
  id: string;
  userId: string;
  amount: number;
  type: string;
  status: string;
  description: string | null;
  referenceId: string | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionListData {
  transactions: TransactionItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TransactionStats {
  totalCount: number;
  totalIncome: number;
  totalExpense: number;
  totalRefund: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
}

export interface TransactionDetail extends TransactionItem {
  refund: {
    id: string;
    reason: string;
    status: string;
    refundAmount: number;
    pointsRefunded: boolean;
    createdAt: string;
  } | null;
}

export interface RefundItem {
  id: string;
  transactionId: string;
  userId: string;
  reason: string;
  details: string | null;
  evidence: unknown;
  status: string;
  refundAmount: number;
  pointsRefunded: boolean;
  reviewedBy: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  transaction?: {
    id: string;
    amount: number;
    type: string;
    description: string | null;
    createdAt: string;
  };
}

export interface RefundListData {
  refunds: RefundItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RefundDetail extends RefundItem {
  transaction: {
    id: string;
    amount: number;
    type: string;
    status: string;
    description: string | null;
    createdAt: string;
  };
  appeals: {
    id: string;
    reason: string;
    evidence: unknown;
    status: string;
    reviewNote: string | null;
    createdAt: string;
  }[];
}

export interface AppealItem {
  id: string;
  refundId: string;
  userId: string;
  reason: string;
  evidence: unknown;
  status: string;
  reviewedBy: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const transactionApi = {
  /**
   * Get transaction list
   */
  getTransactions: (params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: TransactionListData }> =>
    api.get('/v1/transactions', { params }),

  /**
   * Get transaction stats
   */
  getStats: (): Promise<{ success: boolean; data: TransactionStats }> =>
    api.get('/v1/transactions/stats'),

  /**
   * Get transaction detail
   */
  getDetail: (id: string): Promise<{ success: boolean; data: TransactionDetail }> =>
    api.get(`/v1/transactions/${id}`),

  /**
   * Export transactions
   */
  exportTransactions: (params?: {
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: { transactions: TransactionItem[] } }> =>
    api.get('/v1/transactions/export', { params }),

  /**
   * Create refund request
   */
  createRefund: (data: {
    transactionId: string;
    reason: string;
    details?: string;
    evidence?: string[];
  }): Promise<{ success: boolean; data: { id: string; status: string; refundAmount: number } }> =>
    api.post('/v1/transactions/refunds', data),

  /**
   * Get refund list
   */
  getRefunds: (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{ success: boolean; data: RefundListData }> =>
    api.get('/v1/transactions/refunds', { params }),

  /**
   * Get refund detail with appeals
   */
  getRefundDetail: (refundId: string): Promise<{ success: boolean; data: RefundDetail }> =>
    api.get(`/v1/transactions/refunds/${refundId}`),

  /**
   * Cancel a pending refund
   */
  cancelRefund: (
    refundId: string
  ): Promise<{ success: boolean; data: { id: string; status: string } }> =>
    api.post(`/v1/transactions/refunds/${refundId}/cancel`),

  /**
   * Create appeal for rejected refund
   */
  createAppeal: (data: {
    refundId: string;
    reason: string;
    evidence?: string[];
  }): Promise<{ success: boolean; data: AppealItem }> =>
    api.post(`/v1/transactions/refunds/${data.refundId}/appeals`, {
      reason: data.reason,
      evidence: data.evidence,
    }),
};

export default transactionApi;
