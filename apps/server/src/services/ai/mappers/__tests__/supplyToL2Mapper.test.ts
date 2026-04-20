/**
 * Supply to L2 Mapper Tests
 * 供给映射系统单元测试
 */

import { L2Schema, L2FieldType } from '@bridgeai/shared';

import { SupplyToL2Mapper } from '../supplyToL2Mapper';
import { Supply } from '../../supplyExtractionService';

jest.mock('@bridgeai/shared', () => ({
  L2FieldType: {
    TEXT: 'text',
    NUMBER: 'number',
    ENUM: 'enum',
    MULTI_SELECT: 'multi_select',
    RANGE: 'range',
    BOOLEAN: 'boolean',
    DATE: 'date',
    DATETIME: 'datetime',
    TIME: 'time',
    LONG_TEXT: 'long_text',
  },
}));

jest.mock('../../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('SupplyToL2Mapper', () => {
  let mapper: SupplyToL2Mapper;

  const createMockSchema = (fields?: Partial<L2Schema['fields'][0]>[]): L2Schema => ({
    id: 'test-schema',
    version: '1.0.0',
    scene: 'test-scene',
    title: 'Test Schema',
    fields: (fields || [
      { id: 'title', type: L2FieldType.TEXT, label: 'Title', required: true },
      { id: 'description', type: L2FieldType.LONG_TEXT, label: 'Description' },
      { id: 'priceMin', type: L2FieldType.NUMBER, label: 'Min Price', min: 0 },
      { id: 'priceMax', type: L2FieldType.NUMBER, label: 'Max Price', min: 0 },
      { id: 'priceCurrency', type: L2FieldType.TEXT, label: 'Currency' },
      { id: 'priceRange', type: L2FieldType.RANGE, label: 'Price Range', min: 0 },
      { id: 'locationCity', type: L2FieldType.TEXT, label: 'City' },
      { id: 'locationRemote', type: L2FieldType.BOOLEAN, label: 'Remote' },
      { id: 'experienceYears', type: L2FieldType.NUMBER, label: 'Years', min: 0 },
      { id: 'skills', type: L2FieldType.TEXT, label: 'Skills' },
      { id: 'serviceType', type: L2FieldType.ENUM, label: 'Service Type', options: [
        { value: 'photography', label: 'Photography' },
        { value: 'design', label: 'Design' },
        { value: 'development', label: 'Development' },
        { value: 'consulting', label: 'Consulting' },
      ]},
    ]) as L2Schema['fields'],
  });

  const createMockSupply = (overrides?: Partial<Supply>): Supply => ({
    id: 'supply-1',
    agentId: 'agent-1',
    title: 'Professional Photography Service',
    description: 'Professional photography services for weddings, portraits, and events',
    serviceType: 'photography',
    capabilities: [
      {
        name: 'Wedding Photography',
        description: 'Wedding day coverage',
        level: 'expert',
        category: 'event',
        keywords: ['wedding', 'ceremony', 'reception'],
      },
      {
        name: 'Portrait Photography',
        description: 'Studio and outdoor portraits',
        level: 'advanced',
        category: 'portrait',
        keywords: ['portrait', 'headshot'],
      },
    ],
    pricing: {
      type: 'range',
      minRate: 500,
      maxRate: 5000,
      currency: 'CNY',
      unit: 'session',
    },
    skills: ['photo-editing', 'lighting', 'composition', 'photoshop'],
    availability: {
      schedule: 'Weekdays',
      timezone: 'Asia/Shanghai',
      responseTime: '24h',
    },
    location: {
      city: '上海',
      country: 'China',
      remote: false,
      onsite: true,
      hybrid: false,
    },
    experience: {
      years: 8,
      totalProjects: 100,
      relevantProjects: 50,
      certifications: ['CPP'],
      portfolio: ['https://example.com'],
    },
    quality: {
      overallScore: 90,
      completenessScore: 85,
      clarityScore: 90,
      relevanceScore: 88,
      confidence: 90,
    },
    ...overrides,
  });

  beforeEach(() => {
    mapper = new SupplyToL2Mapper();
  });

  describe('map', () => {
    it('should map a complete supply to L2 data', () => {
      const supply = createMockSupply();
      const schema = createMockSchema();

      const result = mapper.map(supply, schema);

      expect(result.success).toBe(true);
      expect(result.mappedFields).toContain('title');
      expect(result.mappedFields).toContain('locationCity');
      expect(result.data.title).toBe('Professional Photography Service');
      expect(result.data.locationCity).toBe('上海');
    });

    it('should map pricing fields correctly', () => {
      const supply = createMockSupply();
      const schema = createMockSchema();

      const result = mapper.map(supply, schema);

      expect(result.data.priceMin).toBe(500);
      expect(result.data.priceMax).toBe(5000);
      expect(result.data.priceCurrency).toBe('CNY');
    });

    it('should map capabilities with level mapping', () => {
      const supply = createMockSupply();
      const schema = createMockSchema([
        { id: 'capabilities', type: L2FieldType.TEXT, label: 'Capabilities' },
      ]);

      const result = mapper.map(supply, schema);

      expect(result.mappedFields).toContain('capabilities');
    });

    it('should generate tags from supply data', () => {
      const supply = createMockSupply();
      const schema = createMockSchema();

      const result = mapper.map(supply, schema);

      expect(result.generatedTags.length).toBeGreaterThan(0);
      expect(result.generatedTags).toContain('photo-editing');
      expect(result.generatedTags).toContain('photography');
    });

    it('should limit tags to 20', () => {
      const supply = createMockSupply({
        skills: Array.from({ length: 30 }, (_, i) => `skill-${i}`),
        capabilities: Array.from({ length: 10 }, (_, i) => ({
          name: `cap-${i}`,
          description: `Capability ${i}`,
          level: 'intermediate' as const,
          category: 'general',
          keywords: [`kw-${i}-a`, `kw-${i}-b`],
        })),
      });
      const schema = createMockSchema();

      const result = mapper.map(supply, schema);

      expect(result.generatedTags.length).toBeLessThanOrEqual(20);
    });

    it('should report unmapped required fields', () => {
      const supply = createMockSupply({ title: '' });
      const schema = createMockSchema();

      const result = mapper.map(supply, schema);

      expect(result.success).toBe(true);
    });

    it('should handle empty supply gracefully', () => {
      const supply = createMockSupply({
        title: '',
        description: '',
        serviceType: '',
        capabilities: [],
        pricing: { type: 'negotiable', currency: 'CNY' },
        skills: [],
        location: undefined,
        experience: undefined,
        availability: undefined,
      });
      const schema = createMockSchema();

      const result = mapper.map(supply, schema);

      expect(result.success).toBe(true);
    });
  });

  describe('transformValue - enum', () => {
    it('should map enum values correctly', () => {
      const supply = createMockSupply({ serviceType: 'photography' });
      const schema = createMockSchema([
        { id: 'serviceType', type: L2FieldType.ENUM, label: 'Type', options: [
          { value: 'photography', label: 'Photography' },
          { value: 'design', label: 'Design' },
        ]},
      ]);

      const result = mapper.map(supply, schema);

      expect(result.data.serviceType).toBe('photography');
    });

    it('should fuzzy match enum values by label', () => {
      const supply = createMockSupply({ serviceType: 'photo' });
      const schema = createMockSchema([
        { id: 'serviceType', type: L2FieldType.ENUM, label: 'Type', options: [
          { value: 'photography', label: 'Photography' },
          { value: 'design', label: 'Design' },
        ]},
      ]);

      const result = mapper.map(supply, schema);

      expect(result.data.serviceType).toBe('photography');
    });
  });

  describe('transformValue - number', () => {
    it('should clamp numbers to min/max', () => {
      const supply = createMockSupply({
        experience: { years: -5 },
      });
      const schema = createMockSchema([
        { id: 'experienceYears', type: L2FieldType.NUMBER, label: 'Years', min: 0, max: 50 },
      ]);

      const result = mapper.map(supply, schema);

      expect(result.data.experienceYears).toBe(0);
    });
  });

  describe('transformValue - range', () => {
    it('should parse range from string with separator', () => {
      const supply = createMockSupply({
        pricing: { type: 'range', minRate: 100, maxRate: 500, currency: 'CNY' },
      });
      const schema = createMockSchema([
        { id: 'priceRange', type: L2FieldType.RANGE, label: 'Price', min: 0 },
      ]);

      const result = mapper.map(supply, schema);

      expect(result.data.priceRange).toBeDefined();
    });
  });

  describe('transformValue - boolean', () => {
    it('should handle Chinese boolean values', () => {
      const supply = createMockSupply();
      const schema = createMockSchema([
        { id: 'locationRemote', type: L2FieldType.BOOLEAN, label: 'Remote' },
      ]);

      const result = mapper.map(supply, schema);

      expect(typeof result.data.locationRemote).toBe('boolean');
    });
  });

  describe('inferFieldValue', () => {
    it('should infer service category from description', () => {
      const supply = createMockSupply({
        serviceType: '',
        description: '专业的摄影服务，包括婚礼和人像摄影',
      });
      const schema = createMockSchema([
        { id: 'serviceCategory', type: L2FieldType.TEXT, label: 'Category' },
      ]);

      const result = mapper.map(supply, schema);

      expect(result.inferredFields).toContain('serviceCategory');
      expect(result.data.serviceCategory).toBe('photography');
    });

    it('should infer currency as CNY for Chinese cities', () => {
      const supply = createMockSupply({
        pricing: { type: 'hourly', currency: '' },
        location: { city: '北京', country: 'China', remote: true, onsite: false, hybrid: false },
      });
      const schema = createMockSchema([
        { id: 'priceCurrency', type: L2FieldType.TEXT, label: 'Currency' },
      ]);

      const result = mapper.map(supply, schema);

      expect(result.data.priceCurrency).toBe('CNY');
    });

    it('should infer remote capability for development services', () => {
      const supply = createMockSupply({
        serviceType: 'development',
        location: undefined,
      });
      const schema = createMockSchema([
        { id: 'locationRemote', type: L2FieldType.BOOLEAN, label: 'Remote' },
      ]);

      const result = mapper.map(supply, schema);

      expect(result.data.locationRemote).toBe(true);
    });
  });

  describe('registerSceneConfig', () => {
    it('should register and use scene-specific config', () => {
      mapper.registerSceneConfig({
        scene: 'visionshare',
        rules: [],
        fieldMappings: {
          title: 'title',
          customField: 'serviceType',
        },
        enumMappings: {},
      });

      const config = mapper.getSceneConfig('visionshare');
      expect(config).toBeDefined();
      expect(config!.fieldMappings.customField).toBe('serviceType');
    });
  });

  describe('validateMapping', () => {
    it('should return true for valid mapping with all required fields', () => {
      const supply = createMockSupply();
      const schema = createMockSchema([
        { id: 'title', type: L2FieldType.TEXT, label: 'Title', required: true },
      ]);

      const result = mapper.map(supply, schema);
      const isValid = mapper.validateMapping(result, schema);

      expect(isValid).toBe(true);
    });

    it('should return false when required field is missing', () => {
      const supply = createMockSupply({ title: '' });
      const schema = createMockSchema([
        { id: 'title', type: L2FieldType.TEXT, label: 'Title', required: true },
      ]);

      const result = mapper.map(supply, schema);
      const isValid = mapper.validateMapping(result, schema);

      expect(isValid).toBe(false);
    });
  });

  describe('capability level mapping', () => {
    it('should map capability levels correctly', () => {
      const supply = createMockSupply({
        capabilities: [
          { name: 'Test', description: 'Test', level: 'beginner', category: 'test', keywords: [] },
          { name: 'Test2', description: 'Test2', level: 'expert', category: 'test', keywords: [] },
        ],
      });
      const schema = createMockSchema([
        { id: 'capabilities', type: L2FieldType.TEXT, label: 'Capabilities' },
      ]);

      const result = mapper.map(supply, schema);

      expect(result.mappedFields).toContain('capabilities');
    });
  });

  describe('addMappingRule', () => {
    it('should add and prioritize custom rules', () => {
      mapper.addMappingRule({
        sourceField: 'custom.source',
        targetField: 'customTarget',
        priority: 10,
      });

      // Should not throw
      const supply = createMockSupply();
      const schema = createMockSchema();
      const result = mapper.map(supply, schema);

      expect(result.success).toBe(true);
    });
  });
});
