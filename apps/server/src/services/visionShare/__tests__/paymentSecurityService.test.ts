/**
 * Payment Security Service Tests
 * Tests for payment risk detection, amount limits, velocity checks, and anomaly detection
 */

jest.mock('../../../db/client', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    userDevice: {
      count: jest.fn(),
    },
    pointsTransaction: {
      aggregate: jest.fn(),
    },
  },
}));

import {
  validatePaymentRequest,
  checkFraudRisk,
  assessRisk,
  recordSuccessfulPayment,
  recordFailedPayment,
  logSecurityEvent,
  getPaymentLimits,
  getSecurityEvents,
  clearUserData,
  clearAllData,
  getRiskConfig,
} from '../paymentSecurityService';
import { prisma } from '../../../db/client';

// Define locally to avoid import type issues with Babel
interface PaymentRequest {
  photoIds: string[];
  totalAmount: number;
  password: string;
  metadata?: { source: 'gallery' | 'preview' | 'cart'; couponCode?: string; discountAmount?: number };
}

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('PaymentSecurityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAllData();

    // Default mocks
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    });
    (mockPrisma.userDevice.count as jest.Mock).mockResolvedValue(1);
    (mockPrisma.pointsTransaction.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amount: 0 },
    });
  });

  // ==========================================================================
  // validatePaymentRequest
  // ==========================================================================

  describe('validatePaymentRequest', () => {
    it('should validate a correct payment request', async () => {
      const request: PaymentRequest = {
        photoIds: ['photo-1'],
        totalAmount: 100,
        password: '123456',
      };

      const result = await validatePaymentRequest('user-1', request);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty userId', async () => {
      const request: PaymentRequest = {
        photoIds: ['photo-1'],
        totalAmount: 100,
        password: '123456',
      };

      const result = await validatePaymentRequest('', request);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('用户ID不能为空');
    });

    it('should reject empty photoIds', async () => {
      const request: PaymentRequest = {
        photoIds: [],
        totalAmount: 100,
        password: '123456',
      };

      const result = await validatePaymentRequest('user-1', request);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('照片ID不能为空');
    });

    it('should reject zero or negative amount', async () => {
      const request: PaymentRequest = {
        photoIds: ['photo-1'],
        totalAmount: 0,
        password: '123456',
      };

      const result = await validatePaymentRequest('user-1', request);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('支付金额必须大于0');
    });

    it('should reject amount exceeding single payment limit', async () => {
      const config = getRiskConfig();
      const request: PaymentRequest = {
        photoIds: ['photo-1'],
        totalAmount: config.maxSinglePaymentAmount + 1,
        password: '123456',
      };

      const result = await validatePaymentRequest('user-1', request);
      expect(result.valid).toBe(false);
    });

    it('should reject short password', async () => {
      const request: PaymentRequest = {
        photoIds: ['photo-1'],
        totalAmount: 100,
        password: '12345',
      };

      const result = await validatePaymentRequest('user-1', request);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('支付密码不正确');
    });
  });

  // ==========================================================================
  // checkFraudRisk
  // ==========================================================================

  describe('checkFraudRisk', () => {
    it('should return low risk for normal user', async () => {
      const result = await checkFraudRisk('user-1', ['photo-1']);

      expect(result.allowed).toBe(true);
      expect(result.riskScore).toBeLessThan(30);
    });

    it('should block high-risk users', async () => {
      // Simulate many payment attempts to trigger velocity check
      for (let i = 0; i < 10; i++) {
        recordSuccessfulPayment('user-1', 100);
      }

      const result = await checkFraudRisk('user-1', ['photo-1']);

      expect(result.riskScore).toBeGreaterThan(0);
    });

    it('should log security events', async () => {
      await checkFraudRisk('user-1', ['photo-1']);

      const events = getSecurityEvents({ userId: 'user-1' });
      expect(events.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // assessRisk - Velocity checks
  // ==========================================================================

  describe('assessRisk - velocity checks', () => {
    it('should flag rapid payment attempts', async () => {
      const config = getRiskConfig();

      // Simulate many rapid attempts
      for (let i = 0; i < config.maxPaymentsPerMinute; i++) {
        recordSuccessfulPayment('user-1', 100);
      }

      const result = await assessRisk('user-1', 100);

      expect(result.riskScore).toBeGreaterThan(0);
      const velocityCheck = result.checks.find(c => c.check === 'velocity');
      expect(velocityCheck?.score).toBeGreaterThan(0);
    });

    it('should allow normal payment pace', async () => {
      const result = await assessRisk('user-1', 100);

      const velocityCheck = result.checks.find(c => c.check === 'velocity');
      expect(velocityCheck?.passed).toBe(true);
      expect(velocityCheck?.score).toBe(0);
    });
  });

  // ==========================================================================
  // assessRisk - Amount limits
  // ==========================================================================

  describe('assessRisk - amount limits', () => {
    it('should block payment exceeding single limit', async () => {
      const config = getRiskConfig();
      const result = await assessRisk('user-1', config.maxSinglePaymentAmount + 1);

      expect(result.allowed).toBe(false);
      const limitCheck = result.checks.find(c => c.check === 'amount_limits');
      expect(limitCheck?.score).toBe(100);
    });

    it('should block payment exceeding daily limit', async () => {
      const config = getRiskConfig();

      (mockPrisma.pointsTransaction.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { amount: config.maxDailyPaymentAmount } })  // daily
        .mockResolvedValueOnce({ _sum: { amount: 0 } });                            // monthly

      const result = await assessRisk('user-1', 100);

      expect(result.allowed).toBe(false);
    });

    it('should block payment exceeding monthly limit', async () => {
      const config = getRiskConfig();

      (mockPrisma.pointsTransaction.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { amount: 0 } })                              // daily
        .mockResolvedValueOnce({ _sum: { amount: config.maxMonthlyPaymentAmount } }); // monthly

      const result = await assessRisk('user-1', 100);

      expect(result.allowed).toBe(false);
    });
  });

  // ==========================================================================
  // assessRisk - Amount anomaly
  // ==========================================================================

  describe('assessRisk - amount anomaly', () => {
    it('should detect repeated same amounts', async () => {
      const config = getRiskConfig();

      // Record same amount multiple times
      for (let i = 0; i < config.sameAmountThreshold; i++) {
        recordSuccessfulPayment('user-1', 500);
      }

      const result = await assessRisk('user-1', 500);

      const anomalyCheck = result.checks.find(c => c.check === 'amount_anomaly');
      expect(anomalyCheck?.score).toBeGreaterThan(0);
    });

    it('should not flag varying amounts', async () => {
      recordSuccessfulPayment('user-1', 100);
      recordSuccessfulPayment('user-1', 200);
      recordSuccessfulPayment('user-1', 300);

      const result = await assessRisk('user-1', 400);

      const anomalyCheck = result.checks.find(c => c.check === 'amount_anomaly');
      expect(anomalyCheck?.score).toBe(0);
    });
  });

  // ==========================================================================
  // assessRisk - Failure cooldown
  // ==========================================================================

  describe('assessRisk - failure cooldown', () => {
    it('should trigger cooldown after multiple failures', async () => {
      const config = getRiskConfig();

      for (let i = 0; i < config.maxFailuresBeforeCooldown; i++) {
        recordFailedPayment('user-1', 100);
      }

      const result = await assessRisk('user-1', 100);

      const failureCheck = result.checks.find(c => c.check === 'failure_cooldown');
      expect(failureCheck?.passed).toBe(false);
      expect(failureCheck?.score).toBeGreaterThanOrEqual(80);
    });

    it('should clear failure history on success', async () => {
      recordFailedPayment('user-1', 100);
      recordFailedPayment('user-1', 100);

      recordSuccessfulPayment('user-1', 100); // clears failures

      const result = await assessRisk('user-1', 100);

      const failureCheck = result.checks.find(c => c.check === 'failure_cooldown');
      expect(failureCheck?.score).toBe(0);
    });
  });

  // ==========================================================================
  // assessRisk - Account age
  // ==========================================================================

  describe('assessRisk - account age', () => {
    it('should flag new accounts for high-value payments', async () => {
      const config = getRiskConfig();

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-new',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      });

      const result = await assessRisk('user-new', config.highValueThreshold + 1);

      const ageCheck = result.checks.find(c => c.check === 'account_age');
      expect(ageCheck?.passed).toBe(false);
      expect(ageCheck?.score).toBeGreaterThan(0);
    });

    it('should allow old accounts for high-value payments', async () => {
      const config = getRiskConfig();

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-old',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      });

      const result = await assessRisk('user-old', config.highValueThreshold + 1);

      const ageCheck = result.checks.find(c => c.check === 'account_age');
      expect(ageCheck?.passed).toBe(true);
    });

    it('should skip age check for low-value payments', async () => {
      const result = await assessRisk('user-1', 100);

      const ageCheck = result.checks.find(c => c.check === 'account_age');
      expect(ageCheck?.passed).toBe(true);
      expect(ageCheck?.score).toBe(0);
    });
  });

  // ==========================================================================
  // assessRisk - Device diversity
  // ==========================================================================

  describe('assessRisk - device diversity', () => {
    it('should flag many devices', async () => {
      (mockPrisma.userDevice.count as jest.Mock).mockResolvedValue(6);

      const result = await assessRisk('user-1', 100);

      const deviceCheck = result.checks.find(c => c.check === 'device_diversity');
      expect(deviceCheck?.score).toBeGreaterThan(0);
    });

    it('should allow reasonable device count', async () => {
      (mockPrisma.userDevice.count as jest.Mock).mockResolvedValue(1);

      const result = await assessRisk('user-1', 100);

      const deviceCheck = result.checks.find(c => c.check === 'device_diversity');
      expect(deviceCheck?.score).toBe(0);
    });
  });

  // ==========================================================================
  // getPaymentLimits
  // ==========================================================================

  describe('getPaymentLimits', () => {
    it('should return limit info', async () => {
      const config = getRiskConfig();

      (mockPrisma.pointsTransaction.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { amount: 500 } })
        .mockResolvedValueOnce({ _sum: { amount: 5000 } });

      const limits = await getPaymentLimits('user-1');

      expect(limits.userId).toBe('user-1');
      expect(limits.dailySpent).toBe(500);
      expect(limits.monthlySpent).toBe(5000);
      expect(limits.dailyLimit).toBe(config.maxDailyPaymentAmount);
      expect(limits.monthlyLimit).toBe(config.maxMonthlyPaymentAmount);
      expect(limits.singleLimit).toBe(config.maxSinglePaymentAmount);
      expect(limits.remainingDaily).toBe(config.maxDailyPaymentAmount - 500);
      expect(limits.remainingMonthly).toBe(config.maxMonthlyPaymentAmount - 5000);
    });
  });

  // ==========================================================================
  // getSecurityEvents
  // ==========================================================================

  describe('getSecurityEvents', () => {
    it('should return empty events initially', () => {
      const events = getSecurityEvents();
      expect(events).toHaveLength(0);
    });

    it('should filter by userId', async () => {
      await checkFraudRisk('user-1', ['photo-1']);
      await checkFraudRisk('user-2', ['photo-2']);

      const events1 = getSecurityEvents({ userId: 'user-1' });
      const events2 = getSecurityEvents({ userId: 'user-2' });

      expect(events1.length).toBeGreaterThan(0);
      expect(events2.length).toBeGreaterThan(0);
      expect(events1.every(e => e.userId === 'user-1')).toBe(true);
    });

    it('should filter by severity', async () => {
      await checkFraudRisk('user-1', ['photo-1']);

      const events = getSecurityEvents({ severity: 'low' });
      expect(events.every(e => e.severity === 'low')).toBe(true);
    });

    it('should respect limit', async () => {
      await checkFraudRisk('user-1', ['photo-1']);
      await checkFraudRisk('user-1', ['photo-2']);

      const events = getSecurityEvents({ limit: 1 });
      expect(events.length).toBeLessThanOrEqual(1);
    });
  });

  // ==========================================================================
  // logSecurityEvent
  // ==========================================================================

  describe('logSecurityEvent', () => {
    it('should log payment event', async () => {
      await logSecurityEvent({
        type: 'payment_attempt',
        userId: 'user-1',
        timestamp: new Date().toISOString(),
        metadata: {},
      });

      const events = getSecurityEvents({ userId: 'user-1' });
      expect(events.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // clearUserData / clearAllData
  // ==========================================================================

  describe('clearUserData', () => {
    it('should clear user tracking data', async () => {
      recordSuccessfulPayment('user-1', 100);
      recordFailedPayment('user-1', 50);

      clearUserData('user-1');

      const result = await assessRisk('user-1', 100);
      const velocityCheck = result.checks.find(c => c.check === 'velocity');
      expect(velocityCheck?.score).toBe(0);
    });
  });

  // ==========================================================================
  // Integration: full risk assessment flow
  // ==========================================================================

  describe('full risk assessment flow', () => {
    it('should assess risk for a normal payment', async () => {
      const request: PaymentRequest = {
        photoIds: ['photo-1', 'photo-2'],
        totalAmount: 200,
        password: '123456',
      };

      // Step 1: Validate
      const validation = await validatePaymentRequest('user-1', request);
      expect(validation.valid).toBe(true);

      // Step 2: Fraud check
      const fraudResult = await checkFraudRisk('user-1', request.photoIds);
      expect(fraudResult.allowed).toBe(true);

      // Step 3: Full risk assessment
      const risk = await assessRisk('user-1', request.totalAmount);
      expect(risk.allowed).toBe(true);
      expect(risk.riskLevel).toBe('low');

      // Step 4: Record success
      recordSuccessfulPayment('user-1', request.totalAmount);

      // Step 5: Check limits
      const limits = await getPaymentLimits('user-1');
      expect(limits.remainingDaily).toBeGreaterThan(0);
    });

    it('should block suspicious behavior end-to-end', async () => {
      const config = getRiskConfig();

      // Simulate attack: rapid payments exceeding velocity
      for (let i = 0; i < config.maxPaymentsPerMinute + 1; i++) {
        recordSuccessfulPayment('attacker', 100);
      }

      const risk = await assessRisk('attacker', 100);
      expect(risk.riskScore).toBeGreaterThan(0);
      expect(risk.reasons.length).toBeGreaterThan(0);
    });
  });
});
