/**
 * Data Factory for E2E Tests
 * Creates test data via API with performance tracking
 */

const API_BASE_URL = process.env.E2E_API_URL || 'http://localhost:3001';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
}

export interface TestAgent {
  id: string;
  name: string;
  description: string;
  userId: string;
}

export interface TestTask {
  id: string;
  title: string;
  description: string;
  status: string;
}

export class DataFactory {
  private static requestTimeout = 3000; // 3 seconds max per entity

  /**
   * Create test user via API
   * Performance requirement: ≤3 seconds
   */
  static async createUser(userData: Partial<TestUser> = {}): Promise<TestUser> {
    const startTime = Date.now();

    const user: TestUser = {
      id: userData.id || `test-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      email: userData.email || `test-${Date.now()}@test.visionshare.local`,
      password: userData.password || 'TestPassword123!',
      name: userData.name || `Test User ${Date.now()}`,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
          name: user.name,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create user: ${response.statusText}`);
      }

      const data = await response.json();
      user.id = data.user?.id || user.id;

      const elapsed = Date.now() - startTime;
      if (elapsed > this.requestTimeout) {
        console.warn(`User creation took ${elapsed}ms, exceeds 3000ms target`);
      }

      return user;
    } catch (error) {
      console.error('Error creating test user:', error);
      throw error;
    }
  }

  /**
   * Create test agent via API
   * Performance requirement: ≤3 seconds
   */
  static async createAgent(userId: string, agentData: Partial<TestAgent> = {}): Promise<TestAgent> {
    const startTime = Date.now();

    const agent: TestAgent = {
      id: '',
      name: agentData.name || `TestAgent-${Date.now()}`,
      description: agentData.description || 'Test agent description',
      userId,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken(userId)}`,
        },
        body: JSON.stringify({
          name: agent.name,
          description: agent.description,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create agent: ${response.statusText}`);
      }

      const data = await response.json();
      agent.id = data.id;

      const elapsed = Date.now() - startTime;
      if (elapsed > this.requestTimeout) {
        console.warn(`Agent creation took ${elapsed}ms, exceeds 3000ms target`);
      }

      return agent;
    } catch (error) {
      console.error('Error creating test agent:', error);
      throw error;
    }
  }

  /**
   * Create test task via API
   * Performance requirement: ≤3 seconds
   */
  static async createTask(userId: string, taskData: Partial<TestTask> = {}): Promise<TestTask> {
    const startTime = Date.now();

    const task: TestTask = {
      id: '',
      title: taskData.title || `TestTask-${Date.now()}`,
      description: taskData.description || 'Test task description',
      status: taskData.status || 'open',
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken(userId)}`,
        },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          status: task.status,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.statusText}`);
      }

      const data = await response.json();
      task.id = data.id;

      const elapsed = Date.now() - startTime;
      if (elapsed > this.requestTimeout) {
        console.warn(`Task creation took ${elapsed}ms, exceeds 3000ms target`);
      }

      return task;
    } catch (error) {
      console.error('Error creating test task:', error);
      throw error;
    }
  }

  /**
   * Get auth token for API calls
   */
  private static authTokens: Map<string, string> = new Map();

  private static async getAuthToken(userId: string): Promise<string> {
    if (this.authTokens.has(userId)) {
      return this.authTokens.get(userId)!;
    }

    // This would typically login and get a token
    // For now, return a mock token
    const token = `test-token-${userId}`;
    this.authTokens.set(userId, token);
    return token;
  }

  /**
   * Clear cached auth tokens
   */
  static clearAuthTokens(): void {
    this.authTokens.clear();
  }
}
