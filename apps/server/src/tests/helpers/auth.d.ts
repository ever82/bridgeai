/**
 * Test user roles
 */
export declare enum TestUserRole {
    USER = "user",
    ADMIN = "admin",
    AGENT = "agent"
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
export declare function generateAccessToken(user: TestUser): string;
/**
 * Generate JWT refresh token for test user
 */
export declare function generateRefreshToken(user: TestUser): string;
/**
 * Generate both tokens for a test user
 */
export declare function generateTokens(user: TestUser): {
    accessToken: string;
    refreshToken: string;
};
/**
 * Verify and decode JWT token
 */
export declare function verifyToken(token: string): JWTPayload;
/**
 * Generate expired token for testing expired token scenarios
 */
export declare function generateExpiredToken(user: TestUser): string;
/**
 * Generate invalid token for testing error scenarios
 */
export declare function generateInvalidToken(): string;
/**
 * Generate token with wrong secret
 */
export declare function generateWrongSecretToken(user: TestUser): string;
/**
 * Create a test user in the database
 */
export declare function createTestUser(overrides?: Partial<TestUser>): Promise<TestUser>;
/**
 * Create test users with different roles
 */
export declare function createTestUsers(): Promise<Record<TestUserRole, TestUser>>;
/**
 * Delete test user from database
 */
export declare function deleteTestUser(userId: string): Promise<void>;
/**
 * Clean up all test users
 */
export declare function cleanupTestUsers(): Promise<void>;
/**
 * Get authorization header with Bearer token
 */
export declare function getAuthHeader(token: string): {
    Authorization: string;
};
/**
 * Get authorization header for a test user
 */
export declare function getUserAuthHeader(user: TestUser): {
    Authorization: string;
};
/**
 * Auth header templates for different scenarios
 */
export declare const AuthHeaders: {
    /**
     * Valid auth header for user
     */
    valid: (user: TestUser) => {
        Authorization: string;
    };
    /**
     * Missing auth header
     */
    missing: () => {};
    /**
     * Empty auth header
     */
    empty: () => {
        Authorization: string;
    };
    /**
     * Malformed auth header (no Bearer prefix)
     */
    malformed: (user: TestUser) => {
        Authorization: string;
    };
    /**
     * Expired token
     */
    expired: (user: TestUser) => {
        Authorization: string;
    };
    /**
     * Invalid token
     */
    invalid: () => {
        Authorization: string;
    };
    /**
     * Wrong secret token
     */
    wrongSecret: (user: TestUser) => {
        Authorization: string;
    };
};
/**
 * Role-based permission test templates
 */
export declare const RoleTests: {
    /**
     * Test that endpoint requires authentication
     */
    requiresAuth: (makeRequest: (headers: Record<string, string>) => Promise<{
        status: number;
    }>) => Promise<void>;
    /**
     * Test that endpoint requires specific role
     */
    requiresRole: (makeRequest: (headers: Record<string, string>) => Promise<{
        status: number;
    }>, requiredRole: TestUserRole) => Promise<void>;
};
/**
 * Mock auth middleware for testing
 * Use this to bypass actual JWT verification in tests
 */
export declare function createMockAuthMiddleware(user: TestUser): (req: any, res: any, next: any) => void;
declare const _default: {
    generateAccessToken: typeof generateAccessToken;
    generateRefreshToken: typeof generateRefreshToken;
    generateTokens: typeof generateTokens;
    verifyToken: typeof verifyToken;
    generateExpiredToken: typeof generateExpiredToken;
    generateInvalidToken: typeof generateInvalidToken;
    generateWrongSecretToken: typeof generateWrongSecretToken;
    createTestUser: typeof createTestUser;
    createTestUsers: typeof createTestUsers;
    deleteTestUser: typeof deleteTestUser;
    cleanupTestUsers: typeof cleanupTestUsers;
    getAuthHeader: typeof getAuthHeader;
    getUserAuthHeader: typeof getUserAuthHeader;
    AuthHeaders: {
        /**
         * Valid auth header for user
         */
        valid: (user: TestUser) => {
            Authorization: string;
        };
        /**
         * Missing auth header
         */
        missing: () => {};
        /**
         * Empty auth header
         */
        empty: () => {
            Authorization: string;
        };
        /**
         * Malformed auth header (no Bearer prefix)
         */
        malformed: (user: TestUser) => {
            Authorization: string;
        };
        /**
         * Expired token
         */
        expired: (user: TestUser) => {
            Authorization: string;
        };
        /**
         * Invalid token
         */
        invalid: () => {
            Authorization: string;
        };
        /**
         * Wrong secret token
         */
        wrongSecret: (user: TestUser) => {
            Authorization: string;
        };
    };
    RoleTests: {
        /**
         * Test that endpoint requires authentication
         */
        requiresAuth: (makeRequest: (headers: Record<string, string>) => Promise<{
            status: number;
        }>) => Promise<void>;
        /**
         * Test that endpoint requires specific role
         */
        requiresRole: (makeRequest: (headers: Record<string, string>) => Promise<{
            status: number;
        }>, requiredRole: TestUserRole) => Promise<void>;
    };
    createMockAuthMiddleware: typeof createMockAuthMiddleware;
    TestUserRole: typeof TestUserRole;
};
export default _default;
//# sourceMappingURL=auth.d.ts.map