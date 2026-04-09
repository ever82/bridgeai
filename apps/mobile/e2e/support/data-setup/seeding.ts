import { DataFactory } from './data-factory';

const API_BASE_URL = process.env.E2E_API_URL || 'http://localhost:3001';

/**
 * Data Seeding for E2E Tests
 * Pre-populates test data before test suite runs
 */
export class DataSeeding {
  private static seededUsers: string[] = [];
  private static seededAgents: string[] = [];
  private static seededTasks: string[] = [];

  /**
   * Seed test database with basic data
   */
  static async seedTestData(): Promise<void> {
    console.log('Seeding test data...');

    // Create test users
    const testUser = await DataFactory.createUser({
      email: 'seeded-test-user@test.visionshare.local',
      name: 'Seeded Test User',
    });
    this.seededUsers.push(testUser.id);

    // Create test agents for the user
    const testAgent = await DataFactory.createAgent(testUser.id, {
      name: 'Seeded Test Agent',
      description: 'A seeded agent for E2E testing',
    });
    this.seededAgents.push(testAgent.id);

    // Create test task
    const testTask = await DataFactory.createTask(testUser.id, {
      title: 'Seeded Test Task',
      description: 'A seeded task for E2E testing',
    });
    this.seededTasks.push(testTask.id);

    console.log(`Seeded ${this.seededUsers.length} users, ${this.seededAgents.length} agents, ${this.seededTasks.length} tasks`);
  }

  /**
   * Get seeded user IDs
   */
  static getSeededUserIds(): string[] {
    return [...this.seededUsers];
  }

  /**
   * Get seeded agent IDs
   */
  static getSeededAgentIds(): string[] {
    return [...this.seededAgents];
  }

  /**
   * Clear seeding records
   */
  static clearSeedingRecords(): void {
    this.seededUsers = [];
    this.seededAgents = [];
    this.seededTasks = [];
  }
}
