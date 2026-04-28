"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_fixtures_1 = require("../../fixtures/test-fixtures");
/**
 * API契约测试
 *
 * 验证各层API接口的契约一致性:
 * - 请求/响应格式
 * - 状态码
 * - 错误处理
 * - 数据类型
 */
test_fixtures_1.test.describe('API契约测试', () => {
    test_fixtures_1.test.describe('认证API契约', () => {
        (0, test_fixtures_1.test)('POST /api/auth/register 应该返回标准格式', async ({ apiContext }) => {
            const timestamp = Date.now();
            const response = await apiContext.post('/api/auth/register', {
                data: {
                    email: `contract-${timestamp}@test.com`,
                    password: 'TestPass123!',
                    nickname: 'ContractTest',
                },
            });
            (0, test_fixtures_1.expect)(response.ok()).toBeTruthy();
            const data = await response.json();
            // 验证响应结构
            (0, test_fixtures_1.expect)(data).toHaveProperty('user');
            (0, test_fixtures_1.expect)(data).toHaveProperty('token');
            (0, test_fixtures_1.expect)(data.user).toHaveProperty('id');
            (0, test_fixtures_1.expect)(data.user).toHaveProperty('email');
            (0, test_fixtures_1.expect)(data.user).toHaveProperty('nickname');
            (0, test_fixtures_1.expect)(typeof data.token).toBe('string');
            (0, test_fixtures_1.expect)(data.token.length).toBeGreaterThan(0);
        });
        (0, test_fixtures_1.test)('POST /api/auth/login 错误密码应该返回401', async ({ apiContext }) => {
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
            (0, test_fixtures_1.expect)(response.status()).toBe(401);
            const data = await response.json();
            (0, test_fixtures_1.expect)(data).toHaveProperty('error');
            (0, test_fixtures_1.expect)(data).toHaveProperty('code');
        });
        (0, test_fixtures_1.test)('GET /api/auth/me 需要有效的token', async ({ apiContext }) => {
            // 无token请求
            const response = await apiContext.get('/api/auth/me');
            (0, test_fixtures_1.expect)(response.status()).toBe(401);
        });
    });
    test_fixtures_1.test.describe('Agent API契约', () => {
        (0, test_fixtures_1.test)('Agent CRUD操作应该遵循REST规范', async ({ apiContext, testUser }) => {
            // Create
            const createResponse = await apiContext.post('/api/agents', {
                headers: { Authorization: `Bearer ${testUser.token}` },
                data: {
                    name: 'ContractAgent',
                    scene: 'visionshare',
                },
            });
            (0, test_fixtures_1.expect)(createResponse.status()).toBe(201);
            const created = await createResponse.json();
            (0, test_fixtures_1.expect)(created).toHaveProperty('id');
            (0, test_fixtures_1.expect)(created.name).toBe('ContractAgent');
            // Read
            const readResponse = await apiContext.get(`/api/agents/${created.id}`, {
                headers: { Authorization: `Bearer ${testUser.token}` },
            });
            (0, test_fixtures_1.expect)(readResponse.status()).toBe(200);
            const read = await readResponse.json();
            (0, test_fixtures_1.expect)(read.id).toBe(created.id);
            // Update
            const updateResponse = await apiContext.patch(`/api/agents/${created.id}`, {
                headers: { Authorization: `Bearer ${testUser.token}` },
                data: { name: 'UpdatedAgent' },
            });
            (0, test_fixtures_1.expect)(updateResponse.status()).toBe(200);
            const updated = await updateResponse.json();
            (0, test_fixtures_1.expect)(updated.name).toBe('UpdatedAgent');
            // Delete
            const deleteResponse = await apiContext.delete(`/api/agents/${created.id}`, {
                headers: { Authorization: `Bearer ${testUser.token}` },
            });
            (0, test_fixtures_1.expect)(deleteResponse.status()).toBe(204);
            // Verify deletion
            const verifyResponse = await apiContext.get(`/api/agents/${created.id}`, {
                headers: { Authorization: `Bearer ${testUser.token}` },
            });
            (0, test_fixtures_1.expect)(verifyResponse.status()).toBe(404);
        });
        (0, test_fixtures_1.test)('Agent列表应该支持分页', async ({ apiContext, testUser }) => {
            const response = await apiContext.get('/api/agents?page=1&limit=10', {
                headers: { Authorization: `Bearer ${testUser.token}` },
            });
            (0, test_fixtures_1.expect)(response.ok()).toBeTruthy();
            const data = await response.json();
            // 验证分页结构
            (0, test_fixtures_1.expect)(data).toHaveProperty('data');
            (0, test_fixtures_1.expect)(data).toHaveProperty('pagination');
            (0, test_fixtures_1.expect)(data.pagination).toHaveProperty('page');
            (0, test_fixtures_1.expect)(data.pagination).toHaveProperty('limit');
            (0, test_fixtures_1.expect)(data.pagination).toHaveProperty('total');
            (0, test_fixtures_1.expect)(Array.isArray(data.data)).toBeTruthy();
        });
    });
    test_fixtures_1.test.describe('VisionShare API契约', () => {
        (0, test_fixtures_1.test)('需求发布应该验证必要字段', async ({ apiContext, testUser }) => {
            const response = await apiContext.post('/api/visionshare/demands', {
                headers: { Authorization: `Bearer ${testUser.token}` },
                data: {
                    // 缺少title和location
                    description: '测试描述',
                },
            });
            (0, test_fixtures_1.expect)(response.status()).toBe(400);
            const data = await response.json();
            (0, test_fixtures_1.expect)(data).toHaveProperty('errors');
            (0, test_fixtures_1.expect)(Array.isArray(data.errors)).toBeTruthy();
        });
        (0, test_fixtures_1.test)('附近查询应该返回地理位置数据', async ({ apiContext, testUser }) => {
            const response = await apiContext.get('/api/visionshare/demands/nearby?lat=39.9042&lng=116.4074&radius=5000', {
                headers: { Authorization: `Bearer ${testUser.token}` },
            });
            (0, test_fixtures_1.expect)(response.ok()).toBeTruthy();
            const data = await response.json();
            (0, test_fixtures_1.expect)(Array.isArray(data)).toBeTruthy();
            if (data.length > 0) {
                const item = data[0];
                (0, test_fixtures_1.expect)(item).toHaveProperty('location');
                (0, test_fixtures_1.expect)(item.location).toHaveProperty('latitude');
                (0, test_fixtures_1.expect)(item.location).toHaveProperty('longitude');
                (0, test_fixtures_1.expect)(typeof item.location.latitude).toBe('number');
                (0, test_fixtures_1.expect)(typeof item.location.longitude).toBe('number');
            }
        });
    });
    test_fixtures_1.test.describe('匹配API契约', () => {
        (0, test_fixtures_1.test)('匹配查询应该返回标准格式', async ({ apiContext, testUser }) => {
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
            (0, test_fixtures_1.expect)(response.ok()).toBeTruthy();
            const data = await response.json();
            (0, test_fixtures_1.expect)(Array.isArray(data)).toBeTruthy();
            if (data.length > 0) {
                const match = data[0];
                (0, test_fixtures_1.expect)(match).toHaveProperty('id');
                (0, test_fixtures_1.expect)(match).toHaveProperty('score');
                (0, test_fixtures_1.expect)(typeof match.score).toBe('number');
                (0, test_fixtures_1.expect)(match.score).toBeGreaterThanOrEqual(0);
                (0, test_fixtures_1.expect)(match.score).toBeLessThanOrEqual(100);
            }
        });
    });
    test_fixtures_1.test.describe('通信API契约', () => {
        (0, test_fixtures_1.test)('消息应该包含必要字段', async ({ apiContext, testUser }) => {
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
            (0, test_fixtures_1.expect)(messageResponse.status()).toBe(201);
            const message = await messageResponse.json();
            // 验证消息结构
            (0, test_fixtures_1.expect)(message).toHaveProperty('id');
            (0, test_fixtures_1.expect)(message).toHaveProperty('roomId');
            (0, test_fixtures_1.expect)(message).toHaveProperty('senderId');
            (0, test_fixtures_1.expect)(message).toHaveProperty('content');
            (0, test_fixtures_1.expect)(message).toHaveProperty('type');
            (0, test_fixtures_1.expect)(message).toHaveProperty('createdAt');
            (0, test_fixtures_1.expect)(message.roomId).toBe(room.id);
            (0, test_fixtures_1.expect)(message.senderId).toBe(testUser.id);
        });
        (0, test_fixtures_1.test)('消息历史应该按时间排序', async ({ apiContext, testUser }) => {
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
            (0, test_fixtures_1.expect)(historyResponse.ok()).toBeTruthy();
            const data = await historyResponse.json();
            (0, test_fixtures_1.expect)(Array.isArray(data.messages)).toBeTruthy();
            // 验证时间排序
            const messages = data.messages;
            for (let i = 1; i < messages.length; i++) {
                const prev = new Date(messages[i - 1].createdAt).getTime();
                const curr = new Date(messages[i].createdAt).getTime();
                (0, test_fixtures_1.expect)(prev).toBeLessThanOrEqual(curr);
            }
        });
    });
    test_fixtures_1.test.describe('信用积分API契约', () => {
        (0, test_fixtures_1.test)('信用分查询应该返回完整信息', async ({ apiContext, testUser }) => {
            const response = await apiContext.get('/api/credits/score', {
                headers: { Authorization: `Bearer ${testUser.token}` },
            });
            (0, test_fixtures_1.expect)(response.ok()).toBeTruthy();
            const data = await response.json();
            (0, test_fixtures_1.expect)(data).toHaveProperty('score');
            (0, test_fixtures_1.expect)(data).toHaveProperty('level');
            (0, test_fixtures_1.expect)(data).toHaveProperty('history');
            (0, test_fixtures_1.expect)(typeof data.score).toBe('number');
            (0, test_fixtures_1.expect)(typeof data.level).toBe('string');
            (0, test_fixtures_1.expect)(Array.isArray(data.history)).toBeTruthy();
        });
        (0, test_fixtures_1.test)('积分交易应该有幂等性保证', async ({ apiContext, testUser }) => {
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
            (0, test_fixtures_1.expect)(response1.ok()).toBeTruthy();
            const data1 = await response1.json();
            const response2 = await apiContext.post('/api/credits/transactions', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                    'Idempotency-Key': idempotencyKey,
                },
                data: payload,
            });
            (0, test_fixtures_1.expect)(response2.ok()).toBeTruthy();
            const data2 = await response2.json();
            // 两次请求应该返回相同的交易ID
            (0, test_fixtures_1.expect)(data2.id).toBe(data1.id);
        });
    });
    test_fixtures_1.test.describe('错误处理契约', () => {
        (0, test_fixtures_1.test)('400错误应该返回标准格式', async ({ apiContext, testUser }) => {
            const response = await apiContext.post('/api/agents', {
                headers: { Authorization: `Bearer ${testUser.token}` },
                data: {}, // 缺少必要字段
            });
            (0, test_fixtures_1.expect)(response.status()).toBe(400);
            const data = await response.json();
            (0, test_fixtures_1.expect)(data).toHaveProperty('error');
            (0, test_fixtures_1.expect)(data).toHaveProperty('code');
            (0, test_fixtures_1.expect)(data).toHaveProperty('statusCode');
            (0, test_fixtures_1.expect)(data.statusCode).toBe(400);
        });
        (0, test_fixtures_1.test)('404错误应该返回标准格式', async ({ apiContext, testUser }) => {
            const response = await apiContext.get('/api/agents/non-existent-id', {
                headers: { Authorization: `Bearer ${testUser.token}` },
            });
            (0, test_fixtures_1.expect)(response.status()).toBe(404);
            const data = await response.json();
            (0, test_fixtures_1.expect)(data).toHaveProperty('error');
            (0, test_fixtures_1.expect)(data).toHaveProperty('code');
            (0, test_fixtures_1.expect)(data.code).toBe('AGENT_NOT_FOUND');
        });
        (0, test_fixtures_1.test)('429错误应该包含Retry-After头', async ({ apiContext }) => {
            // 触发限流
            const requests = [];
            for (let i = 0; i < 150; i++) {
                requests.push(apiContext.get('/api/health'));
            }
            const responses = await Promise.all(requests);
            const rateLimited = responses.some(r => r.status() === 429);
            if (rateLimited) {
                const limited = responses.find(r => r.status() === 429);
                (0, test_fixtures_1.expect)(limited?.headers()['retry-after']).toBeDefined();
            }
        });
    });
});
//# sourceMappingURL=api-contracts.test.js.map