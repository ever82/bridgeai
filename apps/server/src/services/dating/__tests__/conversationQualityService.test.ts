/**
 * Conversation Quality Service Tests
 * 会话质量评估服务测试
 */

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../ai/llmService', () => ({
  llmService: null,
}));

import {
  calculateFluency,
  analyzeEngagement,
  detectIssues,
  assessConversation,
  getQualityTrend,
} from '../conversationQualityService';

describe('conversationQualityService', () => {
  describe('calculateFluency', () => {
    it('should score message patterns', async () => {
      const messages = [
        { role: 'user', content: '你好，最近怎么样？' },
        { role: 'assistant', content: '挺好的，谢谢关心！你呢？' },
        { role: 'user', content: '我也不错，想聊聊吗？' },
        { role: 'assistant', content: '当然可以啊，很高兴认识你！' },
      ];

      const score = await calculateFluency(messages);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should return 0.5 for insufficient messages', async () => {
      const messages = [{ role: 'user', content: 'Hello' }];

      const score = await calculateFluency(messages);

      expect(score).toBe(0.5);
    });

    it('should penalize excessive pause words', async () => {
      const messages = [
        { role: 'user', content: '嗯嗯，啊，那个，然后，然后。' },
        { role: 'assistant', content: '嗯，是的，呃。' },
        { role: 'user', content: '对对对，那个，然后呢？' },
        { role: 'assistant', content: '哦，好的。' },
      ];

      const score = await calculateFluency(messages);

      // Should be lower due to pause words
      expect(score).toBeLessThan(0.7);
    });

    it('should reward good turn-taking patterns', async () => {
      const alternatingMessages = [
        { role: 'user', content: 'Message one from user.' },
        { role: 'assistant', content: 'Response one from assistant.' },
        { role: 'user', content: 'Message two from user.' },
        { role: 'assistant', content: 'Response two from assistant.' },
        { role: 'user', content: 'Message three from user.' },
        { role: 'assistant', content: 'Response three from assistant.' },
      ];

      const score = await calculateFluency(alternatingMessages);

      // Good alternation should help score
      expect(score).toBeGreaterThan(0.5);
    });
  });

  describe('analyzeEngagement', () => {
    it('should measure participation balance', async () => {
      const balancedMessages = [
        { role: 'user', content: 'Message from user one', agentId: 'agent-a' },
        { role: 'assistant', content: 'Message from assistant', agentId: 'agent-b' },
        { role: 'user', content: 'Message from user two', agentId: 'agent-a' },
        { role: 'assistant', content: 'Message from assistant two', agentId: 'agent-b' },
      ];

      const score = await analyzeEngagement(balancedMessages, 'agent-a', 'agent-b');

      expect(score).toBeGreaterThan(0.5);
    });

    it('should penalize imbalanced participation', async () => {
      const imbalancedMessages = [
        { role: 'user', content: 'Message one', agentId: 'agent-a' },
        { role: 'assistant', content: 'Response', agentId: 'agent-b' },
        { role: 'user', content: 'Message two', agentId: 'agent-a' },
        { role: 'user', content: 'Message three', agentId: 'agent-a' },
        { role: 'user', content: 'Message four', agentId: 'agent-a' },
      ];

      const score = await analyzeEngagement(imbalancedMessages, 'agent-a', 'agent-b');

      // Imbalanced participation should lower score
      expect(score).toBeLessThan(0.7);
    });

    it('should reward questions in messages', async () => {
      const questioningMessages = [
        { role: 'user', content: '你好吗？' },
        { role: 'assistant', content: '我很好，你呢？' },
        { role: 'user', content: '你喜欢什么？' },
        { role: 'assistant', content: '我喜欢旅行，你怎么想？' },
      ];

      const score = await analyzeEngagement(questioningMessages, 'agent-a', 'agent-b');

      expect(score).toBeGreaterThan(0.5);
    });

    it('should return 0.5 for insufficient messages', async () => {
      const messages = [{ role: 'user', content: 'Single message' }];

      const score = await analyzeEngagement(messages, 'agent-a', 'agent-b');

      expect(score).toBe(0.5);
    });
  });

  describe('detectIssues', () => {
    it('should identify low engagement issues', async () => {
      const shortMessages = [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hey' },
        { role: 'user', content: 'Yo' },
        { role: 'assistant', content: 'Sup' },
        { role: 'user', content: '...' },
        { role: 'assistant', content: 'Ok' },
      ];

      const issues = await detectIssues(shortMessages, 1);

      const lowEngagementIssues = issues.filter(i => i.type === 'low_engagement');
      expect(lowEngagementIssues.length).toBeGreaterThan(0);
    });

    it('should identify repetitive content', async () => {
      const repetitiveMessages = [
        { role: 'user', content: '我 喜欢 做饭 我 喜欢 做饭' },
        { role: 'assistant', content: '我 喜欢 做饭 太多了' },
        { role: 'user', content: '我 喜欢 做饭 非常 喜欢 做饭' },
        { role: 'assistant', content: '好的' },
      ];

      const issues = await detectIssues(repetitiveMessages, 1);

      const repetitiveIssues = issues.filter(i => i.type === 'repetitive');
      expect(repetitiveIssues.length).toBeGreaterThan(0);
    });

    it('should identify stalled conversation', async () => {
      const stalledMessages = [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hi' },
        { role: 'user', content: 'Ok' },
        { role: 'assistant', content: 'Yes' },
        { role: 'user', content: 'No' },
        { role: 'assistant', content: 'Hmm' },
        { role: 'user', content: 'A' },
        { role: 'assistant', content: 'B' },
      ];

      const issues = await detectIssues(stalledMessages, 1);

      const stalledIssues = issues.filter(i => i.type === 'stalled');
      expect(stalledIssues.length).toBeGreaterThan(0);
    });

    it('should identify inappropriate content', async () => {
      const inappropriateMessages = [
        { role: 'user', content: 'Hello, how are you?' },
        { role: 'assistant', content: 'Fine, thanks!' },
        { role: 'user', content: '辱骂内容测试' },
        { role: 'assistant', content: 'Ok' },
      ];

      const issues = await detectIssues(inappropriateMessages, 1);

      const inappropriateIssues = issues.filter(i => i.type === 'inappropriate');
      expect(inappropriateIssues.length).toBeGreaterThan(0);
    });

    it('should return empty array for insufficient messages', async () => {
      const messages = [{ role: 'user', content: 'Single message' }];

      const issues = await detectIssues(messages, 1);

      expect(issues).toEqual([]);
    });

    it('should not identify issues in healthy conversation', async () => {
      const healthyMessages = [
        { role: 'user', content: '我最近在学习烹饪，你有什么推荐吗？' },
        { role: 'assistant', content: '听起来很有趣！我也喜欢烹饪，你喜欢什么类型的菜系？' },
        { role: 'user', content: '我比较喜欢川菜和粤菜，因为味道很丰富。你呢？' },
        { role: 'assistant', content: '我也很喜欢粤菜！不过日料也很不错，你有没有尝试过？' },
      ];

      const issues = await detectIssues(healthyMessages, 1);

      // Should not have critical issues
      const criticalIssues = issues.filter(i => i.severity === 'high');
      expect(criticalIssues.length).toBe(0);
    });
  });

  describe('assessConversation', () => {
    it('should return complete quality assessment', async () => {
      const messages = [
        { role: 'user', content: '你好！最近怎么样？' },
        { role: 'assistant', content: '挺好的，谢谢！你呢？' },
        { role: 'user', content: '我也不错，有什么兴趣爱好吗？' },
        { role: 'assistant', content: '我喜欢旅行和摄影，你呢？' },
      ];

      const assessment = await assessConversation('room-123', messages, 1);

      expect(assessment).toBeDefined();
      expect(assessment.roomId).toBe('room-123');
      expect(assessment.round).toBe(1);
      expect(assessment.metrics).toBeDefined();
      expect(assessment.metrics.fluency).toBeGreaterThanOrEqual(0);
      expect(assessment.metrics.fluency).toBeLessThanOrEqual(1);
      expect(assessment.metrics.engagement).toBeGreaterThanOrEqual(0);
      expect(assessment.metrics.engagement).toBeLessThanOrEqual(1);
      expect(assessment.metrics.topicDepth).toBeGreaterThanOrEqual(0);
      expect(assessment.metrics.topicDepth).toBeLessThanOrEqual(1);
      expect(assessment.metrics.coherence).toBeGreaterThanOrEqual(0);
      expect(assessment.metrics.coherence).toBeLessThanOrEqual(1);
      expect(assessment.metrics.personaConsistency).toBeGreaterThanOrEqual(0);
      expect(assessment.metrics.personaConsistency).toBeLessThanOrEqual(1);
      expect(assessment.metrics.overall).toBeGreaterThanOrEqual(0);
      expect(assessment.metrics.overall).toBeLessThanOrEqual(1);
      expect(assessment.issues).toBeDefined();
      expect(Array.isArray(assessment.issues)).toBe(true);
      expect(assessment.suggestions).toBeDefined();
      expect(Array.isArray(assessment.suggestions)).toBe(true);
      expect(assessment.timestamp).toBeInstanceOf(Date);
    });

    it('should cache assessment results', async () => {
      const messages = [
        { role: 'user', content: 'Test message one' },
        { role: 'assistant', content: 'Test response one' },
        { role: 'user', content: 'Test message two' },
        { role: 'assistant', content: 'Test response two' },
      ];

      await assessConversation('room-456', messages, 1);
      await assessConversation('room-456', messages, 2);

      const trend = await getQualityTrend('room-456');

      expect(trend.assessments.length).toBe(2);
    });
  });

  describe('getQualityTrend', () => {
    it('should return empty trend for non-existent room', async () => {
      const trend = await getQualityTrend('non-existent-room');

      expect(trend.roomId).toBe('non-existent-room');
      expect(trend.assessments).toEqual([]);
      expect(trend.averageScore).toBe(0);
      expect(trend.trendDirection).toBe('stable');
    });

    it('should calculate average score correctly', async () => {
      const messages = [
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: 'Response 1' },
        { role: 'user', content: 'Message 2' },
        { role: 'assistant', content: 'Response 2' },
      ];

      await assessConversation('room-789', messages, 1);

      const trend = await getQualityTrend('room-789');

      expect(trend.assessments.length).toBe(1);
      expect(trend.averageScore).toBeGreaterThan(0);
    });
  });
});
