import { test, expect } from '../../fixtures/test-fixtures';

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

test.describe('AgentDate场景', () => {
  test.describe('交友画像配置', () => {
    test('用户应该能创建交友画像', async ({ apiContext, testUser }) => {
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

      expect(agentResponse.ok()).toBeTruthy();
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

      expect(profileResponse.ok()).toBeTruthy();
      const profile = await profileResponse.json();
      expect(profile).toHaveProperty('id');
      expect(profile.profile.age).toBe(25);
      expect(profile.preferences.gender).toBe('female');
    });

    test('用户应该能更新交友偏好设置', async ({ apiContext, testUser }) => {
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
      const updateResponse = await apiContext.patch(
        `/api/agentdate/profiles/${profile.id}/preferences`,
        {
          headers: {
            Authorization: `Bearer ${testUser.token}`,
          },
          data: {
            ageRange: [26, 32],
            interests: ['运动', '音乐'],
          },
        }
      );

      expect(updateResponse.ok()).toBeTruthy();
      const updated = await updateResponse.json();
      expect(updated.preferences.ageRange).toEqual([26, 32]);
      expect(updated.preferences.interests).toContain('运动');
    });
  });

  test.describe('Agent主动匹配推荐', () => {
    test('Agent应该能为用户推荐匹配对象', async ({ apiContext, testUser }) => {
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

      expect(matchResponse.ok()).toBeTruthy();
      const matches = await matchResponse.json();
      expect(Array.isArray(matches)).toBeTruthy();
      expect(matches.length).toBeLessThanOrEqual(5);

      // 3. 验证匹配结果结构
      if (matches.length > 0) {
        const firstMatch = matches[0];
        expect(firstMatch).toHaveProperty('userId');
        expect(firstMatch).toHaveProperty('compatibilityScore');
        expect(firstMatch).toHaveProperty('reasoning');
      }
    });

    test('匹配推荐应该考虑用户的偏好设置', async ({ apiContext, testUser }) => {
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
      const matchResponse = await apiContext.get(
        `/api/agentdate/matches?agentId=${agent.id}`,
        {
          headers: {
            Authorization: `Bearer ${testUser.token}`,
          },
        }
      );

      expect(matchResponse.ok()).toBeTruthy();
      const matches = await matchResponse.json();

      // 3. 验证推荐符合偏好
      for (const match of matches) {
        expect(match.profile.age).toBeGreaterThanOrEqual(26);
        expect(match.profile.age).toBeLessThanOrEqual(30);
        expect(match.profile.gender).toBe('female');
      }
    });
  });

  test.describe('Agent间对话匹配', () => {
    test('两个Agent应该能进行匹配对话', async ({ apiContext, testUser }) => {
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

      expect(conversationResponse.ok()).toBeTruthy();
      const conversation = await conversationResponse.json();
      expect(conversation).toHaveProperty('id');
      expect(conversation).toHaveProperty('status');
      expect(['pending', 'active', 'completed']).toContain(conversation.status);
    });

    test('Agent对话应该有轮次限制', async ({ apiContext, testUser }) => {
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
      const configResponse = await apiContext.get(
        `/api/agentdate/conversations/${conversation.id}/config`,
        {
          headers: {
            Authorization: `Bearer ${testUser.token}`,
          },
        }
      );

      expect(configResponse.ok()).toBeTruthy();
      const config = await configResponse.json();
      expect(config).toHaveProperty('maxRounds');
      expect(config.maxRounds).toBeGreaterThan(0);
    });
  });

  test.describe('双向同意引荐机制', () => {
    test('匹配成功需要双方Agent同意', async ({ apiContext, testUser }) => {
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

      expect(matchResponse.ok()).toBeTruthy();
      const match = await matchResponse.json();
      expect(match.status).toBe('pending');

      // 2. 验证需要双方同意
      const statusResponse = await apiContext.get(`/api/agentdate/matches/${match.id}`, {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      });

      expect(statusResponse.ok()).toBeTruthy();
      const status = await statusResponse.json();
      expect(status).toHaveProperty('initiatorConsent');
      expect(status).toHaveProperty('targetConsent');
    });

    test('双方同意后应该能建立连接', async ({ apiContext, testUser }) => {
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

      expect(connectionResponse.ok()).toBeTruthy();
      const connection = await connectionResponse.json();
      expect(connection).toHaveProperty('status');
    });
  });

  test.describe('人机切换', () => {
    test('用户应该能在人机模式间切换', async ({ apiContext, testUser }) => {
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

      expect(switchResponse.ok()).toBeTruthy();
      const switched = await switchResponse.json();
      expect(switched.mode).toBe('human');

      // 3. 验证模式已切换
      const statusResponse = await apiContext.get(`/api/agents/${agent.id}/status`, {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      });

      expect(statusResponse.ok()).toBeTruthy();
      const status = await statusResponse.json();
      expect(status.mode).toBe('human');
    });

    test('人机切换应该记录日志', async ({ apiContext, testUser }) => {
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

      expect(logsResponse.ok()).toBeTruthy();
      const logs = await logsResponse.json();
      const switchLog = logs.find((log: any) => log.action === 'mode_switch');
      expect(switchLog).toBeDefined();
    });
  });
});
