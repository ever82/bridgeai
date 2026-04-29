/**
 * Configure test database connection
 * Uses a separate test database to avoid polluting development data
 */
export declare function configureTestDatabase(): void;
/**
 * Clean up all tables in the database
 * Useful for ensuring clean state between test suites
 */
export declare function cleanDatabase(): Promise<void>;
/**
 * Setup function to run before all tests in a suite
 * Configures database and ensures clean state
 */
export declare function setupTestDatabase(): Promise<void>;
/**
 * Teardown function to run after all tests in a suite
 * Cleans up database connections
 */
export declare function teardownTestDatabase(): Promise<void>;
/**
 * Transaction wrapper for test isolation
 * Wraps a test function in a transaction that gets rolled back after completion
 * Note: This requires PostgreSQL and Prisma's interactive transactions
 */
export declare function withTransaction<T>(fn: () => Promise<T>): Promise<T>;
/**
 * Test fixture interface for type safety
 */
export interface TestFixture<T = unknown> {
    name: string;
    data: T;
    cleanup?: () => Promise<void>;
}
/**
 * Fixture registry for managing test data
 */
export declare class FixtureRegistry {
    private fixtures;
    add<T>(fixture: TestFixture<T>): Promise<T>;
    cleanup(): Promise<void>;
    getAll(): TestFixture[];
}
/**
 * Global fixture registry for test suite
 */
export declare const globalFixtures: FixtureRegistry;
/**
 * Run migrations before test suite
 * Use this in setupFiles or beforeAll
 */
export declare function runMigrations(): Promise<void>;
/**
 * Check database connectivity
 */
export declare function checkDatabaseConnection(): Promise<boolean>;
/**
 * Seed test data helper
 * Runs the seed script in test context
 */
export declare function seedTestData(): Promise<void>;
declare const _default: {
    configureTestDatabase: typeof configureTestDatabase;
    cleanDatabase: typeof cleanDatabase;
    setupTestDatabase: typeof setupTestDatabase;
    teardownTestDatabase: typeof teardownTestDatabase;
    withTransaction: typeof withTransaction;
    FixtureRegistry: typeof FixtureRegistry;
    globalFixtures: FixtureRegistry;
    runMigrations: typeof runMigrations;
    checkDatabaseConnection: typeof checkDatabaseConnection;
    seedTestData: typeof seedTestData;
};
export default _default;
//# sourceMappingURL=database.d.ts.map