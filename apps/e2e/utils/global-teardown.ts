import { FullConfig } from '@playwright/test';

/**
 * 全局清理 - 在所有测试之后运行
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test global teardown...');

  // 清理测试数据
  try {
    await cleanupTestData();
  } catch (e) {
    console.warn('⚠️ Failed to cleanup test data:', e);
  }

  console.log('✅ Global teardown completed');
}

/**
 * 清理测试数据
 */
async function cleanupTestData(): Promise<void> {
  const apiUrl = process.env.API_URL || 'http://localhost:3001';

  try {
    const response = await fetch(`${apiUrl}/api/test/cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Key': process.env.TEST_SECRET_KEY || 'test-secret',
      },
    });

    if (response.ok) {
      console.log('✅ Test data cleaned up successfully');
    } else {
      console.warn('⚠️ Test data cleanup returned non-OK status');
    }
  } catch (e) {
    console.warn('⚠️ Failed to cleanup test data via API:', e);
  }
}

export default globalTeardown;
