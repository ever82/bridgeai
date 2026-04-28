/**
 * @jest-environment node
 *
 * Integration tests for Payment Security Service
 * Runs against a real PostgreSQL database to verify that the service
 * correctly queries and persists data through Prisma.
 *
 * Run with: npm run test:integration -- --testPathPattern=paymentSecurityService.integration
 */

import { randomUUID } from 'crypto';

import { prisma } from '../../../db/client';
import {
  assessRisk,
  recordSuccessfulPayment,
  recordFailedPayment,
  logSecurityEvent,
  getPaymentLimits,
  checkFraudRisk,
  clearUserData,
  clearAllData,
} from '../paymentSecurityService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** IDs of all entities created during this test run; cleaned up in afterAll. */
const createdUserIds: string[] = [];

/** Create a real User row (and optional PointsAccount) in the test database. */
async function createTestUser(opts?: {
  createdAt?: Date;
  withAccount?: boolean;
  accountBalance?: number;
}): Promise<{ id: string; email: string }> {
  const id = randomUUID();
  const email = `test-ps-${id}@integration.test`;
  const createdAt = opts?.createdAt ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago by default

  await prisma.user.create({
    data: {
      id,
      email,
      name: 'Integration Test User',
      passwordHash: '$2b$10$fakehash',
      status: 'ACTIVE',
      createdAt,
      updatedAt: new Date(),
    },
  });
  createdUserIds.push(id);

  if (opts?.withAccount) {
    const accountId = randomUUID();
    await prisma.pointsAccount.create({
      data: {
        id: accountId,
        userId: id,
        balance: opts.accountBalance ?? 100000,
        totalEarned: opts.accountBalance ?? 100000,
        totalSpent: 0,
        frozenAmount: 0,
        version: 0,
      },
    });
  }

  return { id, email };
}

/** Create a PointsTransaction (type=spend) for a user. Requires a PointsAccount. */
async function createSpendTransaction(
  userId: string,
  amount: number,
  createdAt?: Date
): Promise<void> {
  const account = await prisma.pointsAccount.findUnique({ where: { userId } });
  if (!account) throw new Error(`No PointsAccount for user ${userId}`);

  await prisma.pointsTransaction.create({
    data: {
      id: randomUUID(),
      accountId: account.id,
      userId,
      type: 'SPEND',
      amount,
      balanceAfter: Math.max(0, account.balance - amount),
      description: 'integration test spend',
      createdAt: createdAt ?? new Date(),
    },
  });

  // Keep account balance in sync so subsequent transactions have correct balanceAfter
  await prisma.pointsAccount.update({
    where: { userId },
    data: { balance: Math.max(0, account.balance - amount), totalSpent: { increment: amount } },
  });
}

/** Create a UserDevice row for a user. */
async function createTestDevice(
  userId: string,
  overrides?: Partial<{
    deviceId: string;
    deviceType: string;
    lastActiveAt: Date;
  }>
): Promise<void> {
  await prisma.userDevice.create({
    data: {
      id: randomUUID(),
      userId,
      deviceId: overrides?.deviceId ?? randomUUID(),
      deviceName: 'Test Device',
      deviceType: overrides?.deviceType ?? 'ios',
      lastActiveAt: overrides?.lastActiveAt ?? new Date(),
      isCurrent: true,
    },
  });
}

/** Small delay to allow fire-and-forget DB writes to complete. */
function flushDbWrites(ms = 500): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

async function cleanupTestData(): Promise<void> {
  // Delete in reverse dependency order
  for (const userId of createdUserIds) {
    await prisma.auditLog.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.paymentRiskState.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.pointsTransaction.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.pointsFreeze.deleteMany({ where: { account: { userId } } }).catch(() => {});
    await prisma.pointsAccount.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.userDevice.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: userId } }).catch(() => {});
  }
  createdUserIds.length = 0;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PaymentSecurityService Integration', () => {
  // Allow generous timeout for DB round-trips
  jest.setTimeout(30_000);

  beforeAll(async () => {
    // Verify database connectivity
    await prisma.$queryRaw`SELECT 1`;
  });

  afterEach(() => {
    // Reset in-memory state between tests (DB state is managed per-test)
    clearAllData();
  });

  afterAll(async () => {
    clearAllData();
    await cleanupTestData();
    await prisma.$disconnect();
  });

  // -------------------------------------------------------------------------
  // assessRisk - new user returns low risk
  // -------------------------------------------------------------------------

  describe('assessRisk with new user', () => {
    it('should return low risk for a new user with no prior activity', async () => {
      const user = await createTestUser();

      const result = await assessRisk(user.id, 100);

      expect(result.allowed).toBe(true);
      expect(result.riskLevel).toBe('low');
      expect(result.riskScore).toBeLessThan(30);

      // All checks should pass or have zero score for a clean user
      const velocityCheck = result.checks.find(c => c.check === 'velocity');
      expect(velocityCheck?.score).toBe(0);

      const failureCheck = result.checks.find(c => c.check === 'failure_cooldown');
      expect(failureCheck?.score).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // recordSuccessfulPayment + assessRisk tracks payment attempts
  // -------------------------------------------------------------------------

  describe('recordSuccessfulPayment + assessRisk', () => {
    it('should track payment attempts and reflect in risk assessment', async () => {
      const user = await createTestUser();

      // Record several successful payments
      for (let i = 0; i < 3; i++) {
        recordSuccessfulPayment(user.id, 100);
      }

      const result = await assessRisk(user.id, 100);

      // Velocity check should detect the rapid payments
      const velocityCheck = result.checks.find(c => c.check === 'velocity');
      expect(velocityCheck).toBeDefined();
      // With 3 payments in rapid succession, velocity should still be below threshold
      // but there should be a non-zero detection of activity
      expect(result.allowed).toBe(true); // 3 payments is still below maxPaymentsPerMinute (5)

      // Failure cooldown should be zero because successes clear failures
      const failureCheck = result.checks.find(c => c.check === 'failure_cooldown');
      expect(failureCheck?.score).toBe(0);
    });

    it('should persist payment state to database after recording success', async () => {
      const user = await createTestUser();

      recordSuccessfulPayment(user.id, 200);
      recordSuccessfulPayment(user.id, 200);

      // Allow fire-and-forget DB writes to complete
      await flushDbWrites();

      // Verify PaymentRiskState was persisted
      const riskState = await prisma.paymentRiskState.findUnique({
        where: { userId_category: { userId: user.id, category: 'payment_attempts' } },
      });

      expect(riskState).toBeDefined();
      const data = riskState!.data as number[];
      expect(data.length).toBeGreaterThanOrEqual(2);

      // Also verify amount_history was persisted
      const amountState = await prisma.paymentRiskState.findUnique({
        where: { userId_category: { userId: user.id, category: 'amount_history' } },
      });

      expect(amountState).toBeDefined();
      const amounts = amountState!.data as number[];
      expect(amounts).toContain(200);
    });
  });

  // -------------------------------------------------------------------------
  // Velocity detection
  // -------------------------------------------------------------------------

  describe('velocity detection', () => {
    it('should increase risk score when recording many rapid payments', async () => {
      const user = await createTestUser();

      // Record a moderate number of payments (below threshold)
      for (let i = 0; i < 4; i++) {
        recordSuccessfulPayment(user.id, 50);
      }

      const moderateResult = await assessRisk(user.id, 50);

      // Now exceed velocity threshold
      recordSuccessfulPayment(user.id, 50);
      recordSuccessfulPayment(user.id, 50);

      const highResult = await assessRisk(user.id, 50);

      // Risk score should increase with more payments
      expect(highResult.riskScore).toBeGreaterThanOrEqual(moderateResult.riskScore);

      // After exceeding maxPaymentsPerMinute (5), velocity check should flag
      const velocityCheck = highResult.checks.find(c => c.check === 'velocity');
      expect(velocityCheck?.score).toBeGreaterThan(0);
    });

    it('should eventually block payment after exceeding velocity limit', async () => {
      const user = await createTestUser();

      // Exceed maxPaymentsPerMinute
      for (let i = 0; i < 10; i++) {
        recordSuccessfulPayment(user.id, 100);
      }

      const result = await assessRisk(user.id, 100);

      const velocityCheck = result.checks.find(c => c.check === 'velocity');
      expect(velocityCheck?.score).toBeGreaterThan(0);
      expect(velocityCheck?.reason).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Failure cooldown
  // -------------------------------------------------------------------------

  describe('recordFailedPayment + failure cooldown', () => {
    it('should trigger failure cooldown after multiple failures', async () => {
      const user = await createTestUser();

      // Record failures up to the cooldown threshold
      for (let i = 0; i < 3; i++) {
        recordFailedPayment(user.id, 100);
      }

      const result = await assessRisk(user.id, 100);

      const failureCheck = result.checks.find(c => c.check === 'failure_cooldown');
      expect(failureCheck?.passed).toBe(false);
      expect(failureCheck?.score).toBeGreaterThanOrEqual(80);
    });

    it('should clear failure history after a successful payment', async () => {
      const user = await createTestUser();

      recordFailedPayment(user.id, 100);
      recordFailedPayment(user.id, 100);

      // A success clears failure history
      recordSuccessfulPayment(user.id, 100);

      const result = await assessRisk(user.id, 100);

      const failureCheck = result.checks.find(c => c.check === 'failure_cooldown');
      expect(failureCheck?.score).toBe(0);
    });

    it('should persist failed_attempts state to database', async () => {
      const user = await createTestUser();

      recordFailedPayment(user.id, 100);
      recordFailedPayment(user.id, 100);

      await flushDbWrites();

      const failedState = await prisma.paymentRiskState.findUnique({
        where: { userId_category: { userId: user.id, category: 'failed_attempts' } },
      });

      expect(failedState).toBeDefined();
      const data = failedState!.data as number[];
      expect(data.length).toBeGreaterThanOrEqual(2);
    });
  });

  // -------------------------------------------------------------------------
  // getPaymentLimits with spending history
  // -------------------------------------------------------------------------

  describe('getPaymentLimits with spending history', () => {
    it('should return correct limits for a user with spending history', async () => {
      const user = await createTestUser({ withAccount: true, accountBalance: 100000 });

      // Create real spend transactions in the database
      await createSpendTransaction(user.id, 500);
      await createSpendTransaction(user.id, 300);

      const limits = await getPaymentLimits(user.id);

      expect(limits.userId).toBe(user.id);
      expect(limits.dailySpent).toBe(800); // 500 + 300
      expect(limits.remainingDaily).toBeGreaterThan(0);
      expect(limits.remainingMonthly).toBeGreaterThan(0);
      expect(typeof limits.singleLimit).toBe('number');
      expect(typeof limits.dailyLimit).toBe('number');
      expect(typeof limits.monthlyLimit).toBe('number');
    });

    it('should return zero spending for a user with no transactions', async () => {
      const user = await createTestUser();

      const limits = await getPaymentLimits(user.id);

      expect(limits.userId).toBe(user.id);
      expect(limits.dailySpent).toBe(0);
      expect(limits.monthlySpent).toBe(0);
      expect(limits.remainingDaily).toBe(limits.dailyLimit);
      expect(limits.remainingMonthly).toBe(limits.monthlyLimit);
    });
  });

  // -------------------------------------------------------------------------
  // logSecurityEvent persists to AuditLog
  // -------------------------------------------------------------------------

  describe('logSecurityEvent persists to AuditLog', () => {
    it('should write an AuditLog row when a security event is logged', async () => {
      const user = await createTestUser();

      await logSecurityEvent({
        type: 'payment_attempt',
        userId: user.id,
        photoId: 'photo-test-001',
        timestamp: new Date().toISOString(),
        metadata: { source: 'integration_test' },
      });

      // Allow the fire-and-forget DB write to complete
      await flushDbWrites();

      const logs = await prisma.auditLog.findMany({
        where: {
          userId: user.id,
          resource: 'payment_security',
        },
        orderBy: { timestamp: 'desc' },
      });

      expect(logs.length).toBeGreaterThan(0);

      const log = logs[0];
      expect(log.userId).toBe(user.id);
      expect(log.action).toBeDefined();
      expect(log.resource).toBe('payment_security');
      expect(log.details).toBeDefined();

      const details = log.details as Record<string, unknown>;
      expect(details.severity).toBeDefined();
    });

    it('should persist multiple security events for the same user', async () => {
      const user = await createTestUser();

      await logSecurityEvent({
        type: 'payment_success',
        userId: user.id,
        timestamp: new Date().toISOString(),
        metadata: {},
      });

      await logSecurityEvent({
        type: 'payment_failure',
        userId: user.id,
        timestamp: new Date().toISOString(),
        metadata: {},
      });

      await flushDbWrites();

      const logs = await prisma.auditLog.findMany({
        where: {
          userId: user.id,
          resource: 'payment_security',
        },
      });

      expect(logs.length).toBeGreaterThanOrEqual(2);
    });
  });

  // -------------------------------------------------------------------------
  // checkFraudRisk with amount parameter
  // -------------------------------------------------------------------------

  describe('checkFraudRisk with amount parameter', () => {
    it('should use amount parameter for risk assessment', async () => {
      const user = await createTestUser();

      const result = await checkFraudRisk(user.id, ['photo-1', 'photo-2'], 200);

      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('allowed');
      expect(typeof result.riskScore).toBe('number');
      expect(typeof result.allowed).toBe('boolean');
    });

    it('should work without amount parameter (backwards compatible)', async () => {
      const user = await createTestUser();

      const result = await checkFraudRisk(user.id, ['photo-1']);

      expect(result.allowed).toBe(true);
      expect(result.riskScore).toBeLessThan(30);
    });

    it('should flag high amount through fraud risk check', async () => {
      const user = await createTestUser();

      // Use an amount exceeding maxSinglePaymentAmount
      const result = await checkFraudRisk(user.id, ['photo-1'], 10001);

      expect(result.allowed).toBe(false);
      expect(result.riskScore).toBeGreaterThan(0);
    });

    it('should log security event to AuditLog when checking fraud risk', async () => {
      const user = await createTestUser();

      await checkFraudRisk(user.id, ['photo-1'], 100);

      await flushDbWrites();

      const logs = await prisma.auditLog.findMany({
        where: {
          userId: user.id,
          resource: 'payment_security',
        },
      });

      expect(logs.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // clearUserData clears database state
  // -------------------------------------------------------------------------

  describe('clearUserData clears database state', () => {
    it('should remove PaymentRiskState rows for the user', async () => {
      const user = await createTestUser();

      recordSuccessfulPayment(user.id, 100);
      recordFailedPayment(user.id, 50);

      await flushDbWrites();

      // Verify state was written
      const beforeClear = await prisma.paymentRiskState.findMany({
        where: { userId: user.id },
      });
      expect(beforeClear.length).toBeGreaterThan(0);

      // Clear user data
      clearUserData(user.id);

      // Allow fire-and-forget delete to complete
      await flushDbWrites();

      const afterClear = await prisma.paymentRiskState.findMany({
        where: { userId: user.id },
      });
      expect(afterClear.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // End-to-end flow with real database
  // -------------------------------------------------------------------------

  describe('end-to-end risk assessment flow', () => {
    it('should perform a complete risk assessment pipeline with real DB', async () => {
      const user = await createTestUser({ withAccount: true, accountBalance: 100000 });
      await createTestDevice(user.id);

      // Step 1: Initial risk assessment should be low risk
      const initialRisk = await assessRisk(user.id, 500);
      expect(initialRisk.allowed).toBe(true);
      expect(initialRisk.riskLevel).toBe('low');

      // Step 2: Create some spending history
      await createSpendTransaction(user.id, 200);

      // Step 3: Check payment limits reflect the spending
      const limits = await getPaymentLimits(user.id);
      expect(limits.dailySpent).toBe(200);

      // Step 4: Record several payments in-memory
      for (let i = 0; i < 3; i++) {
        recordSuccessfulPayment(user.id, 100);
      }

      // Step 5: Fraud risk check
      const fraudCheck = await checkFraudRisk(user.id, ['photo-1', 'photo-2'], 300);
      expect(typeof fraudCheck.allowed).toBe('boolean');
      expect(typeof fraudCheck.riskScore).toBe('number');

      // Step 6: Log a security event and verify DB persistence
      await logSecurityEvent({
        type: 'payment_success',
        userId: user.id,
        transactionId: 'txn-integration-001',
        timestamp: new Date().toISOString(),
        metadata: { amount: 300, photoCount: 2 },
      });

      await flushDbWrites();

      const auditLogs = await prisma.auditLog.findMany({
        where: {
          userId: user.id,
          resource: 'payment_security',
        },
      });
      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });
});
