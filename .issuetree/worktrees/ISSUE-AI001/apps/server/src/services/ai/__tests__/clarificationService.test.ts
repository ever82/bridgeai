/**
 * Clarification Service Tests
 */

import { ClarificationService } from '../clarificationService';
import { Demand } from '../demandExtractionService';

describe('ClarificationService', () => {
  let service: ClarificationService;

  beforeEach(() => {
    service = new ClarificationService();
  });

  const createMockDemand = (overrides?: Partial<Demand>): Demand => ({
    id: 'test-demand-1',
    rawText: '我想找摄影师',
    intent: {
      intent: 'create_demand',
      confidence: 0.9,
      alternatives: [],
    },
    entities: [],
    structured: {
      title: '找摄影师',
      description: '我想找摄影师',
      location: {},
      time: {},
      people: {},
      budget: {},
      requirements: [],
      preferences: [],
      constraints: [],
    },
    confidence: 0.8,
    scene: 'visionshare',
    clarificationNeeded: true,
    clarificationQuestions: [],
    metadata: {
      processedAt: new Date(),
      provider: 'openai' as any,
      model: 'gpt-4',
      latencyMs: 100,
      version: '1.0.0',
    },
    ...overrides,
  });

  describe('startClarification', () => {
    it('should create a clarification session', async () => {
      const demand = createMockDemand();
      const session = await service.startClarification(demand);

      expect(session.sessionId).toBeDefined();
      expect(session.originalDemand).toEqual(demand);
      expect(session.status).toBe('active');
      expect(session.missingFields).toBeDefined();
      expect(session.clarificationQuestions).toBeDefined();
      expect(session.clarificationQuestions.length).toBeGreaterThan(0);
    });

    it('should detect missing fields automatically', async () => {
      const demand = createMockDemand({
        structured: {
          title: '找摄影师',
          description: '我想找摄影师',
          location: {},
          time: {},
          people: {},
          budget: {},
          requirements: [],
          preferences: [],
          constraints: [],
        },
      });

      const session = await service.startClarification(demand);
      expect(session.missingFields.length).toBeGreaterThan(0);
    });

    it('should accept custom missing fields', async () => {
      const demand = createMockDemand();
      const customFields = ['photographyType', 'budget'];
      const session = await service.startClarification(demand, customFields);

      expect(session.missingFields).toEqual(customFields);
    });

    it('should respect max turns option', async () => {
      const demand = createMockDemand();
      const session = await service.startClarification(demand, undefined, { maxTurns: 3 });

      expect(session.maxTurns).toBe(3);
    });
  });

  describe('processClarification', () => {
    it('should process user response and update session', async () => {
      const demand = createMockDemand();
      const session = await service.startClarification(demand, ['photographyType', 'budget']);

      const response = await service.processClarification({
        sessionId: session.sessionId,
        userResponse: '我需要拍人像写真，预算3000元',
      });

      expect(response.sessionId).toBe(session.sessionId);
      expect(response.status).toBe('clarifying');
      expect(response.clarificationHistory.length).toBe(1);
    });

    it('should track progress', async () => {
      const demand = createMockDemand();
      const session = await service.startClarification(demand, ['photographyType', 'budget']);

      const response = await service.processClarification({
        sessionId: session.sessionId,
        userResponse: '人像摄影',
      });

      expect(response.progress.totalFields).toBe(2);
      expect(response.progress.completedFields).toBeGreaterThan(0);
      expect(response.progress.percentage).toBeGreaterThan(0);
    });

    it('should complete when all fields answered', async () => {
      const demand = createMockDemand();
      const session = await service.startClarification(demand, ['photographyType']);

      const response = await service.processClarification({
        sessionId: session.sessionId,
        userResponse: '人像摄影',
      });

      expect(response.status).toBe('completed');
      expect(response.remainingFields).toHaveLength(0);
    });

    it('should throw error for invalid session', async () => {
      await expect(
        service.processClarification({
          sessionId: 'invalid-session',
          userResponse: 'test',
        })
      ).rejects.toThrow('Clarification session not found');
    });
  });

  describe('getSession', () => {
    it('should return existing session', async () => {
      const demand = createMockDemand();
      const session = await service.startClarification(demand);

      const retrieved = service.getSession(session.sessionId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.sessionId).toBe(session.sessionId);
    });

    it('should return undefined for non-existent session', () => {
      const session = service.getSession('non-existent');
      expect(session).toBeUndefined();
    });
  });

  describe('endSession', () => {
    it('should end active session', async () => {
      const demand = createMockDemand();
      const session = await service.startClarification(demand);

      const result = service.endSession(session.sessionId);
      expect(result).toBe(true);

      const retrieved = service.getSession(session.sessionId);
      expect(retrieved).toBeUndefined();
    });

    it('should return false for non-existent session', () => {
      const result = service.endSession('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('detectMissingFields', () => {
    it('should detect missing required fields', async () => {
      const demand = createMockDemand({
        scene: 'visionshare',
        structured: {
          title: '找摄影师',
          description: '我想找摄影师',
          location: {},
          time: {},
          people: {},
          budget: {},
          requirements: [],
          preferences: [],
          constraints: [],
        },
      });

      const missingFields = await service.detectMissingFields(demand, 'visionshare');
      expect(missingFields).toContain('photographyType');
    });
  });

  describe('generateClarificationQuestions', () => {
    it('should generate questions for missing fields', async () => {
      const questions = await service.generateClarificationQuestions(
        ['photographyType', 'budget'],
        'visionshare'
      );

      expect(questions).toHaveLength(2);
      expect(questions[0]).toContain('摄影');
    });
  });
});
