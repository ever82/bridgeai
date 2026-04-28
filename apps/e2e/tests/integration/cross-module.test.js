"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_fixtures_1 = require("../../fixtures/test-fixtures");
/**
 * 跨模块集成测试
 *
 * 覆盖范围:
 * - Auth-Core-Matching层间API契约测试
 * - AI服务与核心业务模块集成验证
 * - 通信层与各场景模块消息流转测试
 * - 信用积分系统全链路验证
 * - Socket.io实时通信集成测试
 */
test_fixtures_1.test.describe('跨模块集成测试', () => {
    test_fixtures_1.test.describe('Auth-Core-Matching层间集成', () => {
        (0, test_fixtures_1.test)('认证用户应该能创建Agent并进行匹配', async ({ apiContext, testUser }) => {
            // 1. 验证用户认证状态
            const authResponse = await apiContext.get('/api/auth/me', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
            });
            (0, test_fixtures_1.expect)(authResponse.ok()).toBeTruthy();
            const auth = await authResponse.json();
            (0, test_fixtures_1.expect)(auth.id).toBe(testUser.id);
            // 2. 创建Agent (Core层)
            const agentResponse = await apiContext.post('/api/agents', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    name: '集成测试Agent',
                    scene: 'visionshare',
                    config: {
                        autoReply: true,
                    },
                },
            });
            (0, test_fixtures_1.expect)(agentResponse.ok()).toBeTruthy();
            const agent = await agentResponse.json();
            (0, test_fixtures_1.expect)(agent.userId).toBe(testUser.id);
            // 3. 配置Agent L2结构化信息 (Core层)
            const l2Response = await apiContext.post(`/api/agents/${agent.id}/l2-profile`, {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    attributes: [
                        { key: 'location', value: '北京', weight: 0.8 },
                        { key: 'interest', value: '摄影', weight: 0.6 },
                    ],
                    filters: {
                        location: { type: 'within', value: '10km' },
                    },
                },
            });
            (0, test_fixtures_1.expect)(l2Response.ok()).toBeTruthy();
            // 4. 执行匹配查询 (Matching层)
            const matchResponse = await apiContext.post('/api/matching/query', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    agentId: agent.id,
                    filters: {
                        location: { lat: 39.9042, lng: 116.4074, radius: 5000 },
                    },
                    sortBy: 'relevance',
                    limit: 10,
                },
            });
            (0, test_fixtures_1.expect)(matchResponse.ok()).toBeTruthy();
            const matches = await matchResponse.json();
            (0, test_fixtures_1.expect)(Array.isArray(matches)).toBeTruthy();
        });
        (0, test_fixtures_1.test)('用户登出后应该无法访问受保护资源', async ({ apiContext, testUser }) => {
            // 1. 先验证正常访问
            const beforeResponse = await apiContext.get('/api/agents', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
            });
            (0, test_fixtures_1.expect)(beforeResponse.ok()).toBeTruthy();
            // 2. 登出
            const logoutResponse = await apiContext.post('/api/auth/logout', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
            });
            (0, test_fixtures_1.expect)(logoutResponse.ok()).toBeTruthy();
            // 3. 验证登出后无法访问
            const afterResponse = await apiContext.get('/api/agents', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
            });
            (0, test_fixtures_1.expect)(afterResponse.status()).toBe(401);
        });
    });
    test_fixtures_1.test.describe('AI服务与核心业务集成', () => {
        (0, test_fixtures_1.test)('Agent创建应该触发AI信息提炼', async ({ apiContext, testUser }) => {
            // 1. 创建Agent并配置L1
            const agentResponse = await apiContext.post('/api/agents', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    name: 'AI提炼测试Agent',
                    scene: 'agentdate',
                    l1Profile: {
                        rawText: '我喜欢户外活动，喜欢 hiking 和 camping',
                    },
                },
            });
            (0, test_fixtures_1.expect)(agentResponse.ok()).toBeTruthy();
            const agent = await agentResponse.json();
            // 2. 验证AI提炼触发
            const extractionResponse = await apiContext.get(`/api/agents/${agent.id}/extraction-status`, {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
            });
            (0, test_fixtures_1.expect)(extractionResponse.ok()).toBeTruthy();
            const status = await extractionResponse.json();
            (0, test_fixtures_1.expect)(status).toHaveProperty('status');
            (0, test_fixtures_1.expect)(['pending', 'processing', 'completed']).toContain(status.status);
        });
        (0, test_fixtures_1.test)('AI服务故障时应该有降级处理', async ({ apiContext, testUser }) => {
            // 1. 触发一个需要AI服务的操作
            const extractionResponse = await apiContext.post('/api/ai/extract', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    text: '测试文本',
                    type: 'demand',
                },
            });
            // 即使AI服务故障，也应该返回响应（降级模式）
            (0, test_fixtures_1.expect)(extractionResponse.status()).toBeLessThan(500);
            const result = await extractionResponse.json();
            // 验证降级响应结构
            (0, test_fixtures_1.expect)(result).toHaveProperty('extractedData');
            (0, test_fixtures_1.expect)(result).toHaveProperty('fallback');
        });
    });
    test_fixtures_1.test.describe('通信层与场景模块集成', () => {
        (0, test_fixtures_1.test)('匹配成功后应该创建聊天房间', async ({ apiContext, testUser }) => {
            // 1. 创建Agent并发起匹配
            const agentResponse = await apiContext.post('/api/agents', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    name: '通信测试Agent',
                    scene: 'agentdate',
                },
            });
            const agent = await agentResponse.json();
            // 2. 发起匹配
            const matchResponse = await apiContext.post('/api/agentdate/matches', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    agentId: agent.id,
                    targetUserId: 'test-target-user',
                },
            });
            const match = await matchResponse.json();
            // 3. 双方同意
            await apiContext.post(`/api/agentdate/matches/${match.id}/consent`, {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: { decision: 'accept' },
            });
            // 4. 验证聊天房间创建
            const roomResponse = await apiContext.get(`/api/communications/rooms?matchId=${match.id}`, {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
            });
            (0, test_fixtures_1.expect)(roomResponse.ok()).toBeTruthy();
            const rooms = await roomResponse.json();
            (0, test_fixtures_1.expect)(rooms.length).toBeGreaterThan(0);
        });
        (0, test_fixtures_1.test)('消息发送应该正确路由到对应场景', async ({ apiContext, testUser }) => {
            // 1. 创建一个聊天房间
            const roomResponse = await apiContext.post('/api/communications/rooms', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    type: 'direct',
                    participants: [testUser.id, 'test-participant-id'],
                    scene: 'agentdate',
                },
            });
            (0, test_fixtures_1.expect)(roomResponse.ok()).toBeTruthy();
            const room = await roomResponse.json();
            // 2. 发送消息
            const messageResponse = await apiContext.post(`/api/communications/rooms/${room.id}/messages`, {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    content: '测试消息',
                    type: 'text',
                },
            });
            (0, test_fixtures_1.expect)(messageResponse.ok()).toBeTruthy();
            const message = await messageResponse.json();
            (0, test_fixtures_1.expect)(message.roomId).toBe(room.id);
            (0, test_fixtures_1.expect)(message.scene).toBe('agentdate');
        });
    });
    test_fixtures_1.test.describe('信用积分系统全链路', () => {
        (0, test_fixtures_1.test)('交易应该正确影响用户信用分', async ({ apiContext, testUser }) => {
            // 1. 获取初始信用分
            const initialCreditResponse = await apiContext.get('/api/credits/score', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
            });
            (0, test_fixtures_1.expect)(initialCreditResponse.ok()).toBeTruthy();
            const initialCredit = await initialCreditResponse.json();
            // 2. 完成一次VisionShare交易
            const agentResponse = await apiContext.post('/api/agents', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    name: '信用测试Agent',
                    scene: 'visionshare',
                },
            });
            const _agent = await agentResponse.json();
            const demandResponse = await apiContext.post('/api/visionshare/demands', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    title: '信用测试需求',
                    description: '测试信用变动',
                    location: { latitude: 39.9, longitude: 116.4 },
                    radius: 1000,
                    reward: 10,
                },
            });
            const demand = await demandResponse.json();
            // 3. 完成交易并评价
            await apiContext.post(`/api/visionshare/demands/${demand.id}/complete`, {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    rating: 5,
                    feedback: '非常满意',
                },
            });
            // 4. 验证信用分更新
            const finalCreditResponse = await apiContext.get('/api/credits/score', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
            });
            (0, test_fixtures_1.expect)(finalCreditResponse.ok()).toBeTruthy();
            const finalCredit = await finalCreditResponse.json();
            // 正面评价应该提升或保持信用分
            (0, test_fixtures_1.expect)(finalCredit.score).toBeGreaterThanOrEqual(initialCredit.score);
        });
        (0, test_fixtures_1.test)('积分交易应该有完整的记录', async ({ apiContext, testUser }) => {
            // 1. 执行一次积分支付
            const transactionResponse = await apiContext.post('/api/credits/transactions', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    type: 'debit',
                    amount: 10,
                    description: '测试交易',
                    referenceId: 'test-reference-123',
                    referenceType: 'visionshare_view',
                },
            });
            (0, test_fixtures_1.expect)(transactionResponse.ok()).toBeTruthy();
            const transaction = await transactionResponse.json();
            (0, test_fixtures_1.expect)(transaction).toHaveProperty('id');
            (0, test_fixtures_1.expect)(transaction.status).toBe('completed');
            // 2. 查询交易记录
            const historyResponse = await apiContext.get('/api/credits/transactions', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
            });
            (0, test_fixtures_1.expect)(historyResponse.ok()).toBeTruthy();
            const history = await historyResponse.json();
            (0, test_fixtures_1.expect)(history.transactions).toContainEqual(test_fixtures_1.expect.objectContaining({
                id: transaction.id,
                amount: 10,
            }));
        });
    });
    test_fixtures_1.test.describe('场景模块间数据一致性', () => {
        (0, test_fixtures_1.test)('用户数据应该在各场景间保持一致', async ({ apiContext, testUser }) => {
            // 1. 更新用户资料
            const updateResponse = await apiContext.patch('/api/users/profile', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    nickname: '新昵称',
                    location: '上海',
                },
            });
            (0, test_fixtures_1.expect)(updateResponse.ok()).toBeTruthy();
            // 2. 验证各场景都能看到更新后的数据
            const scenes = ['visionshare', 'agentdate', 'agentjob', 'agentad'];
            for (const scene of scenes) {
                const sceneResponse = await apiContext.get(`/api/${scene}/user-info`, {
                    headers: {
                        Authorization: `Bearer ${testUser.token}`,
                    },
                });
                (0, test_fixtures_1.expect)(sceneResponse.ok()).toBeTruthy();
                const info = await sceneResponse.json();
                (0, test_fixtures_1.expect)(info.nickname).toBe('新昵称');
                (0, test_fixtures_1.expect)(info.location).toBe('上海');
            }
        });
        (0, test_fixtures_1.test)('删除Agent应该清理相关场景数据', async ({ apiContext, testUser }) => {
            // 1. 创建Agent
            const agentResponse = await apiContext.post('/api/agents', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    name: '待删除Agent',
                    scene: 'agentdate',
                },
            });
            const agent = await agentResponse.json();
            // 2. 配置场景数据
            await apiContext.post('/api/agentdate/profiles', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    agentId: agent.id,
                    profile: { age: 25, gender: 'male' },
                },
            });
            // 3. 删除Agent
            const deleteResponse = await apiContext.delete(`/api/agents/${agent.id}`, {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
            });
            (0, test_fixtures_1.expect)(deleteResponse.ok()).toBeTruthy();
            // 4. 验证场景数据已清理
            const profileResponse = await apiContext.get(`/api/agentdate/profiles?agentId=${agent.id}`, {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
            });
            (0, test_fixtures_1.expect)(profileResponse.status()).toBe(404);
        });
    });
});
//# sourceMappingURL=cross-module.test.js.map