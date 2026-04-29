/**
 * Test Isolation Utilities
 * Provides unique test data, cleanup helpers, and sharding support for E2E tests
 */

import { execSync } from 'child_process';

/**
 * Generate a unique test identifier for the current test run
 */
export function generateTestId(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate a unique email address for test user
 */
export function generateTestEmail(prefix: string = 'e2e'): string {
  return `${prefix}-${generateTestId()}@bridgeai.test`;
}

/**
 * Clean up test user data by email
 * This should be called after each test to ensure isolation
 */
export async function cleanupTestUser(email: string): Promise<void> {
  try {
    // Call backend API to delete test user
    execSync(
      `curl -s -X DELETE "http://localhost:3001/api/test/users?email=${encodeURIComponent(email)}" || true`,
      { stdio: 'ignore' }
    );
  } catch {
    // Cleanup is best-effort, don't fail tests
    console.log(`⚠️ Cleanup failed for ${email} (non-critical)`);
  }
}

/**
 * Shard an array of items for parallel execution
 * @param items Array of items to shard
 * @param totalShards Total number of shards
 * @param shardIndex Index of this shard (0-based)
 */
export function getShard<T>(items: T[], totalShards: number, shardIndex: number): T[] {
  if (totalShards <= 0 || shardIndex < 0 || shardIndex >= totalShards) {
    throw new Error(`Invalid shard params: total=${totalShards}, index=${shardIndex}`);
  }
  return items.filter((_, i) => i % totalShards === shardIndex);
}