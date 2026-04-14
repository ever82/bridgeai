/**
 * Match A/B Test Service Tests
 * A/B 测试服务单元测试
 */

import { MatchABTestService, ABTestExperiment, ABTestVariant } from './matchABTest';

describe('MatchABTestService', () => {
  let service: MatchABTestService;

  beforeEach(() => {
    service = new MatchABTestService();
  });

  describe('createExperiment', () => {
    it('should create an experiment with valid traffic distribution', () => {
      const experiment = service.createExperiment({
        name: 'Test Experiment',
        description: 'Testing match algorithm variants',
        variants: [
          { id: 'control', name: 'Control', version: 'v1.0', config: {}, trafficPercent: 50 },
          { id: 'variant_a', name: 'Variant A', version: 'v1.1', config: {}, trafficPercent: 50 },
        ],
        targetMetrics: ['conversionRate', 'successRate'],
      });

      expect(experiment.id).toBeTruthy();
      expect(experiment.status).toBe('running');
      expect(experiment.variants).toHaveLength(2);
    });

    it('should throw error if traffic distribution does not sum to 100%', () => {
      expect(() => {
        service.createExperiment({
          name: 'Invalid Experiment',
          description: 'Invalid traffic distribution',
          variants: [
            { id: 'control', name: 'Control', version: 'v1.0', config: {}, trafficPercent: 30 },
            { id: 'variant_a', name: 'Variant A', version: 'v1.1', config: {}, trafficPercent: 50 },
          ],
          targetMetrics: ['conversionRate'],
        });
      }).toThrow('Variant traffic must sum to 100%');
    });

    it('should support multiple variants', () => {
      const experiment = service.createExperiment({
        name: 'Multi Variant Test',
        description: 'Testing 3 variants',
        variants: [
          { id: 'control', name: 'Control', version: 'v1.0', config: {}, trafficPercent: 34 },
          { id: 'variant_a', name: 'Variant A', version: 'v1.1', config: {}, trafficPercent: 33 },
          { id: 'variant_b', name: 'Variant B', version: 'v1.2', config: {}, trafficPercent: 33 },
        ],
        targetMetrics: ['conversionRate', 'successRate'],
      });

      expect(experiment.variants).toHaveLength(3);
    });
  });

  describe('getModelForExperiment', () => {
    it('should return model for valid running experiment', () => {
      const experiment = service.createExperiment({
        name: 'Test',
        description: 'Test',
        variants: [
          { id: 'control', name: 'Control', version: 'v1.0', config: {}, trafficPercent: 100 },
        ],
        targetMetrics: ['conversionRate'],
      });

      const model = service.getModelForExperiment(experiment.id, 'user123');
      expect(model).toBeTruthy();
    });

    it('should return null for non-existent experiment', () => {
      const model = service.getModelForExperiment('non-existent', 'user123');
      expect(model).toBeNull();
    });

    it('should return null for paused experiment', () => {
      const experiment = service.createExperiment({
        name: 'Test',
        description: 'Test',
        variants: [
          { id: 'control', name: 'Control', version: 'v1.0', config: {}, trafficPercent: 100 },
        ],
        targetMetrics: ['conversionRate'],
      });

      service.pauseExperiment(experiment.id);
      const model = service.getModelForExperiment(experiment.id, 'user123');
      expect(model).toBeNull();
    });
  });

  describe('trackEvent', () => {
    it('should track events', () => {
      const experiment = service.createExperiment({
        name: 'Test',
        description: 'Test',
        variants: [
          { id: 'control', name: 'Control', version: 'v1.0', config: {}, trafficPercent: 100 },
        ],
        targetMetrics: ['conversionRate'],
      });

      service.trackEvent({
        experimentId: experiment.id,
        variantId: 'control',
        matchId: 'match1',
        supplyId: 'supply1',
        demandId: 'demand1',
        score: 0.85,
        eventType: 'calculated',
      });

      const metrics = service.calculateMetrics(experiment.id);
      expect(metrics[0].totalMatches).toBe(1);
    });

    it('should calculate average score', () => {
      const experiment = service.createExperiment({
        name: 'Test',
        description: 'Test',
        variants: [
          { id: 'control', name: 'Control', version: 'v1.0', config: {}, trafficPercent: 100 },
        ],
        targetMetrics: ['conversionRate'],
      });

      service.trackEvent({
        experimentId: experiment.id,
        variantId: 'control',
        matchId: 'match1',
        supplyId: 'supply1',
        demandId: 'demand1',
        score: 0.8,
        eventType: 'calculated',
      });

      service.trackEvent({
        experimentId: experiment.id,
        variantId: 'control',
        matchId: 'match2',
        supplyId: 'supply2',
        demandId: 'demand2',
        score: 0.9,
        eventType: 'calculated',
      });

      const metrics = service.calculateMetrics(experiment.id);
      expect(metrics[0].avgScore).toBeCloseTo(0.85, 2);
    });

    it('should calculate contact rate', () => {
      const experiment = service.createExperiment({
        name: 'Test',
        description: 'Test',
        variants: [
          { id: 'control', name: 'Control', version: 'v1.0', config: {}, trafficPercent: 100 },
        ],
        targetMetrics: ['conversionRate'],
      });

      service.trackEvent({
        experimentId: experiment.id,
        variantId: 'control',
        matchId: 'match1',
        supplyId: 'supply1',
        demandId: 'demand1',
        score: 0.8,
        eventType: 'calculated',
      });

      service.trackEvent({
        experimentId: experiment.id,
        variantId: 'control',
        matchId: 'match1',
        supplyId: 'supply1',
        demandId: 'demand1',
        score: 0.8,
        eventType: 'contacted',
      });

      const metrics = service.calculateMetrics(experiment.id);
      expect(metrics[0].contactRate).toBe(1);
    });

    it('should calculate success rate', () => {
      const experiment = service.createExperiment({
        name: 'Test',
        description: 'Test',
        variants: [
          { id: 'control', name: 'Control', version: 'v1.0', config: {}, trafficPercent: 100 },
        ],
        targetMetrics: ['successRate'],
      });

      service.trackEvent({
        experimentId: experiment.id,
        variantId: 'control',
        matchId: 'match1',
        supplyId: 'supply1',
        demandId: 'demand1',
        score: 0.8,
        eventType: 'contacted',
      });

      service.trackEvent({
        experimentId: experiment.id,
        variantId: 'control',
        matchId: 'match1',
        supplyId: 'supply1',
        demandId: 'demand1',
        score: 0.8,
        eventType: 'matched',
      });

      const metrics = service.calculateMetrics(experiment.id);
      expect(metrics[0].successRate).toBe(1);
    });
  });

  describe('getExperiments', () => {
    it('should return all experiments', () => {
      service.createExperiment({
        name: 'Test 1',
        description: 'Test 1',
        variants: [
          { id: 'control', name: 'Control', version: 'v1.0', config: {}, trafficPercent: 100 },
        ],
        targetMetrics: ['conversionRate'],
      });

      service.createExperiment({
        name: 'Test 2',
        description: 'Test 2',
        variants: [
          { id: 'control', name: 'Control', version: 'v1.0', config: {}, trafficPercent: 100 },
        ],
        targetMetrics: ['conversionRate'],
      });

      const experiments = service.getExperiments();
      expect(experiments).toHaveLength(2);
    });

    it('should filter by status', () => {
      const exp1 = service.createExperiment({
        name: 'Test 1',
        description: 'Test 1',
        variants: [
          { id: 'control', name: 'Control', version: 'v1.0', config: {}, trafficPercent: 100 },
        ],
        targetMetrics: ['conversionRate'],
      });

      service.pauseExperiment(exp1.id);

      service.createExperiment({
        name: 'Test 2',
        description: 'Test 2',
        variants: [
          { id: 'control', name: 'Control', version: 'v1.0', config: {}, trafficPercent: 100 },
        ],
        targetMetrics: ['conversionRate'],
      });

      const running = service.getExperiments('running');
      const paused = service.getExperiments('paused');

      expect(running).toHaveLength(1);
      expect(paused).toHaveLength(1);
    });
  });

  describe('pause and resume experiment', () => {
    it('should pause running experiment', () => {
      const experiment = service.createExperiment({
        name: 'Test',
        description: 'Test',
        variants: [
          { id: 'control', name: 'Control', version: 'v1.0', config: {}, trafficPercent: 100 },
        ],
        targetMetrics: ['conversionRate'],
      });

      const result = service.pauseExperiment(experiment.id);
      expect(result).toBe(true);

      const paused = service.getExperiments('paused');
      expect(paused).toHaveLength(1);
    });

    it('should resume paused experiment', () => {
      const experiment = service.createExperiment({
        name: 'Test',
        description: 'Test',
        variants: [
          { id: 'control', name: 'Control', version: 'v1.0', config: {}, trafficPercent: 100 },
        ],
        targetMetrics: ['conversionRate'],
      });

      service.pauseExperiment(experiment.id);
      const result = service.resumeExperiment(experiment.id);
      expect(result).toBe(true);

      const running = service.getExperiments('running');
      expect(running).toHaveLength(1);
    });

    it('should return false for non-existent experiment', () => {
      const result = service.pauseExperiment('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('complete experiment', () => {
    it('should complete experiment and return metrics', () => {
      const experiment = service.createExperiment({
        name: 'Test',
        description: 'Test',
        variants: [
          { id: 'control', name: 'Control', version: 'v1.0', config: {}, trafficPercent: 100 },
        ],
        targetMetrics: ['conversionRate'],
      });

      service.trackEvent({
        experimentId: experiment.id,
        variantId: 'control',
        matchId: 'match1',
        supplyId: 'supply1',
        demandId: 'demand1',
        score: 0.8,
        eventType: 'calculated',
      });

      const metrics = service.completeExperiment(experiment.id);
      expect(metrics).toBeTruthy();
      expect(metrics![0].totalMatches).toBe(1);

      const completed = service.getExperiments('completed');
      expect(completed).toHaveLength(1);
    });
  });

  describe('getWinningVariant', () => {
    it('should return variant with highest success rate', () => {
      const experiment = service.createExperiment({
        name: 'Test',
        description: 'Test',
        variants: [
          { id: 'control', name: 'Control', version: 'v1.0', config: {}, trafficPercent: 50 },
          { id: 'variant_a', name: 'Variant A', version: 'v1.1', config: {}, trafficPercent: 50 },
        ],
        targetMetrics: ['successRate'],
      });

      // Control: 1 contacted, 1 matched = 100% success rate
      service.trackEvent({
        experimentId: experiment.id,
        variantId: 'control',
        matchId: 'match1',
        supplyId: 'supply1',
        demandId: 'demand1',
        score: 0.8,
        eventType: 'contacted',
      });
      service.trackEvent({
        experimentId: experiment.id,
        variantId: 'control',
        matchId: 'match1',
        supplyId: 'supply1',
        demandId: 'demand1',
        score: 0.8,
        eventType: 'matched',
      });

      // Variant A: 2 contacted, 1 matched = 50% success rate
      service.trackEvent({
        experimentId: experiment.id,
        variantId: 'variant_a',
        matchId: 'match2',
        supplyId: 'supply2',
        demandId: 'demand2',
        score: 0.8,
        eventType: 'contacted',
      });
      service.trackEvent({
        experimentId: experiment.id,
        variantId: 'variant_a',
        matchId: 'match3',
        supplyId: 'supply3',
        demandId: 'demand3',
        score: 0.8,
        eventType: 'contacted',
      });
      service.trackEvent({
        experimentId: experiment.id,
        variantId: 'variant_a',
        matchId: 'match2',
        supplyId: 'supply2',
        demandId: 'demand2',
        score: 0.8,
        eventType: 'matched',
      });

      const winner = service.getWinningVariant(experiment.id, 'successRate');
      expect(winner?.id).toBe('control');
    });

    it('should return null for experiment with no data', () => {
      const experiment = service.createExperiment({
        name: 'Test',
        description: 'Test',
        variants: [
          { id: 'control', name: 'Control', version: 'v1.0', config: {}, trafficPercent: 100 },
        ],
        targetMetrics: ['conversionRate'],
      });

      const winner = service.getWinningVariant(experiment.id);
      expect(winner).toBeNull();
    });
  });
});
