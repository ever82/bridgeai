/**
 * Scene Extractors Tests
 * 场景提取器单元测试
 */

import {
  VisionShareExtractor,
  AgentDateExtractor,
  AgentJobExtractor,
  AgentAdExtractor,
} from '../extractors';
import { SceneType } from '../extractors/types';

describe('Scene Extractors', () => {
  describe('VisionShareExtractor', () => {
    let extractor: VisionShareExtractor;

    beforeEach(() => {
      extractor = new VisionShareExtractor();
    });

    it('should detect VisionShare scene from photography keywords', async () => {
      const result = await extractor.canHandle('我想找摄影师拍一组人像写真');
      expect(result.canHandle).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should extract photography type from text', async () => {
      const result = await extractor.extract('想拍一组婚纱照，预算5000左右');
      expect(result.scene).toBe('visionshare');
      expect(result.structured.photographyType).toContain('婚礼摄影');
    });

    it('should extract budget information', async () => {
      const result = await extractor.extract('预算5000-8000元，拍商业产品照片');
      expect(result.structured.budget).toBeDefined();
      expect(result.structured.budget?.min).toBe(5000);
      expect(result.structured.budget?.max).toBe(8000);
      expect(result.structured.budget?.currency).toBe('CNY');
    });

    it('should extract location information', async () => {
      const result = await extractor.extract('在上海浦东新区拍外景人像');
      expect(result.structured.location?.city).toBe('上海');
    });

    it('should generate clarification questions for missing fields', () => {
      const questions = extractor.generateClarificationQuestions(['photographyType', 'budget']);
      expect(questions.length).toBe(2);
      expect(questions[0]).toContain('摄影类型');
      expect(questions[1]).toContain('预算');
    });

    it('should validate extracted data', async () => {
      const result = await extractor.extract('想拍写真');
      const validation = extractor.validate(result);
      expect(validation.valid).toBe(false);
      expect(validation.missingFields).toContain('photographyType');
    });

    it('should detect indoor/outdoor preference', async () => {
      const indoorResult = await extractor.extract('在摄影棚内拍产品照');
      expect(indoorResult.structured.location?.indoor).toBe(true);

      const outdoorResult = await extractor.extract('想拍外景婚纱照');
      expect(outdoorResult.structured.location?.indoor).toBe(false);
    });

    it('should extract photography style preferences', async () => {
      const result = await extractor.extract('喜欢复古文艺风格的人像摄影');
      expect(result.structured.photographerPreferences?.style).toContain('复古文艺');
    });
  });

  describe('AgentDateExtractor', () => {
    let extractor: AgentDateExtractor;

    beforeEach(() => {
      extractor = new AgentDateExtractor();
    });

    it('should detect AgentDate scene from dating keywords', async () => {
      const result = await extractor.canHandle('想找个对象，要求年龄25-30岁');
      expect(result.canHandle).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should extract partner age preferences', async () => {
      const result = await extractor.extract('想找25-30岁的女生，身高160以上');
      expect(result.structured.partnerPreferences?.ageRange).toEqual({
        min: 25,
        max: 30,
      });
    });

    it('should extract education preferences', async () => {
      const result = await extractor.extract('希望对方本科以上学历，硕士更好');
      expect(result.structured.partnerPreferences?.education).toContain('本科');
      expect(result.structured.partnerPreferences?.education).toContain('硕士');
    });

    it('should extract interests', async () => {
      const result = await extractor.extract('喜欢旅游、看电影、健身');
      expect(result.structured.interests).toContain('旅游');
      expect(result.structured.interests).toContain('电影');
      expect(result.structured.interests).toContain('运动');
    });

    it('should extract date activities', async () => {
      const result = await extractor.extract('周末一起喝咖啡看电影');
      expect(result.structured.dateActivities).toContain('喝咖啡');
      expect(result.structured.dateActivities).toContain('看电影');
    });

    it('should generate clarification questions', () => {
      const questions = extractor.generateClarificationQuestions(['partnerCriteria', 'interests']);
      expect(questions.length).toBe(2);
      expect(questions[0]).toContain('伴侣');
    });

    it('should extract occupation preferences', async () => {
      const result = await extractor.extract('希望对方是医生或教师');
      expect(result.structured.partnerPreferences?.occupation).toContain('医生');
      expect(result.structured.partnerPreferences?.occupation).toContain('教师');
    });

    it('should extract location preference', async () => {
      const result = await extractor.extract('希望在北京市区找');
      expect(result.structured.partnerPreferences?.location).toBeDefined();
    });
  });

  describe('AgentJobExtractor', () => {
    let extractor: AgentJobExtractor;

    beforeEach(() => {
      extractor = new AgentJobExtractor();
    });

    it('should detect AgentJob scene from job keywords', async () => {
      const result = await extractor.canHandle('找工作，Java开发，3年经验');
      expect(result.canHandle).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should extract skills from text', async () => {
      const result = await extractor.extract('精通Java、Python、React，熟悉MySQL和Redis');
      expect(result.structured.skills).toContain('Java');
      expect(result.structured.skills).toContain('Python');
      expect(result.structured.skills).toContain('React');
    });

    it('should extract experience years', async () => {
      const result = await extractor.extract('有5年工作经验，做过互联网和教育行业');
      expect(result.structured.experience?.years).toBe(5);
      expect(result.structured.experience?.industries).toContain('互联网');
      expect(result.structured.experience?.industries).toContain('教育');
    });

    it('should extract salary expectation', async () => {
      const result = await extractor.extract('期望薪资20K-30K');
      expect(result.structured.salaryExpectation?.min).toBe(20000);
      expect(result.structured.salaryExpectation?.max).toBe(30000);
      expect(result.structured.salaryExpectation?.period).toBe('monthly');
    });

    it('should detect experience level', async () => {
      const junior = await extractor.extract('应届生，初级Java开发');
      expect(junior.structured.experience?.level).toBe('junior');

      const expert = await extractor.extract('资深专家，10年经验');
      expect(expert.structured.experience?.level).toBe('expert');
    });

    it('should extract job type', async () => {
      const result = await extractor.extract('找全职远程工作');
      expect(result.structured.jobType).toContain('全职');
      expect(result.structured.location?.remote).toBe(true);
    });

    it('should extract benefits', async () => {
      const result = await extractor.extract('要求五险一金，双休，有年假');
      expect(result.structured.benefits).toContain('五险一金');
      expect(result.structured.benefits).toContain('双休');
      expect(result.structured.benefits).toContain('年假');
    });

    it('should generate clarification questions', () => {
      const questions = extractor.generateClarificationQuestions(['skills', 'experience']);
      expect(questions.length).toBeGreaterThan(0);
      expect(questions[0]).toContain('技能');
    });
  });

  describe('AgentAdExtractor', () => {
    let extractor: AgentAdExtractor;

    beforeEach(() => {
      extractor = new AgentAdExtractor();
    });

    it('should detect AgentAd scene from shopping keywords', async () => {
      const result = await extractor.canHandle('想买一部iPhone手机，预算8000');
      expect(result.canHandle).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should extract product information', async () => {
      const result = await extractor.extract('想买iPhone 15 Pro，256G，全新未拆封');
      expect(result.structured.product?.name).toContain('iPhone');
      expect(result.structured.product?.category).toBe('手机');
      expect(result.structured.product?.condition).toBe('new');
    });

    it('should extract budget', async () => {
      const result = await extractor.extract('预算5000-8000元');
      expect(result.structured.budget?.min).toBe(5000);
      expect(result.structured.budget?.max).toBe(8000);
    });

    it('should extract brand preferences', async () => {
      const result = await extractor.extract('想要苹果或华为的手机');
      expect(result.structured.brandPreferences).toContain('Apple');
      expect(result.structured.brandPreferences).toContain('华为');
    });

    it('should extract platform preferences', async () => {
      const result = await extractor.extract('希望在京东或淘宝购买');
      expect(result.structured.platform).toContain('京东');
      expect(result.structured.platform).toContain('淘宝/天猫');
    });

    it('should detect urgency', async () => {
      const urgent = await extractor.extract('急！马上要买');
      expect(urgent.structured.urgency).toBe('high');

      const normal = await extractor.extract('不急，可以慢慢选');
      expect(normal.structured.urgency).toBe('low');
    });

    it('should extract purchase timeline', async () => {
      const result = await extractor.extract('下周要买，最迟月底');
      expect(result.structured.purchaseTimeline).toBeDefined();
    });

    it('should generate clarification questions', () => {
      const questions = extractor.generateClarificationQuestions(['product', 'budget']);
      expect(questions.length).toBe(2);
      expect(questions[0]).toContain('产品');
      expect(questions[1]).toContain('预算');
    });
  });

  describe('Scene Detector', () => {
    it('should detect correct scene for VisionShare text', async () => {
      const extractor = new VisionShareExtractor();
      const result = await extractor.canHandle('找摄影师拍婚礼照片');
      expect(result.canHandle).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect correct scene for AgentDate text', async () => {
      const extractor = new AgentDateExtractor();
      const result = await extractor.canHandle('相亲找对象，要求本科以上学历');
      expect(result.canHandle).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect correct scene for AgentJob text', async () => {
      const extractor = new AgentJobExtractor();
      const result = await extractor.canHandle('招聘Java开发工程师，5年经验');
      expect(result.canHandle).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect correct scene for AgentAd text', async () => {
      const extractor = new AgentAdExtractor();
      const result = await extractor.canHandle('买iPhone 15，预算8000');
      expect(result.canHandle).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });
});
