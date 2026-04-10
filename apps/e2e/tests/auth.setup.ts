import { test as setup } from '@playwright/test';

/**
 * Playwright全局setup文件
 * 在测试项目开始前执行
 */

setup('setup test environment', async () => {
  console.log('🧪 Setting up E2E test environment...');

  // 验证测试环境
  const apiUrl = process.env.API_URL || 'http://localhost:3001';

  try {
    const response = await fetch(`${apiUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    console.log('✅ Test environment is ready');
  } catch (error) {
    console.error('❌ Test environment setup failed:', error);
    throw error;
  }
});
