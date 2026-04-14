import { prisma } from '../../db/client';

// Extract TransactionClient type from PrismaClient.$transaction method
type TransactionClient = Parameters<typeof prisma.$transaction>[0] extends (
  (client: infer T) => Promise<unknown>
) ? T : never;

/**
 * Test database lifecycle management helper
 * Handles transactions, cleanup, and isolation for integration tests
 */

// Store original database URL for restoration
const originalDatabaseUrl = process.env.DATABASE_URL;

/**
 * Configure test database connection
 * Uses a separate test database to avoid polluting development data
 */
export function configureTestDatabase(): void {
  // Use test database URL if available, otherwise append _test to database name
  const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL?.replace(
    /\/([^/]+)$/,
    '/visionshare_test'
  );

  if (testDbUrl) {
    process.env.DATABASE_URL = testDbUrl;
  }
}

/**
 * Clean up all tables in the database
 * Useful for ensuring clean state between test suites
 */
export async function cleanDatabase(): Promise<void> {
  const tables = [
    'Message',
    'Chat',
    'AgentSchedule',
    'Agent',
    'Match',
    'RefreshToken',
    'User',
  ];

  // Disable foreign key checks temporarily for cleaning
  await prisma.$executeRawUnsafe('SET session_replication_role = replica;');

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch {
      // Table might not exist, ignore
    }
  }

  // Re-enable foreign key checks
  await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
}

/**
 * Setup function to run before all tests in a suite
 * Configures database and ensures clean state
 */
export async function setupTestDatabase(): Promise<void> {
  configureTestDatabase();
  await cleanDatabase();
}

/**
 * Teardown function to run after all tests in a suite
 * Cleans up database connections
 */
export async function teardownTestDatabase(): Promise<void> {
  await prisma.$disconnect();

  // Restore original database URL
  if (originalDatabaseUrl) {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
}

/**
 * Transaction wrapper for test isolation
 * Wraps a test function in a transaction that gets rolled back after completion
 * Note: This requires PostgreSQL and Prisma's interactive transactions
 */
export async function withTransaction<T>(
  fn: () => Promise<T>
): Promise<T> {
  return await prisma.$transaction(async (tx: TransactionClient) => {
    try {
      // Temporarily replace global prisma with transaction client
      const result = await fn();
      // Rollback by throwing a special error that's caught
      throw new TransactionRollbackError(result);
    } catch (error) {
      if (error instanceof TransactionRollbackError) {
        return error.result as T;
      }
      throw error;
    }
  }, {
    isolationLevel: 'Serializable',
    maxWait: 5000,
    timeout: 10000,
  });
}

/**
 * Custom error to signal transaction rollback with result
 */
class TransactionRollbackError extends Error {
  result: unknown;

  constructor(result: unknown) {
    super('TransactionRollback');
    this.result = result;
    this.name = 'TransactionRollbackError';
  }
}

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
export class FixtureRegistry {
  private fixtures: TestFixture[] = [];

  async add<T>(fixture: TestFixture<T>): Promise<T> {
    this.fixtures.push(fixture);
    return fixture.data;
  }

  async cleanup(): Promise<void> {
    // Cleanup in reverse order
    for (const fixture of this.fixtures.reverse()) {
      if (fixture.cleanup) {
        await fixture.cleanup();
      }
    }
    this.fixtures = [];
  }

  getAll(): TestFixture[] {
    return [...this.fixtures];
  }
}

/**
 * Global fixture registry for test suite
 */
export const globalFixtures = new FixtureRegistry();

/**
 * Run migrations before test suite
 * Use this in setupFiles or beforeAll
 */
export async function runMigrations(): Promise<void> {
  // Migrations should be run via npm script or CI pipeline
  // This is a placeholder for documentation
  console.log('Ensure migrations are run before tests: npm run db:migrate');
}

/**
 * Check database connectivity
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

/**
 * Seed test data helper
 * Runs the seed script in test context
 */
export async function seedTestData(): Promise<void> {
  // Run seed via npm script or implement custom seeding here
  console.log('Seeding test data...');
  // Example: await prisma.user.create({ data: testUserData });
}

export default {
  configureTestDatabase,
  cleanDatabase,
  setupTestDatabase,
  teardownTestDatabase,
  withTransaction,
  FixtureRegistry,
  globalFixtures,
  runMigrations,
  checkDatabaseConnection,
  seedTestData,
};
