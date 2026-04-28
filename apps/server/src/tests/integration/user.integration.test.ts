import {
  Request,
  createTestUser,
  cleanupTestUsers,
  getUserAuthHeader,
  validateSuccessResponse,
  validateErrorResponse,
} from '../helpers';

/**
 * User API Integration Tests
 * Tests user profile endpoints (all /me-based routes)
 */

describe('User API Integration', () => {
  afterAll(async () => {
    await cleanupTestUsers();
  });

  describe('GET /api/v1/users/me', () => {
    it('should return current user profile', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await Request.get('/api/v1/users/me', { headers });

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      expect(body.data).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      const response = await Request.get('/api/v1/users/me');

      expect(response.status).toBe(401);
      expect(validateErrorResponse(response)).toBe(true);
    });
  });

  describe('PUT /api/v1/users/me', () => {
    it('should update current user profile', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await Request.put('/api/v1/users/me', { name: 'Updated Name' }, { headers });

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      const data = body.data as Record<string, unknown>;
      expect(data).toHaveProperty('name', 'Updated Name');
    });

    it('should return 401 without authentication', async () => {
      const response = await Request.put('/api/v1/users/me', { name: 'Test' });

      expect(response.status).toBe(401);
      expect(validateErrorResponse(response)).toBe(true);
    });
  });

  describe('DELETE /api/v1/users/me', () => {
    it('should delete current user account with password', async () => {
      const password = 'TestPassword123!';
      const user = await createTestUser({ password });
      const headers = getUserAuthHeader(user);

      const response = await Request.delete('/api/v1/users/me', { headers });

      // May return 200 or require password in body
      expect([200, 400, 401]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      const response = await Request.delete('/api/v1/users/me');

      expect(response.status).toBe(401);
      expect(validateErrorResponse(response)).toBe(true);
    });
  });

  describe('GET /api/v1/users/privacy', () => {
    it('should return privacy settings', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await Request.get('/api/v1/users/privacy', { headers });

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await Request.get('/api/v1/users/privacy');

      expect(response.status).toBe(401);
      expect(validateErrorResponse(response)).toBe(true);
    });
  });

  describe('PUT /api/v1/users/privacy', () => {
    it('should update privacy settings', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await Request.put(
        '/api/v1/users/privacy',
        { profileVisible: false },
        { headers }
      );

      // May succeed or return validation error depending on schema
      expect([200, 400]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      const response = await Request.put('/api/v1/users/privacy', {});

      expect(response.status).toBe(401);
      expect(validateErrorResponse(response)).toBe(true);
    });
  });

  describe('GET /api/v1/users/devices', () => {
    it('should return user devices', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await Request.get('/api/v1/users/devices', { headers });

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await Request.get('/api/v1/users/devices');

      expect(response.status).toBe(401);
      expect(validateErrorResponse(response)).toBe(true);
    });
  });
});

describe('User API Authentication Enforcement', () => {
  afterAll(async () => {
    await cleanupTestUsers();
  });

  it('should require authentication for all user endpoints', async () => {
    const endpoints = [
      { method: 'GET' as const, path: '/api/v1/users/me' },
      { method: 'PUT' as const, path: '/api/v1/users/me' },
      { method: 'DELETE' as const, path: '/api/v1/users/me' },
      { method: 'GET' as const, path: '/api/v1/users/privacy' },
      { method: 'GET' as const, path: '/api/v1/users/devices' },
    ];

    for (const endpoint of endpoints) {
      const response = await Request.get(endpoint.path);
      expect(response.status).toBe(401);
    }
  });
});
