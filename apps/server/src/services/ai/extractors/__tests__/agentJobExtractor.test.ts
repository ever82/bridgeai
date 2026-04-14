/**
 * AgentJob Extractor Tests
 */

import { AgentJobExtractor } from '../agentJobExtractor';

describe('AgentJobExtractor', () => {
  let extractor: AgentJobExtractor;

  beforeEach(() => {
    extractor = new AgentJobExtractor();
  });

  describe('canHandle', () => {
    it('should detect AgentJob scene from job keywords', async () => {
      const result = await extractor.canHandle('我想找一份Java开发工作');
      expect(result.canHandle).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should not detect unrelated text', async () => {
      const result = await extractor.canHandle('我想找对象');
      expect(result.canHandle).toBe(false);
    });
  });

  describe('extract', () => {
    it('should extract skills', async () => {
      const result = await extractor.extract('找Java和Python开发工作');
      expect(result.structured.skills).toContain('Java');
      expect(result.structured.skills).toContain('Python');
    });

    it('should extract salary expectation', async () => {
      const result = await extractor.extract('薪资期望15K-25K/月');
      expect(result.structured.salaryExpectation).toBeDefined();
      expect(result.structured.salaryExpectation?.min).toBe(15000);
      expect(result.structured.salaryExpectation?.max).toBe(25000);
    });

    it('should extract experience', async () => {
      const result = await extractor.extract('有3年工作经验');
      expect(result.structured.experience).toBeDefined();
      expect(result.structured.experience?.years).toBe(3);
    });

    it('should extract job type', async () => {
      const result = await extractor.extract('找全职远程工作');
      expect(result.structured.jobType).toContain('全职');
    });

    it('should extract remote work preference', async () => {
      const result = await extractor.extract('希望找远程工作');
      expect(result.structured.location?.remote).toBe(true);
    });

    it('should extract benefits', async () => {
      const result = await extractor.extract('要求五险一金，双休');
      expect(result.structured.benefits).toContain('五险一金');
      expect(result.structured.benefits).toContain('双休');
    });
  });

  describe('getRequiredFields', () => {
    it('should return required fields', () => {
      const fields = extractor.getRequiredFields();
      expect(fields).toContain('skills');
      expect(fields).toContain('salaryExpectation');
    });
  });
});
