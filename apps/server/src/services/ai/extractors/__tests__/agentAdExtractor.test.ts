/**
 * AgentAd Extractor Tests
 */

import { AgentAdExtractor } from '../agentAdExtractor';

describe('AgentAdExtractor', () => {
  let extractor: AgentAdExtractor;

  beforeEach(() => {
    extractor = new AgentAdExtractor();
  });

  describe('canHandle', () => {
    it('should detect AgentAd scene from shopping keywords', async () => {
      const result = await extractor.canHandle('想买一部iPhone 15');
      expect(result.canHandle).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should not detect unrelated text', async () => {
      const result = await extractor.canHandle('我想找工作');
      expect(result.canHandle).toBe(false);
    });
  });

  describe('extract', () => {
    it('should extract product name', async () => {
      const result = await extractor.extract('想买iPhone 15 Pro');
      expect(result.structured.product?.name).toBe('iPhone 15 Pro');
    });

    it('should extract product category', async () => {
      const result = await extractor.extract('想买一部手机');
      expect(result.structured.product?.category).toBe('手机');
    });

    it('should extract budget', async () => {
      const result = await extractor.extract('预算5000元左右');
      expect(result.structured.budget?.max).toBe(5000);
    });

    it('should extract brand preferences', async () => {
      const result = await extractor.extract('喜欢Apple和华为的产品');
      expect(result.structured.brandPreferences).toContain('Apple');
      expect(result.structured.brandPreferences).toContain('华为');
    });

    it('should extract platform preferences', async () => {
      const result = await extractor.extract('希望在京东或淘宝购买');
      expect(result.structured.platform).toContain('京东');
      expect(result.structured.platform).toContain('淘宝/天猫');
    });

    it('should extract urgency', async () => {
      const result = await extractor.extract('急需购买');
      expect(result.structured.urgency).toBe('high');
    });

    it('should extract purchase timeline', async () => {
      const result = await extractor.extract('打算双11购买');
      expect(result.structured.purchaseTimeline).toBe('双十一');
    });
  });

  describe('getRequiredFields', () => {
    it('should return product as required', () => {
      const fields = extractor.getRequiredFields();
      expect(fields).toContain('product');
    });
  });
});
