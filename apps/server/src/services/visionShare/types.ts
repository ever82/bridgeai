/**
 * VisionShare Service Types
 * Type definitions for VisionShare server services
 */

import { Photo, PhotoFilter, PhotoStatus } from '../../../shared/types/photo.types';
import {
  PaymentTransaction,
  PaymentRequest,
  PaymentResponse,
  PaymentStatus,
  UnlockedPhotoInfo,
  DownloadAuth,
  RefundRequest,
  RefundResponse,
} from '../../../shared/types/payment.types';

// ============================================================================
// Photo Service Types
// ============================================================================

/** Photo service interface */
export interface IPhotoService {
  /** Get photos by filter with pagination */
  getPhotos(filter: PhotoFilter, page: number, limit: number): Promise<PhotoListResult>;

  /** Get single photo by ID */
  getPhotoById(photoId: string): Promise<Photo | null>;

  /** Get photos by scene ID */
  getPhotosByScene(sceneId: string): Promise<Photo[]>;

  /** Get photos by supplier ID */
  getPhotosBySupplier(supplierId: string): Promise<Photo[]>;

  /** Check if user has unlocked photo */
  isPhotoUnlocked(photoId: string, userId: string): Promise<boolean>;

  /** Get unlocked photos for user */
  getUnlockedPhotos(userId: string): Promise<Photo[]>;

  /** Update photo status */
  updatePhotoStatus(photoId: string, status: PhotoStatus): Promise<Photo>;

  /** Generate thumbnail URLs */
  generateThumbnail(photoId: string, size: 'small' | 'medium' | 'large'): Promise<string>;
}

/** Photo list result */
export interface PhotoListResult {
  photos: Photo[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/** Photo upload result */
export interface PhotoUploadResult {
  photoId: string;
  url: string;
  thumbnailUrl: string;
  status: PhotoStatus;
}

// ============================================================================
// Payment Service Types
// ============================================================================

/** Payment service interface */
export interface IPaymentService {
  /** Process payment for photos */
  processPayment(userId: string, request: PaymentRequest): Promise<PaymentResponse>;

  /** Verify payment password */
  verifyPaymentPassword(userId: string, password: string): Promise<boolean>;

  /** Get transaction by ID */
  getTransaction(transactionId: string): Promise<PaymentTransaction | null>;

  /** Get user transactions */
  getUserTransactions(userId: string, page: number, limit: number): Promise<TransactionListResult>;

  /** Get transaction status */
  getTransactionStatus(transactionId: string): Promise<PaymentStatus>;
}

/** Transaction list result */
export interface TransactionListResult {
  transactions: PaymentTransaction[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// Unlock Service Types
// ============================================================================

/** Unlock service interface */
export interface IUnlockService {
  /** Unlock photos after successful payment */
  unlockPhotos(userId: string, photoIds: string[]): Promise<UnlockedPhotoInfo[]>;

  /** Get unlock info for photo */
  getUnlockInfo(photoId: string, userId: string): Promise<UnlockedPhotoInfo | null>;

  /** Generate download token */
  generateDownloadToken(photoId: string, userId: string): Promise<string>;

  /** Validate download token */
  validateDownloadToken(token: string): Promise<DownloadAuth | null>;

  /** Record download usage */
  recordDownload(token: string): Promise<void>;

  /** Check if download is allowed */
  canDownload(photoId: string, userId: string): Promise<boolean>;
}

// ============================================================================
// Refund Service Types
// ============================================================================

/** Refund service interface */
export interface IRefundService {
  /** Request refund for transaction */
  requestRefund(userId: string, request: RefundRequest): Promise<RefundResponse>;

  /** Get refund status */
  getRefundStatus(refundId: string): Promise<RefundStatus>;

  /** Process refund (admin) */
  processRefund(refundId: string, approved: boolean, reason?: string): Promise<RefundResponse>;

  /** Get user refund requests */
  getUserRefunds(userId: string): Promise<RefundRequest[]>;
}

/** Refund status */
export interface RefundStatus {
  refundId: string;
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  amount: number;
  requestedAt: string;
  resolvedAt?: string;
  reason: string;
  resolutionReason?: string;
}

// ============================================================================
// Credit Service Types
// ============================================================================

/** Credit service interface */
export interface ICreditService {
  /** Get user credit balance */
  getBalance(userId: string): Promise<CreditBalanceResult>;

  /** Deduct credits for payment */
  deductCredits(userId: string, amount: number, transactionId: string): Promise<boolean>;

  /** Refund credits */
  refundCredits(userId: string, amount: number, transactionId: string): Promise<boolean>;

  /** Freeze credits (for pending transactions) */
  freezeCredits(userId: string, amount: number): Promise<boolean>;

  /** Unfreeze credits */
  unfreezeCredits(userId: string, amount: number): Promise<boolean>;
}

/** Credit balance result */
export interface CreditBalanceResult {
  userId: string;
  available: number;
  frozen: number;
  total: number;
  sufficient: boolean;
}

// ============================================================================
// Security Service Types
// ============================================================================

/** Security service interface */
export interface ISecurityService {
  /** Validate payment request */
  validatePaymentRequest(userId: string, request: PaymentRequest): Promise<ValidationResult>;

  /** Check for suspicious activity */
  checkFraudRisk(userId: string, photoIds: string[]): Promise<FraudRiskResult>;

  /** Log security event */
  logSecurityEvent(event: SecurityEvent): Promise<void>;

  /** Verify download authorization */
  verifyDownloadAuth(token: string, userId: string): Promise<boolean>;
}

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Fraud risk result */
export interface FraudRiskResult {
  riskScore: number;
  allowed: boolean;
  reason?: string;
}

/** Security event */
export interface SecurityEvent {
  type: 'payment_attempt' | 'payment_success' | 'payment_failure' | 'download' | 'refund_request';
  userId: string;
  photoId?: string;
  transactionId?: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}
