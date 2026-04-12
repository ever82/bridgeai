/**
 * L3 Matcher Tests
 * 语义匹配器单元测试
 */

import { L3Matcher, L3SemanticData } from '../matchers/L3Matcher';

describe('L3Matcher', () => {
  let matcher: L3Matcher;

  beforeEach(() => {
    matcher = new L3Matcher();
  });

  const baseSupply: L3SemanticData = {
    title: '专业家庭维修服务',
    description: '提供各类家电维修、水管维修、电路检修等专业服务，经验丰富，价格合理。',
    expectations: ['快速响应', '专业技能', '质量保证'],
    constraints: ['仅限工作日', '需提前预约'],
    keywords: ['维修', '家电', '水管', '电路', '专业'],
  };

  const baseDemand: L3SemanticData = {
    title: '寻找可靠的家电维修师傅',
    description: '家里的冰箱坏了，需要找一位专业的维修师傅，希望能在周末修好。',
    expectations: ['专业维修', '周末服务', '价格合理'],
    constraints: ['必须是周末', '需要发票'],
    keywords: ['维修', '家电', '冰箱', '专业', '周末'],
  };

  describe('calculate', () => {
    it('should return match result with all fields', async () => {
      const result = await matcher.calculate(baseSupply, baseDemand);

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('semanticSimilarity');
      expect(result).toHaveProperty('intentAlignment');
      expect(result).toHaveProperty('constraintCompatibility');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('matchedKeywords');

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('should calculate semantic similarity', async () => {
      const result = await matcher.calculate(baseSupply, baseDemand);

      expect(result.semanticSimilarity).toBeGreaterThanOrEqual(0);
      expect(result.semanticSimilarity).toBeLessThanOrEqual(1);
    });

    it('should calculate intent alignment', async () => {
      const result = await matcher.calculate(baseSupply, baseDemand);

      expect(result.intentAlignment).toBeGreaterThanOrEqual(0);
      expect(result.intentAlignment).toBeLessThanOrEqual(1);
    });

    it('should calculate constraint compatibility', async () => {
      const result = await matcher.calculate(baseSupply, baseDemand);

      expect(result.constraintCompatibility).toBeGreaterThanOrEqual(0);
      expect(result.constraintCompatibility).toBeLessThanOrEqual(1);
    });

    it('should find matched keywords', async () => {
      const result = await matcher.calculate(baseSupply, baseDemand);

      expect(result.matchedKeywords.length).toBeGreaterThan(0);
      expect(result.matchedKeywords).toContain('维修');
      expect(result.matchedKeywords).toContain('专业');
    });

    it('should generate reasoning', async () => {
      const result = await matcher.calculate(baseSupply, baseDemand);

      expect(result.reasoning).toBeTruthy();
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should return higher score for similar content', async () => {
      const similarSupply: L3SemanticData = {
        ...baseDemand,
        title: '家电维修专家',
        description: '专业维修各类家电，经验丰富，周末可服务。',
      };

      const result = await matcher.calculate(similarSupply, baseDemand);
      expect(result.score).toBeGreaterThan(0.5);
    });

    it('should return lower score for dissimilar content', async () => {
      const differentSupply: L3SemanticData = {
        title: '软件开发服务',
        description: '提供各类软件开发、网站开发、APP开发服务。',
        expectations: ['按时交付', '代码质量'],
        constraints: ['仅限远程'],
        keywords: ['软件', '开发', '编程'],
      };

      const result = await matcher.calculate(differentSupply, baseDemand);
      expect(result.score).toBeLessThan(0.5);
    });
  });

  describe('constraint detection', () => {
    it('should detect constraint conflicts', async () => {
      const supply: L3SemanticData = {
        ...baseSupply,
        constraints: ['不周末服务', '无需发票'],
      };

      const result = await matcher.calculate(supply, baseDemand);
      expect(result.constraintCompatibility).toBeLessThan(0.8);
    });

    it('should return high compatibility for compatible constraints', async () => {
      const supply: L3SemanticData = {
        ...baseSupply,
        constraints: ['需要发票', '周末可服务'],
      };

      const result = await matcher.calculate(supply, baseDemand);
      expect(result.constraintCompatibility).toBeGreaterThan(0.5);
    });

    it('should return high compatibility when no constraints', async () => {
      const supply: L3SemanticData = {
        ...baseSupply,
        constraints: [],
      };

      const demand: L3SemanticData = {
        ...baseDemand,
        constraints: [],
      };

      const result = await matcher.calculate(supply, demand);
      expect(result.constraintCompatibility).toBe(1);
    });
  });

  describe('intent alignment', () => {
    it('should return high alignment for similar expectations', async () => {
      const supply: L3SemanticData = {
        ...baseSupply,
        expectations: ['专业维修', '快速响应', '合理价格'],
      };

      const result = await matcher.calculate(supply, baseDemand);
      expect(result.intentAlignment).toBeGreaterThan(0.4);
    });

    it('should return low alignment for different expectations', async () => {
      const supply: L3SemanticData = {
        ...baseSupply,
        expectations: ['高端定制', '奢华体验', 'VIP服务'],
      };

      const result = await matcher.calculate(supply, baseDemand);
      expect(result.intentAlignment).toBeLessThan(0.8);
    });

    it('should handle empty expectations', async () => {
      const supply: L3SemanticData = {
        ...baseSupply,
        expectations: [],
      };

      const result = await matcher.calculate(supply, baseDemand);
      expect(result.intentAlignment).toBe(0.5);
    });
  });

  describe('batch calculate', () => {
    it('should calculate multiple matches', async () => {
      const demands: L3SemanticData[] = [
        baseDemand,
        {
          title: '水管维修需求',
          description: '厨房水管漏水，需要维修。',
          expectations: ['快速上门'],
          constraints: [],
          keywords: ['水管', '维修'],
        },
      ];

      const results = await matcher.batchCalculate(baseSupply, demands);

      expect(results).toHaveLength(2);
      expect(results[0].result).toHaveProperty('score');
      expect(results[1].result).toHaveProperty('score');
    });
  });
});
