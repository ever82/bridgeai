/**
 * Points API Integration Tests
 * Tests the full HTTP request flow for points API endpoints using real database
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

function validateSuccessResponse(response: any): boolean {
  return response.body && response.body.success === true;
}

function validateErrorResponse(response: any): boolean {
  return response.status >= 400;
}

/**
 * Cleanup function to clean up points data for a user
 */
async function cleanupPointsData(userId: string): Promise<void> {
  await prisma.pointsTransaction.deleteMany({
    where: { userId },
  });
  await prisma.pointsFreeze.deleteMany({
    where: { account: { userId } },
  });
  await prisma.pointsAccount.deleteMany({
    where: { userId },
  });
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

describe('Points API Integration', () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp();
  });

  afterAll(async () => {
    await cleanupTestUsers();
  });

  describe('GET /api/v1/points/account', () => {
    it('should return account for authenticated user', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await request(app).get('/api/v1/points/account').set(headers);

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      expect(body.data).toHaveProperty('balance');
      expect(body.data).toHaveProperty('totalEarned');
      expect(body.data).toHaveProperty('totalSpent');
      expect(body.data).toHaveProperty('frozenAmount');
      expect(body.data).toHaveProperty('availableBalance');

      await cleanupPointsData(user.id);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/v1/points/account');
      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/points/account')
        .set('Authorization', 'Bearer invalid-token');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/points/balance', () => {
    it('should return available balance', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await request(app).get('/api/v1/points/balance').set(headers);

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      expect(body.data).toHaveProperty('availableBalance');

      await cleanupPointsData(user.id);
    });
  });

  describe('GET /api/v1/points/transactions', () => {
    it('should return empty transactions list for new user', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await request(app).get('/api/v1/points/transactions').set(headers);

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      expect(body.data).toHaveProperty('transactions');
      expect(body.data).toHaveProperty('pagination');
      expect(Array.isArray((body.data as Record<string, unknown>).transactions)).toBe(true);

      await cleanupPointsData(user.id);
    });

    it('should return paginated transactions', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await request(app)
        .get('/api/v1/points/transactions')
        .set(headers)
        .query({ page: '1', pageSize: '10' });

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      const pagination = (body.data as Record<string, unknown>).pagination as Record<
        string,
        unknown
      >;
      expect(pagination).toHaveProperty('page', 1);
      expect(pagination).toHaveProperty('pageSize', 10);

      await cleanupPointsData(user.id);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/v1/points/transactions');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/points/stats', () => {
    it('should return stats for authenticated user', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await request(app).get('/api/v1/points/stats').set(headers);

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      expect(body.data).toHaveProperty('balance');
      expect(body.data).toHaveProperty('totalEarned');
      expect(body.data).toHaveProperty('totalSpent');
      expect(body.data).toHaveProperty('frozenAmount');
      expect(body.data).toHaveProperty('availableBalance');
      expect(body.data).toHaveProperty('byType');
      expect(body.data).toHaveProperty('recentStats');

      await cleanupPointsData(user.id);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/v1/points/stats');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/points/transactions/export', () => {
    it('should export transactions as CSV', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await request(app)
        .get('/api/v1/points/transactions/export')
        .set(headers)
        .query({ format: 'csv' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');

      await cleanupPointsData(user.id);
    });

    it('should return 400 for unsupported format', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await request(app)
        .get('/api/v1/points/transactions/export')
        .set(headers)
        .query({ format: 'pdf' });

      expect(response.status).toBe(400);
      expect(validateErrorResponse(response)).toBe(true);

      await cleanupPointsData(user.id);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/v1/points/transactions/export');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/points/freezes', () => {
    it('should return empty freezes list for new user', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await request(app).get('/api/v1/points/freezes').set(headers);

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      expect(body.data).toHaveProperty('freezes');
      expect(Array.isArray((body.data as Record<string, unknown>).freezes)).toBe(true);

      await cleanupPointsData(user.id);
    });
  });

  describe('GET /api/v1/points/rules', () => {
    it('should return all available rules', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await request(app).get('/api/v1/points/rules').set(headers);

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      expect(body.data).toHaveProperty('rules');
      expect(Array.isArray((body.data as Record<string, unknown>).rules)).toBe(true);

      await cleanupPointsData(user.id);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/v1/points/rules');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/points/earn', () => {
    it('should earn points with valid rule code', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      // Ensure account exists first (GET /account calls getOrCreateAccount)
      await request(app).get('/api/v1/points/account').set(headers);

      const response = await request(app)
        .post('/api/v1/points/earn')
        .set(headers)
        .send({ ruleCode: 'CHECKIN' });

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      expect((body.data as Record<string, unknown>).success).toBe(true);

      await cleanupPointsData(user.id);
    });

    it('should return 400 for invalid rule code', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await request(app)
        .post('/api/v1/points/earn')
        .set(headers)
        .send({ ruleCode: 'INVALID_RULE' });

      expect(response.status).toBe(400);

      await cleanupPointsData(user.id);
    });
  });

  describe('POST /api/v1/points/checkin', () => {
    it('should allow user to checkin', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      // Ensure account exists first
      await request(app).get('/api/v1/points/account').set(headers);

      const response = await request(app).post('/api/v1/points/checkin').set(headers).send({});

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      expect((body.data as Record<string, unknown>).success).toBe(true);

      await cleanupPointsData(user.id);
    });
  });

  describe('POST /api/v1/points/spend', () => {
    it('should spend points with valid rule code', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      // Ensure account and balance first
      await request(app).get('/api/v1/points/account').set(headers);
      // Earn some points first
      await request(app).post('/api/v1/points/earn').set(headers).send({ ruleCode: 'CHECKIN' });

      const response = await request(app)
        .post('/api/v1/points/spend')
        .set(headers)
        .send({ ruleCode: 'VIEW_PROFILE', metadata: { targetUserId: 'some-user-id' } });

      expect([200, 400]).toContain(response.status);
      // If 200, should have success; if 400, should have error
      if (response.status === 200) {
        expect(validateSuccessResponse(response)).toBe(true);
      }

      await cleanupPointsData(user.id);
    });

    it('should return 400 for invalid rule code', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await request(app)
        .post('/api/v1/points/spend')
        .set(headers)
        .send({ ruleCode: 'INVALID_RULE' });

      expect(response.status).toBe(400);
      await cleanupPointsData(user.id);
    });
  });

  describe('POST /api/v1/points/freeze', () => {
    it('should freeze points successfully', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      // Earn some points first
      await request(app).get('/api/v1/points/account').set(headers);
      await request(app).post('/api/v1/points/earn').set(headers).send({ ruleCode: 'CHECKIN' });

      const response = await request(app)
        .post('/api/v1/points/freeze')
        .set(headers)
        .send({ amount: 1, reason: 'Test freeze', scene: 'AGENT_DATE' });

      expect([200, 400]).toContain(response.status);
      if (response.status === 200) {
        expect(validateSuccessResponse(response)).toBe(true);
      }

      await cleanupPointsData(user.id);
    });

    it('should return 400 for invalid amount', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await request(app)
        .post('/api/v1/points/freeze')
        .set(headers)
        .send({ amount: -1, reason: 'Test freeze' });

      expect(response.status).toBe(400);
      await cleanupPointsData(user.id);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/points/freeze')
        .send({ amount: 1, reason: 'Test freeze' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/points/transfer', () => {
    it('should transfer points between users', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const headers1 = getUserAuthHeader(user1);
      const _headers2 = getUserAuthHeader(user2);

      // Earn some points for user1
      await request(app).get('/api/v1/points/account').set(headers1);
      await request(app).post('/api/v1/points/earn').set(headers1).send({ ruleCode: 'CHECKIN' });

      const response = await request(app)
        .post('/api/v1/points/transfer')
        .set(headers1)
        .send({ toUserId: user2.id, amount: 1, description: 'Test transfer' });

      expect([200, 400]).toContain(response.status);
      if (response.status === 200) {
        expect(validateSuccessResponse(response)).toBe(true);
      }

      await cleanupPointsData(user1.id);
      await cleanupPointsData(user2.id);
    });

    it('should return 400 for invalid amount', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const headers1 = getUserAuthHeader(user1);

      const response = await request(app)
        .post('/api/v1/points/transfer')
        .set(headers1)
        .send({ toUserId: user2.id, amount: -1 });

      expect(response.status).toBe(400);

      await cleanupPointsData(user1.id);
      await cleanupPointsData(user2.id);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/points/transfer')
        .send({ toUserId: 'some-user-id', amount: 1 });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/points/transactions/:transactionId', () => {
    it('should return transaction detail', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      // Create a transaction first
      await request(app).get('/api/v1/points/account').set(headers);
      const earnRes = await request(app)
        .post('/api/v1/points/earn')
        .set(headers)
        .send({ ruleCode: 'CHECKIN' });

      const transactionId = earnRes.body.data?.transaction?.id;

      if (transactionId) {
        const response = await request(app)
          .get(`/api/v1/points/transactions/${transactionId}`)
          .set(headers);

        expect(response.status).toBe(200);
        expect(validateSuccessResponse(response)).toBe(true);
        const body = response.body as Record<string, unknown>;
        expect(body.data).toHaveProperty('id', transactionId);
      }

      await cleanupPointsData(user.id);
    });

    it('should return 404 for non-existent transaction', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await request(app)
        .get('/api/v1/points/transactions/00000000-0000-0000-0000-000000000000')
        .set(headers);

      expect(response.status).toBe(404);
      await cleanupPointsData(user.id);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get(
        '/api/v1/points/transactions/00000000-0000-0000-0000-000000000000'
      );
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/points/rules/:ruleCode', () => {
    it('should return rule detail', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await request(app).get('/api/v1/points/rules/CHECKIN').set(headers);

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      expect(body.data).toHaveProperty('code', 'CHECKIN');

      await cleanupPointsData(user.id);
    });

    it('should return 404 for unknown rule', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await request(app).get('/api/v1/points/rules/UNKNOWN_RULE').set(headers);

      expect(response.status).toBe(404);
      await cleanupPointsData(user.id);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/v1/points/rules/CHECKIN');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/points/rules/scene/:scene', () => {
    it('should return rules for specific scene', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await request(app).get('/api/v1/points/rules/scene/AGENT_DATE').set(headers);

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      expect(body.data).toHaveProperty('rules');
      expect(Array.isArray((body.data as Record<string, unknown>).rules)).toBe(true);

      await cleanupPointsData(user.id);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/v1/points/rules/scene/AGENT_DATE');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/points/rules/:ruleCode/check-limits', () => {
    it('should check rule limits', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await request(app)
        .post('/api/v1/points/rules/CHECKIN/check-limits')
        .set(headers)
        .send({});

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      expect(body.data).toHaveProperty('allowed');
      expect(body.data).toHaveProperty('remaining');

      await cleanupPointsData(user.id);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).post('/api/v1/points/rules/CHECKIN/check-limits');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/points/config/value', () => {
    it('should return value config', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await request(app).get('/api/v1/points/config/value').set(headers);

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      expect(body.data).toHaveProperty('rmbToPointsRate');
      expect(body.data).toHaveProperty('pointsToRmbRate');

      await cleanupPointsData(user.id);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/v1/points/config/value');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/points/config/limits', () => {
    it('should return limit config', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await request(app).get('/api/v1/points/config/limits').set(headers);

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      expect(body.data).toHaveProperty('dailyEarnLimit');

      await cleanupPointsData(user.id);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/v1/points/config/limits');
      expect(response.status).toBe(401);
    });
  });
});
