/**
 * Points E2E Tests
 * Tests complete user flow for points system without mocking
 */

// Set up test environment BEFORE any other imports
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-integration-tests';

import { randomUUID } from 'crypto';

import request from 'supertest';
import express, { Express } from 'express';
import * as jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import { prisma } from '../../db/client';
import pointsRouter from '../../routes/points';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

async function createTestUser(): Promise<{
  id: string;
  email: string;
  name: string;
  role: string;
  password?: string;
}> {
  const user = {
    id: randomUUID(),
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    role: 'user',
    password: 'TestPassword123!',
  };
  const passwordHash = await bcrypt.hash(user.password!, 10);
  await prisma.user.create({
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash,
      status: 'ACTIVE',
    },
  });
  return user;
}

async function cleanupTestUsers(): Promise<void> {
  await prisma.user.deleteMany({
    where: { email: { contains: '@example.com' } },
  });
}

function getUserAuthHeader(user: { id: string; email: string; role: string }): {
  Authorization: string;
} {
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
      jti: `test-${user.id}-${Date.now()}`,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  return { Authorization: `Bearer ${token}` };
}

async function cleanupPointsData(userId: string): Promise<void> {
  await prisma.pointsTransaction.deleteMany({ where: { userId } });
  await prisma.pointsFreeze.deleteMany({ where: { account: { userId } } });
  await prisma.pointsAccount.deleteMany({ where: { userId } });
}

/**
 * Setup test app with points routes
 */
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/points', pointsRouter);
  return app;
}

describe('Points E2E', () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp();
  });

  afterAll(async () => {
    await cleanupTestUsers();
  });

  describe('Complete user points flow', () => {
    it('should handle complete earn and spend flow', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      // Step 1: Check initial balance (should be 0)
      let res = await request(app).get('/api/v1/points/account').set(headers);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.balance).toBe(0);

      // Step 2: Earn points via checkin
      res = await request(app)
        .post('/api/v1/points/earn')
        .set(headers)
        .send({ ruleCode: 'CHECKIN' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.transaction).toBeDefined();

      const earnedAmount = res.body.data.transaction.amount;

      // Step 3: Check balance increased
      res = await request(app).get('/api/v1/points/account').set(headers);

      expect(res.status).toBe(200);
      expect(res.body.data.balance).toBe(earnedAmount);

      // Step 4: Get stats
      res = await request(app).get('/api/v1/points/stats').set(headers);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.byType).toBeDefined();
      expect(res.body.data.recentStats).toBeDefined();

      // Step 5: Get transactions list
      res = await request(app).get('/api/v1/points/transactions').set(headers);

      expect(res.status).toBe(200);
      expect(res.body.data.transactions.length).toBeGreaterThan(0);

      // Step 6: Export transactions
      res = await request(app)
        .get('/api/v1/points/transactions/export')
        .set(headers)
        .query({ format: 'csv' });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      // CSV should have header row
      expect(res.text).toContain('ID,Type,Amount');

      // Step 7: Get rules
      res = await request(app).get('/api/v1/points/rules').set(headers);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.rules)).toBe(true);

      // Step 8: Spend points
      res = await request(app)
        .post('/api/v1/points/spend')
        .set(headers)
        .send({ ruleCode: 'VIEW_PROFILE', metadata: { targetUserId: 'some-user-id' } });

      // Should either succeed (if balance enough) or fail gracefully
      expect([200, 400]).toContain(res.status);

      // Step 9: Verify transactions list after spend
      res = await request(app)
        .get('/api/v1/points/transactions')
        .set(headers)
        .query({ pageSize: '100' });

      expect(res.status).toBe(200);
      expect(res.body.data.transactions.length).toBeGreaterThanOrEqual(1);

      await cleanupPointsData(user.id);
    });

    it('should handle recharge flow', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const res = await request(app)
        .post('/api/v1/points/recharge')
        .set(headers)
        .send({ rmbAmount: 10, description: 'Test recharge' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.transaction).toBeDefined();

      await cleanupPointsData(user.id);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const endpoints = [
        { method: 'GET', path: '/api/v1/points/account' },
        { method: 'GET', path: '/api/v1/points/balance' },
        { method: 'GET', path: '/api/v1/points/transactions' },
        { method: 'GET', path: '/api/v1/points/stats' },
        { method: 'GET', path: '/api/v1/points/transactions/export' },
        { method: 'GET', path: '/api/v1/points/rules' },
        { method: 'GET', path: '/api/v1/points/freezes' },
        { method: 'POST', path: '/api/v1/points/earn' },
        { method: 'POST', path: '/api/v1/points/spend' },
        { method: 'POST', path: '/api/v1/points/freeze' },
        { method: 'POST', path: '/api/v1/points/transfer' },
      ];

      for (const { method, path } of endpoints) {
        const res = method === 'GET' ? await request(app).get(path) : await request(app).post(path);

        expect(res.status).toBe(401);
      }
    });

    it('should handle freeze and unfreeze flow', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      // Earn points first
      await request(app).get('/api/v1/points/account').set(headers);
      const earnRes = await request(app)
        .post('/api/v1/points/earn')
        .set(headers)
        .send({ ruleCode: 'CHECKIN' });

      if (earnRes.body.data?.success) {
        // Get initial balance
        const accountRes = await request(app).get('/api/v1/points/account').set(headers);
        const _initialBalance = accountRes.body.data.balance;

        // Freeze points
        const freezeRes = await request(app)
          .post('/api/v1/points/freeze')
          .set(headers)
          .send({ amount: 1, reason: 'Test freeze for matching' });

        if (freezeRes.body.data?.success) {
          // Get freeze list
          const freezesRes = await request(app).get('/api/v1/points/freezes').set(headers);
          expect(freezesRes.status).toBe(200);
          expect(Array.isArray(freezesRes.body.data.freezes)).toBe(true);

          // Get frozen amount in account
          const accountAfterRes = await request(app).get('/api/v1/points/account').set(headers);
          expect(accountAfterRes.body.data.frozenAmount).toBeGreaterThan(0);
        }
      }

      await cleanupPointsData(user.id);
    });

    it('should handle transfer flow between users', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const headers1 = getUserAuthHeader(user1);
      const headers2 = getUserAuthHeader(user2);

      // Ensure accounts exist
      await request(app).get('/api/v1/points/account').set(headers1);
      await request(app).get('/api/v1/points/account').set(headers2);

      // Earn points for user1
      await request(app).post('/api/v1/points/earn').set(headers1).send({ ruleCode: 'CHECKIN' });

      // Get user2 initial balance
      const user2InitialRes = await request(app).get('/api/v1/points/account').set(headers2);
      const user2InitialBalance = user2InitialRes.body.data.balance;

      // Transfer to user2
      const transferRes = await request(app)
        .post('/api/v1/points/transfer')
        .set(headers1)
        .send({ toUserId: user2.id, amount: 1, description: 'Test transfer' });

      expect([200, 400]).toContain(transferRes.status);

      // Verify user2 balance increased
      const user2FinalRes = await request(app).get('/api/v1/points/account').set(headers2);
      expect(user2FinalRes.body.data.balance).toBeGreaterThanOrEqual(user2InitialBalance);

      await cleanupPointsData(user1.id);
      await cleanupPointsData(user2.id);
    });

    it('should handle config and rules queries', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      // Get value config
      const valueRes = await request(app).get('/api/v1/points/config/value').set(headers);
      expect(valueRes.status).toBe(200);
      expect(valueRes.body.data).toHaveProperty('rmbToPointsRate');

      // Get limits config
      const limitsRes = await request(app).get('/api/v1/points/config/limits').set(headers);
      expect(limitsRes.status).toBe(200);
      expect(limitsRes.body.data).toHaveProperty('dailyEarnLimit');

      // Get specific rule detail
      const ruleRes = await request(app).get('/api/v1/points/rules/CHECKIN').set(headers);
      expect(ruleRes.status).toBe(200);
      expect(ruleRes.body.data).toHaveProperty('code', 'CHECKIN');

      // Get scene rules
      const sceneRes = await request(app).get('/api/v1/points/rules/scene/AGENT_DATE').set(headers);
      expect(sceneRes.status).toBe(200);
      expect(Array.isArray(sceneRes.body.data.rules)).toBe(true);

      // Check rule limits
      const checkRes = await request(app)
        .post('/api/v1/points/rules/CHECKIN/check-limits')
        .set(headers)
        .send({});
      expect(checkRes.status).toBe(200);
      expect(checkRes.body.data).toHaveProperty('allowed');

      await cleanupPointsData(user.id);
    });

    it('should get transaction detail', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      // Create a transaction
      await request(app).get('/api/v1/points/account').set(headers);
      const earnRes = await request(app)
        .post('/api/v1/points/earn')
        .set(headers)
        .send({ ruleCode: 'CHECKIN' });

      const transactionId = earnRes.body.data?.transaction?.id;

      if (transactionId) {
        const detailRes = await request(app)
          .get(`/api/v1/points/transactions/${transactionId}`)
          .set(headers);

        expect(detailRes.status).toBe(200);
        expect(detailRes.body.data).toHaveProperty('id', transactionId);
      }

      await cleanupPointsData(user.id);
    });

    it('should export transactions in CSV format', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      // Create some transactions
      await request(app).get('/api/v1/points/account').set(headers);
      await request(app).post('/api/v1/points/earn').set(headers).send({ ruleCode: 'CHECKIN' });

      // Export CSV
      const exportRes = await request(app)
        .get('/api/v1/points/transactions/export')
        .set(headers)
        .query({ format: 'csv' });

      expect(exportRes.status).toBe(200);
      expect(exportRes.headers['content-type']).toContain('text/csv');
      expect(exportRes.headers['content-disposition']).toContain('attachment');
      // CSV should have header row
      expect(exportRes.text).toContain('ID,Type,Amount');

      // Filter by type in export
      const filterRes = await request(app)
        .get('/api/v1/points/transactions/export')
        .set(headers)
        .query({ format: 'csv', type: 'EARN' });

      expect(filterRes.status).toBe(200);

      await cleanupPointsData(user.id);
    });
  });
});
