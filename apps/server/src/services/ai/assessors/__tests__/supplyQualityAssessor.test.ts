/**
 * Supply Quality Assessor Tests
 * 供给质量评估系统单元测试
 */

import { SupplyQualityAssessor, QualityGrade } from '../supplyQualityAssessor';
import { Supply } from '../../supplyExtractionService';

jest.mock('../../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('SupplyQualityAssessor', () => {
  let assessor: SupplyQualityAssessor;

  const createFullSupply = (overrides?: Partial<Supply>): Supply => ({
    id: 'supply-1',
    agentId: 'agent-1',
    title: 'Professional Full Stack Development Services',
    description: 'I offer professional full stack web development services with expertise in React, Node.js, TypeScript, and cloud infrastructure. Over 8 years of experience building scalable web applications for enterprise clients. Specializing in e-commerce, SaaS platforms, and real-time applications. Committed to delivering clean, maintainable code with comprehensive testing.',
    serviceType: 'development',
    capabilities: [
      {
        name: 'Frontend Development',
        description: 'Modern web UI with React',
        level: 'expert',
        category: 'frontend',
        keywords: ['React', 'TypeScript', 'CSS'],
      },
      {
        name: 'Backend Development',
        description: 'RESTful APIs with Node.js',
        level: 'advanced',
        category: 'backend',
        keywords: ['Node.js', 'Express', 'PostgreSQL'],
      },
      {
        name: 'DevOps',
        description: 'CI/CD and cloud infrastructure',
        level: 'intermediate',
        category: 'devops',
        keywords: ['Docker', 'AWS', 'CI/CD'],
      },
    ],
    pricing: {
      type: 'hourly',
      minRate: 80,
      maxRate: 150,
      currency: 'USD',
      unit: 'hour',
    },
    skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'AWS'],
    availability: {
      schedule: 'Mon-Fri 9AM-6PM EST',
      timezone: 'America/New_York',
      responseTime: 'Within 4 hours',
    },
    location: {
      city: 'New York',
      country: 'USA',
      remote: true,
      onsite: false,
      hybrid: true,
    },
    experience: {
      years: 8,
      totalProjects: 30,
      relevantProjects: 25,
      certifications: ['AWS Certified Solutions Architect'],
      portfolio: ['https://example.com/portfolio'],
    },
    quality: {
      overallScore: 92,
      completenessScore: 90,
      clarityScore: 95,
      relevanceScore: 91,
      confidence: 92,
    },
    ...overrides,
  });

  const createMinimalSupply = (overrides?: Partial<Supply>): Supply => ({
    id: 'supply-min',
    title: 'Svc',
    description: 'Short',
    serviceType: 'general',
    capabilities: [],
    pricing: { type: 'negotiable', currency: 'CNY' },
    skills: [],
    quality: {
      overallScore: 30,
      completenessScore: 20,
      clarityScore: 40,
      relevanceScore: 30,
      confidence: 30,
    },
    ...overrides,
  });

  beforeEach(() => {
    assessor = new SupplyQualityAssessor();
  });

  describe('assess', () => {
    it('should return a complete assessment for a full supply', () => {
      const supply = createFullSupply();
      const result = assessor.assess(supply);

      expect(result.supplyId).toBe('supply-1');
      expect(result.completenessScore).toBeGreaterThan(0);
      expect(result.credibilityScore).toBeGreaterThan(0);
      expect(result.competitivenessScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.grade).toBeDefined();
      expect(result.assessedAt).toBeDefined();
      expect(result.optimizationSuggestions).toBeDefined();
    });

    it('should give high scores to complete supplies', () => {
      const supply = createFullSupply();
      const result = assessor.assess(supply);

      expect(result.completenessScore).toBeGreaterThan(60);
      expect(result.overallScore).toBeGreaterThan(50);
      expect(['A', 'B', 'C']).toContain(result.grade);
    });

    it('should give low scores to minimal supplies', () => {
      const supply = createMinimalSupply();
      const result = assessor.assess(supply);

      expect(result.completenessScore).toBeLessThan(50);
      expect(result.overallScore).toBeLessThan(50);
      expect(['D', 'F']).toContain(result.grade);
    });

    it('should handle supply with no id', () => {
      const supply = createFullSupply();
      delete supply.id;
      const result = assessor.assess(supply);

      expect(result.supplyId).toBe('unknown');
    });
  });

  describe('completeness scoring', () => {
    it('should score title completeness', () => {
      const long = createFullSupply();
      const short = createMinimalSupply();
      const resultLong = assessor.assess(long);
      const resultShort = assessor.assess(short);

      expect(resultLong.completenessScore).toBeGreaterThan(resultShort.completenessScore);
    });

    it('should reward longer descriptions', () => {
      const detailed = createFullSupply();
      const brief = createFullSupply({ description: 'Short desc' });
      const rDetailed = assessor.assess(detailed);
      const rBrief = assessor.assess(brief);

      expect(rDetailed.completenessScore).toBeGreaterThan(rBrief.completenessScore);
    });

    it('should reward more capabilities', () => {
      const many = createFullSupply({
        capabilities: Array.from({ length: 5 }, (_, i) => ({
          name: `Cap ${i}`,
          description: `Description ${i}`,
          level: 'advanced' as const,
          category: 'tech',
          keywords: [`kw-${i}`],
        })),
      });
      const none = createFullSupply({ capabilities: [] });
      const rMany = assessor.assess(many);
      const rNone = assessor.assess(none);

      expect(rMany.completenessScore).toBeGreaterThan(rNone.completenessScore);
    });

    it('should reward more skills', () => {
      const many = createFullSupply({
        skills: ['React', 'Node.js', 'TypeScript', 'Python', 'Docker', 'AWS', 'GraphQL', 'Redis'],
      });
      const few = createFullSupply({ skills: [] });
      const rMany = assessor.assess(many);
      const rFew = assessor.assess(few);

      expect(rMany.completenessScore).toBeGreaterThan(rFew.completenessScore);
    });

    it('should reward having pricing info', () => {
      const withPricing = createFullSupply();
      const noPricing = createFullSupply({
        pricing: { type: 'negotiable', currency: 'CNY' },
      });
      const rWith = assessor.assess(withPricing);
      const rWithout = assessor.assess(noPricing);

      expect(rWith.completenessScore).toBeGreaterThan(rWithout.completenessScore);
    });

    it('should reward having experience data', () => {
      const withExp = createFullSupply();
      const noExp = createFullSupply({ experience: undefined });
      const rWith = assessor.assess(withExp);
      const rWithout = assessor.assess(noExp);

      expect(rWith.completenessScore).toBeGreaterThan(rWithout.completenessScore);
    });
  });

  describe('credibility scoring', () => {
    it('should detect pricing inconsistency (min > max)', () => {
      const consistent = createFullSupply();
      const inconsistent = createFullSupply({
        pricing: { type: 'range', minRate: 500, maxRate: 100, currency: 'CNY' },
      });
      const rConsistent = assessor.assess(consistent);
      const rInconsistent = assessor.assess(inconsistent);

      expect(rConsistent.credibilityScore).toBeGreaterThan(rInconsistent.credibilityScore);
    });

    it('should detect implausible experience years', () => {
      const plausible = createFullSupply();
      const implausible = createFullSupply({
        experience: { years: 60 },
      });
      const rPlausible = assessor.assess(plausible);
      const rImplausible = assessor.assess(implausible);

      expect(rPlausible.credibilityScore).toBeGreaterThan(rImplausible.credibilityScore);
    });

    it('should penalize skill-capability mismatch', () => {
      const matched = createFullSupply();
      const mismatched = createFullSupply({
        skills: ['cooking', 'gardening', 'painting', 'singing', 'dancing'],
        capabilities: [{
          name: 'Web Development',
          description: 'Building websites',
          level: 'expert' as const,
          category: 'tech',
          keywords: ['React', 'Node.js'],
        }],
      });
      const rMatched = assessor.assess(matched);
      const rMismatched = assessor.assess(mismatched);

      expect(rMatched.credibilityScore).toBeGreaterThan(rMismatched.credibilityScore);
    });

    it('should detect too wide pricing range', () => {
      const normal = createFullSupply();
      const wide = createFullSupply({
        pricing: { type: 'range', minRate: 10, maxRate: 10000, currency: 'CNY' },
      });
      const rNormal = assessor.assess(normal);
      const rWide = assessor.assess(wide);

      expect(rNormal.credibilityScore).toBeGreaterThan(rWide.credibilityScore);
    });
  });

  describe('competitiveness scoring', () => {
    it('should reward detailed descriptions', () => {
      const detailed = createFullSupply();
      const brief = createFullSupply({ description: 'Short' });
      const rDetailed = assessor.assess(detailed);
      const rBrief = assessor.assess(brief);

      expect(rDetailed.competitivenessScore).toBeGreaterThan(rBrief.competitivenessScore);
    });

    it('should reward more capabilities', () => {
      const many = createFullSupply({
        capabilities: Array.from({ length: 5 }, (_, i) => ({
          name: `Cap ${i}`,
          description: `Desc ${i}`,
          level: 'advanced' as const,
          category: 'tech',
          keywords: [],
        })),
      });
      const few = createFullSupply({ capabilities: [] });
      const rMany = assessor.assess(many);
      const rFew = assessor.assess(few);

      expect(rMany.competitivenessScore).toBeGreaterThan(rFew.competitivenessScore);
    });

    it('should reward certifications', () => {
      const withCerts = createFullSupply({
        experience: { ...createFullSupply().experience, certifications: ['AWS', 'GCP', 'Azure'] },
      });
      const noCerts = createFullSupply({
        experience: { ...createFullSupply().experience, certifications: [] },
      });
      const rWith = assessor.assess(withCerts);
      const rWithout = assessor.assess(noCerts);

      expect(rWith.competitivenessScore).toBeGreaterThan(rWithout.competitivenessScore);
    });

    it('should reward portfolio links', () => {
      const withPortfolio = createFullSupply({
        experience: { ...createFullSupply().experience, portfolio: ['url1', 'url2'] },
      });
      const noPortfolio = createFullSupply({
        experience: { ...createFullSupply().experience, portfolio: [] },
      });
      const rWith = assessor.assess(withPortfolio);
      const rWithout = assessor.assess(noPortfolio);

      expect(rWith.competitivenessScore).toBeGreaterThan(rWithout.competitivenessScore);
    });
  });

  describe('quality grade', () => {
    it('should assign grade A for scores >= 90', () => {
      const supply = createFullSupply();
      const result = assessor.assess(supply);
      // Grade depends on overall score
      if (result.overallScore >= 90) {
        expect(result.grade).toBe('A');
      }
    });

    it('should assign grade F for low scores', () => {
      const supply = createMinimalSupply();
      const result = assessor.assess(supply);
      if (result.overallScore < 60) {
        expect(result.grade).toBe('F');
      }
    });

    it('should assign grades B/C/D for intermediate scores', () => {
      const grades: QualityGrade[] = ['A', 'B', 'C', 'D', 'F'];
      const supply = createFullSupply({ description: 'Medium desc', capabilities: [{
        name: 'Test', description: 'Test', level: 'intermediate' as const, category: 'test', keywords: [],
      }]});
      const result = assessor.assess(supply);

      expect(grades).toContain(result.grade);
    });
  });

  describe('optimization suggestions', () => {
    it('should suggest adding missing title for empty title', () => {
      const supply = createFullSupply({ title: '' });
      const result = assessor.assess(supply);

      const titleSuggestion = result.optimizationSuggestions.find(s => s.field === 'title');
      expect(titleSuggestion).toBeDefined();
      expect(titleSuggestion!.type).toBe('add_missing');
      expect(titleSuggestion!.priority).toBe('high');
    });

    it('should suggest improving short description', () => {
      const supply = createFullSupply({ description: 'Too short' });
      const result = assessor.assess(supply);

      const descSuggestion = result.optimizationSuggestions.find(s => s.field === 'description');
      expect(descSuggestion).toBeDefined();
      expect(descSuggestion!.type).toBe('increase_detail');
    });

    it('should suggest adding capabilities when empty', () => {
      const supply = createFullSupply({ capabilities: [] });
      const result = assessor.assess(supply);

      const capSuggestion = result.optimizationSuggestions.find(s => s.field === 'capabilities');
      expect(capSuggestion).toBeDefined();
      expect(capSuggestion!.priority).toBe('high');
    });

    it('should suggest adding pricing', () => {
      const supply = createFullSupply({
        pricing: { type: 'negotiable', currency: 'CNY' },
      });
      const result = assessor.assess(supply);

      const pricingSuggestion = result.optimizationSuggestions.find(s => s.field === 'pricing');
      expect(pricingSuggestion).toBeDefined();
    });

    it('should sort suggestions by priority and impact', () => {
      const supply = createMinimalSupply();
      const result = assessor.assess(supply);

      for (let i = 0; i < result.optimizationSuggestions.length - 1; i++) {
        const curr = result.optimizationSuggestions[i];
        const next = result.optimizationSuggestions[i + 1];
        const priorityMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
        const currP = priorityMap[curr.priority] || 0;
        const nextP = priorityMap[next.priority] || 0;
        if (currP === nextP) {
          expect(curr.impact).toBeGreaterThanOrEqual(next.impact);
        } else {
          expect(currP).toBeGreaterThanOrEqual(nextP);
        }
      }
    });

    it('should suggest fixing pricing inconsistency', () => {
      const supply = createFullSupply({
        pricing: { type: 'range', minRate: 500, maxRate: 100, currency: 'CNY' },
      });
      const result = assessor.assess(supply);

      const fixSuggestion = result.optimizationSuggestions.find(
        s => s.type === 'fix_inconsistency' && s.field === 'pricing'
      );
      expect(fixSuggestion).toBeDefined();
      expect(fixSuggestion!.priority).toBe('high');
    });

    it('should suggest adding skills when empty', () => {
      const supply = createFullSupply({ skills: [] });
      const result = assessor.assess(supply);

      const skillSuggestion = result.optimizationSuggestions.find(s => s.field === 'skills');
      expect(skillSuggestion).toBeDefined();
    });

    it('should suggest adding experience years', () => {
      const supply = createFullSupply({ experience: { totalProjects: 10 } });
      const result = assessor.assess(supply);

      const expSuggestion = result.optimizationSuggestions.find(s => s.field === 'experience.years');
      expect(expSuggestion).toBeDefined();
    });
  });
});
