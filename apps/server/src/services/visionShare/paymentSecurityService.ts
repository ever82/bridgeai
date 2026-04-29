/**
 * Payment Security Service (支付安全与风控)
 *
 * Implements ISecurityService for VisionShare payment security:
 * - Payment behavior risk detection (支付行为风控检测)
 * - Abnormal transaction alerting (异常交易预警)
 * - Payment limit control (支付限额控制)
 */

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import type { PaymentRequest } from '../../../shared/types/payment.types';

import type { ValidationResult, FraudRiskResult, SecurityEvent } from './types';

// ============================================================================
// Configuration
// ============================================================================

const RISK_CONFIG = {
  // Payment velocity limits
  maxPaymentsPerMinute: 5,
  maxPaymentsPerHour: 20,
  maxPaymentsPerDay: 50,

  // Amount limits
  maxSinglePaymentAmount: 10000, // 单笔最大积分
  maxDailyPaymentAmount: 50000, // 单日最大积分
  maxMonthlyPaymentAmount: 200000, // 单月最大积分

  // Suspicious amount thresholds (same amount repeated)
  sameAmountThreshold: 3, // 同一金额出现次数阈值

  // Risk score thresholds
  lowRiskThreshold: 30,
  mediumRiskThreshold: 60,
  highRiskThreshold: 80,

  // Account age requirement (days) for high-value payments
  minAccountAgeForHighValue: 7,
  highValueThreshold: 5000,

  // Cooldown after failed payment attempts (ms)
  failureCooldownMs: 60_000,
  maxFailuresBeforeCooldown: 3,
} as const;

// In-memory caches for read-through performance (backed by database)
const paymentAttempts = new Map<string, number[]>(); // userId -> timestamps
const failedAttempts = new Map<string, number[]>(); // userId -> timestamps
const amountHistory = new Map<string, number[]>(); // userId -> recent amounts
const securityEventLog: PaymentSecurityEvent[] = [];
const MAX_EVENT_LOG = 5000;

// Category constants for database persistence
type RiskStateCategory = 'payment_attempts' | 'failed_attempts' | 'amount_history';

// Map category to the corresponding in-memory cache
function getCacheForCategory(category: RiskStateCategory): Map<string, number[]> {
  switch (category) {
    case 'payment_attempts':
      return paymentAttempts;
    case 'failed_attempts':
      return failedAttempts;
    case 'amount_history':
      return amountHistory;
  }
}

/**
 * Load risk state from database. Falls back to in-memory cache if DB read fails.
 * Populates the in-memory cache on successful DB read.
 */
async function loadState(userId: string, category: RiskStateCategory): Promise<number[]> {
  const cache = getCacheForCategory(category);

  // Return cache if already populated (avoids DB round-trip)
  if (cache.has(userId)) {
    return cache.get(userId)!;
  }

  try {
    const record = await prisma.paymentRiskState.findUnique({
      where: { userId_category: { userId, category } },
    });
    const data = record ? (record.data as number[]) : [];
    cache.set(userId, data);
    return data;
  } catch (dbError) {
    logger.error('[PaymentSecurity] Failed to load risk state from database', {
      userId,
      category,
      error: dbError instanceof Error ? dbError.message : String(dbError),
    });
    // Fall back to whatever is in the in-memory cache
    return cache.get(userId) || [];
  }
}

/**
 * Save risk state to both in-memory cache and database.
 * DB write is fire-and-forget (non-blocking) to maintain performance.
 */
function saveState(userId: string, category: RiskStateCategory, data: number[]): void {
  const cache = getCacheForCategory(category);
  cache.set(userId, data);

  // Persist to database asynchronously (fire-and-forget)
  prisma.paymentRiskState
    .upsert({
      where: { userId_category: { userId, category } },
      update: { data },
      create: { userId, category, data },
    })
    .catch((dbError: unknown) => {
      logger.error('[PaymentSecurity] Failed to persist risk state to database', {
        userId,
        category,
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
    });
}

// ============================================================================
// Types
// ============================================================================

export interface PaymentSecurityEvent {
  id: string;
  type:
    | 'PAYMENT_BLOCKED'
    | 'FRAUD_DETECTED'
    | 'LIMIT_EXCEEDED'
    | 'VELOCITY_WARNING'
    | 'AMOUNT_ANOMALY'
    | 'SUSPICIOUS_PATTERN'
    | 'PAYMENT_ALLOWED'
    | 'COOLDOWN_ACTIVE';
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

// ============================================================================
// ID Generator
// ============================================================================

function generateId(): string {
  return `pse_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// Core Risk Checks
// ============================================================================

/**
 * Check payment velocity (frequency of payment attempts)
 */
async function checkVelocity(userId: string): Promise<RiskCheckResult> {
  const now = Date.now();
  const timestamps = await loadState(userId, 'payment_attempts');

  // Clean old entries
  const recent = timestamps.filter(t => now - t < 86_400_000); // 24h
  const lastHour = recent.filter(t => now - t < 3_600_000);
  const lastMinute = recent.filter(t => now - t < 60_000);

  let score = 0;
  let reason: string | undefined;

  if (lastMinute.length >= RISK_CONFIG.maxPaymentsPerMinute) {
    score = 50;
    reason = `1分钟内${lastMinute.length}次支付尝试，超过限制`;
  } else if (lastHour.length >= RISK_CONFIG.maxPaymentsPerHour) {
    score = 40;
    reason = `1小时内${lastHour.length}次支付尝试，异常频繁`;
  } else if (recent.length >= RISK_CONFIG.maxPaymentsPerDay) {
    score = 60;
    reason = `24小时内${recent.length}次支付尝试，超过日限制`;
  } else if (lastHour.length > RISK_CONFIG.maxPaymentsPerHour * 0.7) {
    score = 15;
    reason = '支付频率偏高';
  }

  return {
    check: 'velocity',
    passed: score < RISK_CONFIG.highRiskThreshold,
    score,
    reason,
  };
}

/**
 * Check payment amount limits
 */
function checkAmountLimits(
  userId: string,
  amount: number,
  dailySpent: number,
  monthlySpent: number
): RiskCheckResult {
  let score = 0;
  let reason: string | undefined;

  if (amount > RISK_CONFIG.maxSinglePaymentAmount) {
    score = 100;
    reason = `单笔金额${amount}超过限额${RISK_CONFIG.maxSinglePaymentAmount}`;
  } else if (dailySpent + amount > RISK_CONFIG.maxDailyPaymentAmount) {
    score = 100;
    reason = `日累计${dailySpent + amount}超过限额${RISK_CONFIG.maxDailyPaymentAmount}`;
  } else if (monthlySpent + amount > RISK_CONFIG.maxMonthlyPaymentAmount) {
    score = 100;
    reason = `月累计${monthlySpent + amount}超过限额${RISK_CONFIG.maxMonthlyPaymentAmount}`;
  } else if (amount > RISK_CONFIG.highValueThreshold) {
    score = 10;
    reason = '大额支付';
  }

  return {
    check: 'amount_limits',
    passed: score < 100,
    score,
    reason,
  };
}

/**
 * Check for amount anomaly (same amount repeated)
 */
async function checkAmountAnomaly(userId: string, amount: number): Promise<RiskCheckResult> {
  const history = await loadState(userId, 'amount_history');
  const sameAmountCount = history.filter(a => a === amount).length;

  let score = 0;
  let reason: string | undefined;

  if (sameAmountCount >= RISK_CONFIG.sameAmountThreshold) {
    score = 35;
    reason = `相同金额${amount}已出现${sameAmountCount}次，可能存在异常`;
  }

  return {
    check: 'amount_anomaly',
    passed: score === 0,
    score,
    reason,
  };
}

/**
 * Check failure cooldown
 */
async function checkFailureCooldown(userId: string): Promise<RiskCheckResult> {
  const now = Date.now();
  const failures = await loadState(userId, 'failed_attempts');
  const recentFailures = failures.filter(t => now - t < RISK_CONFIG.failureCooldownMs);

  let score = 0;
  let reason: string | undefined;

  if (recentFailures.length >= RISK_CONFIG.maxFailuresBeforeCooldown) {
    score = 80;
    reason = `近期失败${recentFailures.length}次，触发冷却期`;
  } else if (recentFailures.length > 0) {
    score = recentFailures.length * 10;
    reason = `近期有${recentFailures.length}次失败记录`;
  }

  return {
    check: 'failure_cooldown',
    passed: recentFailures.length < RISK_CONFIG.maxFailuresBeforeCooldown,
    score,
    reason,
  };
}

/**
 * Check account age for high-value payments
 */
async function checkAccountAge(userId: string, amount: number): Promise<RiskCheckResult> {
  if (amount < RISK_CONFIG.highValueThreshold) {
    return { check: 'account_age', passed: true, score: 0 };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });

    if (!user) {
      return { check: 'account_age', passed: false, score: 30, reason: '用户不存在' };
    }

    const ageDays = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (ageDays < RISK_CONFIG.minAccountAgeForHighValue) {
      return {
        check: 'account_age',
        passed: false,
        score: 25,
        reason: `账户年龄${Math.floor(ageDays)}天，不满足高价值支付要求(${RISK_CONFIG.minAccountAgeForHighValue}天)`,
      };
    }

    return { check: 'account_age', passed: true, score: 0 };
  } catch {
    return { check: 'account_age', passed: true, score: 0 };
  }
}

/**
 * Simple deterministic hash for fingerprinting device identifiers.
 * Produces a hex string from the input.
 */
function simpleFingerprintHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0; // |0 keeps it as 32-bit int
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Check device fingerprint (设备指纹识别)
 *
 * Collects device records, builds fingerprint hashes from device identifiers,
 * and checks for suspicious patterns such as:
 * - Shared device fraud (same deviceId used by multiple users)
 * - Unknown devices not in user's history
 * - Multiple device types in a short timeframe
 * Also retains the original device count risk logic.
 */
async function checkDeviceFingerprint(userId: string): Promise<RiskCheckResult> {
  try {
    const since = new Date(Date.now() - 86_400_000); // last 24 hours

    const devices = await prisma.userDevice.findMany({
      where: {
        userId,
        lastActiveAt: { gte: since },
      },
      select: {
        deviceId: true,
        deviceType: true,
        osVersion: true,
      },
    });

    const deviceCount = devices.length;
    let score = 0;
    const reasons: string[] = [];

    // --- Existing device count risk ---
    if (deviceCount > 5) {
      score += 30;
      reasons.push(`24小时内使用${deviceCount}台不同设备`);
    } else if (deviceCount > 3) {
      score += 15;
      reasons.push(`24小时内使用${deviceCount}台不同设备`);
    }

    // --- Fingerprint hash per device (for future matching) ---
    const _deviceFingerprints = devices.map(d =>
      simpleFingerprintHash(`${d.deviceId}|${d.deviceType}|${d.osVersion}`)
    );

    // Check for shared device fraud: same deviceId used by other users
    if (devices.length > 0) {
      const deviceIds = devices.map(d => d.deviceId);
      const sharedCount = await prisma.userDevice.groupBy({
        by: ['deviceId'],
        where: {
          deviceId: { in: deviceIds },
          userId: { not: userId },
          lastActiveAt: { gte: since },
        },
        _count: { userId: true },
        having: { userId: { _count: { gt: 0 } } },
      });

      if (sharedCount.length > 0) {
        score += 40;
        reasons.push(`检测到${sharedCount.length}个设备被其他用户共享使用`);
      }
    }

    // Check for multiple device types in short timeframe (suspicious rapid switching)
    const deviceTypes = new Set(devices.map(d => d.deviceType));
    if (deviceTypes.size > 2 && deviceCount >= 3) {
      score += 25;
      reasons.push(`短时间内使用${deviceTypes.size}种不同设备类型，可能存在异常`);
    }

    // Check for unknown / new devices (devices with no prior history before 24h window)
    if (devices.length > 0) {
      const knownDeviceCount = await prisma.userDevice.count({
        where: {
          userId,
          createdAt: { lt: since },
        },
      });
      const newDeviceCount = deviceCount - Math.min(knownDeviceCount, deviceCount);
      if (newDeviceCount > 2) {
        score += 20;
        reasons.push(`24小时内出现${newDeviceCount}台全新设备`);
      }
    }

    const combinedReason = reasons.length > 0 ? reasons.join('; ') : undefined;

    return {
      check: 'device_fingerprint',
      passed: score < RISK_CONFIG.highRiskThreshold,
      score,
      reason: combinedReason,
    };
  } catch {
    return { check: 'device_fingerprint', passed: true, score: 0 };
  }
}

// ============================================================================
// Internal Helpers
// ============================================================================

function logEvent(event: Omit<PaymentSecurityEvent, 'id' | 'timestamp'>): void {
  const fullEvent: PaymentSecurityEvent = {
    ...event,
    id: generateId(),
    timestamp: new Date(),
  };
  securityEventLog.push(fullEvent);
  if (securityEventLog.length > MAX_EVENT_LOG) {
    securityEventLog.shift();
  }

  // Persist to database for reliable audit logging (支付日志审计)
  prisma.auditLog
    .create({
      data: {
        userId: fullEvent.userId,
        action: fullEvent.type,
        resource: 'payment_security',
        resourceId: fullEvent.id,
        details: {
          severity: fullEvent.severity,
          riskScore: fullEvent.riskScore,
          ...fullEvent.details,
        },
        timestamp: fullEvent.timestamp,
      },
    })
    .catch((dbError: unknown) => {
      logger.error('[PaymentSecurity] Failed to persist audit log to database', {
        eventId: fullEvent.id,
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
    });

  if (event.severity === 'high' || event.severity === 'critical') {
    logger.warn(`[PaymentSecurity] ${event.type}`, {
      userId: event.userId,
      riskScore: event.riskScore,
      details: event.details,
    });
  }
}

function recordPaymentAttempt(userId: string, amount: number): void {
  const now = Date.now();
  const timestamps = paymentAttempts.get(userId) || [];
  timestamps.push(now);
  // Keep only last 24h
  const recentTimestamps = timestamps.filter(t => now - t < 86_400_000);
  saveState(userId, 'payment_attempts', recentTimestamps);

  const amounts = amountHistory.get(userId) || [];
  amounts.push(amount);
  // Keep only last 50 amounts
  if (amounts.length > 50) amounts.shift();
  saveState(userId, 'amount_history', amounts);
}

function recordFailure(userId: string): void {
  const now = Date.now();
  const failures = failedAttempts.get(userId) || [];
  failures.push(now);
  const recentFailures = failures.filter(t => now - t < RISK_CONFIG.failureCooldownMs);
  saveState(userId, 'failed_attempts', recentFailures);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Validate a payment request before processing
 */
export async function validatePaymentRequest(
  userId: string,
  request: PaymentRequest
): Promise<ValidationResult> {
  const errors: string[] = [];

  // Basic request validation
  if (!userId) {
    errors.push('用户ID不能为空');
  }

  if (!request.photoIds || request.photoIds.length === 0) {
    errors.push('照片ID不能为空');
  }

  if (!request.totalAmount || request.totalAmount <= 0) {
    errors.push('支付金额必须大于0');
  }

  if (request.totalAmount > RISK_CONFIG.maxSinglePaymentAmount) {
    errors.push(`单笔支付金额不能超过${RISK_CONFIG.maxSinglePaymentAmount}积分`);
  }

  // Password validation
  if (!request.password || request.password.length < 6) {
    errors.push('支付密码不正确');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check fraud risk for a payment attempt
 * Returns risk assessment with score and decision
 */
export async function checkFraudRisk(
  userId: string,
  photoIds: string[],
  amount: number
): Promise<FraudRiskResult> {
  const assessment = await assessRisk(userId, amount);

  logEvent({
    type: assessment.allowed ? 'PAYMENT_ALLOWED' : 'FRAUD_DETECTED',
    userId,
    severity:
      assessment.riskLevel === 'high'
        ? 'high'
        : assessment.riskLevel === 'medium'
          ? 'medium'
          : 'low',
    riskScore: assessment.riskScore,
    details: {
      photoCount: photoIds.length,
      reasons: assessment.reasons,
    },
  });

  return {
    riskScore: assessment.riskScore,
    allowed: assessment.allowed,
    reason: assessment.reasons.length > 0 ? assessment.reasons[0] : undefined,
  };
}

/**
 * Full risk assessment for a payment
 */
export async function assessRisk(userId: string, amount: number): Promise<PaymentRiskAssessment> {
  const checks: RiskCheckResult[] = [];
  const reasons: string[] = [];
  let totalScore = 0;

  // 1. Velocity check
  const velocityCheck = await checkVelocity(userId);
  checks.push(velocityCheck);
  totalScore += velocityCheck.score;
  if (velocityCheck.reason) reasons.push(velocityCheck.reason);

  // 2. Amount limits check (use 0 for dailySpent/monthlySpent if amount is 0)
  let dailySpent = 0;
  let monthlySpent = 0;
  if (amount > 0) {
    const spent = await getSpentAmounts(userId);
    dailySpent = spent.daily;
    monthlySpent = spent.monthly;

    const limitCheck = checkAmountLimits(userId, amount, dailySpent, monthlySpent);
    checks.push(limitCheck);
    totalScore += limitCheck.score;
    if (limitCheck.reason) reasons.push(limitCheck.reason);

    // 3. Amount anomaly check
    const anomalyCheck = await checkAmountAnomaly(userId, amount);
    checks.push(anomalyCheck);
    totalScore += anomalyCheck.score;
    if (anomalyCheck.reason) reasons.push(anomalyCheck.reason);
  }

  // 4. Failure cooldown check
  const failureCheck = await checkFailureCooldown(userId);
  checks.push(failureCheck);
  totalScore += failureCheck.score;
  if (failureCheck.reason) reasons.push(failureCheck.reason);

  // 5. Account age check (only for high-value)
  const ageCheck = await checkAccountAge(userId, amount);
  checks.push(ageCheck);
  totalScore += ageCheck.score;
  if (ageCheck.reason) reasons.push(ageCheck.reason);

  // 6. Device fingerprint check (设备指纹识别)
  const deviceCheck = await checkDeviceFingerprint(userId);
  checks.push(deviceCheck);
  totalScore += deviceCheck.score;
  if (deviceCheck.reason) reasons.push(deviceCheck.reason);

  // Cap total score at 100
  totalScore = Math.min(100, totalScore);

  const riskLevel =
    totalScore >= RISK_CONFIG.highRiskThreshold
      ? 'high'
      : totalScore >= RISK_CONFIG.mediumRiskThreshold
        ? 'medium'
        : 'low';

  const blocked = totalScore >= RISK_CONFIG.highRiskThreshold;

  if (blocked && reasons.length > 0) {
    logEvent({
      type: 'FRAUD_DETECTED',
      userId,
      severity: 'high',
      riskScore: totalScore,
      details: { reasons, checks: checks.map(c => c.check) },
    });
  }

  return {
    riskScore: totalScore,
    riskLevel,
    allowed: !blocked,
    reasons,
    checks,
  };
}

/**
 * Get spent amounts for daily and monthly periods
 */
async function getSpentAmounts(userId: string): Promise<{ daily: number; monthly: number }> {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [dailyResult, monthlyResult] = await Promise.all([
      prisma.pointsTransaction.aggregate({
        where: {
          userId,
          type: 'spend',
          createdAt: { gte: startOfDay },
        },
        _sum: { amount: true },
      }),
      prisma.pointsTransaction.aggregate({
        where: {
          userId,
          type: 'spend',
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      daily: Math.abs(dailyResult._sum.amount || 0),
      monthly: Math.abs(monthlyResult._sum.amount || 0),
    };
  } catch {
    return { daily: 0, monthly: 0 };
  }
}

/**
 * Record a successful payment
 */
export function recordSuccessfulPayment(userId: string, amount: number): void {
  recordPaymentAttempt(userId, amount);
  // Clear failure history on success (both cache and database)
  failedAttempts.delete(userId);
  prisma.paymentRiskState
    .deleteMany({
      where: { userId, category: 'failed_attempts' },
    })
    .catch((dbError: unknown) => {
      logger.error('[PaymentSecurity] Failed to clear failure state from database', {
        userId,
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
    });
}

/**
 * Record a failed payment attempt
 */
export function recordFailedPayment(userId: string, amount: number): void {
  recordPaymentAttempt(userId, amount);
  recordFailure(userId);

  logEvent({
    type: 'SUSPICIOUS_PATTERN',
    userId,
    severity: 'medium',
    riskScore: 30,
    details: { amount, reason: 'payment_failed' },
  });
}

/**
 * Log a security event (implements ISecurityService)
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  logEvent({
    type: mapEventType(event.type),
    userId: event.userId,
    severity: mapSeverity(event.type),
    riskScore: 0,
    details: {
      photoId: event.photoId,
      transactionId: event.transactionId,
      metadata: event.metadata,
    },
  });
}

/**
 * Get payment limits info for a user
 */
export async function getPaymentLimits(userId: string): Promise<PaymentLimitInfo> {
  const spent = await getSpentAmounts(userId);

  return {
    userId,
    dailySpent: spent.daily,
    dailyLimit: RISK_CONFIG.maxDailyPaymentAmount,
    monthlySpent: spent.monthly,
    monthlyLimit: RISK_CONFIG.maxMonthlyPaymentAmount,
    singleLimit: RISK_CONFIG.maxSinglePaymentAmount,
    remainingDaily: Math.max(0, RISK_CONFIG.maxDailyPaymentAmount - spent.daily),
    remainingMonthly: Math.max(0, RISK_CONFIG.maxMonthlyPaymentAmount - spent.monthly),
  };
}

/**
 * Map an AuditLog DB record back to a PaymentSecurityEvent.
 */
function auditLogToSecurityEvent(record: {
  id: string;
  userId: string | null;
  action: string;
  details: unknown;
  timestamp: Date;
}): PaymentSecurityEvent | null {
  const details = record.details as Record<string, unknown>;
  const type = record.action as PaymentSecurityEvent['type'];
  const validTypes: PaymentSecurityEvent['type'][] = [
    'PAYMENT_BLOCKED',
    'FRAUD_DETECTED',
    'LIMIT_EXCEEDED',
    'VELOCITY_WARNING',
    'AMOUNT_ANOMALY',
    'SUSPICIOUS_PATTERN',
    'PAYMENT_ALLOWED',
    'COOLDOWN_ACTIVE',
  ];
  if (!validTypes.includes(type)) {
    return null;
  }
  return {
    id: record.id,
    type,
    userId: record.userId ?? '',
    severity: (details?.severity as PaymentSecurityEvent['severity']) ?? 'low',
    riskScore: (details?.riskScore as number) ?? 0,
    details: details ?? {},
    timestamp: record.timestamp,
  };
}

/**
 * Get security events with optional filters.
 *
 * Returns events from the in-memory cache. Events are also persisted to the
 * `audit_logs` table by logEvent(), so data survives server restarts.
 * For historical queries beyond the in-memory window, use getSecurityEventsFromDB().
 */
export function getSecurityEvents(filters?: {
  userId?: string;
  type?: PaymentSecurityEvent['type'];
  severity?: string;
  since?: Date;
  limit?: number;
}): PaymentSecurityEvent[] {
  let filtered = [...securityEventLog];

  if (filters?.userId) {
    filtered = filtered.filter(e => e.userId === filters.userId);
  }
  if (filters?.type) {
    filtered = filtered.filter(e => e.type === filters.type);
  }
  if (filters?.severity) {
    filtered = filtered.filter(e => e.severity === filters.severity);
  }
  if (filters?.since) {
    filtered = filtered.filter(e => e.timestamp >= filters.since!);
  }

  filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (filters?.limit) {
    filtered = filtered.slice(0, filters.limit);
  }

  return filtered;
}

/**
 * Get security events from the database (persistent audit trail).
 * Use for historical queries that may go beyond the in-memory cache window.
 */
export async function getSecurityEventsFromDB(filters?: {
  userId?: string;
  type?: PaymentSecurityEvent['type'];
  severity?: string;
  since?: Date;
  limit?: number;
}): Promise<PaymentSecurityEvent[]> {
  const dbWhere: {
    resource: string;
    userId?: string;
    action?: string;
    timestamp?: { gte: Date };
  } = { resource: 'payment_security' };

  if (filters?.userId) dbWhere.userId = filters.userId;
  if (filters?.type) dbWhere.action = filters.type;
  if (filters?.since) dbWhere.timestamp = { gte: filters.since };

  const records = await prisma.auditLog.findMany({
    where: dbWhere,
    orderBy: { timestamp: 'desc' },
    take: filters?.limit ?? 1000,
  });

  return records
    .map(r => auditLogToSecurityEvent(r))
    .filter((e): e is PaymentSecurityEvent => e !== null);
}

/**
 * Get risk config (for admin/monitoring)
 */
export function getRiskConfig(): typeof RISK_CONFIG {
  return { ...RISK_CONFIG };
}

/**
 * Clear tracking data for a user (for testing)
 */
export function clearUserData(userId: string): void {
  paymentAttempts.delete(userId);
  failedAttempts.delete(userId);
  amountHistory.delete(userId);
  prisma.paymentRiskState
    .deleteMany({
      where: { userId },
    })
    .catch((dbError: unknown) => {
      logger.error('[PaymentSecurity] Failed to clear user risk state from database', {
        userId,
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
    });
}

/**
 * Clear all tracking data (for testing)
 */
export function clearAllData(): void {
  paymentAttempts.clear();
  failedAttempts.clear();
  amountHistory.clear();
  securityEventLog.length = 0;
  prisma.paymentRiskState.deleteMany({}).catch((dbError: unknown) => {
    logger.error('[PaymentSecurity] Failed to clear all risk state from database', {
      error: dbError instanceof Error ? dbError.message : String(dbError),
    });
  });
}

// ============================================================================
// Mappers
// ============================================================================

function mapEventType(type: SecurityEvent['type']): PaymentSecurityEvent['type'] {
  switch (type) {
    case 'payment_attempt':
      return 'PAYMENT_ALLOWED';
    case 'payment_success':
      return 'PAYMENT_ALLOWED';
    case 'payment_failure':
      return 'SUSPICIOUS_PATTERN';
    case 'download':
      return 'PAYMENT_ALLOWED';
    case 'refund_request':
      return 'FRAUD_DETECTED';
    default:
      return 'SUSPICIOUS_PATTERN';
  }
}

function mapSeverity(type: SecurityEvent['type']): PaymentSecurityEvent['severity'] {
  switch (type) {
    case 'payment_failure':
      return 'medium';
    case 'refund_request':
      return 'medium';
    default:
      return 'low';
  }
}
