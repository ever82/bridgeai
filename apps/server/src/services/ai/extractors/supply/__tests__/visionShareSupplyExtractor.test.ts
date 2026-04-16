/**
 * VisionShare Supply Extractor Tests
 */

import { VisionShareSupplyExtractor } from '../visionShareSupplyExtractor';

describe('VisionShareSupplyExtractor', () => {
  let extractor: VisionShareSupplyExtractor;

  beforeEach(() => {
    extractor = new VisionShareSupplyExtractor();
  });

  describe('getSceneType', () => {
    it('should return visionshare', () => {
      expect(extractor.getSceneType()).toBe('visionshare');
    });
  });

  describe('canHandle', () => {
    it('should detect photography supply text', async () => {
      const result = await extractor.canHandle('我是专业摄影师，有8年人像摄影经验，使用佳能5D4');
      expect(result.canHandle).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should not detect unrelated text', async () => {
      const result = await extractor.canHandle('我想买一个新手机');
      expect(result.canHandle).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('should detect studio/workshop keywords', async () => {
      const result = await extractor.canHandle('我有自己的摄影工作室，承接各种拍摄项目');
      expect(result.canHandle).toBe(true);
    });
  });

  describe('extract', () => {
    it('should extract equipment information', async () => {
      const result = await extractor.extract(
        '我是专业摄影师，使用佳能5D4和索尼A7M4，有85mm定焦和24-70变焦镜头',
      );
      expect(result.equipment.cameras.length).toBeGreaterThan(0);
      expect(result.equipment.lenses.length).toBeGreaterThan(0);
      expect(result.scene).toBe('visionshare');
    });

    it('should extract experience information', async () => {
      const result = await extractor.extract(
        '5年+婚礼摄影经验，擅长人像写真和婚纱摄影',
      );
      expect(result.experience.years).toBe(5);
      expect(result.experience.photographyTypes).toContain('婚礼摄影');
      expect(result.experience.photographyTypes).toContain('人像摄影');
    });

    it('should extract style information', async () => {
      const result = await extractor.extract(
        '我的拍摄风格是自然纪实风格，也擅长唯美浪漫风格',
      );
      expect(result.style.primary).toBe('自然纪实');
      expect(result.style.secondary).toContain('唯美浪漫');
    });

    it('should extract pricing information', async () => {
      const result = await extractor.extract(
        '人像写真收费500-2000元，婚礼摄影3000-8000元起',
      );
      expect(result.pricing).toBeDefined();
    });

    it('should extract availability', async () => {
      const result = await extractor.extract(
        '周末可约拍，也可工作日晚上拍摄，支持旅拍',
      );
      expect(result.availability).toBeDefined();
      expect(result.availability?.weekends).toBe(true);
      expect(result.availability?.evenings).toBe(true);
      expect(result.availability?.travel).toBe(true);
    });

    it('should build qualification', async () => {
      const result = await extractor.extract(
        '资深摄影师8年经验，专业摄影师认证',
      );
      expect(result.qualification).toBeDefined();
      expect(result.qualification.experienceYears).toBe(8);
      expect(result.qualification.certifications).toContain('专业摄影师');
    });

    it('should calculate confidence', async () => {
      const result = await extractor.extract(
        '8年人像摄影经验，使用佳能相机，擅长自然纪实风格，人像写真500元起',
      );
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should include quality metrics', async () => {
      const result = await extractor.extract(
        '专业摄影师5年经验，商业摄影作品丰富',
      );
      expect(result.qualityMetrics).toBeDefined();
      expect(result.qualityMetrics.completeness).toBeGreaterThanOrEqual(0);
      expect(result.qualityMetrics.completeness).toBeLessThanOrEqual(1);
    });
  });

  describe('validate', () => {
    it('should validate complete data', async () => {
      const data = await extractor.extract(
        '8年婚礼摄影经验，擅长唯美浪漫风格，使用佳能5D4',
      );
      const result = extractor.validate(data);
      expect(result.valid).toBe(true);
    });
  });

  describe('getRequiredFields', () => {
    it('should return required fields', () => {
      const fields = extractor.getRequiredFields();
      expect(fields).toContain('experience');
      expect(fields).toContain('style');
    });
  });

  describe('generateClarificationQuestions', () => {
    it('should generate questions for missing fields', () => {
      const questions = extractor.generateClarificationQuestions(['equipment', 'pricing']);
      expect(questions).toHaveLength(2);
      expect(questions[0]).toContain('设备');
      expect(questions[1]).toContain('价格');
    });
  });
});
