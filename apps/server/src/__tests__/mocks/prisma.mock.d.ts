import type { PrismaClient } from '@prisma/client';
/**
 * Mock Prisma Client for unit tests
 * This provides a mock implementation of all Prisma models
 */
export declare const mockPrisma: PrismaClient;
/**
 * Reset all mock implementations
 * Call this in beforeEach to ensure clean state between tests
 */
export declare function resetPrismaMocks(): void;
/**
 * Mock a successful database response
 */
export declare function mockSuccess<T>(data: T): Promise<T>;
/**
 * Mock a database error
 */
export declare function mockError(error: Error): Promise<never>;
//# sourceMappingURL=prisma.mock.d.ts.map