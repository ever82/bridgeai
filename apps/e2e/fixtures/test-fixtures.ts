import { test as base, expect, APIRequestContext } from '@playwright/test';
import { TestUser, TestAgent, TestData } from './types';

/**
 * 扩展的test fixture，提供测试数据和辅助方法
 */
export const test = base.extend<{
  apiContext: APIRequestContext;
  testUser: TestUser;
  testAgent: TestAgent;
  testData: TestData;
}>({
  // API上下文
  apiContext: async ({ playwright }, use) => {
    const apiContext = await playwright.request.newContext({
      baseURL: process.env.API_URL || 'http://localhost:3001',
    });
    await use(apiContext);
    await apiContext.dispose();
  },

  // 测试用户fixture
  testUser: async ({ apiContext }, use) => {
    const user = await createTestUser(apiContext);
    await use(user);
    await cleanupTestUser(apiContext, user.id);
  },

  // 测试Agent fixture
  testAgent: async ({ apiContext, testUser }, use) => {
    const agent = await createTestAgent(apiContext, testUser.token);
    await use(agent);
    await cleanupTestAgent(apiContext, testUser.token, agent.id);
  },

  // 测试数据fixture
  testData: async ({}, use) => {
    await use({
      users: [],
      agents: [],
      conversations: [],
    });
  },
});

export { expect };

/**
 * 创建测试用户
 */
async function createTestUser(apiContext: APIRequestContext): Promise<TestUser> {
  const timestamp = Date.now();
  const response = await apiContext.post('/api/auth/register', {
    data: {
      email: `test-${timestamp}@e2e.test`,
      password: 'TestPassword123!',
      nickname: `TestUser-${timestamp}`,
    },
  });

  expect(response.ok()).toBeTruthy();
  const data = await response.json();

  return {
    id: data.user.id,
    email: data.user.email,
    nickname: data.user.nickname,
    token: data.token,
  };
}

/**
 * 清理测试用户
 */
async function cleanupTestUser(apiContext: APIRequestContext, userId: string): Promise<void> {
  try {
    await apiContext.delete(`/api/test/users/${userId}`);
  } catch (e) {
    // 忽略清理错误
  }
}

/**
 * 创建测试Agent
 */
async function createTestAgent(
  apiContext: APIRequestContext,
  token: string
): Promise<TestAgent> {
  const response = await apiContext.post('/api/agents', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      name: `TestAgent-${Date.now()}`,
      scene: 'visionshare',
      config: {
        autoReply: true,
        disclosureLevel: 'basic',
      },
    },
  });

  expect(response.ok()).toBeTruthy();
  const data = await response.json();

  return {
    id: data.id,
    name: data.name,
    scene: data.scene,
  };
}

/**
 * 清理测试Agent
 */
async function cleanupTestAgent(
  apiContext: APIRequestContext,
  token: string,
  agentId: string
): Promise<void> {
  try {
    await apiContext.delete(`/api/agents/${agentId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (e) {
    // 忽略清理错误
  }
}
