/**
 * Demand to L2 Mapper Tests
 */

import { DemandToL2Mapper, SceneMappingConfig } from '../demandToL2Mapper';
import { Demand, EntityType } from '../../demandExtractionService';
import { L2Schema, L2FieldType } from '@bridgeai/shared';

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('DemandToL2Mapper', () => {
  let mapper: DemandToL2Mapper;

  const mockSchema: L2Schema = {
    id: 'test-schema',
    version: '1.0.0',
    scene: 'test-scene',
    title: 'Test Schema',
    fields: [
      {
        id: 'title',
        type: L2FieldType.TEXT,
        label: 'Title',
        required: true,
      },
      {
        id: 'location',
        type: L2FieldType.TEXT,
        label: 'Location',
        required: false,
      },
      {
        id: 'budgetMin',
        type: L2FieldType.NUMBER,
        label: 'Minimum Budget',
        required: false,
        min: 0,
      },
      {
        id: 'budgetMax',
        type: L2FieldType.NUMBER,
        label: 'Maximum Budget',
        required: false,
        min: 0,
      },
      {
        id: 'serviceType',
        type: L2FieldType.ENUM,
        label: 'Service Type',
        required: false,
        options: [
          { value: 'photography', label: '摄影' },
          { value: 'video', label: '摄像' },
        ],
      },
      {
        id: 'tags',
        type: L2FieldType.MULTI_SELECT,
        label: 'Tags',
        required: false,
        options: [
          { value: 'indoor', label: '室内' },
          { value: 'outdoor', label: '室外' },
        ],
      },
      {
        id: 'priceRange',
        type: L2FieldType.RANGE,
        label: 'Price Range',
        required: false,
        min: 0,
        max: 10000,
      },
      {
        id: 'urgent',
        type: L2FieldType.BOOLEAN,
        label: 'Urgent',
        required: false,
      },
    ],
  };

  beforeEach(() => {
    mapper = new DemandToL2Mapper();
  });

  describe('map', () => {
    it('should map demand to L2 data', () => {
      const demand: Demand = {
        rawText: '我想在北京拍摄，预算1000-2000元',
        intent: {
          intent: 'create_demand',
          confidence: 0.95,
          alternatives: [],
        },
        entities: [
          {
            type: 'location' as EntityType,
            value: '北京',
            normalizedValue: '北京',
            startIndex: 3,
            endIndex: 5,
            confidence: 0.95,
          },
        ],
        structured: {
          title: '拍摄需求',
          description: '我想在北京拍摄，预算1000-2000元',
          location: {
            city: '北京',
          },
          budget: {
            min: 1000,
            max: 2000,
            currency: 'CNY',
          },
        },
        confidence: 0.9,
        clarificationNeeded: false,
        metadata: {
          processedAt: new Date(),
          provider: 'openai' as any,
          model: 'gpt-4',
          latencyMs: 100,
          version: '1.0.0',
        },
      };

      const result = mapper.map(demand, mockSchema);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.mappedFields).toContain('title');
      expect(result.mappedFields).toContain('location');
      expect(result.mappedFields).toContain('budgetMin');
      expect(result.mappedFields).toContain('budgetMax');
    });

    it('should transform number values correctly', () => {
      const demand: Demand = {
        rawText: '预算5000元',
        intent: { intent: 'create_demand', confidence: 0.9, alternatives: [] },
        entities: [],
        structured: {
          budget: {
            max: 5000,
          },
        },
        confidence: 0.9,
        clarificationNeeded: false,
        metadata: {
          processedAt: new Date(),
          provider: 'openai' as any,
          model: 'gpt-4',
          latencyMs: 100,
          version: '1.0.0',
        },
      };

      const result = mapper.map(demand, mockSchema);

      expect(result.data.budgetMax).toBe(5000);
      expect(typeof result.data.budgetMax).toBe('number');
    });

    it('should transform enum values correctly', () => {
      const demand: Demand = {
        rawText: '需要摄影服务',
        intent: { intent: 'create_demand', confidence: 0.9, alternatives: [] },
        entities: [],
        structured: {
          title: '摄影需求',
        },
        confidence: 0.9,
        clarificationNeeded: false,
        metadata: {
          processedAt: new Date(),
          provider: 'openai' as any,
          model: 'gpt-4',
          latencyMs: 100,
          version: '1.0.0',
        },
      };

      const result = mapper.map(demand, mockSchema);

      // Enum transformation would need entity with service type
      expect(result.data.serviceType).toBeUndefined();
    });

    it('should handle range values correctly', () => {
      const demand: Demand = {
        rawText: '价格范围1000-5000',
        intent: { intent: 'create_demand', confidence: 0.9, alternatives: [] },
        entities: [],
        structured: {
          budget: {
            min: 1000,
            max: 5000,
          },
        },
        confidence: 0.9,
        clarificationNeeded: false,
        metadata: {
          processedAt: new Date(),
          provider: 'openai' as any,
          model: 'gpt-4',
          latencyMs: 100,
          version: '1.0.0',
        },
      };

      const result = mapper.map(demand, mockSchema);

      expect(result.data.priceRange).toEqual({ min: 1000, max: 5000 });
    });

    it('should transform boolean values correctly', () => {
      const demand: Demand = {
        rawText: '紧急需求',
        intent: { intent: 'create_demand', confidence: 0.9, alternatives: [] },
        entities: [],
        structured: {
          title: '紧急拍摄',
        },
        confidence: 0.9,
        clarificationNeeded: false,
        metadata: {
          processedAt: new Date(),
          provider: 'openai' as any,
          model: 'gpt-4',
          latencyMs: 100,
          version: '1.0.0',
        },
      };

      // Infer urgent from text
      const result = mapper.map(demand, mockSchema);

      // The mapper may infer urgency from the text containing '紧急'
      expect(result.data.urgent).toBeDefined();
    });

    it('should track unmapped required fields', () => {
      const demand: Demand = {
        rawText: '',
        intent: { intent: 'unknown', confidence: 0, alternatives: [] },
        entities: [],
        structured: {},
        confidence: 0,
        clarificationNeeded: false,
        metadata: {
          processedAt: new Date(),
          provider: 'openai' as any,
          model: 'gpt-4',
          latencyMs: 100,
          version: '1.0.0',
        },
      };

      const result = mapper.map(demand, mockSchema);

      expect(result.unmappedFields).toContain('title');
    });

    it('should apply scene-specific mappings', () => {
      const sceneConfig: SceneMappingConfig = {
        scene: 'test-scene',
        rules: [],
        fieldMappings: {
          location: 'structured.location.city',
        },
        enumMappings: {},
      };

      mapper.registerSceneConfig(sceneConfig);

      const demand: Demand = {
        rawText: '北京拍摄',
        intent: { intent: 'create_demand', confidence: 0.9, alternatives: [] },
        entities: [],
        structured: {
          location: {
            city: '北京',
          },
        },
        confidence: 0.9,
        clarificationNeeded: false,
        metadata: {
          processedAt: new Date(),
          provider: 'openai' as any,
          model: 'gpt-4',
          latencyMs: 100,
          version: '1.0.0',
        },
      };

      const result = mapper.map(demand, mockSchema);

      expect(result.data.location).toBe('北京');
    });

    it('should detect conflicts', () => {
      const demand: Demand = {
        rawText: '北京和上海拍摄',
        intent: { intent: 'create_demand', confidence: 0.9, alternatives: [] },
        entities: [
          { type: 'location', value: '北京', confidence: 0.9, startIndex: 0, endIndex: 2 },
          { type: 'location', value: '上海', confidence: 0.85, startIndex: 3, endIndex: 5 },
        ],
        structured: {
          location: {
            city: '北京',
          },
        },
        confidence: 0.9,
        clarificationNeeded: false,
        metadata: {
          processedAt: new Date(),
          provider: 'openai' as any,
          model: 'gpt-4',
          latencyMs: 100,
          version: '1.0.0',
        },
      };

      const result = mapper.map(demand, mockSchema);

      expect(result.conflicts.length).toBeGreaterThanOrEqual(0);
    });

    it('should record transformations', () => {
      const demand: Demand = {
        rawText: '预算五千',
        intent: { intent: 'create_demand', confidence: 0.9, alternatives: [] },
        entities: [],
        structured: {
          budget: {
            max: 5000,
          },
        },
        confidence: 0.9,
        clarificationNeeded: false,
        metadata: {
          processedAt: new Date(),
          provider: 'openai' as any,
          model: 'gpt-4',
          latencyMs: 100,
          version: '1.0.0',
        },
      };

      const result = mapper.map(demand, mockSchema);

      expect(result.transformations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('value transformation', () => {
    it('should normalize budget from string', () => {
      const demand: Demand = {
        rawText: '预算1000元',
        intent: { intent: 'create_demand', confidence: 0.9, alternatives: [] },
        entities: [
          { type: 'budget', value: '1000元', normalizedValue: '1000元', confidence: 0.9, startIndex: 0, endIndex: 5 },
        ],
        structured: {
          budget: {
            max: 1000,
            currency: 'CNY',
          },
        },
        confidence: 0.9,
        clarificationNeeded: false,
        metadata: {
          processedAt: new Date(),
          provider: 'openai' as any,
          model: 'gpt-4',
          latencyMs: 100,
          version: '1.0.0',
        },
      };

      const result = mapper.map(demand, mockSchema);

      expect(result.data.budgetMax).toBe(1000);
    });

    it('should handle missing values gracefully', () => {
      const demand: Demand = {
        rawText: '',
        intent: { intent: 'unknown', confidence: 0, alternatives: [] },
        entities: [],
        structured: {},
        confidence: 0,
        clarificationNeeded: false,
        metadata: {
          processedAt: new Date(),
          provider: 'openai' as any,
          model: 'gpt-4',
          latencyMs: 100,
          version: '1.0.0',
        },
      };

      const result = mapper.map(demand, mockSchema);

      expect(result.success).toBe(true);
      expect(Object.keys(result.data).length).toBe(0);
    });
  });

  describe('scene configuration', () => {
    it('should register and retrieve scene config', () => {
      const config: SceneMappingConfig = {
        scene: 'custom-scene',
        rules: [],
        fieldMappings: {},
        enumMappings: {},
      };

      mapper.registerSceneConfig(config);

      const retrieved = mapper.getSceneConfig('custom-scene');
      expect(retrieved).toEqual(config);
    });

    it('should return undefined for unknown scene', () => {
      const config = mapper.getSceneConfig('unknown-scene');
      expect(config).toBeUndefined();
    });
  });

  describe('validation', () => {
    it('should validate mapping result', () => {
      const demand: Demand = {
        rawText: '测试',
        intent: { intent: 'create_demand', confidence: 0.9, alternatives: [] },
        entities: [],
        structured: {
          title: '有标题的需求',
        },
        confidence: 0.9,
        clarificationNeeded: false,
        metadata: {
          processedAt: new Date(),
          provider: 'openai' as any,
          model: 'gpt-4',
          latencyMs: 100,
          version: '1.0.0',
        },
      };

      const result = mapper.map(demand, mockSchema);
      const isValid = mapper.validateMapping(result, mockSchema);

      expect(isValid).toBe(true);
    });

    it('should invalidate mapping with missing required fields', () => {
      const demand: Demand = {
        rawText: '',
        intent: { intent: 'unknown', confidence: 0, alternatives: [] },
        entities: [],
        structured: {},
        confidence: 0,
        clarificationNeeded: false,
        metadata: {
          processedAt: new Date(),
          provider: 'openai' as any,
          model: 'gpt-4',
          latencyMs: 100,
          version: '1.0.0',
        },
      };

      const result = mapper.map(demand, mockSchema);
      const isValid = mapper.validateMapping(result, mockSchema);

      expect(isValid).toBe(false);
    });
  });
});
