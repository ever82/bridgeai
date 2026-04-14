/**
 * Match Algorithm Tests
 * 匹配度算法单元测试
 */

import { MatchScoringModel, MatchWeights, MatchDimension } from '../matchAlgorithm';

describe('MatchScoringModel', () => {
  let model: MatchScoringModel;

  beforeEach(() => {
    model = new MatchScoringModel();
  });

  describe('calculateScore', () => {
    it('should calculate correct weighted score', () => {
      const dimensions: MatchDimension[] = [
        { name: '基础属性', weight: 0.3, score: 0.8 },
        { name: '结构化信息', weight: 0.3, score: 0.7 },
        { name: '语义匹配', weight: 0.4, score: 0.9 },
      ];

      const result = model.calculateScore(0.8, 0.7, 0.9, dimensions);

      // Expected: 0.8 * 0.3 + 0.7 * 0.3 + 0.9 * 0.4 = 0.24 + 0.21 + 0.36 = 0.81
      expect(result.score).toBeCloseTo(0.81, 2);
      expect(result.l1Score).toBe(0.8);
      expect(result.l2Score).toBe(0.7);
      expect(result.l3Score).toBe(0.9);
    });

    it('should determine correct match level', () => {
      const dimensions: MatchDimension[] = [
        { name: 'test', weight: 1, score: 0.9 },
      ];

      const excellent = model.calculateScore(0.9, 0.9, 0.9, dimensions);
      expect(excellent.level).toBe('excellent');

      const good = model.calculateScore(0.7, 0.7, 0.7, dimensions);
      expect(good.level).toBe('good');

      const fair = model.calculateScore(0.5, 0.5, 0.5, dimensions);
      expect(fair.level).toBe('fair');

      const poor = model.calculateScore(0.2, 0.2, 0.2, dimensions);
      expect(poor.level).toBe('poor');
    });

    it('should normalize score to 0-1 range', () => {
      const dimensions: MatchDimension[] = [
        { name: 'test', weight: 1, score: 1.5 },
      ];

      const result = model.calculateScore(1.5, 1.5, 1.5, dimensions);
      expect(result.score).toBe(1);
    });

    it('should generate explanation', () => {
      const dimensions: MatchDimension[] = [
        { name: '维度A', weight: 0.5, score: 0.9 },
        { name: '维度B', weight: 0.5, score: 0.3 },
      ];

      const result = model.calculateScore(0.9, 0.5, 0.5, dimensions);

      expect(result.explanation).toContain('匹配度');
      expect(result.explanation).toContain('维度A');
      expect(result.explanation).toContain('维度B');
    });
  });

  describe('updateWeights', () => {
    it('should update layer weights', () => {
      model.updateWeights({ l1: 0.5, l2: 0.3, l3: 0.2 });

      const config = model.getConfig();
      expect(config.weights.l1).toBe(0.5);
      expect(config.weights.l2).toBe(0.3);
      expect(config.weights.l3).toBe(0.2);
    });

    it('should update dimension weights', () => {
      model.updateWeights({
        dimensions: { category: 0.5, location: 0.5 },
      });

      const config = model.getConfig();
      expect(config.weights.dimensions.category).toBe(0.5);
      expect(config.weights.dimensions.location).toBe(0.5);
    });
  });

  describe('batchCalculate', () => {
    it('should calculate multiple matches', () => {
      const items = [
        { id: '1', l1Score: 0.8, l2Score: 0.7, l3Score: 0.9, dimensions: [] },
        { id: '2', l1Score: 0.6, l2Score: 0.5, l3Score: 0.7, dimensions: [] },
      ];

      const results = model.batchCalculate(items);

      expect(results).toHaveLength(2);
      expect(results[0].l1Score).toBe(0.8);
      expect(results[1].l1Score).toBe(0.6);
    });
  });

  describe('optimizeWeights', () => {
    it('should adjust weights based on feedback', () => {
      const initialConfig = model.getConfig();
      const initialL3 = initialConfig.weights.l3;

      // 高成功率的反馈
      const feedback = [
        { matchId: '1', success: true, score: 0.9 },
        { matchId: '2', success: true, score: 0.85 },
        { matchId: '3', success: true, score: 0.88 },
      ];

      model.optimizeWeights(feedback);

      const newConfig = model.getConfig();
      // 高成功率应增加 L3 权重
      expect(newConfig.weights.l3).toBeGreaterThan(initialL3);
    });
  });

  describe('scene configs', () => {
    it('should use supply_demand scene config', () => {
      const sceneModel = new MatchScoringModel({ scene: 'supply_demand' });
      const config = sceneModel.getConfig();

      expect(config.scene).toBe('supply_demand');
      expect(config.weights.l1).toBe(0.35);
      expect(config.weights.l2).toBe(0.35);
      expect(config.weights.l3).toBe(0.3);
    });

    it('should use skill_matching scene config', () => {
      const sceneModel = new MatchScoringModel({ scene: 'skill_matching' });
      const config = sceneModel.getConfig();

      expect(config.scene).toBe('skill_matching');
      expect(config.weights.l3).toBe(0.5);
    });
  });
});
