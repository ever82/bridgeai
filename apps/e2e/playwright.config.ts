import { defineConfig, devices } from '@playwright/test';

/**
 * BridgeAI E2E测试配置
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',

  /* 测试文件匹配模式 */
  testMatch: /.*\.test\.ts/,

  /* 完全并行运行测试 */
  fullyParallel: true,

  /* 禁止在CI中重复使用文件 */
  forbidOnly: !!process.env.CI,

  /* 重试配置: CI中重试2次，本地不重试 */
  retries: process.env.CI ? 2 : 0,

  /* 工作进程数 */
  workers: process.env.CI ? 1 : undefined,

  /* 报告器配置 */
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/test-results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],

  /* 共享上下文配置 */
  use: {
    /* 基础URL */
    baseURL: process.env.BASE_URL || 'http://localhost:3001',

    /* 收集所有请求的trace */
    trace: 'on-first-retry',

    /* 失败时截图 */
    screenshot: 'only-on-failure',

    /* 失败时录制视频 */
    video: 'on-first-retry',

    /* 请求超时 */
    actionTimeout: 15000,

    /* 导航超时 */
    navigationTimeout: 30000,
  },

  /* 全局设置 */
  globalSetup: require.resolve('./utils/global-setup'),
  globalTeardown: require.resolve('./utils/global-teardown'),

  /* 项目配置 */
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'api',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.API_URL || 'http://localhost:3001',
      },
      testMatch: /tests\/(integration|contracts)\/.*\.test\.ts/,
      dependencies: ['setup'],
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      testMatch: /tests\/scenarios\/.*\.test\.ts/,
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
      testMatch: /tests\/scenarios\/.*\.test\.ts/,
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
      testMatch: /tests\/scenarios\/.*\.test\.ts/,
      dependencies: ['setup'],
    },
    {
      name: 'websocket',
      use: {
        ...devices['Desktop Chrome'],
      },
      testMatch: /tests\/websocket\/.*\.test\.ts/,
      dependencies: ['setup'],
    },
  ],

  /* 测试服务器配置 */
  webServer: {
    command: 'pnpm --filter server start:test',
    url: 'http://localhost:3001/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
