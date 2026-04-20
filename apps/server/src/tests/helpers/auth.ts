import * as jwt from 'jsonwebtoken';

import { prisma } from '../../db/client';

/**
 * Authentication test helpers
 * Provides utilities for generating tokens and managing test users
 */

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
const JWT_EXPIRES_IN = '1h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

/**
 * Test user roles
 */
export enum TestUserRole {
  USER = 'user',
  ADMIN = 'admin',
  AGENT = 'agent',
}

/**
 * Test user interface
 */
export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: TestUserRole;
  password?: string;
}

/**
 * JWT payload interface
 */
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Generate JWT access token for test user
 */
export function generateAccessToken(user: TestUser): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Generate JWT refresh token for test user
 */
export function generateRefreshToken(user: TestUser): string {
  return jwt.sign(
    {
      userId: user.id,
      type: 'refresh',
    },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
}

/**
 * Generate both tokens for a test user
 */
export function generateTokens(user: TestUser): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

/**
 * Generate expired token for testing expired token scenarios
 */
export function generateExpiredToken(user: TestUser): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '-1h' } // Already expired
  );
}

/**
 * Generate invalid token for testing error scenarios
 */
export function generateInvalidToken(): string {
  return 'invalid.token.signature';
}

/**
 * Generate token with wrong secret
 */
export function generateWrongSecretToken(user: TestUser): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    'wrong-secret-key',
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Create a test user in the database
 */
export async function createTestUser(
  overrides: Partial<TestUser> = {}
): Promise<TestUser> {
  const defaultUser: TestUser = {
    id: `test-user-${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    role: TestUserRole.USER,
    password: 'TestPassword123!',
  };

  const user = { ...defaultUser, ...overrides };

  // Create user in database
  await prisma.user.create({
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.password || 'hashed-password',
    },
  });

  return user;
}

/**
 * Create test users with different roles
 */
export async function createTestUsers(): Promise<Record<TestUserRole, TestUser>> {
  const roles = [TestUserRole.USER, TestUserRole.ADMIN, TestUserRole.AGENT];
  const users: Partial<Record<TestUserRole, TestUser>> = {};

  for (const role of roles) {
    users[role] = await createTestUser({
      email: `${role}-test-${Date.now()}@example.com`,
      name: `${role.charAt(0).toUpperCase() + role.slice(1)} Test User`,
      role,
    });
  }

  return users as Record<TestUserRole, TestUser>;
}

/**
 * Delete test user from database
 */
export async function deleteTestUser(userId: string): Promise<void> {
  await prisma.user.deleteMany({
    where: { id: userId },
  });
}

/**
 * Clean up all test users
 */
export async function cleanupTestUsers(): Promise<void> {
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: '@example.com',
      },
    },
  });
}

/**
 * Get authorization header with Bearer token
 */
export function getAuthHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Get authorization header for a test user
 */
export function getUserAuthHeader(user: TestUser): { Authorization: string } {
  const token = generateAccessToken(user);
  return getAuthHeader(token);
}

/**
 * Auth header templates for different scenarios
 */
export const AuthHeaders = {
  /**
   * Valid auth header for user
   */
  valid: (user: TestUser) => getUserAuthHeader(user),

  /**
   * Missing auth header
   */
  missing: () => ({}),

  /**
   * Empty auth header
   */
  empty: () => ({ Authorization: '' }),

  /**
   * Malformed auth header (no Bearer prefix)
   */
  malformed: (user: TestUser) => ({ Authorization: generateAccessToken(user) }),

  /**
   * Expired token
   */
  expired: (user: TestUser) => getAuthHeader(generateExpiredToken(user)),

  /**
   * Invalid token
   */
  invalid: () => getAuthHeader(generateInvalidToken()),

  /**
   * Wrong secret token
   */
  wrongSecret: (user: TestUser) => getAuthHeader(generateWrongSecretToken(user)),
};

/**
 * Role-based permission test templates
 */
export const RoleTests = {
  /**
   * Test that endpoint requires authentication
   */
  requiresAuth: async (
    makeRequest: (headers: Record<string, string>) => Promise<{ status: number }>
  ): Promise<void> => {
    // Without auth
    const noAuthRes = await makeRequest(AuthHeaders.missing());
    expect(noAuthRes.status).toBe(401);

    // With empty auth
    const emptyAuthRes = await makeRequest(AuthHeaders.empty());
    expect(emptyAuthRes.status).toBe(401);

    // With invalid token
    const invalidRes = await makeRequest(AuthHeaders.invalid());
    expect(invalidRes.status).toBe(401);

    // With expired token
    const testUser = await createTestUser();
    const expiredRes = await makeRequest(AuthHeaders.expired(testUser));
    expect(expiredRes.status).toBe(401);
    await deleteTestUser(testUser.id);
  },

  /**
   * Test that endpoint requires specific role
   */
  requiresRole: async (
    makeRequest: (headers: Record<string, string>) => Promise<{ status: number }>,
    requiredRole: TestUserRole
  ): Promise<void> => {
    const users = await createTestUsers();

    // USER should not access ADMIN/AGENT endpoints
    if (requiredRole !== TestUserRole.USER) {
      const userRes = await makeRequest(getUserAuthHeader(users[TestUserRole.USER]));
      expect(userRes.status).toBe(403);
    }

    // AGENT should not access ADMIN endpoints
    if (requiredRole === TestUserRole.ADMIN) {
      const agentRes = await makeRequest(getUserAuthHeader(users[TestUserRole.AGENT]));
      expect(agentRes.status).toBe(403);
    }

    // Required role should have access
    const allowedRes = await makeRequest(getUserAuthHeader(users[requiredRole]));
    expect(allowedRes.status).not.toBe(403);

    // Cleanup
    await cleanupTestUsers();
  },
};

/**
 * Mock auth middleware for testing
 * Use this to bypass actual JWT verification in tests
 */
export function createMockAuthMiddleware(user: TestUser) {
  return (req: any, res: any, next: any) => {
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    next();
  };
}

export default {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyToken,
  generateExpiredToken,
  generateInvalidToken,
  generateWrongSecretToken,
  createTestUser,
  createTestUsers,
  deleteTestUser,
  cleanupTestUsers,
  getAuthHeader,
  getUserAuthHeader,
  AuthHeaders,
  RoleTests,
  createMockAuthMiddleware,
  TestUserRole,
};
