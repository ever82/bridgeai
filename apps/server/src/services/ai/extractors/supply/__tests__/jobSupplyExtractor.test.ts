/**
 * Job Supply Extractor Tests
 */

import { JobSupplyExtractor } from '../jobSupplyExtractor';

describe('JobSupplyExtractor', () => {
  let extractor: JobSupplyExtractor;

  beforeEach(() => {
    extractor = new JobSupplyExtractor();
  });

  describe('getSceneType', () => {
    it('should return agentjob', () => {
      expect(extractor.getSceneType()).toBe('agentjob');
    });
  });

  describe('canHandle', () => {
    it('should detect job seeker supply text', async () => {
      const result = await extractor.canHandle('5年Java开发经验，擅长Spring Boot和微服务架构，求职后端开发');
      expect(result.canHandle).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should not detect unrelated text', async () => {
      const result = await extractor.canHandle('我要买一台新相机');
      expect(result.canHandle).toBe(false);
    });

    it('should detect resume-like text', async () => {
      const result = await extractor.canHandle('技能：Python、数据分析、机器学习');
      expect(result.canHandle).toBe(true);
    });
  });

  describe('extract', () => {
    it('should extract technical skills', async () => {
      const result = await extractor.extract(
        '精通Java、Python、React，熟悉Docker和Kubernetes',
      );
      expect(result.skills.technical).toContain('Java');
      expect(result.skills.technical).toContain('Python');
      expect(result.skills.technical).toContain('React');
      expect(result.skills.technical).toContain('Docker');
    });

    it('should extract soft skills', async () => {
      const result = await extractor.extract(
        '具有良好的沟通能力和团队协作精神，有项目管理经验',
      );
      expect(result.skills.soft).toContain('沟通能力');
      expect(result.skills.soft).toContain('团队协作');
      expect(result.skills.soft).toContain('项目管理');
    });

    it('should extract language skills', async () => {
      const result = await extractor.extract(
        '英语流利，CET-6，日语N2',
      );
      expect(result.skills.languages).toContain('英语');
      expect(result.skills.languages).toContain('日语');
    });

    it('should extract experience', async () => {
      const result = await extractor.extract(
        '5年工作经验，在互联网行业，曾任高级后端工程师',
      );
      expect(result.experience.totalYears).toBe(5);
      expect(result.experience.industries).toContain('互联网');
    });

    it('should determine experience level', async () => {
      const juniorResult = await extractor.extract('应届毕业生，求职前端开发');
      expect(juniorResult.experience.level).toBe('junior');

      const seniorResult = await extractor.extract('10年资深工程师，技术总监');
      expect(seniorResult.experience.level).toBe('expert');
    });

    it('should extract salary expectations', async () => {
      const result = await extractor.extract(
        '期望薪资15K-25K/月',
      );
      expect(result.expectations.salaryRange).toBeDefined();
      expect(result.expectations.salaryRange?.period).toBe('monthly');
    });

    it('should extract job type preferences', async () => {
      const result = await extractor.extract(
        '求职全职或远程工作',
      );
      expect(result.expectations.jobTypes).toContain('全职');
      expect(result.expectations.remote).toBe(true);
    });

    it('should extract education', async () => {
      const result = await extractor.extract(
        '本科毕业，计算机科学专业，985大学',
      );
      expect(result.education).toBeDefined();
      expect(result.education?.degree).toBe('本科');
    });

    it('should build qualification', async () => {
      const result = await extractor.extract(
        '8年互联网经验，PMP认证，擅长项目管理和团队协作',
      );
      expect(result.qualification).toBeDefined();
      expect(result.qualification.certifications).toContain('PMP');
    });

    it('should calculate confidence', async () => {
      const result = await extractor.extract(
        '5年Java开发经验，精通Spring Boot，期望薪资20K-30K，求职后端开发',
      );
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('validate', () => {
    it('should validate data with skills and experience', async () => {
      const data = await extractor.extract(
        '3年Python开发经验，擅长数据分析和机器学习',
      );
      const result = extractor.validate(data);
      expect(result.valid).toBe(true);
    });
  });

  describe('getRequiredFields', () => {
    it('should return required fields', () => {
      const fields = extractor.getRequiredFields();
      expect(fields).toContain('skills');
      expect(fields).toContain('experience');
    });
  });

  describe('generateClarificationQuestions', () => {
    it('should generate questions for missing fields', () => {
      const questions = extractor.generateClarificationQuestions(['skills', 'experience']);
      expect(questions).toHaveLength(2);
      expect(questions[0]).toContain('技能');
      expect(questions[1]).toContain('经验');
    });
  });
});
