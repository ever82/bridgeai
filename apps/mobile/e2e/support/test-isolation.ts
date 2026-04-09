/**
 * Test Isolation Utilities
 * Ensures each test runs with independent data
 */
export class TestIsolation {
  private static initialized = false;

  /**
   * Initialize test isolation
   */
  static initialize(): void {
    if (this.initialized) return;

    // Set up global test configuration
    (global as any).TEST_ISOLATION = {
      prefix: 'test',
      timestamp: Date.now(),
      counter: 0,
    };

    this.initialized = true;
  }

  /**
   * Generate unique test user ID
   * Format: test-${timestamp}-${random}
   */
  static generateTestUserId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const counter = (global as any).TEST_ISOLATION?.counter || 0;

    if ((global as any).TEST_ISOLATION) {
      (global as any).TEST_ISOLATION.counter = counter + 1;
    }

    return `test-${timestamp}-${random}-${counter}`;
  }

  /**
   * Generate unique test email
   */
  static generateTestEmail(userId?: string): string {
    const id = userId || this.generateTestUserId();
    return `${id}@test.visionshare.local`;
  }

  /**
   * Generate unique test agent name
   */
  static generateTestAgentName(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `TestAgent-${timestamp}-${random}`;
  }

  /**
   * Get test user prefix
   */
  static getTestPrefix(): string {
    return (global as any).TEST_ISOLATION?.prefix || 'test';
  }

  /**
   * Check if string is test data
   */
  static isTestData(value: string): boolean {
    return value.startsWith('test-') || value.includes('@test.visionshare.local');
  }

  /**
   * Generate test task title
   */
  static generateTestTaskTitle(): string {
    const timestamp = Date.now();
    return `TestTask-${timestamp}`;
  }
}
