/**
 * Demand to L2 Mapper Tests
 */

import { DemandToL2Mapper } from '../mappers/demandToL2Mapper';
import { Demand, ExtractedEntities, IntentResult } from '../demandExtractionService';
import { L2FieldType } from '@visionshare/shared';

describe('DemandToL2Mapper', () => {
  let mapper: DemandToL2Mapper;

  beforeEach(() => {
    mapper = new DemandToL2Mapper();
  });

  const createMockDemand = (overrides?: Partial<Demand>): Demand => ({
    id: 'demand-test-123',
    scene: 'VISIONSHARE',
    intent: {
      primary: 'find_collaborator',
      confidence: 85,
      alternatives: [],
    } as IntentResult,
    entities: {
      time: [],
      location: [],
      people: [],
      organizations: [],
      keywords: ['摄影', '拍照'],
    } as ExtractedEntities,
    attributes: {
      contentType: ['photography'],
      purpose: 'collaborate',
      skillLevel: 'intermediate',
    },
    rawText: '我想找个一起拍照的朋友',
    confidence: 82,
    fieldConfidence: {
      contentType: 90,
      purpose: 80,
    },
    extractedAt: new Date(),
    clarificationNeeded: false,
    missingFields: [],
    suggestedQuestions: [],
    ...overrides,
  });

  describe('map', () => {
    it('should map demand attributes to L2 data', () => {
      const demand = createMockDemand();
      const result = mapper.map(demand);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.contentType).toEqual(['photography']);
      expect(result.data.purpose).toBe('collaborate');
      expect(result.data.skillLevel).toBe('intermediate');
    });

    it('should return mapped fields list', () => {
      const demand = createMockDemand();
      const result = mapper.map(demand);

      expect(result.mappedFields).toContain('contentType');
      expect(result.mappedFields).toContain('purpose');
      expect(result.mappedFields).toContain('skillLevel');
    });

    it('should return unmapped fields for unknown attributes', () => {
      const demand = createMockDemand({
        attributes: {
          ...createMockDemand().attributes,
          unknownField: 'value',
        },
      });
      const result = mapper.map(demand);

      expect(result.unmappedFields).toContain('unknownField');
    });

    it('should standardize number values', () => {
      const demand = createMockDemand({
        scene: 'AGENTJOB',
        attributes: {
          salaryMin: '10000元',
          salaryMax: '20000元',
        },
      });
      const result = mapper.map(demand);

      expect(typeof result.data.salaryMin).toBe('number');
      expect(typeof result.data.salaryMax).toBe('number');
      expect(result.data.salaryMin).toBe(10000);
      expect(result.data.salaryMax).toBe(20000);
    });

    it('should standardize price with k/m suffix', () => {
      const demand = createMockDemand({
        scene: 'AGENTJOB',
        attributes: {
          salaryMin: '15k',
          salaryMax: '30k',
        },
      });
      const result = mapper.map(demand);

      expect(result.data.salaryMin).toBe(15000);
      expect(result.data.salaryMax).toBe(30000);
    });

    it('should standardize boolean values', () => {
      const demand = createMockDemand({
        attributes: {
          isPublic: 'yes',
          requiresVerification: 'no',
          isUrgent: true,
        },
      });
      const result = mapper.map(demand);

      expect(result.data.isPublic).toBe(true);
      expect(result.data.requiresVerification).toBe(false);
      expect(result.data.isUrgent).toBe(true);
    });

    it('should parse range values', () => {
      const demand = createMockDemand({
        scene: 'AGENTJOB',
        attributes: {
          salaryRange: { min: 10000, max: 20000 },
        },
      });
      const result = mapper.map(demand);

      expect(result.data.salaryRange).toEqual({ min: 10000, max: 20000 });
    });

    it('should parse range from string', () => {
      const demand = createMockDemand({
        scene: 'AGENTJOB',
        attributes: {
          salaryRange: '10000-20000',
        },
      });
      const result = mapper.map(demand);

      expect(result.data.salaryRange).toEqual({ min: 10000, max: 20000 });
    });

    it('should standardize date values', () => {
      const demand = createMockDemand({
        attributes: {
          deadline: '2024-12-31',
        },
      });
      const result = mapper.map(demand);

      expect(result.data.deadline).toBe('2024-12-31');
    });

    it('should match enum values', () => {
      const demand = createMockDemand({
        attributes: {
          purpose: 'share', // lowercase should match
        },
      });
      const result = mapper.map(demand);

      expect(result.data.purpose).toBe('share');
    });

    it('should parse multi-select values from array', () => {
      const demand = createMockDemand({
        attributes: {
          contentType: ['photography', 'artwork'],
        },
      });
      const result = mapper.map(demand);

      expect(result.data.contentType).toEqual(['photography', 'artwork']);
    });

    it('should parse multi-select values from string', () => {
      const demand = createMockDemand({
        attributes: {
          availability: 'weekday_morning,weekend_afternoon',
        },
      });
      const result = mapper.map(demand);

      expect(result.data.availability).toContain('weekday_morning');
      expect(result.data.availability).toContain('weekend_afternoon');
    });

    it('should track standardized fields', () => {
      const demand = createMockDemand({
        scene: 'AGENTJOB',
        attributes: {
          salaryMin: '15k',
        },
      });
      const result = mapper.map(demand);

      expect(result.standardizedFields).toHaveLength(1);
      expect(result.standardizedFields[0].field).toBe('salaryMin');
      expect(result.standardizedFields[0].original).toBe('15k');
      expect(result.standardizedFields[0].standardized).toBe(15000);
      expect(result.standardizedFields[0].transformation).toBe('number_standardization');
    });

    it('should infer fields from entities', () => {
      const demand = createMockDemand({
        entities: {
          time: [{ text: '周末', type: 'datetime', normalized: 'weekend' }],
          location: [{ text: '北京', type: 'city', normalized: 'Beijing' }],
          people: [],
          organizations: [],
          keywords: [],
        },
      });
      const result = mapper.map(demand);

      // Should infer time-related and location-related fields
      expect(result.inferredFields.length).toBeGreaterThan(0);
    });

    it('should detect conflicts for invalid values', () => {
      const demand = createMockDemand({
        scene: 'VISIONSHARE',
        attributes: {
          // This would cause a conflict if skillLevel has specific options
          skillLevel: 'invalid_value',
        },
      });
      const result = mapper.map(demand);

      // Enum matching should return undefined for invalid values
      expect(result.data.skillLevel).toBeUndefined();
    });

    it('should return error for invalid scene', () => {
      const demand = createMockDemand({
        scene: 'INVALID_SCENE',
      });
      const result = mapper.map(demand);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('SCHEMA_NOT_FOUND');
    });

    it('should report missing required fields', () => {
      // VISIONSHARE requires contentType, purpose, skillLevel
      const demand = createMockDemand({
        attributes: {
          // Missing required fields
          additionalInfo: 'some info',
        },
      });
      const result = mapper.map(demand);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.code === 'REQUIRED_FIELD_MISSING')).toBe(true);
    });
  });

  describe('applyCorrections', () => {
    it('should apply user corrections to mapped data', () => {
      const mappedData = {
        contentType: ['photography'],
        purpose: 'share',
      };
      const corrections = {
        purpose: 'collaborate',
      };

      const result = mapper.applyCorrections(mappedData, corrections);

      expect(result.contentType).toEqual(['photography']);
      expect(result.purpose).toBe('collaborate');
    });
  });

  describe('getMappingStats', () => {
    it('should calculate mapping statistics', () => {
      const result = mapper.getMappingStats({
        success: true,
        data: { field1: 'value1', field2: 'value2' },
        mappedFields: ['field1', 'field2'],
        unmappedFields: ['field3'],
        standardizedFields: [],
        inferredFields: [{ field: 'field4', value: 'value4', reasoning: 'test', confidence: 70 }],
        conflicts: [],
        errors: [],
      });

      expect(result.totalFields).toBe(3);
      expect(result.mappedRatio).toBe(2 / 3);
      expect(result.inferredRatio).toBe(1 / 3);
      expect(result.conflictCount).toBe(0);
      expect(result.hasErrors).toBe(false);
    });

    it('should report hasErrors when there are errors', () => {
      const result = mapper.getMappingStats({
        success: false,
        data: {},
        mappedFields: [],
        unmappedFields: [],
        standardizedFields: [],
        inferredFields: [],
        conflicts: [],
        errors: [{ field: 'test', message: 'error', code: 'TEST' }],
      });

      expect(result.hasErrors).toBe(true);
    });
  });
});
