/**
 * Payment Service Types
 * Type definitions for payment server services
 */

// Local type stubs for payment types (shared module not available)
export interface PaymentTransaction {
  id: string;
  userId: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRequest {
  userId: string;
  amount: number;
  currency: string;
  type: string;
  description?: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export interface PaymentError {
  code: string;
  message: string;
  details?: string;
}

export interface CreditBalance {
  available: number;
  frozen: number;
  total: number;
}

export interface PaymentConfirmation {
  transactionId: string;
  confirmedAt: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Core Payment Service
// ============================================================================

/** Credit payment service interface */
export interface ICreditPaymentService {
  /** Process credit payment */
  processPayment(userId: string, request: PaymentRequest): Promise<PaymentProcessResult>;

  /** Verify payment password */
  verifyPassword(userId: string, password: string): Promise<boolean>;

  /** Get payment status */
  getPaymentStatus(transactionId: string): Promise<PaymentStatus>;

  /** Get payment confirmation */
  getConfirmation(transactionId: string): Promise<PaymentConfirmation | null>;

  /** Cancel pending payment */
  cancelPayment(transactionId: string): Promise<boolean>;
}

/** Payment process result */
export interface PaymentProcessResult {
  success: boolean;
  transactionId?: string;
  error?: PaymentError;
  remainingBalance?: number;
}

// ============================================================================
// Transaction Service
// ============================================================================

/** Transaction service interface */
export interface ITransactionService {
  /** Create transaction record */
  createTransaction(userId: string, request: PaymentRequest): Promise<PaymentTransaction>;

  /** Update transaction status */
  updateTransactionStatus(
    transactionId: string,
    status: PaymentStatus,
    metadata?: Record<string, unknown>
  ): Promise<PaymentTransaction>;

  /** Get transaction by ID */
  getTransaction(transactionId: string): Promise<PaymentTransaction | null>;

  /** Get user transactions with pagination */
  getUserTransactions(
    userId: string,
    options: TransactionQueryOptions
  ): Promise<TransactionQueryResult>;

  /** Get transaction statistics */
  getTransactionStats(userId: string): Promise<TransactionStats>;
}

/** Transaction query options */
export interface TransactionQueryOptions {
  page: number;
  limit: number;
  type?: 'purchase' | 'refund' | 'bonus' | 'adjustment' | 'all';
  status?: PaymentStatus | 'all';
  startDate?: string;
  endDate?: string;
}

/** Transaction query result */
export interface TransactionQueryResult {
  transactions: PaymentTransaction[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/** Transaction statistics */
export interface TransactionStats {
  totalCount: number;
  totalSpent: number;
  totalRefunded: number;
  averageTransaction: number;
  thisMonthSpent: number;
  thisMonthCount: number;
}

// ============================================================================
// Credit Balance Service
// ============================================================================

/** Credit balance service interface */
export interface ICreditBalanceService {
  /** Get user credit balance */
  getBalance(userId: string): Promise<CreditBalance>;

  /** Check if user has sufficient credits */
  hasSufficientCredits(userId: string, amount: number): Promise<boolean>;

  /** Deduct credits from user account */
  deductCredits(userId: string, amount: number, transactionId: string): Promise<DeductResult>;

  /** Add credits to user account */
  addCredits(userId: string, amount: number, reason: string): Promise<AddResult>;

  /** Freeze credits (for pending transactions) */
  freezeCredits(userId: string, amount: number): Promise<FreezeResult>;

  /** Unfreeze credits */
  unfreezeCredits(userId: string, amount: number): Promise<UnfreezeResult>;
}

/** Deduct result */
export interface DeductResult {
  success: boolean;
  newBalance?: number;
  error?: string;
}

/** Add result */
export interface AddResult {
  success: boolean;
  newBalance?: number;
  error?: string;
}

/** Freeze result */
export interface FreezeResult {
  success: boolean;
  frozenAmount?: number;
  error?: string;
}

/** Unfreeze result */
export interface UnfreezeResult {
  success: boolean;
  availableAmount?: number;
  error?: string;
}

// ============================================================================
// Payment Validation Service
// ============================================================================

/** Payment validation service interface */
export interface IPaymentValidationService {
  /** Validate payment request */
  validateRequest(userId: string, request: PaymentRequest): Promise<ValidationResult>;

  /** Validate payment password */
  validatePassword(userId: string, password: string): Promise<PasswordValidationResult>;

  /** Validate photo IDs for payment */
  validatePhotoIds(photoIds: string[]): Promise<PhotoValidationResult>;
}

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Password validation result */
export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
  attemptsRemaining?: number;
}

/** Photo validation result */
export interface PhotoValidationResult {
  valid: boolean;
  errors: string[];
  invalidPhotoIds?: string[];
  alreadyUnlocked?: string[];
  totalAmount?: number;
}

// ============================================================================
// Payment Notification Service
// ============================================================================

/** Payment notification service interface */
export interface IPaymentNotificationService {
  /** Send payment success notification */
  notifyPaymentSuccess(userId: string, transactionId: string, amount: number): Promise<void>;

  /** Send payment failure notification */
  notifyPaymentFailure(userId: string, error: PaymentError): Promise<void>;

  /** Send balance low warning */
  notifyBalanceLow(userId: string, balance: number): Promise<void>;

  /** Send refund notification */
  notifyRefundProcessed(userId: string, transactionId: string, amount: number): Promise<void>;
}
