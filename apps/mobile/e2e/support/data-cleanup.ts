/**
 * Data Cleanup for E2E Tests
 * Removes test data after each test/suite
 */

const API_BASE_URL = process.env.E2E_API_URL || 'http://localhost:3001';

export class DataCleanup {
  private static cleanedUserIds: Set<string> = new Set();

  /**
   * Cleanup test data for a specific user
   * Called after each test regardless of result
   */
  static async cleanupTestData(userId: string): Promise<void> {
    if (!userId || this.cleanedUserIds.has(userId)) {
      return;
    }

    console.log(`Cleaning up test data for user: ${userId}`);

    try {
      // Delete user's agents
      await this.deleteUserAgents(userId);

      // Delete user's tasks
      await this.deleteUserTasks(userId);

      // Delete user's messages
      await this.deleteUserMessages(userId);

      // Delete user account
      await this.deleteUser(userId);

      this.cleanedUserIds.add(userId);
    } catch (error) {
      console.error(`Error cleaning up test data for user ${userId}:`, error);
      // Don't throw - cleanup errors shouldn't fail tests
    }
  }

  /**
   * Cleanup all test data
   * Called after entire test suite
   */
  static async cleanupAllTestData(): Promise<void> {
    console.log('Cleaning up all test data...');

    try {
      // Find all test users and clean them up
      const response = await fetch(`${API_BASE_URL}/api/admin/test-users`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${process.env.ADMIN_API_KEY || ''}` },
      });

      if (response.ok) {
        const testUsers = await response.json();
        for (const user of testUsers) {
          await this.cleanupTestData(user.id);
        }
      }
    } catch (error) {
      console.error('Error cleaning up all test data:', error);
    }

    this.cleanedUserIds.clear();
  }

  /**
   * Delete user agents
   */
  private static async deleteUserAgents(userId: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/users/${userId}/agents`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${process.env.ADMIN_API_KEY || ''}` },
      });
    } catch (error) {
      console.warn(`Failed to delete agents for user ${userId}:`, error);
    }
  }

  /**
   * Delete user tasks
   */
  private static async deleteUserTasks(userId: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/users/${userId}/tasks`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${process.env.ADMIN_API_KEY || ''}` },
      });
    } catch (error) {
      console.warn(`Failed to delete tasks for user ${userId}:`, error);
    }
  }

  /**
   * Delete user messages
   */
  private static async deleteUserMessages(userId: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/users/${userId}/messages`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${process.env.ADMIN_API_KEY || ''}` },
      });
    } catch (error) {
      console.warn(`Failed to delete messages for user ${userId}:`, error);
    }
  }

  /**
   * Delete user account
   */
  private static async deleteUser(userId: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${process.env.ADMIN_API_KEY || ''}` },
      });
    } catch (error) {
      console.warn(`Failed to delete user ${userId}:`, error);
    }
  }

  /**
   * Reset cleaned records
   */
  static resetCleanedRecords(): void {
    this.cleanedUserIds.clear();
  }
}
