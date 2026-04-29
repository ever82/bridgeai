/**
 * Payment Security Service (支付安全与风控)
 *
 * Implements ISecurityService for VisionShare payment security:
 * - Payment behavior risk detection (支付行为风控检测)
 * - Abnormal transaction alerting (异常交易预警)
 * - Payment limit control (支付限额控制)
 */
import type { PaymentRequest } from '../../../shared/types/payment.types';
import type { ValidationResult, FraudRiskResult, SecurityEvent } from './types';
declare const RISK_CONFIG: {
    readonly maxPaymentsPerMinute: 5;
    readonly maxPaymentsPerHour: 20;
    readonly maxPaymentsPerDay: 50;
    readonly maxSinglePaymentAmount: 10000;
    readonly maxDailyPaymentAmount: 50000;
    readonly maxMonthlyPaymentAmount: 200000;
    readonly sameAmountThreshold: 3;
    readonly lowRiskThreshold: 30;
    readonly mediumRiskThreshold: 60;
    readonly highRiskThreshold: 80;
    readonly minAccountAgeForHighValue: 7;
    readonly highValueThreshold: 5000;
    readonly failureCooldownMs: 60000;
    readonly maxFailuresBeforeCooldown: 3;
};
export interface PaymentSecurityEvent {
    id: string;
    type: 'PAYMENT_BLOCKED' | 'FRAUD_DETECTED' | 'LIMIT_EXCEEDED' | 'VELOCITY_WARNING' | 'AMOUNT_ANOMALY' | 'SUSPICIOUS_PATTERN' | 'PAYMENT_ALLOWED' | 'COOLDOWN_ACTIVE';
    userId: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    details: Record<string, unknown>;
    timestamp: Date;
}
export interface PaymentRiskAssessment {
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    allowed: boolean;
    reasons: string[];
    checks: RiskCheckResult[];
}
export interface RiskCheckResult {
    check: string;
    passed: boolean;
    score: number;
    reason?: string;
}
export interface PaymentLimitInfo {
    userId: string;
    dailySpent: number;
    dailyLimit: number;
    monthlySpent: number;
    monthlyLimit: number;
    singleLimit: number;
    remainingDaily: number;
    remainingMonthly: number;
}
/**
 * Validate a payment request before processing
 */
export declare function validatePaymentRequest(userId: string, request: PaymentRequest): Promise<ValidationResult>;
/**
 * Check fraud risk for a payment attempt
 * Returns risk assessment with score and decision
 */
export declare function checkFraudRisk(userId: string, photoIds: string[], amount: number): Promise<FraudRiskResult>;
/**
 * Full risk assessment for a payment
 */
export declare function assessRisk(userId: string, amount: number): Promise<PaymentRiskAssessment>;
/**
 * Record a successful payment
 */
export declare function recordSuccessfulPayment(userId: string, amount: number): void;
/**
 * Record a failed payment attempt
 */
export declare function recordFailedPayment(userId: string, amount: number): void;
/**
 * Log a security event (implements ISecurityService)
 */
export declare function logSecurityEvent(event: SecurityEvent): Promise<void>;
/**
 * Get payment limits info for a user
 */
export declare function getPaymentLimits(userId: string): Promise<PaymentLimitInfo>;
/**
 * Get security events with optional filters.
 *
 * Returns events from the in-memory cache. Events are also persisted to the
 * `audit_logs` table by logEvent(), so data survives server restarts.
 * For historical queries beyond the in-memory window, use getSecurityEventsFromDB().
 */
export declare function getSecurityEvents(filters?: {
    userId?: string;
    type?: PaymentSecurityEvent['type'];
    severity?: string;
    since?: Date;
    limit?: number;
}): PaymentSecurityEvent[];
/**
 * Get security events from the database (persistent audit trail).
 * Use for historical queries that may go beyond the in-memory cache window.
 */
export declare function getSecurityEventsFromDB(filters?: {
    userId?: string;
    type?: PaymentSecurityEvent['type'];
    severity?: string;
    since?: Date;
    limit?: number;
}): Promise<PaymentSecurityEvent[]>;
/**
 * Get risk config (for admin/monitoring)
 */
export declare function getRiskConfig(): typeof RISK_CONFIG;
/**
 * Clear tracking data for a user (for testing)
 */
export declare function clearUserData(userId: string): void;
/**
 * Clear all tracking data (for testing)
 */
export declare function clearAllData(): void;
export {};
//# sourceMappingURL=paymentSecurityService.d.ts.map