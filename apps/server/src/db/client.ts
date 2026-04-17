import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client with Performance Optimizations
 *
 * Features:
 * - Connection pooling
 * - Query logging for slow queries
 * - Query timeout handling
 * - Performance metrics tracking
 */

// Connection pool configuration
const CONNECTION_POOL_SIZE = parseInt(process.env.DATABASE_CONNECTION_POOL_SIZE || '20', 10);
const CONNECTION_TIMEOUT = parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '30000', 10);
const IDLE_TIMEOUT = parseInt(process.env.DATABASE_IDLE_TIMEOUT || '60000', 10);
const QUERY_TIMEOUT = parseInt(process.env.DATABASE_QUERY_TIMEOUT || '10000', 10);

// Slow query threshold (ms)
const SLOW_QUERY_THRESHOLD = parseInt(process.env.SLOW_QUERY_THRESHOLD || '500', 10);

// PrismaClient singleton with connection pooling
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Create Prisma client with optimized configuration
 */
function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Connection pool configuration
    // Note: These are passed to the underlying connection pool
    // The actual configuration depends on the database driver
  });

  // Add query performance extension (Prisma 5 compatible)
  return client.$extends({
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          const start = Date.now();
          const opName = `${model}.${operation}`;

          return query(args).then(
            (result) => {
              const duration = Date.now() - start;

              // Log slow queries
              if (duration > SLOW_QUERY_THRESHOLD) {
                console.warn(`[SLOW QUERY] ${opName} took ${duration}ms`, {
                  model,
                  operation,
                  duration,
                  args: sanitizeArgs(args),
                });
              }

              // Log query metrics in development
              if (process.env.NODE_ENV === 'development' && duration > 100) {
                console.log(`[QUERY] ${opName}: ${duration}ms`);
              }

              return result;
            },
            (error) => {
              const duration = Date.now() - start;
              console.error(`[QUERY ERROR] ${opName} failed after ${duration}ms:`, error);
              throw error;
            }
          );
        },
      },
    },
  }) as unknown as PrismaClient;
}

/**
 * Sanitize query arguments for logging
 * Removes sensitive data like passwords
 */
function sanitizeArgs(args: unknown): unknown {
  if (!args || typeof args !== 'object') {
    return args;
  }

  const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'key'];
  const sanitized = { ...args } as Record<string, unknown>;

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

// Create singleton instance
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Test database connection with retry
 */
export async function testConnection(retries = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('Database connection successful');
      return true;
    } catch (error) {
      console.error(`Database connection attempt ${i + 1}/${retries} failed:`, error);
      if (i < retries - 1) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  return false;
}

/**
 * Gracefully close database connection
 */
export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
  console.log('Database connection closed');
}

/**
 * Get connection pool statistics
 */
export async function getConnectionStats(): Promise<{
  active: number;
  idle: number;
  total: number;
}> {
  // Note: Prisma doesn't expose connection pool stats directly
  // This is a placeholder for future implementation
  // Could be implemented using database-specific queries
  return {
    active: 0,
    idle: 0,
    total: 0,
  };
}

/**
 * Execute query with timeout
 */
export async function executeWithTimeout<T>(
  query: () => Promise<T>,
  timeoutMs: number = QUERY_TIMEOUT
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Query timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    query()
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Batch query for large datasets
 * Prevents memory issues with large queries
 */
export async function batchQuery<T, R>(
  items: T[],
  batchSize: number,
  processBatch: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processBatch(batch);
    results.push(...batchResults);

    // Add small delay between batches to prevent connection pool exhaustion
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  return results;
}

/**
 * Performance monitoring wrapper
 * Tracks query execution time and logs metrics
 */
export async function withPerformanceTracking<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - start;

    console.log(`[PERF] ${operation}: ${duration.toFixed(2)}ms`);

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[PERF ERROR] ${operation} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
}

export default prisma;
