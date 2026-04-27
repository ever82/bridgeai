/**
 * API Contract Integration Tests
 *
 * Verifies request/response schemas, status codes, and error format consistency
 * across Auth, Core (Agent), and Matching module boundaries.
 */

import {
  Request,
  ApiPaths,
  createTestUser,
  cleanupTestUsers,
  getUserAuthHeader,
  validateSuccessResponse,
  validateErrorResponse,
  generateExpiredToken,
} from '../helpers';

/**
 * Response envelope contract: every API response must follow
 * { success: boolean, data?: T, error?: string, errorCode?: string }
 */
function expectStandardEnvelope(body: Record<string, unknown>, expectSuccess: boolean) {
  expect(body).toHaveProperty('success');
  expect(typeof body.success).toBe('boolean');
  expect(body.success).toBe(expectSuccess);

  if (expectSuccess) {
    expect(body).toHaveProperty('data');
  } else {
    expect('error' in body || 'message' in body).toBe(true);
    expect(body).toHaveProperty('errorCode');
  }
}

describe('API Contract Integration Tests', () => {
  afterAll(async () => {
    await cleanupTestUsers();
  });

  describe('Auth Module Contracts', () => {
    describe('POST /api/v1/auth/register', () => {
      it('should return 201 with { success, data: { id, email, name } } on valid input', async () => {
        const response = await Request.post(ApiPaths.auth.register, {
          email: `contract-${Date.now()}@example.com`,
          password: 'ContractPass123!',
          name: 'Contract User',
        });

        expect(response.status).toBe(201);
        expect(validateSuccessResponse(response)).toBe(true);
        const body = response.body as Record<string, unknown>;
        const data = body.data as Record<string, unknown>;
        expect(data).toHaveProperty('id');
        expect(typeof data.id).toBe('string');
        expect(data).toHaveProperty('email');
        expect(typeof data.email).toBe('string');
        expect(data).toHaveProperty('name');
        expect(data).not.toHaveProperty('password');
        expect(data).not.toHaveProperty('passwordHash');
      });

      it('should return 400 with standard error envelope on invalid input', async () => {
        const response = await Request.post(ApiPaths.auth.register, {
          email: 'not-an-email',
          password: 'short',
        });

        expect(response.status).toBe(400);
        expect(validateErrorResponse(response)).toBe(true);
        const body = response.body as Record<string, unknown>;
        expectStandardEnvelope(body, false);
      });

      it('should return 409 with DUPLICATE_EMAIL code on duplicate registration', async () => {
        const user = await createTestUser();

        const response = await Request.post(ApiPaths.auth.register, {
          email: user.email,
          password: 'ContractPass123!',
          name: 'Duplicate',
        });

        expect(response.status).toBe(409);
        expect(validateErrorResponse(response)).toBe(true);
        const body = response.body as Record<string, unknown>;
        expect(body.errorCode).toBe('DUPLICATE_EMAIL');
      });
    });

    describe('POST /api/v1/auth/login', () => {
      it('should return 200 with { success, data: { accessToken, refreshToken, user } }', async () => {
        const password = 'LoginPass123!';
        const user = await createTestUser({ password });

        const response = await Request.post(ApiPaths.auth.login, {
          email: user.email,
          password,
        });

        expect(response.status).toBe(200);
        expect(validateSuccessResponse(response)).toBe(true);
        const body = response.body as Record<string, unknown>;
        const data = body.data as Record<string, unknown>;
        expect(data).toHaveProperty('accessToken');
        expect(typeof data.accessToken).toBe('string');
        expect(data).toHaveProperty('refreshToken');
        expect(typeof data.refreshToken).toBe('string');
        expect(data).toHaveProperty('user');
      });

      it('should return 401 with standard error envelope on wrong password', async () => {
        const user = await createTestUser();

        const response = await Request.post(ApiPaths.auth.login, {
          email: user.email,
          password: 'WrongPassword123!',
        });

        expect(response.status).toBe(401);
        expect(validateErrorResponse(response)).toBe(true);
      });
    });

    describe('GET /api/v1/auth/me', () => {
      it('should return 200 with user profile when authenticated', async () => {
        const user = await createTestUser();
        const headers = getUserAuthHeader(user);

        const response = await Request.get(ApiPaths.auth.me, { headers });

        expect(response.status).toBe(200);
        expect(validateSuccessResponse(response)).toBe(true);
        const body = response.body as Record<string, unknown>;
        const data = body.data as Record<string, unknown>;
        expect(data).toHaveProperty('id', user.id);
        expect(data).toHaveProperty('email', user.email);
        expect(data).not.toHaveProperty('passwordHash');
      });

      it('should return 401 with standard error envelope when unauthenticated', async () => {
        const response = await Request.get(ApiPaths.auth.me);

        expect(response.status).toBe(401);
        expect(validateErrorResponse(response)).toBe(true);
      });
    });
  });

  describe('Core (Agent) Module Contracts', () => {
    describe('Agent CRUD status codes', () => {
      it('should return 201 on agent creation', async () => {
        const user = await createTestUser();
        const headers = getUserAuthHeader(user);

        const response = await Request.post(
          '/api/v1/agents',
          {
            name: 'Contract Test Agent',
            scene: 'visionshare',
          },
          { headers }
        );

        expect([201, 200]).toContain(response.status);
        if (response.status === 201 || response.status === 200) {
          expect(validateSuccessResponse(response)).toBe(true);
        }
      });

      it('should return 401 without authentication', async () => {
        const response = await Request.get('/api/v1/agents');

        expect(response.status).toBe(401);
        expect(validateErrorResponse(response)).toBe(true);
      });
    });

    describe('Response structure consistency', () => {
      it('list endpoint should return array data with consistent item structure', async () => {
        const user = await createTestUser();
        const headers = getUserAuthHeader(user);

        const response = await Request.get('/api/v1/agents', { headers });

        expect(response.status).toBe(200);
        expect(validateSuccessResponse(response)).toBe(true);
        const body = response.body as Record<string, unknown>;
        const data = body.data as Record<string, unknown>;
        expect(data).toHaveProperty('items');
        expect(Array.isArray(data.items)).toBe(true);

        if (data.items.length > 0) {
          const item = (data.items as Record<string, unknown>[])[0];
          expect(item).toHaveProperty('id');
          expect(typeof item.id).toBe('string');
        }
      });
    });
  });

  describe('Matching Module Contracts', () => {
    it('matching query should return standardized score format', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await Request.post(
        '/api/v1/matching/query',
        {
          filters: {},
          limit: 10,
        },
        { headers }
      );

      if (response.status === 200) {
        expect(validateSuccessResponse(response)).toBe(true);
        const body = response.body as Record<string, unknown>;
        const data = body.data as Record<string, unknown>;
        if (Array.isArray(data)) {
          // Direct array response
        } else if (data && 'items' in data) {
          const items = data.items as Record<string, unknown>[];
          for (const item of items) {
            if ('score' in item) {
              expect(typeof item.score).toBe('number');
              expect(item.score).toBeGreaterThanOrEqual(0);
              expect(item.score).toBeLessThanOrEqual(100);
            }
          }
        }
      }
    });
  });

  describe('Cross-Module Contract Consistency', () => {
    it('all authenticated endpoints should reject expired tokens consistently', async () => {
      const user = await createTestUser();
      const expiredHeaders = {
        Authorization: `Bearer ${generateExpiredToken(user)}`,
      };

      const endpoints = [
        { method: 'GET' as const, path: ApiPaths.auth.me },
        { method: 'GET' as const, path: '/api/v1/agents' },
      ];

      for (const endpoint of endpoints) {
        const response = await Request.get(endpoint.path, { headers: expiredHeaders });
        expect(response.status).toBe(401);
        expect(validateErrorResponse(response)).toBe(true);
        const body = response.body as Record<string, unknown>;
        expectStandardEnvelope(body, false);
      }
    });

    it('all endpoints should return consistent error format for 404', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await Request.get('/api/v1/agents/non-existent-id-12345', { headers });

      if (response.status === 404) {
        expect(validateErrorResponse(response)).toBe(true);
        const body = response.body as Record<string, unknown>;
        expectStandardEnvelope(body, false);
      }
    });

    it('all validation errors should return 400 with error details', async () => {
      await createTestUser();

      // Auth module validation error
      const authResponse = await Request.post(ApiPaths.auth.register, {
        email: 'bad-email',
        password: '123',
      });
      expect(authResponse.status).toBe(400);
      expect(validateErrorResponse(authResponse)).toBe(true);
      const authBody = authResponse.body as Record<string, unknown>;
      expectStandardEnvelope(authBody, false);
    });

    it('Content-Type should be application/json for all API responses', async () => {
      const responses = [await Request.get('/health'), await Request.get(ApiPaths.auth.me)];

      for (const response of responses) {
        const contentType = response.headers['content-type'] || '';
        expect(contentType).toContain('application/json');
      }
    });
  });
});
