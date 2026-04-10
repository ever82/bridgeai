import { test, expect } from '../../fixtures/test-fixtures';

/**
 * API契约测试
 *
 * 验证各层API接口的契约一致性:
 * - 请求/响应格式
 * - 状态码
 * - 错误处理
 * - 数据类型
 */

test.describe('API契约测试', () => {
  test.describe('认证API契约', () => {
    test('POST /api/auth/register 应该返回标准格式', async ({ apiContext }) => {
      const timestamp = Date.now();
      const response = await apiContext.post('/api/auth/register', {
        data: {
          email: `contract-${timestamp}@test.com`,
          password: 'TestPass123!',
          nickname: 'ContractTest',
        },
      });

      expect(response.ok()).toBeTruthy();

      const data = await response.json();

      // 验证响应结构
      expect(data).toHaveProperty('user');
      expect(data).toHaveProperty('token');
      expect(data.user).toHaveProperty('id');
      expect(data.user).toHaveProperty('email');
      expect(data.user).toHaveProperty('nickname');
      expect(typeof data.token).toBe('string');
      expect(data.token.length).toBeGreaterThan(0);
    });

    test('POST /api/auth/login 错误密码应该返回401', async ({ apiContext }) => {
      // 先注册一个用户
      const timestamp = Date.now();
      await apiContext.post('/api/auth/register', {
        data: {
          email: `login-test-${timestamp}@test.com`,
          password: 'CorrectPass123!',
          nickname: 'LoginTest',
        },
      });

      // 用错误密码登录
      const response = await apiContext.post('/api/auth/login', {
        data: {
          email: `login-test-${timestamp}@test.com`,
          password: 'WrongPass123!',
        },
      });

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code');
    });

    test('GET /api/auth/me 需要有效的token', async ({ apiContext }) => {
      // 无token请求
      const response = await apiContext.get('/api/auth/me');

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Agent API契约', () => {
    test('Agent CRUD操作应该遵循REST规范', async ({ apiContext, testUser }) => {
      // Create
      const createResponse = await apiContext.post('/api/agents', {
        headers: { Authorization: `Bearer ${testUser.token}` },
        data: {
          name: 'ContractAgent',
          scene: 'visionshare',
        },
      });

      expect(createResponse.status()).toBe(201);
      const created = await createResponse.json();
      expect(created).toHaveProperty('id');
      expect(created.name).toBe('ContractAgent');

      // Read
      const readResponse = await apiContext.get(`/api/agents/${created.id}`, {
        headers: { Authorization: `Bearer ${testUser.token}` },
      });

      expect(readResponse.status()).toBe(200);
      const read = await readResponse.json();
      expect(read.id).toBe(created.id);

      // Update
      const updateResponse = await apiContext.patch(`/api/agents/${created.id}`, {
        headers: { Authorization: `Bearer ${testUser.token}` },
        data: { name: 'UpdatedAgent' },
      });

      expect(updateResponse.status()).toBe(200);
      const updated = await updateResponse.json();
      expect(updated.name).toBe('UpdatedAgent');

      // Delete
      const deleteResponse = await apiContext.delete(`/api/agents/${created.id}`, {
        headers: { Authorization: `Bearer ${testUser.token}` },
      });

      expect(deleteResponse.status()).toBe(204);

      // Verify deletion
      const verifyResponse = await apiContext.get(`/api/agents/${created.id}`, {
        headers: { Authorization: `Bearer ${testUser.token}` },
      });

      expect(verifyResponse.status()).toBe(404);
    });

    test('Agent列表应该支持分页', async ({ apiContext, testUser }) => {
      const response = await apiContext.get('/api/agents?page=1&limit=10', {
        headers: { Authorization: `Bearer ${testUser.token}` },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      // 验证分页结构
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(data.pagination).toHaveProperty('page');
      expect(data.pagination).toHaveProperty('limit');
      expect(data.pagination).toHaveProperty('total');
      expect(Array.isArray(data.data)).toBeTruthy();
    });
  });

  test.describe('VisionShare API契约', () => {
    test('需求发布应该验证必要字段', async ({ apiContext, testUser }) => {
      const response = await apiContext.post('/api/visionshare/demands', {
        headers: { Authorization: `Bearer ${testUser.token}` },
        data: {
          // 缺少title和location
          description: '测试描述',
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('errors');
      expect(Array.isArray(data.errors)).toBeTruthy();
    });

    test('附近查询应该返回地理位置数据', async ({ apiContext, testUser }) => {
      const response = await apiContext.get(
        '/api/visionshare/demands/nearby?lat=39.9042&lng=116.4074&radius=5000',
        {
          headers: { Authorization: `Bearer ${testUser.token}` },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();

      if (data.length > 0) {
        const item = data[0];
        expect(item).toHaveProperty('location');
        expect(item.location).toHaveProperty('latitude');
        expect(item.location).toHaveProperty('longitude');
        expect(typeof item.location.latitude).toBe('number');
        expect(typeof item.location.longitude).toBe('number');
      }
    });
  });

  test.describe('匹配API契约', () => {
    test('匹配查询应该返回标准格式', async ({ apiContext, testUser }) => {
      // 先创建Agent
      const agentResponse = await apiContext.post('/api/agents', {
        headers: { Authorization: `Bearer ${testUser.token}` },
        data: { name: 'MatchAgent', scene: 'agentdate' },
      });

      const agent = await agentResponse.json();

      const response = await apiContext.post('/api/matching/query', {
        headers: { Authorization: `Bearer ${testUser.token}` },
        data: {
          agentId: agent.id,
          filters: {},
          limit: 10,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();

      if (data.length > 0) {
        const match = data[0];
        expect(match).toHaveProperty('id');
        expect(match).toHaveProperty('score');
        expect(typeof match.score).toBe('number');
        expect(match.score).toBeGreaterThanOrEqual(0);
        expect(match.score).toBeLessThanOrEqual(100);
      }
    });
  });

  test.describe('通信API契约', () => {
    test('消息应该包含必要字段', async ({ apiContext, testUser }) => {
      // 创建房间
      const roomResponse = await apiContext.post('/api/communications/rooms', {
        headers: { Authorization: `Bearer ${testUser.token}` },
        data: {
          type: 'direct',
          participants: [testUser.id, 'other-user-id'],
        },
      });

      const room = await roomResponse.json();

      // 发送消息
      const messageResponse = await apiContext.post(`/api/communications/rooms/${room.id}/messages`, {
        headers: { Authorization: `Bearer ${testUser.token}` },
        data: {
          content: 'Test message',
          type: 'text',
        },
      });

      expect(messageResponse.status()).toBe(201);
      const message = await messageResponse.json();

      // 验证消息结构
      expect(message).toHaveProperty('id');
      expect(message).toHaveProperty('roomId');
      expect(message).toHaveProperty('senderId');
      expect(message).toHaveProperty('content');
      expect(message).toHaveProperty('type');
      expect(message).toHaveProperty('createdAt');
      expect(message.roomId).toBe(room.id);
      expect(message.senderId).toBe(testUser.id);
    });

    test('消息历史应该按时间排序', async ({ apiContext, testUser }) => {
      const roomResponse = await apiContext.post('/api/communications/rooms', {
        headers: { Authorization: `Bearer ${testUser.token}` },
        data: {
          type: 'direct',
          participants: [testUser.id],
        },
      });

      const room = await roomResponse.json();

      // 获取消息历史
      const historyResponse = await apiContext.get(`/api/communications/rooms/${room.id}/messages`, {
        headers: { Authorization: `Bearer ${testUser.token}` },
      });

      expect(historyResponse.ok()).toBeTruthy();
      const data = await historyResponse.json();
      expect(Array.isArray(data.messages)).toBeTruthy();

      // 验证时间排序
      const messages = data.messages;
      for (let i = 1; i < messages.length; i++) {
        const prev = new Date(messages[i - 1].createdAt).getTime();
        const curr = new Date(messages[i].createdAt).getTime();
        expect(prev).toBeLessThanOrEqual(curr);
      }
    });
  });

  test.describe('信用积分API契约', () => {
    test('信用分查询应该返回完整信息', async ({ apiContext, testUser }) => {
      const response = await apiContext.get('/api/credits/score', {
        headers: { Authorization: `Bearer ${testUser.token}` },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data).toHaveProperty('score');
      expect(data).toHaveProperty('level');
      expect(data).toHaveProperty('history');
      expect(typeof data.score).toBe('number');
      expect(typeof data.level).toBe('string');
      expect(Array.isArray(data.history)).toBeTruthy();
    });

    test('积分交易应该有幂等性保证', async ({ apiContext, testUser }) => {
      // 使用相同的idempotency key发送两次
      const idempotencyKey = `test-${Date.now()}`;

      const payload = {
        type: 'credit',
        amount: 100,
        description: '幂等性测试',
      };

      const response1 = await apiContext.post('/api/credits/transactions', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
          'Idempotency-Key': idempotencyKey,
        },
        data: payload,
      });

      expect(response1.ok()).toBeTruthy();
      const data1 = await response1.json();

      const response2 = await apiContext.post('/api/credits/transactions', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
          'Idempotency-Key': idempotencyKey,
        },
        data: payload,
      });

      expect(response2.ok()).toBeTruthy();
      const data2 = await response2.json();

      // 两次请求应该返回相同的交易ID
      expect(data2.id).toBe(data1.id);
    });
  });

  test.describe('错误处理契约', () => {
    test('400错误应该返回标准格式', async ({ apiContext, testUser }) => {
      const response = await apiContext.post('/api/agents', {
        headers: { Authorization: `Bearer ${testUser.token}` },
        data: {}, // 缺少必要字段
      });

      expect(response.status()).toBe(400);
      const data = await response.json();

      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code');
      expect(data).toHaveProperty('statusCode');
      expect(data.statusCode).toBe(400);
    });

    test('404错误应该返回标准格式', async ({ apiContext, testUser }) => {
      const response = await apiContext.get('/api/agents/non-existent-id', {
        headers: { Authorization: `Bearer ${testUser.token}` },
      });

      expect(response.status()).toBe(404);
      const data = await response.json();

      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code');
      expect(data.code).toBe('AGENT_NOT_FOUND');
    });

    test('429错误应该包含Retry-After头', async ({ apiContext }) => {
      // 触发限流
      const requests = [];
      for (let i = 0; i < 150; i++) {
        requests.push(apiContext.get('/api/health'));
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status() === 429);

      if (rateLimited) {
        const limited = responses.find(r => r.status() === 429);
        expect(limited?.headers()['retry-after']).toBeDefined();
      }
    });
  });
});
