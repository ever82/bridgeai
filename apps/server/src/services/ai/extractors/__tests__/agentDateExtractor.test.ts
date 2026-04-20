/**
 * AgentDate Extractor Tests
 */

import {
  PersonalityTrait,
  InterestCategory,
  DatingPurpose,
} from '@bridgeai/shared';

import {
  AgentDateExtractor,
} from '../agentDateExtractor';

describe('AgentDateExtractor', () => {
  let extractor: AgentDateExtractor;

  beforeEach(() => {
    extractor = new AgentDateExtractor();
  });

  describe('canHandle', () => {
    it('should detect AgentDate scene from dating keywords', async () => {
      const result = await extractor.canHandle('我想找对象，希望对方25-30岁');
      expect(result.canHandle).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should not detect unrelated text', async () => {
      const result = await extractor.canHandle('我想找工作');
      expect(result.canHandle).toBe(false);
    });

    it('should detect dating scene', async () => {
      const result = await extractor.canHandle('相亲找对象，想找一位有稳定工作的伴侣');
      expect(result.canHandle).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('extract', () => {
    it('should extract partner preferences', async () => {
      const result = await extractor.extract('想找25-30岁，本科以上学历的对象');
      expect(result.structured.partnerPreferences).toBeDefined();
      expect(result.structured.partnerPreferences?.ageRange).toEqual({ min: 25, max: 30 });
      expect(result.structured.partnerPreferences?.education).toContain('本科');
    });

    it('should extract interests', async () => {
      const result = await extractor.extract('我喜欢旅游和看电影');
      expect(result.structured.interests).toContain('旅游');
      expect(result.structured.interests).toContain('电影');
    });

    it('should extract date time', async () => {
      const result = await extractor.extract('这周六下午见面');
      expect(result.structured.dateTime).toBeDefined();
      expect(result.structured.dateTime?.timeRange).toBe('afternoon');
    });

    it('should extract date activities', async () => {
      const result = await extractor.extract('想一起吃饭看电影');
      expect(result.structured.dateActivities).toContain('共进晚餐');
      expect(result.structured.dateActivities).toContain('看电影');
    });

    it('should calculate confidence', async () => {
      const result = await extractor.extract(
        '想找25-30岁的对象，本科以上，喜欢旅游和电影'
      );
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('getRequiredFields', () => {
    it('should return partnerPreferences as required', () => {
      const fields = extractor.getRequiredFields();
      expect(fields).toContain('partnerPreferences');
    });
  });

  // ==================== AS-DATE-002-AC-1: 寒暄破冰 ====================
  describe('generateIceBreakingMessage', () => {
    it('should generate a greeting message', () => {
      const message = extractor.generateIceBreakingMessage('小明');
      expect(message).toBeDefined();
      expect(message.length).toBeGreaterThan(0);
    });

    it('should include a greeting component', () => {
      const message = extractor.generateIceBreakingMessage('小明');
      const greetings = ['你好', '嗨'];
      const hasGreeting = greetings.some(g => message.includes(g));
      expect(hasGreeting).toBe(true);
    });

    it('should personalize with partner interests when provided', () => {
      const message = extractor.generateIceBreakingMessage('小明', {
        name: '小红',
        interests: ['旅游'],
      });
      expect(message).toContain('旅游');
    });

    it('should fall back to generic topic when no interests', () => {
      const message = extractor.generateIceBreakingMessage('小明', {
        name: '小红',
        interests: [],
      });
      const genericTopics = ['兴趣爱好', '空闲时间', '有趣的事'];
      const hasGenericTopic = genericTopics.some(t => message.includes(t));
      expect(hasGenericTopic).toBe(true);
    });

    it('should include a positive closing', () => {
      const message = extractor.generateIceBreakingMessage('小明');
      const closings = ['😊', '期待', '高兴', '开心', '认识'];
      const hasClosing = closings.some(c => message.includes(c));
      expect(hasClosing).toBe(true);
    });

    it('should handle missing partner profile', () => {
      const message = extractor.generateIceBreakingMessage('小明');
      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
    });

    it('should use first interest for personalization', () => {
      const message = extractor.generateIceBreakingMessage('小明', {
        interests: ['电影', '音乐', '游戏'],
      });
      expect(message).toContain('电影');
    });
  });

  // ==================== AS-DATE-002-AC-2: 评估性格匹配度 ====================
  describe('evaluatePersonalityMatch', () => {
    it('should return a valid match result', () => {
      const result = extractor.evaluatePersonalityMatch([], [], [], []);
      expect(result).toBeDefined();
      expect(typeof result.overallScore).toBe('number');
    });

    it('should score high when shared traits exist', () => {
      const result = extractor.evaluatePersonalityMatch(
        [PersonalityTrait.OPTIMISTIC, PersonalityTrait.HUMOROUS],
        [PersonalityTrait.OPTIMISTIC, PersonalityTrait.HUMOROUS],
        [],
        []
      );
      expect(result.traitScore).toBe(100);
      expect(result.sharedTraitsCount).toBe(2);
    });

    it('should score lower when no shared traits', () => {
      const result = extractor.evaluatePersonalityMatch(
        [PersonalityTrait.INTROVERTED, PersonalityTrait.RATIONAL],
        [PersonalityTrait.EXTROVERTED, PersonalityTrait.EMOTIONAL],
        [],
        []
      );
      expect(result.traitScore).toBe(0);
      expect(result.sharedTraitsCount).toBe(0);
    });

    it('should score interest overlap correctly', () => {
      const result = extractor.evaluatePersonalityMatch(
        [],
        [],
        [InterestCategory.MOVIES, InterestCategory.MUSIC, InterestCategory.TRAVEL],
        [InterestCategory.MOVIES, InterestCategory.MUSIC]
      );
      expect(result.interestScore).toBeGreaterThan(0);
      expect(result.interestScore).toBeLessThan(100);
      expect(result.sharedInterestsCount).toBe(2);
    });

    it('should give MBTI complement bonus for introvert-extrovert pairs', () => {
      const introvert = [PersonalityTrait.INTROVERTED];
      const extrovert = [PersonalityTrait.EXTROVERTED];
      const same = [PersonalityTrait.EXTROVERTED];

      const complement = extractor.evaluatePersonalityMatch(introvert, extrovert, [], []);
      const sameType = extractor.evaluatePersonalityMatch(same, same, [], []);

      expect(complement.mbtiScore).toBeGreaterThan(sameType.mbtiScore);
    });

    it('should set high matchLevel for score >= 75', () => {
      const result = extractor.evaluatePersonalityMatch(
        [PersonalityTrait.OPTIMISTIC, PersonalityTrait.HUMOROUS, PersonalityTrait.GENTLE],
        [PersonalityTrait.OPTIMISTIC, PersonalityTrait.HUMOROUS, PersonalityTrait.GENTLE],
        [InterestCategory.TRAVEL, InterestCategory.MOVIES],
        [InterestCategory.TRAVEL, InterestCategory.MOVIES, InterestCategory.MUSIC]
      );
      expect(result.matchLevel).toBe('high');
      expect(result.overallScore).toBeGreaterThanOrEqual(75);
    });

    it('should set medium matchLevel for score 45-74', () => {
      // Introvert-extrovert gives mbtiScore=85, shared interest gives interestScore=100
      // Overall: (0*0.4 + 100*0.35 + 85*0.25) = 59.25 → medium
      const result = extractor.evaluatePersonalityMatch(
        [PersonalityTrait.INTROVERTED],
        [PersonalityTrait.EXTROVERTED],
        [InterestCategory.TRAVEL],
        [InterestCategory.TRAVEL]
      );
      expect(result.matchLevel).toBe('medium');
      expect(result.overallScore).toBeGreaterThanOrEqual(45);
      expect(result.overallScore).toBeLessThan(75);
    });

    it('should set low matchLevel for score < 45', () => {
      const result = extractor.evaluatePersonalityMatch(
        [PersonalityTrait.RATIONAL],
        [PersonalityTrait.EXTROVERTED],
        [],
        []
      );
      expect(result.matchLevel).toBe('low');
      expect(result.overallScore).toBeLessThan(45);
    });

    it('should apply marriage purpose weight', () => {
      const baseResult = extractor.evaluatePersonalityMatch(
        [PersonalityTrait.OPTIMISTIC],
        [PersonalityTrait.OPTIMISTIC],
        [],
        []
      );
      const marriageResult = extractor.evaluatePersonalityMatch(
        [PersonalityTrait.OPTIMISTIC],
        [PersonalityTrait.OPTIMISTIC],
        [],
        [],
        DatingPurpose.MARRIAGE
      );
      expect(marriageResult.overallScore).toBeGreaterThanOrEqual(baseResult.overallScore);
    });

    it('should include match advice for all levels', () => {
      const high = extractor.evaluatePersonalityMatch(
        [PersonalityTrait.OPTIMISTIC, PersonalityTrait.HUMOROUS],
        [PersonalityTrait.OPTIMISTIC, PersonalityTrait.HUMOROUS],
        [InterestCategory.TRAVEL],
        [InterestCategory.TRAVEL]
      );
      expect(high.advice).toContain('匹配度很高');

      const low = extractor.evaluatePersonalityMatch(
        [PersonalityTrait.RATIONAL],
        [PersonalityTrait.EXTROVERTED],
        [],
        []
      );
      expect(low.advice).toBeDefined();
      expect(low.advice.length).toBeGreaterThan(0);
    });

    it('should cap overall score at 100', () => {
      const result = extractor.evaluatePersonalityMatch(
        [PersonalityTrait.OPTIMISTIC],
        [PersonalityTrait.OPTIMISTIC],
        [InterestCategory.TRAVEL, InterestCategory.MOVIES, InterestCategory.MUSIC],
        [InterestCategory.TRAVEL, InterestCategory.MOVIES, InterestCategory.MUSIC],
        DatingPurpose.MARRIAGE
      );
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should handle empty personality arrays gracefully', () => {
      const result = extractor.evaluatePersonalityMatch([], [], [], []);
      expect(result.traitScore).toBe(50); // default for empty
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
    });

    it('should correctly identify shared traits and interests', () => {
      const ownerTraits = [
        PersonalityTrait.OPTIMISTIC,
        PersonalityTrait.HUMOROUS,
        PersonalityTrait.INDEPENDENT,
      ];
      const partnerTraits = [
        PersonalityTrait.OPTIMISTIC,
        PersonalityTrait.GENTLE,
        PersonalityTrait.INDEPENDENT,
      ];
      const ownerInterests = [
        InterestCategory.TRAVEL,
        InterestCategory.MOVIES,
        InterestCategory.MUSIC,
      ];
      const partnerInterests = [
        InterestCategory.TRAVEL,
        InterestCategory.GAMING,
        InterestCategory.MUSIC,
      ];

      const result = extractor.evaluatePersonalityMatch(
        ownerTraits,
        partnerTraits,
        ownerInterests,
        partnerInterests
      );

      expect(result.sharedTraits).toContain(PersonalityTrait.OPTIMISTIC);
      expect(result.sharedTraits).toContain(PersonalityTrait.INDEPENDENT);
      expect(result.sharedTraits).not.toContain(PersonalityTrait.HUMOROUS);
      expect(result.sharedTraits).not.toContain(PersonalityTrait.GENTLE);
      expect(result.sharedTraitsCount).toBe(2);

      expect(result.sharedInterests).toContain(InterestCategory.TRAVEL);
      expect(result.sharedInterests).toContain(InterestCategory.MUSIC);
      expect(result.sharedInterests).not.toContain(InterestCategory.MOVIES);
      expect(result.sharedInterestsCount).toBe(2);
    });
  });
});
