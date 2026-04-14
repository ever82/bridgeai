/**
 * VisionShare Payment Types
 * Shared types for credit payment and transaction functionality
 */

import { Photo } from './photo.types';

/** Payment transaction record */
export interface PaymentTransaction {
  id: string;
  userId: string;
  photoId: string;
  sceneId: string;
  amount: number;
  currency: 'credits';
  status: PaymentStatus;
  type: TransactionType;
  metadata: TransactionMetadata;
  createdAt: string;
  completedAt?: string;
}

/** Payment status enum */
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed',
}

/** Transaction type enum */
export enum TransactionType {
  PURCHASE = 'purchase',
  REFUND = 'refund',
  BONUS = 'bonus',
  ADJUSTMENT = 'adjustment',
}

/** Transaction metadata */
export interface TransactionMetadata {
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  paymentMethod?: string;
  receiptUrl?: string;
  refundReason?: string;
  disputeReason?: string;
}

/** Payment request payload */
export interface PaymentRequest {
  photoIds: string[];
  totalAmount: number;
  password: string;
  metadata?: PaymentRequestMetadata;
}

/** Payment request metadata */
export interface PaymentRequestMetadata {
  source: 'gallery' | 'preview' | 'cart';
  couponCode?: string;
  discountAmount?: number;
}

/** Payment response */
export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  remainingBalance: number;
  unlockedPhotos: UnlockedPhotoInfo[];
  error?: PaymentError;
}

/** Unlocked photo information */
export interface UnlockedPhotoInfo {
  photoId: string;
  hdUrl: string;
  downloadToken: string;
  expiresAt: string;
  downloadLimit: number;
  downloadsRemaining: number;
}

/** Payment error details */
export interface PaymentError {
  code: string;
  message: string;
  field?: string;
}

/** User credit balance */
export interface CreditBalance {
  userId: string;
  available: number;
  frozen: number;
  total: number;
  currency: 'credits';
  updatedAt: string;
}

/** Payment confirmation details */
export interface PaymentConfirmation {
  transactionId: string;
  photoCount: number;
  totalAmount: number;
  balanceAfter: number;
  timestamp: string;
}

/** Refund request */
export interface RefundRequest {
  transactionId: string;
  reason: string;
  details?: string;
  evidence?: string[];
}

/** Refund response */
export interface RefundResponse {
  success: boolean;
  refundId?: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  estimatedResolutionAt?: string;
}

/** Download authorization */
export interface DownloadAuth {
  token: string;
  photoId: string;
  userId: string;
  expiresAt: string;
  maxDownloads: number;
  usedDownloads: number;
}
