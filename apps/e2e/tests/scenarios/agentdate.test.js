"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_fixtures_1 = require("../../fixtures/test-fixtures");
/**
 * AgentDate场景端到端测试
 *
 * 覆盖范围:
 * - 交友画像配置完整流程
 * - Agent主动匹配推荐机制
 * - Agent间对话匹配流程
 * - 双向同意引荐机制验证
 * - 人机切换场景测试
 */
test_fixtures_1.test.describe('AgentDate场景', () => {
    test_fixtures_1.test.describe('交友画像配置', () => {
        (0, test_fixtures_1.test)('用户应该能创建交友画像', async ({ apiContext, testUser }) => {
            // 1. 创建Agent
            const agentResponse = await apiContext.post('/api/agents', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    name: '交友助手',
                    scene: 'agentdate',
                    config: {
                        autoReply: true,
                        disclosureLevel: 'basic',
                    },
                },
            });
            (0, test_fixtures_1.expect)(agentResponse.ok()).toBeTruthy();
            const agent = await agentResponse.json();
            // 2. 配置交友画像
            const profileResponse = await apiContext.post('/api/agentdate/profiles', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    agentId: agent.id,
                    profile: {
                        age: 25,
                        gender: 'male',
                        location: '北京',
                        occupation: '工程师',
                        interests: ['摄影', '旅行', '阅读'],
                        personality: '开朗外向',
                    },
                    preferences: {
                        ageRange: [22, 30],
                        gender: 'female',
                        location: '北京',
                        interests: ['旅行', '美食'],
                    },
                },
            });
            (0, test_fixtures_1.expect)(profileResponse.ok()).toBeTruthy();
            const profile = await profileResponse.json();
            (0, test_fixtures_1.expect)(profile).toHaveProperty('id');
            (0, test_fixtures_1.expect)(profile.profile.age).toBe(25);
            (0, test_fixtures_1.expect)(profile.preferences.gender).toBe('female');
        });
        (0, test_fixtures_1.test)('用户应该能更新交友偏好设置', async ({ apiContext, testUser }) => {
            // 1. 先创建画像
            const agentResponse = await apiContext.post('/api/agents', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    name: '交友助手2',
                    scene: 'agentdate',
                },
            });
            const agent = await agentResponse.json();
            const profileResponse = await apiContext.post('/api/agentdate/profiles', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    agentId: agent.id,
                    profile: {
                        age: 28,
                        gender: 'female',
                        location: '上海',
                    },
                    preferences: {
                        ageRange: [25, 35],
                        gender: 'male',
                    },
                },
            });
            const profile = await profileResponse.json();
            // 2. 更新偏好设置
            const updateResponse = await apiContext.patch(`/api/agentdate/profiles/${profile.id}/preferences`, {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    ageRange: [26, 32],
                    interests: ['运动', '音乐'],
                },
            });
            (0, test_fixtures_1.expect)(updateResponse.ok()).toBeTruthy();
            const updated = await updateResponse.json();
            (0, test_fixtures_1.expect)(updated.preferences.ageRange).toEqual([26, 32]);
            (0, test_fixtures_1.expect)(updated.preferences.interests).toContain('运动');
        });
    });
    test_fixtures_1.test.describe('Agent主动匹配推荐', () => {
        (0, test_fixtures_1.test)('Agent应该能为用户推荐匹配对象', async ({ apiContext, testUser }) => {
            // 1. 创建用户画像
            const agentResponse = await apiContext.post('/api/agents', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    name: '匹配测试助手',
                    scene: 'agentdate',
                },
            });
            const agent = await agentResponse.json();
            await apiContext.post('/api/agentdate/profiles', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    agentId: agent.id,
                    profile: {
                        age: 26,
                        gender: 'female',
                        location: '北京',
                        interests: ['电影', '音乐'],
                    },
                    preferences: {
                        ageRange: [24, 32],
                        gender: 'male',
                        location: '北京',
                    },
                },
            });
            // 2. 请求匹配推荐
            const matchResponse = await apiContext.post('/api/agentdate/matches', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    agentId: agent.id,
                    limit: 5,
                },
            });
            (0, test_fixtures_1.expect)(matchResponse.ok()).toBeTruthy();
            const matches = await matchResponse.json();
            (0, test_fixtures_1.expect)(Array.isArray(matches)).toBeTruthy();
            (0, test_fixtures_1.expect)(matches.length).toBeLessThanOrEqual(5);
            // 3. 验证匹配结果结构
            if (matches.length > 0) {
                const firstMatch = matches[0];
                (0, test_fixtures_1.expect)(firstMatch).toHaveProperty('userId');
                (0, test_fixtures_1.expect)(firstMatch).toHaveProperty('compatibilityScore');
                (0, test_fixtures_1.expect)(firstMatch).toHaveProperty('reasoning');
            }
        });
        (0, test_fixtures_1.test)('匹配推荐应该考虑用户的偏好设置', async ({ apiContext, testUser }) => {
            // 1. 设置严格的偏好
            const agentResponse = await apiContext.post('/api/agents', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    name: '严格匹配助手',
                    scene: 'agentdate',
                },
            });
            const agent = await agentResponse.json();
            await apiContext.post('/api/agentdate/profiles', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    agentId: agent.id,
                    profile: {
                        age: 30,
                        gender: 'male',
                        location: '深圳',
                    },
                    preferences: {
                        ageRange: [26, 30],
                        gender: 'female',
                        location: '深圳',
                        strictMode: true,
                    },
                },
            });
            // 2. 获取推荐
            const matchResponse = await apiContext.get(`/api/agentdate/matches?agentId=${agent.id}`, {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
            });
            (0, test_fixtures_1.expect)(matchResponse.ok()).toBeTruthy();
            const matches = await matchResponse.json();
            // 3. 验证推荐符合偏好
            for (const match of matches) {
                (0, test_fixtures_1.expect)(match.profile.age).toBeGreaterThanOrEqual(26);
                (0, test_fixtures_1.expect)(match.profile.age).toBeLessThanOrEqual(30);
                (0, test_fixtures_1.expect)(match.profile.gender).toBe('female');
            }
        });
    });
    test_fixtures_1.test.describe('Agent间对话匹配', () => {
        (0, test_fixtures_1.test)('两个Agent应该能进行匹配对话', async ({ apiContext, testUser }) => {
            // 1. 创建第一个Agent和画像
            const agent1Response = await apiContext.post('/api/agents', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    name: '对话Agent1',
                    scene: 'agentdate',
                },
            });
            const agent1 = await agent1Response.json();
            await apiContext.post('/api/agentdate/profiles', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    agentId: agent1.id,
                    profile: {
                        age: 27,
                        gender: 'male',
                        interests: ['编程', '游戏'],
                    },
                    preferences: {
                        ageRange: [24, 30],
                        gender: 'female',
                    },
                },
            });
            // 2. 发起Agent对话请求
            const conversationResponse = await apiContext.post('/api/agentdate/conversations', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    agentId: agent1.id,
                    targetUserId: 'test-target-user-id',
                },
            });
            (0, test_fixtures_1.expect)(conversationResponse.ok()).toBeTruthy();
            const conversation = await conversationResponse.json();
            (0, test_fixtures_1.expect)(conversation).toHaveProperty('id');
            (0, test_fixtures_1.expect)(conversation).toHaveProperty('status');
            (0, test_fixtures_1.expect)(['pending', 'active', 'completed']).toContain(conversation.status);
        });
        (0, test_fixtures_1.test)('Agent对话应该有轮次限制', async ({ apiContext, testUser }) => {
            // 1. 创建Agent对话
            const agentResponse = await apiContext.post('/api/agents', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    name: '轮次测试Agent',
                    scene: 'agentdate',
                },
            });
            const agent = await agentResponse.json();
            const conversationResponse = await apiContext.post('/api/agentdate/conversations', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    agentId: agent.id,
                    targetUserId: 'test-target-id',
                },
            });
            const conversation = await conversationResponse.json();
            // 2. 验证对话有轮次限制配置
            const configResponse = await apiContext.get(`/api/agentdate/conversations/${conversation.id}/config`, {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
            });
            (0, test_fixtures_1.expect)(configResponse.ok()).toBeTruthy();
            const config = await configResponse.json();
            (0, test_fixtures_1.expect)(config).toHaveProperty('maxRounds');
            (0, test_fixtures_1.expect)(config.maxRounds).toBeGreaterThan(0);
        });
    });
    test_fixtures_1.test.describe('双向同意引荐机制', () => {
        (0, test_fixtures_1.test)('匹配成功需要双方Agent同意', async ({ apiContext, testUser }) => {
            // 1. 创建匹配
            const agentResponse = await apiContext.post('/api/agents', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    name: '引荐测试Agent',
                    scene: 'agentdate',
                },
            });
            const agent = await agentResponse.json();
            const matchResponse = await apiContext.post('/api/agentdate/matches/request', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    agentId: agent.id,
                    targetUserId: 'target-user-id',
                },
            });
            (0, test_fixtures_1.expect)(matchResponse.ok()).toBeTruthy();
            const match = await matchResponse.json();
            (0, test_fixtures_1.expect)(match.status).toBe('pending');
            // 2. 验证需要双方同意
            const statusResponse = await apiContext.get(`/api/agentdate/matches/${match.id}`, {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
            });
            (0, test_fixtures_1.expect)(statusResponse.ok()).toBeTruthy();
            const status = await statusResponse.json();
            (0, test_fixtures_1.expect)(status).toHaveProperty('initiatorConsent');
            (0, test_fixtures_1.expect)(status).toHaveProperty('targetConsent');
        });
        (0, test_fixtures_1.test)('双方同意后应该能建立连接', async ({ apiContext, testUser }) => {
            // 1. 创建并完成匹配流程
            const agentResponse = await apiContext.post('/api/agents', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    name: '连接测试Agent',
                    scene: 'agentdate',
                },
            });
            const agent = await agentResponse.json();
            const matchResponse = await apiContext.post('/api/agentdate/matches', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    agentId: agent.id,
                    targetUserId: 'target-user-id',
                },
            });
            const match = await matchResponse.json();
            // 2. 双方同意
            await apiContext.post(`/api/agentdate/matches/${match.id}/consent`, {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    decision: 'accept',
                },
            });
            // 3. 验证连接状态
            const connectionResponse = await apiContext.get(`/api/agentdate/connections/${match.id}`, {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
            });
            (0, test_fixtures_1.expect)(connectionResponse.ok()).toBeTruthy();
            const connection = await connectionResponse.json();
            (0, test_fixtures_1.expect)(connection).toHaveProperty('status');
        });
    });
    test_fixtures_1.test.describe('人机切换', () => {
        (0, test_fixtures_1.test)('用户应该能在人机模式间切换', async ({ apiContext, testUser }) => {
            // 1. 创建Agent
            const agentResponse = await apiContext.post('/api/agents', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    name: '切换测试Agent',
                    scene: 'agentdate',
                    config: {
                        autoReply: true,
                    },
                },
            });
            const agent = await agentResponse.json();
            // 2. 切换到人工模式
            const switchResponse = await apiContext.post(`/api/agents/${agent.id}/mode`, {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    mode: 'human',
                    reason: '用户主动接管',
                },
            });
            (0, test_fixtures_1.expect)(switchResponse.ok()).toBeTruthy();
            const switched = await switchResponse.json();
            (0, test_fixtures_1.expect)(switched.mode).toBe('human');
            // 3. 验证模式已切换
            const statusResponse = await apiContext.get(`/api/agents/${agent.id}/status`, {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
            });
            (0, test_fixtures_1.expect)(statusResponse.ok()).toBeTruthy();
            const status = await statusResponse.json();
            (0, test_fixtures_1.expect)(status.mode).toBe('human');
        });
        (0, test_fixtures_1.test)('人机切换应该记录日志', async ({ apiContext, testUser }) => {
            // 1. 创建并切换
            const agentResponse = await apiContext.post('/api/agents', {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    name: '日志测试Agent',
                    scene: 'agentdate',
                },
            });
            const agent = await agentResponse.json();
            await apiContext.post(`/api/agents/${agent.id}/mode`, {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
                data: {
                    mode: 'human',
                },
            });
            // 2. 验证切换日志
            const logsResponse = await apiContext.get(`/api/agents/${agent.id}/logs`, {
                headers: {
                    Authorization: `Bearer ${testUser.token}`,
                },
            });
            (0, test_fixtures_1.expect)(logsResponse.ok()).toBeTruthy();
            const logs = await logsResponse.json();
            const switchLog = logs.find((log) => log.action === 'mode_switch');
            (0, test_fixtures_1.expect)(switchLog).toBeDefined();
        });
    });
});
//# sourceMappingURL=agentdate.test.js.map