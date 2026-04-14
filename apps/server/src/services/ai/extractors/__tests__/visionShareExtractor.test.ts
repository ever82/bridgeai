/**
 * VisionShare Extractor Tests
 */

import { VisionShareExtractor } from '../visionShareExtractor';

describe('VisionShareExtractor', () => {
  let extractor: VisionShareExtractor;

  beforeEach(() => {
    extractor = new VisionShareExtractor();
  });

  describe('canHandle', () => {
    it('should detect VisionShare scene from photography keywords', async () => {
      const result = await extractor.canHandle('我想找摄影师拍婚纱照');
      expect(result.canHandle).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should not detect unrelated text', async () => {
      const result = await extractor.canHandle('我想找工作');
      expect(result.canHandle).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('should detect multiple photography keywords', async () => {
      const result = await extractor.canHandle('需要专业摄影师拍摄商业照片');
      expect(result.canHandle).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('extract', () => {
    it('should extract photography type', async () => {
      const result = await extractor.extract('我想拍人像写真');
      expect(result.structured.photographyType).toContain('人像摄影');
      expect(result.scene).toBe('visionshare');
    });

    it('should extract wedding photography type', async () => {
      const result = await extractor.extract('需要婚礼摄影师');
      expect(result.structured.photographyType).toContain('婚礼摄影');
    });

    it('should extract budget', async () => {
      const result = await extractor.extract('预算5000元拍写真');
      expect(result.structured.budget).toBeDefined();
      expect(result.structured.budget?.max).toBe(5000);
      expect(result.structured.budget?.currency).toBe('CNY');
    });

    it('should extract time', async () => {
      const result = await extractor.extract('下周六下午拍摄');
      expect(result.structured.photographyTime).toBeDefined();
      expect(result.structured.photographyTime?.timeOfDay).toBe('afternoon');
    });

    it('should extract location', async () => {
      const result = await extractor.extract('在北京市朝阳区拍摄');
      expect(result.structured.location).toBeDefined();
      expect(result.structured.location?.city).toBe('北京市');
      expect(result.structured.location?.district).toBe('朝阳区');
    });

    it('should calculate confidence', async () => {
      const result = await extractor.extract('需要人像摄影，预算3000元，下周拍摄');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('getRequiredFields', () => {
    it('should return photographyType as required', () => {
      const fields = extractor.getRequiredFields();
      expect(fields).toContain('photographyType');
    });
  });

  describe('getOptionalFields', () => {
    it('should return optional fields', () => {
      const fields = extractor.getOptionalFields();
      expect(fields).toContain('photographyTime');
      expect(fields).toContain('budget');
      expect(fields).toContain('location');
    });
  });

  describe('validate', () => {
    it('should validate complete data', async () => {
      const data = await extractor.extract('需要婚礼摄影');
      const result = extractor.validate(data);
      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });
  });

  describe('generateClarificationQuestions', () => {
    it('should generate questions for missing fields', () => {
      const questions = extractor.generateClarificationQuestions(['photographyTime', 'budget']);
      expect(questions).toHaveLength(2);
      expect(questions[0]).toContain('时间');
      expect(questions[1]).toContain('预算');
    });
  });
});
