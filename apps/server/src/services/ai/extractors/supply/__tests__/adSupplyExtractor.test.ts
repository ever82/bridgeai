/**
 * Ad Supply Extractor Tests
 */

import { AdSupplyExtractor } from '../adSupplyExtractor';

describe('AdSupplyExtractor', () => {
  let extractor: AdSupplyExtractor;

  beforeEach(() => {
    extractor = new AdSupplyExtractor();
  });

  describe('getSceneType', () => {
    it('should return agentad', () => {
      expect(extractor.getSceneType()).toBe('agentad');
    });
  });

  describe('canHandle', () => {
    it('should detect merchant supply text', async () => {
      const result = await extractor.canHandle('出售全新iPhone 15 Pro，正品行货，全国包邮');
      expect(result.canHandle).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should not detect unrelated text', async () => {
      const result = await extractor.canHandle('我想找一个摄影师');
      expect(result.canHandle).toBe(false);
    });

    it('should detect wholesale/supply keywords', async () => {
      const result = await extractor.canHandle('长期供应各类手机配件，支持批发');
      expect(result.canHandle).toBe(true);
    });
  });

  describe('extract', () => {
    it('should extract named products', async () => {
      const result = await extractor.extract(
        '出售iPhone 15 Pro 256G，全新正品，价格7999元',
      );
      expect(result.products.length).toBeGreaterThan(0);
      expect(result.products[0].category).toBe('手机');
      expect(result.scene).toBe('agentad');
    });

    it('should extract product categories', async () => {
      const result = await extractor.extract(
        '专营各类运动鞋和服装，大量现货',
      );
      expect(result.products.length).toBeGreaterThan(0);
      expect(result.products.some(p => p.category === '服装')).toBe(true);
    });

    it('should extract product condition', async () => {
      const newResult = await extractor.extract('全新手机出售');
      expect(newResult.products[0]?.condition).toBe('new');

      const usedResult = await extractor.extract('二手相机出售，9成新');
      expect(usedResult.products[0]?.condition).toBe('used');
    });

    it('should extract pricing', async () => {
      const result = await extractor.extract(
        '出售全新笔记本，价格5000-8000元',
      );
      expect(result.products.some(p => p.pricing !== undefined)).toBe(true);
    });

    it('should extract product features', async () => {
      const result = await extractor.extract(
        '出售正品手表，包邮，7天无理由退换，提供发票',
      );
      const features = result.products[0]?.features || [];
      expect(features).toContain('正品保障');
      expect(features).toContain('包邮');
      expect(features).toContain('7天无理由退换');
    });

    it('should extract offers/discounts', async () => {
      const result = await extractor.extract(
        '全场8折优惠，满200减30，包邮，买就送手机壳',
      );
      expect(result.offers.length).toBeGreaterThanOrEqual(2);
      expect(result.offers.some(o => o.type === '折扣')).toBe(true);
      expect(result.offers.some(o => o.type === '满减')).toBe(true);
      expect(result.offers.some(o => o.type === '赠品')).toBe(true);
    });

    it('should extract business information', async () => {
      const result = await extractor.extract(
        '华为官方旗舰店，品牌授权，天猫/京东均有店铺',
      );
      expect(result.business.platforms.length).toBeGreaterThan(0);
      expect(result.business.verified).toBe(true);
    });

    it('should extract business location', async () => {
      const result = await extractor.extract(
        '深圳华强北实体店铺，主营手机和数码产品',
      );
      expect(result.business.location).toBeDefined();
    });

    it('should build qualification', async () => {
      const result = await extractor.extract(
        '品牌授权经销商，3C认证，营业执照齐全',
      );
      expect(result.qualification).toBeDefined();
      expect(result.qualification.certifications).toContain('品牌授权');
      expect(result.qualification.certifications).toContain('3C认证');
    });

    it('should calculate confidence', async () => {
      const result = await extractor.extract(
        '出售全新iPhone 15，8折优惠，全国包邮，苹果旗舰店',
      );
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should include quality metrics', async () => {
      const result = await extractor.extract(
        '供应各类手机配件，价格优惠',
      );
      expect(result.qualityMetrics).toBeDefined();
      expect(result.qualityMetrics.completeness).toBeGreaterThanOrEqual(0);
      expect(result.qualityMetrics.completeness).toBeLessThanOrEqual(1);
    });
  });

  describe('validate', () => {
    it('should validate data with products', async () => {
      const data = await extractor.extract(
        '出售各类数码产品，大量现货',
      );
      const result = extractor.validate(data);
      expect(result.valid).toBe(true);
    });
  });

  describe('getRequiredFields', () => {
    it('should return required fields', () => {
      const fields = extractor.getRequiredFields();
      expect(fields).toContain('products');
    });
  });

  describe('generateClarificationQuestions', () => {
    it('should generate questions for missing fields', () => {
      const questions = extractor.generateClarificationQuestions(['products', 'offers']);
      expect(questions).toHaveLength(2);
      expect(questions[0]).toContain('产品');
    });
  });
});
