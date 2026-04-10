import { FullConfig } from '@playwright/test';

/**
 * 全局设置 - 在所有测试之前运行
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...');

  // 设置测试环境变量
  process.env.NODE_ENV = 'test';
  process.env.API_URL = process.env.API_URL || 'http://localhost:3001';
  process.env.BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

  // 等待测试服务器就绪
  const { webServer } = config;
  if (webServer) {
    console.log('⏳ Waiting for test server to be ready...');
    await waitForServer(webServer.url || 'http://localhost:3001/health');
  }

  console.log('✅ Global setup completed');
}

/**
 * 等待服务器就绪
 */
async function waitForServer(url: string, maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`✅ Server is ready at ${url}`);
        return;
      }
    } catch (e) {
      // 服务器还未就绪，继续等待
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`Server did not become ready after ${maxAttempts} attempts`);
}

export default globalSetup;
