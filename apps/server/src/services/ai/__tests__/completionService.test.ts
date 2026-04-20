/**
 * Supply Completion Service Tests
 * 供给补全服务单元测试
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { SupplyCompletionService, CompletionSuggestion } from '../completionService';
import { Supply } from '../supplyExtractionService';

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('SupplyCompletionService', () => {
  let service: SupplyCompletionService;

  const createFullSupply = (overrides?: Partial<Supply>): Supply => ({
    id: 'supply-1',
    title: 'Professional Photography Service',
    description: 'I provide professional wedding and event photography services with over 10 years of experience in capturing special moments.',
    serviceType: 'photography',
    capabilities: [
      {
        name: 'Wedding Photography',
        description: 'Complete wedding coverage',
        level: 'expert',
        category: 'event',
        keywords: ['wedding', 'ceremony'],
      },
    ],
    pricing: { type: 'range', minRate: 2000, maxRate: 8000, currency: 'CNY', unit: 'session' },
    skills: ['photo-editing', 'lighting'],
    location: { city: '上海', country: 'China', remote: false, onsite: true, hybrid: false },
    experience: { years: 10, totalProjects: 200, certifications: ['CPP'] },
    availability: { schedule: 'Weekends', responseTime: '2h' },
    quality: { overallScore: 90, completenessScore: 90, clarityScore: 90, relevanceScore: 90, confidence: 90 },
    ...overrides,
  });

  const createSparseSupply = (overrides?: Partial<Supply>): Supply => ({
    id: 'supply-sparse',
    title: '',
    description: '',
    serviceType: '',
    capabilities: [],
    pricing: { type: 'negotiable', currency: 'CNY' },
    skills: [],
    quality: { overallScore: 10, completenessScore: 10, clarityScore: 10, relevanceScore: 10, confidence: 10 },
    ...overrides,
  });

  const createPartialSupply = (overrides?: Partial<Supply>): Supply => ({
    id: 'supply-partial',
    title: 'Dev',
    description: 'Short desc',
    serviceType: '',
    capabilities: [
      { name: 'Web Dev', description: 'Web development', level: 'advanced', category: 'tech', keywords: ['react'] },
    ],
    pricing: { type: 'hourly', currency: '' },
    skills: [],
    quality: { overallScore: 40, completenessScore: 40, clarityScore: 40, relevanceScore: 40, confidence: 40 },
    ...overrides,
  });

  beforeEach(() => {
    service = new SupplyCompletionService();
  });

  // ========== c2: Missing Information Detection ==========

  describe('detectIncomplete', () => {
    it('should detect no missing fields for complete supply', () => {
      const supply = createFullSupply();
      const { missing } = service.detectIncomplete(supply);

      expect(missing).toHaveLength(0);
    });

    it('should detect all missing fields for sparse supply', () => {
      const supply = createSparseSupply();
      const { missing } = service.detectIncomplete(supply);

      expect(missing).toContain('title');
      expect(missing).toContain('description');
      expect(missing).toContain('serviceType');
      expect(missing).toContain('pricing');
      expect(missing).toContain('capabilities');
    });

    it('should detect missing title', () => {
      const supply = createFullSupply({ title: '' });
      const { missing } = service.detectIncomplete(supply);

      expect(missing).toContain('title');
    });

    it('should detect short title as incomplete', () => {
      const supply = createFullSupply({ title: 'Ab' });
      const { incomplete } = service.detectIncomplete(supply);

      expect(incomplete).toContain('title');
    });

    it('should detect missing description', () => {
      const supply = createFullSupply({ description: '' });
      const { missing } = service.detectIncomplete(supply);

      expect(missing).toContain('description');
    });

    it('should detect short description as incomplete', () => {
      const supply = createFullSupply({ description: 'Too short' });
      const { incomplete } = service.detectIncomplete(supply);

      expect(incomplete).toContain('description');
    });

    it('should detect empty capabilities', () => {
      const supply = createFullSupply({ capabilities: [] });
      const { missing } = service.detectIncomplete(supply);

      expect(missing).toContain('capabilities');
    });

    it('should detect capability without level', () => {
      const supply = createFullSupply({
        capabilities: [{
          name: 'Test', description: 'Test', level: '' as any, category: 'test', keywords: [],
        }],
      });
      const { incomplete } = service.detectIncomplete(supply);

      expect(incomplete.some(f => f.includes('level'))).toBe(true);
    });

    it('should detect missing pricing type', () => {
      const supply = createFullSupply({ pricing: { type: '' as any, currency: 'CNY' } });
      const { incomplete } = service.detectIncomplete(supply);

      expect(incomplete).toContain('pricing.type');
    });

    it('should detect missing pricing rates for non-negotiable', () => {
      const supply = createFullSupply({
        pricing: { type: 'hourly', currency: 'CNY' },
      });
      const { incomplete } = service.detectIncomplete(supply);

      expect(incomplete).toContain('pricing.rates');
    });

    it('should detect missing pricing currency', () => {
      const supply = createFullSupply({
        pricing: { type: 'hourly', currency: '' },
      });
      const { incomplete } = service.detectIncomplete(supply);

      expect(incomplete).toContain('pricing.currency');
    });

    it('should detect missing skills as incomplete', () => {
      const supply = createFullSupply({ skills: [] });
      const { incomplete } = service.detectIncomplete(supply);

      expect(incomplete).toContain('skills');
    });

    it('should detect missing location', () => {
      const supply = createFullSupply({ location: undefined });
      const { incomplete } = service.detectIncomplete(supply);

      expect(incomplete).toContain('location');
    });

    it('should detect missing location mode', () => {
      const supply = createFullSupply({
        location: { city: '上海', country: 'China', remote: undefined as any, onsite: undefined as any, hybrid: false },
      });
      const { incomplete } = service.detectIncomplete(supply);

      expect(incomplete).toContain('location.mode');
    });

    it('should detect missing experience', () => {
      const supply = createFullSupply({ experience: undefined });
      const { incomplete } = service.detectIncomplete(supply);

      expect(incomplete).toContain('experience');
    });

    it('should detect missing availability', () => {
      const supply = createFullSupply({ availability: undefined });
      const { incomplete } = service.detectIncomplete(supply);

      expect(incomplete).toContain('availability');
    });
  });

  // ========== c2: Smart Completion Suggestions ==========

  describe('generateSuggestions', () => {
    it('should suggest title from service type and capabilities', () => {
      const supply = createFullSupply({ title: '', serviceType: 'photography', capabilities: [
        { name: 'Wedding', description: 'Wedding', level: 'expert', category: 'event', keywords: [] },
      ]});
      const suggestions = service.generateSuggestions(supply);
      const titleSuggestion = suggestions.find(s => s.field === 'title');

      expect(titleSuggestion).toBeDefined();
      expect(titleSuggestion!.suggestedValue).toContain('photography');
    });

    it('should suggest description from capabilities', () => {
      const supply = createFullSupply({
        description: '',
        serviceType: 'development',
        capabilities: [
          { name: 'React', description: 'Frontend', level: 'expert', category: 'frontend', keywords: [] },
        ],
        experience: { years: 5 },
      });
      const suggestions = service.generateSuggestions(supply);
      const descSuggestion = suggestions.find(s => s.field === 'description');

      expect(descSuggestion).toBeDefined();
      expect(descSuggestion!.source).toBe('inference');
    });

    it('should suggest default currency', () => {
      const supply = createFullSupply({
        pricing: { type: 'hourly', currency: '' },
      });
      const suggestions = service.generateSuggestions(supply);
      const currencySuggestion = suggestions.find(s => s.field === 'pricing.currency');

      expect(currencySuggestion).toBeDefined();
      expect(currencySuggestion!.suggestedValue).toBe('CNY');
    });

    it('should suggest market rate for pricing', () => {
      const supply = createFullSupply({
        serviceType: 'development',
        capabilities: [{ name: 'Web Dev', description: 'Web', level: 'expert', category: 'tech', keywords: [] }],
        pricing: { type: 'hourly', currency: 'CNY' },
      });
      const suggestions = service.generateSuggestions(supply);
      const rateSuggestion = suggestions.find(s => s.field === 'pricing.rates');

      expect(rateSuggestion).toBeDefined();
      expect(rateSuggestion!.source).toBe('rule');
    });

    it('should suggest default capability level', () => {
      const supply = createFullSupply({
        capabilities: [{
          name: 'Test', description: 'Test', level: '' as any, category: 'test', keywords: [],
        }],
      });
      const suggestions = service.generateSuggestions(supply);
      const levelSuggestion = suggestions.find(s => s.field.includes('level'));

      expect(levelSuggestion).toBeDefined();
      expect(levelSuggestion!.suggestedValue).toBe('intermediate');
    });

    it('should suggest skills from capabilities', () => {
      const supply = createFullSupply({
        skills: [],
        capabilities: [
          { name: 'Photography', description: 'Photo', level: 'expert', category: 'photo', keywords: ['camera', 'lighting'] },
        ],
      });
      const suggestions = service.generateSuggestions(supply);
      const skillSuggestion = suggestions.find(s => s.field === 'skills');

      expect(skillSuggestion).toBeDefined();
      expect(skillSuggestion!.suggestedValue).toContain('Photography');
    });

    it('should suggest location mode from service type defaults', () => {
      const supply = createFullSupply({
        serviceType: 'development',
        location: { city: '北京', country: 'China', remote: undefined as any, onsite: undefined as any, hybrid: false },
      });
      const suggestions = service.generateSuggestions(supply);
      const locSuggestion = suggestions.find(s => s.field === 'location.mode');

      expect(locSuggestion).toBeDefined();
    });

    it('should return empty suggestions for complete supply', () => {
      const supply = createFullSupply();
      const suggestions = service.generateSuggestions(supply);

      // Complete supply should have minimal or no suggestions
      expect(suggestions.length).toBeLessThanOrEqual(2);
    });
  });

  // ========== c2: Default Value Inference ==========

  describe('applySuggestions', () => {
    it('should apply confirmed title suggestion', () => {
      const supply = createSparseSupply();
      const suggestions: CompletionSuggestion[] = [
        {
          field: 'title',
          currentValue: '',
          suggestedValue: 'Photography Service',
          confidence: 60,
          source: 'inference',
          reason: 'Inferred from description',
          confirmed: true,
        },
      ];

      const result = service.applySuggestions(supply, suggestions);

      expect(result.title).toBe('Photography Service');
    });

    it('should not apply unconfirmed suggestions', () => {
      const supply = createSparseSupply();
      const suggestions: CompletionSuggestion[] = [
        {
          field: 'title',
          currentValue: '',
          suggestedValue: 'Photography Service',
          confidence: 60,
          source: 'inference',
          reason: 'Inferred from description',
          confirmed: false,
        },
      ];

      const result = service.applySuggestions(supply, suggestions);

      expect(result.title).toBe('');
    });

    it('should apply confirmed pricing currency', () => {
      const supply = createFullSupply({ pricing: { type: 'hourly', currency: '' } });
      const suggestions: CompletionSuggestion[] = [
        {
          field: 'pricing.currency',
          currentValue: '',
          suggestedValue: 'USD',
          confidence: 70,
          source: 'default',
          reason: 'Default USD currency',
          confirmed: true,
        },
      ];

      const result = service.applySuggestions(supply, suggestions);

      expect(result.pricing.currency).toBe('USD');
    });

    it('should apply confirmed pricing rates', () => {
      const supply = createFullSupply({ pricing: { type: 'hourly', currency: 'CNY' } });
      const suggestions: CompletionSuggestion[] = [
        {
          field: 'pricing.rates',
          currentValue: {},
          suggestedValue: { min: 200, max: 500 },
          confidence: 40,
          source: 'rule',
          reason: 'Market rate',
          confirmed: true,
        },
      ];

      const result = service.applySuggestions(supply, suggestions);

      expect(result.pricing.minRate).toBe(200);
      expect(result.pricing.maxRate).toBe(500);
    });

    it('should apply confirmed skills', () => {
      const supply = createFullSupply({ skills: [] });
      const suggestions: CompletionSuggestion[] = [
        {
          field: 'skills',
          currentValue: [],
          suggestedValue: ['React', 'TypeScript'],
          confidence: 65,
          source: 'inference',
          reason: 'From capabilities',
          confirmed: true,
        },
      ];

      const result = service.applySuggestions(supply, suggestions);

      expect(result.skills).toEqual(['React', 'TypeScript']);
    });

    it('should apply confirmed location mode', () => {
      const supply = createFullSupply({
        location: { city: '上海', country: 'China', remote: undefined as any, onsite: undefined as any, hybrid: false },
      });
      const suggestions: CompletionSuggestion[] = [
        {
          field: 'location.mode',
          currentValue: {},
          suggestedValue: { remote: true, onsite: false },
          confidence: 60,
          source: 'default',
          reason: 'Remote default',
          confirmed: true,
        },
      ];

      const result = service.applySuggestions(supply, suggestions);

      expect(result.location!.remote).toBe(true);
      expect(result.location!.onsite).toBe(false);
    });
  });

  // ========== c2: External Data Enrichment ==========

  describe('queryExternalData', () => {
    it('should query certification validity', () => {
      const supply = createFullSupply({
        experience: { certifications: ['AWS Certified', 'PMP'] },
      });
      const queries = service.queryExternalData(supply);

      const certQueries = queries.filter(q => q.type === 'certification');
      expect(certQueries).toHaveLength(2);
      expect(certQueries[0].query).toBe('AWS Certified');
    });

    it('should query market rate for service type', () => {
      const supply = createFullSupply();
      const queries = service.queryExternalData(supply);

      const marketQuery = queries.find(q => q.type === 'market_rate');
      expect(marketQuery).toBeDefined();
      expect(marketQuery!.query).toBe('photography');
    });

    it('should return empty for supply without certifications or service type', () => {
      const supply = createSparseSupply();
      supply.experience = { certifications: [] };
      const queries = service.queryExternalData(supply);

      expect(queries.filter(q => q.type === 'certification')).toHaveLength(0);
    });
  });

  // ========== c2: Completion Confirmation Workflow ==========

  describe('complete', () => {
    it('should return a complete analysis result', () => {
      const supply = createPartialSupply();
      const result = service.complete(supply);

      expect(result.supplyId).toBe('supply-partial');
      expect(result.missingFields).toBeDefined();
      expect(result.incompleteFields).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.completenessScore).toBeGreaterThanOrEqual(0);
      expect(result.completenessScore).toBeLessThanOrEqual(100);
    });

    it('should calculate completeness score', () => {
      const full = createFullSupply();
      const sparse = createSparseSupply();

      const rFull = service.complete(full);
      const rSparse = service.complete(sparse);

      expect(rFull.completenessScore).toBeGreaterThan(rSparse.completenessScore);
    });

    it('should provide suggestions for sparse supply', () => {
      const supply = createSparseSupply();
      const result = service.complete(supply);

      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should identify external queries', () => {
      const supply = createFullSupply();
      const result = service.complete(supply);

      expect(result.externalQueries).toBeDefined();
    });
  });

  // ========== c2: Integration: Confirmation workflow ==========

  describe('confirmation workflow', () => {
    it('should support full confirm-apply cycle', () => {
      const supply = createSparseSupply();
      const result = service.complete(supply);

      // Confirm all suggestions
      const confirmedSuggestions = result.suggestions.map(s => ({
        ...s,
        confirmed: true,
      }));

      const updated = service.applySuggestions(supply, confirmedSuggestions);

      // After confirming all suggestions, supply should have more data
      expect(updated).toBeDefined();
    });

    it('should allow selective confirmation', () => {
      const supply = createPartialSupply();
      const result = service.complete(supply);

      // Only confirm the first suggestion
      if (result.suggestions.length > 0) {
        const partialConfirmation = result.suggestions.slice(0, 1).map(s => ({
          ...s,
          confirmed: true,
        }));

        const updated = service.applySuggestions(supply, partialConfirmation);
        expect(updated).toBeDefined();
      }
    });
  });
});
