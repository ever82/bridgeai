import {
  Request,
  ApiPaths,
  createTestUser,
  createTestUsers,
  cleanupTestUsers,
  getUserAuthHeader,
  TestUserRole,
  validateSuccessResponse,
  validateErrorResponse,
} from '../helpers';

/**
 * User API Integration Tests
 * Tests user management endpoints
 */

describe('User API Integration', () => {
  afterAll(async () => {
    await cleanupTestUsers();
  });

  describe('GET /api/v1/users', () => {
    it('should list all users (admin only)', async () => {
      const admin = await createTestUser({ role: TestUserRole.ADMIN });
      const headers = getUserAuthHeader(admin);

      const response = await Request.get(ApiPaths.users.list, { headers });

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      expect(body.data).toHaveProperty('items');
      expect(body.data).toHaveProperty('pagination');
      expect(Array.isArray((body.data as Record<string, unknown>).items)).toBe(true);
    });

    it('should support pagination', async () => {
      const admin = await createTestUser({ role: TestUserRole.ADMIN });
      const headers = getUserAuthHeader(admin);

      const response = await Request.get(ApiPaths.users.list, {
        headers,
        query: { page: '1', limit: '10' },
      });

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      const data = body.data as Record<string, unknown>;
      const pagination = data.pagination as Record<string, unknown>;
      expect(pagination).toHaveProperty('page', 1);
      expect(pagination).toHaveProperty('limit', 10);
    });

    it('should return 403 for non-admin users', async () => {
      const user = await createTestUser({ role: TestUserRole.USER });
      const headers = getUserAuthHeader(user);

      const response = await Request.get(ApiPaths.users.list, { headers });

      expect(response.status).toBe(403);
      expect(validateErrorResponse(response)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await Request.get(ApiPaths.users.list);

      expect(response.status).toBe(401);
      expect(validateErrorResponse(response)).toBe(true);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should get user by ID (admin)', async () => {
      const admin = await createTestUser({ role: TestUserRole.ADMIN });
      const targetUser = await createTestUser();
      const headers = getUserAuthHeader(admin);

      const response = await Request.get(ApiPaths.users.detail(targetUser.id), {
        headers,
      });

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      const data = body.data as Record<string, unknown>;
      expect(data).toHaveProperty('id', targetUser.id);
      expect(data).toHaveProperty('email', targetUser.email);
      expect(data).not.toHaveProperty('password');
    });

    it('should allow users to get their own profile', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await Request.get(ApiPaths.users.detail(user.id), {
        headers,
      });

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      const data = body.data as Record<string, unknown>;
      expect(data).toHaveProperty('id', user.id);
    });

    it('should return 403 when accessing other user profile (non-admin)', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const headers = getUserAuthHeader(user1);

      const response = await Request.get(ApiPaths.users.detail(user2.id), {
        headers,
      });

      expect(response.status).toBe(403);
      expect(validateErrorResponse(response)).toBe(true);
    });

    it('should return 404 for non-existent user', async () => {
      const admin = await createTestUser({ role: TestUserRole.ADMIN });
      const headers = getUserAuthHeader(admin);

      const response = await Request.get(
        ApiPaths.users.detail('non-existent-id'),
        { headers }
      );

      expect(response.status).toBe(404);
      expect(validateErrorResponse(response)).toBe(true);
    });
  });

  describe('PUT /api/v1/users/:id', () => {
    it('should update user (admin)', async () => {
      const admin = await createTestUser({ role: TestUserRole.ADMIN });
      const targetUser = await createTestUser();
      const headers = getUserAuthHeader(admin);

      const updateData = {
        name: 'Updated Name',
        role: TestUserRole.AGENT,
      };

      const response = await Request.put(
        ApiPaths.users.update(targetUser.id),
        updateData,
        { headers }
      );

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      const body = response.body as Record<string, unknown>;
      const data = body.data as Record<string, unknown>;
      expect(data).toHaveProperty('name', updateData.name);
      expect(data).toHaveProperty('role', updateData.role);
    });

    it('should allow users to update their own profile', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await Request.put(
        ApiPaths.users.update(user.id),
        { name: 'My New Name' },
        { headers }
      );

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
    });

    it('should return 400 for invalid update data', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await Request.put(
        ApiPaths.users.update(user.id),
        { email: 'invalid-email' },
        { headers }
      );

      expect(response.status).toBe(400);
      expect(validateErrorResponse(response)).toBe(true);
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('should delete user (admin)', async () => {
      const admin = await createTestUser({ role: TestUserRole.ADMIN });
      const targetUser = await createTestUser();
      const headers = getUserAuthHeader(admin);

      const response = await Request.delete(ApiPaths.users.delete(targetUser.id), {
        headers,
      });

      expect([200, 204]).toContain(response.status);

      // Verify user is deleted
      const getResponse = await Request.get(ApiPaths.users.detail(targetUser.id), {
        headers,
      });
      expect(getResponse.status).toBe(404);
    });

    it('should allow users to delete their own account', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await Request.delete(ApiPaths.users.delete(user.id), {
        headers,
      });

      expect([200, 204]).toContain(response.status);
    });

    it('should return 403 when deleting other user (non-admin)', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const headers = getUserAuthHeader(user1);

      const response = await Request.delete(ApiPaths.users.delete(user2.id), {
        headers,
      });

      expect(response.status).toBe(403);
      expect(validateErrorResponse(response)).toBe(true);
    });

    it('should return 404 for non-existent user', async () => {
      const admin = await createTestUser({ role: TestUserRole.ADMIN });
      const headers = getUserAuthHeader(admin);

      const response = await Request.delete(
        ApiPaths.users.delete('non-existent-id'),
        { headers }
      );

      expect(response.status).toBe(404);
      expect(validateErrorResponse(response)).toBe(true);
    });
  });
});

describe('User API Role-Based Access Control', () => {
  afterAll(async () => {
    await cleanupTestUsers();
  });

  it('should enforce role permissions correctly', async () => {
    const users = await createTestUsers();

    // Test cases for different roles
    const testCases = [
      {
        role: TestUserRole.USER,
        canListUsers: false,
        canAccessOthers: false,
      },
      {
        role: TestUserRole.AGENT,
        canListUsers: false,
        canAccessOthers: false,
      },
      {
        role: TestUserRole.ADMIN,
        canListUsers: true,
        canAccessOthers: true,
      },
    ];

    for (const testCase of testCases) {
      const user = users[testCase.role];
      const headers = getUserAuthHeader(user);

      // Test list users
      const listResponse = await Request.get(ApiPaths.users.list, { headers });
      expect(listResponse.status).toBe(
        testCase.canListUsers ? 200 : 403
      );

      // Test access other user
      const otherUser = await createTestUser();
      const accessResponse = await Request.get(
        ApiPaths.users.detail(otherUser.id),
        { headers }
      );
      expect(accessResponse.status).toBe(
        testCase.canAccessOthers ? 200 : 403
      );
    }
  });
});
