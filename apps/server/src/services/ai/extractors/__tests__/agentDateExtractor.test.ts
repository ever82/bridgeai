/**
 * AgentDate Extractor Tests
 */

import { AgentDateExtractor } from '../agentDateExtractor';

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
});
