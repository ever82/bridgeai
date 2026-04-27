/**
 * Dating Conversation Service Tests
 * 约会对话生成服务测试 (ISSUE-DATE003 c2)
 */

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../llmService', () => ({
  llmService: null,
}));

import { DatingConversationService } from '../datingConversationService';
import type { DatingProfileSummary } from '../datingConversationService';

describe('DatingConversationService', () => {
  let service: DatingConversationService;

  const mockProfileA: DatingProfileSummary = {
    userId: 'user-a',
    agentId: 'agent-a',
    interests: ['旅游', '摄影', '美食'],
    personality: ['外向', '开朗'],
    lifestyle: ['喜欢户外活动', '早起'],
    goals: ['找到志同道合的伴侣', '一起探索世界'],
  };

  const mockProfileB: DatingProfileSummary = {
    userId: 'user-b',
    agentId: 'agent-b',
    interests: ['旅游', '音乐', '美食'],
    personality: ['内向', '细腻'],
    lifestyle: ['喜欢安静', '晚睡'],
    goals: ['寻找稳定的感情', '共同成长'],
  };

  beforeEach(() => {
    service = new DatingConversationService();
  });

  describe('DatingConversationService class instantiation', () => {
    it('should create service with default config', () => {
      const defaultService = new DatingConversationService();

      expect(defaultService).toBeDefined();
    });

    it('should create service with custom config', () => {
      const customService = new DatingConversationService({
        maxRounds: 30,
        turnTimeoutMs: 120000,
        personaConsistencyThreshold: 0.9,
        topicDepthLevels: 5,
      });

      expect(customService).toBeDefined();
    });
  });

  describe('startConversation', () => {
    it('should create session with profiles', async () => {
      const session = await service.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        mockProfileA,
        mockProfileB
      );

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.roomId).toBeDefined();
      expect(session.agentAId).toBe('agent-a');
      expect(session.agentBId).toBe('agent-b');
      expect(session.userIdA).toBe('user-a');
      expect(session.userIdB).toBe('user-b');
      expect(session.profileA).toEqual(mockProfileA);
      expect(session.profileB).toEqual(mockProfileB);
      expect(session.round).toBe(0);
      expect(session.status).toBe('active');
      expect(session.currentTopicIndex).toBe(0);
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });

    it('should create personas based on profiles', async () => {
      const session = await service.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        mockProfileA,
        mockProfileB
      );

      expect(session.personaA).toBeDefined();
      expect(session.personaA.name).toContain('Agent-');
      expect(session.personaA.role).toBe('dating_match');
      expect(session.personaA.personality).toEqual(mockProfileA.personality);
      expect(session.personaA.goals).toEqual(mockProfileA.goals);
      expect(session.personaA.communicationStyle).toBe('friendly');
      expect(session.personaA.specializations).toEqual(mockProfileA.interests);

      expect(session.personaB).toBeDefined();
      expect(session.personaB.personality).toEqual(mockProfileB.personality);
    });

    it('should initialize context with shared interests', async () => {
      const session = await service.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        mockProfileA,
        mockProfileB
      );

      // Profile A and B share '旅游' and '美食'
      expect(session.context.sharedInterests).toContain('旅游');
      expect(session.context.sharedInterests).toContain('美食');
      expect(session.context.discussedTopics).toEqual([]);
      expect(session.context.highlights).toEqual([]);
      expect(session.context.connectionPoints).toEqual([]);
      expect(session.context.redFlags).toEqual([]);
    });

    it('should build topic queue', async () => {
      const session = await service.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        mockProfileA,
        mockProfileB
      );

      expect(session.topics.length).toBeGreaterThan(0);
      // Topics should be sorted by relevance score
      for (let i = 1; i < session.topics.length; i++) {
        expect(session.topics[i - 1].relevanceScore).toBeGreaterThanOrEqual(
          session.topics[i].relevanceScore
        );
      }
      // Shared interests should have high relevance
      const interestTopics = session.topics.filter(t => t.category === 'interest');
      expect(interestTopics.length).toBeGreaterThan(0);
    });
  });

  describe('getSession', () => {
    it('should return session by id', async () => {
      const created = await service.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        mockProfileA,
        mockProfileB
      );

      const session = await service.getSession(created.id);

      expect(session).toBeDefined();
      expect(session?.id).toBe(created.id);
    });

    it('should return null for non-existent session', async () => {
      const session = await service.getSession('non-existent-id');

      expect(session).toBeNull();
    });
  });

  describe('Topic queue building', () => {
    it('should prioritize icebreaker topics first', async () => {
      const session = await service.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        mockProfileA,
        mockProfileB
      );

      // Icebreaker topics should have questions
      const icebreakers = session.topics.filter(t => t.category === 'icebreaker');
      expect(icebreakers.length).toBeGreaterThan(0);
      icebreakers.forEach(topic => {
        expect(topic.questions.length).toBeGreaterThan(0);
        expect(topic.explored).toBe(false);
      });
    });

    it('should include all topic categories', async () => {
      const session = await service.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        mockProfileA,
        mockProfileB
      );

      const categories = new Set(session.topics.map(t => t.category));
      expect(categories.has('icebreaker')).toBe(true);
      expect(categories.has('interest')).toBe(true);
      expect(categories.has('lifestyle')).toBe(true);
      expect(categories.has('value')).toBe(true);
      expect(categories.has('deep')).toBe(true);
    });

    it('should give higher relevance to shared interests', async () => {
      const session = await service.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        mockProfileA,
        mockProfileB
      );

      const interestTopics = session.topics.filter(t => t.category === 'interest');
      const hasHighRelevance = interestTopics.some(t => t.relevanceScore >= 0.9);
      expect(hasHighRelevance).toBe(true);
    });

    it('should handle profiles with no shared interests', async () => {
      const uniqueProfileA: DatingProfileSummary = {
        ...mockProfileA,
        interests: ['登山', '潜水'],
      };
      const uniqueProfileB: DatingProfileSummary = {
        ...mockProfileB,
        interests: ['烹饪', '绘画'],
      };

      const session = await service.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        uniqueProfileA,
        uniqueProfileB
      );

      // Should still create session with empty shared interests
      expect(session.context.sharedInterests).toEqual([]);
      // Should still have topics
      expect(session.topics.length).toBeGreaterThan(0);
    });
  });

  describe('generateFallbackResponse', () => {
    it('should generate response based on profile', async () => {
      const session = await service.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        mockProfileA,
        mockProfileB
      );

      // Access private method via any type
      const response = await (service as any).generateFallbackResponse(session, 'agent-a', {
        id: 'topic-1',
        name: 'Test Topic',
        category: 'icebreaker',
        relevanceScore: 0.8,
        questions: ['你好吗？'],
        explored: false,
      });

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should return 0 for new service', async () => {
      const cleaned = await service.cleanupExpiredSessions();

      expect(cleaned).toBe(0);
    });
  });

  describe('updateSessionStatus', () => {
    it('should update session status', async () => {
      const session = await service.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        mockProfileA,
        mockProfileB
      );

      await service.updateSessionStatus(session.id, 'completed');

      const updated = await service.getSession(session.id);
      expect(updated?.status).toBe('completed');
    });

    it('should throw error for non-existent session', async () => {
      await expect(service.updateSessionStatus('non-existent', 'completed')).rejects.toThrow(
        'Session not found'
      );
    });
  });

  describe('getConversationSummary', () => {
    it('should return context summary', async () => {
      const session = await service.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        mockProfileA,
        mockProfileB
      );

      const summary = await service.getConversationSummary(session.id);

      expect(summary).toBeDefined();
      expect(summary.sharedInterests).toBeDefined();
      expect(summary.discussedTopics).toBeDefined();
      expect(summary.highlights).toBeDefined();
      expect(summary.connectionPoints).toBeDefined();
      expect(summary.redFlags).toBeDefined();
    });

    it('should throw error for non-existent session', async () => {
      await expect(service.getConversationSummary('non-existent')).rejects.toThrow(
        'Session not found'
      );
    });
  });
});
