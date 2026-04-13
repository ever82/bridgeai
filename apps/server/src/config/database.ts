/**
 * Database Configuration
 * Prisma client with optimized connection pool settings
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Parse DATABASE_URL to extract connection parameters
function parseDatabaseUrl(url: string): {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
} {
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) {
    throw new Error('Invalid DATABASE_URL format');
  }
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4], 10),
    database: match[5],
  };
}

// Connection pool configuration
export interface DatabaseConfig {
  connectionLimit: number;
  poolTimeout: number;
  idleTimeout: number;
  queryTimeout: number;
  slowQueryThreshold: number;
  maxQueries: number;
  maxConnections: number;
}

export const databaseConfig: DatabaseConfig = {
  // Connection pool settings
  connectionLimit: parseInt(process.env.DB_POOL_SIZE || '10', 10),
  poolTimeout: parseInt(process.env.DB_POOL_TIMEOUT || '10', 10),
  idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30', 10),

  // Query performance settings
  queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '5000', 10), // 5 seconds
  slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000', 10), // 1 second

  // Connection pooler settings (for PgBouncer/pgpool)
  maxQueries: parseInt(process.env.DB_MAX_QUERIES || '50000', 10),
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '100', 10),
};

// Create Prisma client with optimized settings
const prismaClient = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
});

// Slow query tracking
interface SlowQueryLog {
  query: string;
  duration: number;
  timestamp: Date;
}

const slowQueryLogs: SlowQueryLog[] = [];
const MAX_SLOW_QUERY_LOGS = 100;

// Event handlers for query logging
prismaClient.$on('query', (e) => {
  if (e.duration >= databaseConfig.slowQueryThreshold) {
    const log: SlowQueryLog = {
      query: e.query.substring(0, 200), // Truncate long queries
      duration: e.duration,
      timestamp: new Date(),
    };
    slowQueryLogs.push(log);
    if (slowQueryLogs.length > MAX_SLOW_QUERY_LOGS) {
      slowQueryLogs.shift();
    }
    logger.warn(`Slow query detected (${e.duration}ms): ${log.query}`);
  }
});

// Health check function
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency: number;
  connectionCount: number;
}> {
  const start = Date.now();
  try {
    await prismaClient.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    return {
      healthy: true,
      latency,
      connectionCount: 0, // Would need PgBouncer admin for actual count
    };
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - start,
      connectionCount: 0,
    };
  }
}

// Get slow query logs
export function getSlowQueryLogs(limit: number = 10): SlowQueryLog[] {
  return slowQueryLogs.slice(-limit);
}

// Export Prisma client as default
export { prismaClient as prisma };

// For backwards compatibility
export const prisma = prismaClient;
