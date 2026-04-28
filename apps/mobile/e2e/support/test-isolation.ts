/**
 * Test Isolation for E2E Tests
 * Ensures each test uses independent data, cleans up after tests, and supports sharding
 *
 * Key features:
 * - Generates unique test user IDs with timestamp + random suffix
 * - Tracks test user IDs for cleanup
 * - Supports parallel test execution via sharding
 * - Cleans up test data after each test flow
 */

const API_BASE_URL = process.env.E2E_API_URL || 'http://localhost:3001';

export interface TestIdentity {
  email: string;
  username: string;
  displayName: string;
  password: string;
  userId?: string;
  flowName: string;
}

/**
 * Generate a unique timestamp-based suffix
 */
function generateUniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * TestIsolation class for managing test data isolation
 */
export class TestIsolation {
  private static activeTests: Map<string, TestIdentity> = new Map();
  private static completedTests: Set<string> = new Set();
  private static totalShards: number = 1;
  private static shardIndex: number = 0;

  /**
   * Configure sharding for parallel test execution
   * @param total Total number of shards
   * @param index Current shard index (0-based)
   */
  static configureSharding(total: number, index: number): void {
    this.totalShards = Math.max(1, total);
    this.shardIndex = Math.min(Math.max(0, index), this.totalShards - 1);
    console.log(`  [TestIsolation] Sharding configured: shard ${this.shardIndex + 1}/${this.totalShards}`);
  }

  /**
   * Get current shard configuration
   */
  static getShardConfig(): { total: number; index: number } {
    return { total: this.totalShards, index: this.shardIndex };
  }

  /**
   * Check if this flow should run on the current shard
   * Uses consistent hashing based on flow name to distribute flows evenly
   */
  static shouldRunOnThisShard(flowName: string, _totalFlows: number): boolean {
    if (this.totalShards <= 1) return true;

    // Hash the flow name to get a consistent index
    let hash = 0;
    for (let i = 0; i < flowName.length; i++) {
      hash = ((hash << 5) - hash + flowName.charCodeAt(i)) | 0;
    }
    const flowShardIndex = Math.abs(hash) % this.totalShards;

    return flowShardIndex === this.shardIndex;
  }

  /**
   * Generate a unique test identity for a flow
   * @param flowName Name of the test flow
   * @returns Unique test identity with email, username, etc.
   */
  static generateTestIdentity(flowName: string): TestIdentity {
    const suffix = generateUniqueSuffix();
    const identity: TestIdentity = {
      email: `test-${suffix}@bridgeai.test`,
      username: `e2euser-${suffix}`,
      displayName: `E2E Test User ${suffix}`,
      password: 'TestPass123!',
      flowName,
    };

    this.activeTests.set(flowName, identity);
    return identity;
  }

  /**
   * Get the test identity for a specific flow
   * @param flowName Name of the test flow
   * @returns Test identity or null if not found
   */
  static getTestIdentity(flowName: string): TestIdentity | undefined {
    return this.activeTests.get(flowName);
  }

  /**
   * Register a user ID after successful registration
   * @param flowName Name of the test flow
   * @param userId User ID from the backend
   */
  static registerUserId(flowName: string, userId: string): void {
    const identity = this.activeTests.get(flowName);
    if (identity) {
      identity.userId = userId;
    }
  }

  /**
   * Mark a flow as completed and schedule cleanup
   * @param flowName Name of the test flow
   */
  static markCompleted(flowName: string): void {
    this.completedTests.add(flowName);
  }

  /**
   * Get all active test identities that need cleanup
   */
  static getActiveIdentities(): TestIdentity[] {
    return Array.from(this.activeTests.values());
  }

  /**
   * Get all user IDs that need cleanup
   */
  static getActiveUserIds(): string[] {
    return this.getActiveIdentities()
      .filter((id) => id.userId)
      .map((id) => id.userId!);
  }

  /**
   * Cleanup test data for a specific flow
   * @param flowName Name of the test flow
   */
  static async cleanupFlow(flowName: string): Promise<void> {
    const identity = this.activeTests.get(flowName);
    if (!identity) return;

    console.log(`  [TestIsolation] Cleaning up test data for: ${flowName}`);

    if (identity.userId) {
      await this.cleanupUserData(identity.userId);
    }

    this.activeTests.delete(flowName);
  }

  /**
   * Cleanup all test data
   */
  static async cleanupAll(): Promise<void> {
    console.log('  [TestIsolation] Cleaning up all test data...');

    const userIds = this.getActiveUserIds();
    for (const userId of userIds) {
      await this.cleanupUserData(userId);
    }

    this.activeTests.clear();
    this.completedTests.clear();
  }

  /**
   * Cleanup user data via API
   * @param userId User ID to cleanup
   */
  private static async cleanupUserData(userId: string): Promise<void> {
    const adminKey = process.env.ADMIN_API_KEY || '';

    try {
      // Delete user's agents
      await this.deleteResource(`${API_BASE_URL}/api/users/${userId}/agents`, adminKey);
      // Delete user's tasks
      await this.deleteResource(`${API_BASE_URL}/api/users/${userId}/tasks`, adminKey);
      // Delete user's messages
      await this.deleteResource(`${API_BASE_URL}/api/users/${userId}/messages`, adminKey);
      // Delete user account
      await this.deleteResource(`${API_BASE_URL}/api/users/${userId}`, adminKey);

      console.log(`  [TestIsolation] Cleaned up user: ${userId}`);
    } catch (error) {
      console.warn(`  [TestIsolation] Cleanup failed for user ${userId}:`, error);
      // Don't throw - cleanup errors shouldn't fail tests
    }
  }

  /**
   * Delete a resource via API
   */
  private static async deleteResource(url: string, adminKey: string): Promise<void> {
    try {
      await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminKey}`,
          'Content-Type': 'application/json',
        },
      });
    } catch {
      // Ignore individual deletion errors
    }
  }

  /**
   * Reset the isolation state (useful between test runs)
   */
  static reset(): void {
    this.activeTests.clear();
    this.completedTests.clear();
    this.totalShards = 1;
    this.shardIndex = 0;
  }

  /**
   * Get statistics about test isolation
   */
  static getStats(): { active: number; completed: number; shards: string } {
    return {
      active: this.activeTests.size,
      completed: this.completedTests.size,
      shards: `${this.shardIndex + 1}/${this.totalShards}`,
    };
  }
}

export default TestIsolation;