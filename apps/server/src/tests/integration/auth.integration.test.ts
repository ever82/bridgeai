import {
  Request,
  ApiPaths,
  createTestUser,
  cleanupTestUsers,
  getUserAuthHeader,
  AuthHeaders,
  createValidator,
  StatusValidators,
  validateSuccessResponse,
  validateErrorResponse,
  TestUserRole,
} from '../helpers';

/**
 * Authentication API Integration Tests
 * Tests authentication endpoints and flows
 */

describe('Authentication API Integration', () => {
  afterAll(async () => {
    await cleanupTestUsers();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: `newuser-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        name: 'New Test User',
      };

      const response = await Request.post(ApiPaths.auth.register, userData);

      expect(response.status).toBe(201);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      expect(body.data).toHaveProperty('id');
      expect(body.data).toHaveProperty('email', userData.email);
      expect(body.data).toHaveProperty('name', userData.name);
      expect(body.data).not.toHaveProperty('password');
    });

    it('should return 400 for invalid email', async () => {
      const response = await Request.post(ApiPaths.auth.register, {
        email: 'invalid-email',
        password: 'SecurePassword123!',
        name: 'Test User',
      });

      expect(response.status).toBe(400);
      expect(validateErrorResponse(response)).toBe(true);
    });

    it('should return 400 for weak password', async () => {
      const response = await Request.post(ApiPaths.auth.register, {
        email: `test-${Date.now()}@example.com`,
        password: '123',
        name: 'Test User',
      });

      expect(response.status).toBe(400);
      expect(validateErrorResponse(response)).toBe(true);
    });

    it('should return 409 for duplicate email', async () => {
      const user = await createTestUser();

      const response = await Request.post(ApiPaths.auth.register, {
        email: user.email,
        password: 'SecurePassword123!',
        name: 'Duplicate User',
      });

      expect(response.status).toBe(409);
      expect(validateErrorResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      expect(body.errorCode).toBe('DUPLICATE_EMAIL');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const password = 'SecurePassword123!';
      const user = await createTestUser({ password });

      const response = await Request.post(ApiPaths.auth.login, {
        email: user.email,
        password,
      });

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      expect(body.data).toHaveProperty('accessToken');
      expect(body.data).toHaveProperty('refreshToken');
      expect(body.data).toHaveProperty('user');
    });

    it('should return 401 for invalid credentials', async () => {
      const user = await createTestUser();

      const response = await Request.post(ApiPaths.auth.login, {
        email: user.email,
        password: 'wrongpassword',
      });

      expect(response.status).toBe(401);
      expect(validateErrorResponse(response)).toBe(true);
    });

    it('should return 401 for non-existent user', async () => {
      const response = await Request.post(ApiPaths.auth.login, {
        email: 'nonexistent@example.com',
        password: 'anypassword',
      });

      expect(response.status).toBe(401);
      expect(validateErrorResponse(response)).toBe(true);
    });

    it('should return 400 for missing credentials', async () => {
      const response = await Request.post(ApiPaths.auth.login, {});

      expect(response.status).toBe(400);
      expect(validateErrorResponse(response)).toBe(true);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const user = await createTestUser();
      const { generateTokens } = require('../helpers/auth');
      const { refreshToken } = generateTokens(user);

      const response = await Request.post(ApiPaths.auth.refresh, {
        refreshToken,
      });

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      expect(body.data).toHaveProperty('accessToken');
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await Request.post(ApiPaths.auth.refresh, {
        refreshToken: 'invalid.token.here',
      });

      expect(response.status).toBe(401);
      expect(validateErrorResponse(response)).toBe(true);
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await Request.post(ApiPaths.auth.refresh, {});

      expect(response.status).toBe(400);
      expect(validateErrorResponse(response)).toBe(true);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await Request.post(ApiPaths.auth.logout, {}, { headers });

      // Depending on implementation, may return 200 or 204
      expect([200, 204]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      const response = await Request.post(ApiPaths.auth.logout, {});

      expect(response.status).toBe(401);
      expect(validateErrorResponse(response)).toBe(true);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user profile', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await Request.get(ApiPaths.auth.me, { headers });

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      expect(body.data).toHaveProperty('id', user.id);
      expect(body.data).toHaveProperty('email', user.email);
    });

    it('should return 401 without authentication', async () => {
      const response = await Request.get(ApiPaths.auth.me);

      expect(response.status).toBe(401);
      expect(validateErrorResponse(response)).toBe(true);
    });

    it('should return 401 with expired token', async () => {
      const user = await createTestUser();
      const { generateExpiredToken } = require('../helpers/auth');
      const headers = { Authorization: `Bearer ${generateExpiredToken(user)}` };

      const response = await Request.get(ApiPaths.auth.me, { headers });

      expect(response.status).toBe(401);
      expect(validateErrorResponse(response)).toBe(true);
    });

    it('should return 401 with invalid token', async () => {
      const response = await Request.get(ApiPaths.auth.me, {
        headers: AuthHeaders.invalid(),
      });

      expect(response.status).toBe(401);
      expect(validateErrorResponse(response)).toBe(true);
    });
  });
});

describe('Authentication Error Scenarios', () => {
  it('should handle authentication edge cases', async () => {
    const testCases = [
      {
        name: 'empty authorization header',
        headers: AuthHeaders.empty(),
        expectedStatus: 401,
      },
      {
        name: 'malformed authorization header',
        headers: AuthHeaders.malformed(await createTestUser()),
        expectedStatus: 401,
      },
      {
        name: 'missing authorization header',
        headers: AuthHeaders.missing(),
        expectedStatus: 401,
      },
    ];

    for (const testCase of testCases) {
      const response = await Request.get(ApiPaths.auth.me, {
        headers: testCase.headers,
      });

      expect(response.status).toBe(testCase.expectedStatus);
      expect(validateErrorResponse(response)).toBe(true);
    }
  });
});
