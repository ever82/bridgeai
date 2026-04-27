/**
 * Tests for Attribute Filter Service (server-side)
 */

import { AgeRange, Gender, EducationLevel } from '@bridgeai/shared';

import {
  filterAgents,
  validateFilterFields,
  buildSimpleFilter,
  buildEnumFilter,
  buildRangeFilter,
  buildBooleanFilter,
  buildTagsFilter,
  buildAndFilter,
  buildOrFilter,
  buildNotFilter,
  AgentFilterableData,
} from '../attributeFilterService';

// ============================================
// Test data
// ============================================

const testAgents: AgentFilterableData[] = [
  {
    agentId: 'agent-1',
    sceneId: 'agentdate',
    l1: {
      age: AgeRange.AGE_26_30,
      gender: Gender.FEMALE,
      location: { city: 'Beijing', province: 'Beijing' },
      education: EducationLevel.BACHELOR,
      occupation: 'Designer',
    },
    l2: {
      datingPurpose: 'serious_relationship',
      interests: ['music', 'hiking', 'photography'],
      personalityTraits: ['introverted', 'creative'],
    },
  },
  {
    agentId: 'agent-2',
    sceneId: 'agentdate',
    l1: {
      age: AgeRange.AGE_31_35,
      gender: Gender.MALE,
      location: { city: 'Shanghai', province: 'Shanghai' },
      education: EducationLevel.MASTER,
      occupation: 'Engineer',
    },
    l2: {
      datingPurpose: 'casual_dating',
      interests: ['sports', 'gaming', 'travel'],
      personalityTraits: ['extroverted', 'adventurous'],
    },
  },
  {
    agentId: 'agent-3',
    sceneId: 'agentdate',
    l1: {
      age: AgeRange.AGE_26_30,
      gender: Gender.MALE,
      location: { city: 'Beijing', province: 'Beijing' },
      education: EducationLevel.DOCTORATE,
      occupation: 'Researcher',
    },
    l2: {
      datingPurpose: 'serious_relationship',
      interests: ['reading', 'music', 'cooking'],
      personalityTraits: ['introverted', 'analytical'],
    },
  },
  {
    agentId: 'agent-4',
    sceneId: 'agentjob',
    l1: {
      age: AgeRange.AGE_36_40,
      gender: Gender.FEMALE,
      location: { city: 'Shenzhen', province: 'Guangdong' },
      education: EducationLevel.MASTER,
      occupation: 'Product Manager',
    },
    l2: {
      jobType: 'full_time',
      expectedSalary: { min: 30000, max: 50000 },
      skills: ['product', 'agile', 'data analysis'],
      workExperience: { min: 8, max: 12 },
    },
  },
];

// ============================================
// filterAgents
// ============================================

describe('filterAgents', () => {
  it('filters by single enum condition', () => {
    const result = filterAgents(testAgents, {
      field: 'l1.gender',
      operator: 'eq',
      value: Gender.FEMALE,
    });
    expect(result.matched).toHaveLength(2);
    expect(result.matched.map(a => a.agentId)).toEqual(['agent-1', 'agent-4']);
  });

  it('filters by in condition (enum matching)', () => {
    const result = filterAgents(testAgents, {
      field: 'l1.age',
      operator: 'in',
      value: [AgeRange.AGE_26_30, AgeRange.AGE_31_35],
    });
    expect(result.matched).toHaveLength(3);
    expect(result.matched.map(a => a.agentId)).toEqual(['agent-1', 'agent-2', 'agent-3']);
  });

  it('filters by tags overlap (in)', () => {
    const result = filterAgents(testAgents, {
      field: 'l2.interests',
      operator: 'in',
      value: ['music'],
    });
    expect(result.matched).toHaveLength(2);
    expect(result.matched.map(a => a.agentId)).toEqual(['agent-1', 'agent-3']);
  });

  it('filters by text contains', () => {
    const result = filterAgents(testAgents, {
      field: 'l1.location.city',
      operator: 'contains',
      value: 'Bei',
    });
    expect(result.matched).toHaveLength(2);
  });

  it('filters by AND combination', () => {
    const result = filterAgents(testAgents, {
      and: [
        { field: 'l1.location.city', operator: 'eq', value: 'Beijing' },
        { field: 'l1.gender', operator: 'eq', value: Gender.MALE },
      ],
    });
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].agentId).toBe('agent-3');
  });

  it('filters by OR combination', () => {
    const result = filterAgents(testAgents, {
      or: [
        { field: 'l1.gender', operator: 'eq', value: Gender.FEMALE },
        { field: 'l2.datingPurpose', operator: 'eq', value: 'serious_relationship' },
      ],
    });
    expect(result.matched).toHaveLength(3); // agent-1 (F + serious), agent-3 (serious), agent-4 (F)
  });

  it('filters by NOT condition', () => {
    const result = filterAgents(testAgents, {
      not: { field: 'l1.gender', operator: 'eq', value: Gender.MALE },
    });
    expect(result.matched).toHaveLength(2);
    expect(result.matched.map(a => a.agentId)).toEqual(['agent-1', 'agent-4']);
  });

  it('filters by range overlap', () => {
    const result = filterAgents(
      testAgents,
      { field: 'l2.expectedSalary', operator: 'gte', value: 25000 },
      { sceneId: 'agentjob' }
    );
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].agentId).toBe('agent-4');
  });

  it('complex nested filter', () => {
    // Beijing + (female OR serious_relationship)
    const result = filterAgents(testAgents, {
      and: [
        { field: 'l1.location.city', operator: 'eq', value: 'Beijing' },
        {
          or: [
            { field: 'l1.gender', operator: 'eq', value: Gender.FEMALE },
            { field: 'l2.datingPurpose', operator: 'eq', value: 'serious_relationship' },
          ],
        },
      ],
    });
    expect(result.matched).toHaveLength(2);
    expect(result.matched.map(a => a.agentId)).toEqual(['agent-1', 'agent-3']);
  });

  it('applies limit', () => {
    const result = filterAgents(
      testAgents,
      { field: 'l1.gender', operator: 'eq', value: Gender.MALE },
      { limit: 1 }
    );
    expect(result.matched).toHaveLength(1);
    expect(result.matchCount).toBe(2); // total matches
  });

  it('applies offset', () => {
    const result = filterAgents(
      testAgents,
      { field: 'l1.gender', operator: 'eq', value: Gender.MALE },
      { offset: 1 }
    );
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].agentId).toBe('agent-3');
  });

  it('handles empty agents array', () => {
    const result = filterAgents([], { field: 'l1.age', operator: 'exists', value: true });
    expect(result.matched).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

// ============================================
// validateFilterFields
// ============================================

describe('validateFilterFields', () => {
  it('returns empty for valid fields', () => {
    const invalid = validateFilterFields(
      { field: 'l1.age', operator: 'eq', value: AgeRange.AGE_26_30 },
      'agentdate'
    );
    expect(invalid).toEqual([]);
  });

  it('detects invalid field paths', () => {
    const invalid = validateFilterFields(
      { field: 'l1.nonexistent', operator: 'eq', value: 'test' },
      'agentdate'
    );
    expect(invalid).toEqual(['l1.nonexistent']);
  });

  it('validates fields in AND expression', () => {
    const invalid = validateFilterFields(
      {
        and: [
          { field: 'l1.age', operator: 'eq', value: AgeRange.AGE_26_30 },
          { field: 'l1.invalid', operator: 'eq', value: 'x' },
        ],
      },
      'agentdate'
    );
    expect(invalid).toEqual(['l1.invalid']);
  });
});

// ============================================
// Builder functions
// ============================================

describe('Builder functions', () => {
  it('buildSimpleFilter creates AND of eq conditions', () => {
    const expr = buildSimpleFilter([
      { field: 'l1.age', value: AgeRange.AGE_26_30 },
      { field: 'l1.gender', value: Gender.FEMALE },
    ]);
    expect(expr).toEqual({
      and: [
        { field: 'l1.age', operator: 'eq', value: AgeRange.AGE_26_30 },
        { field: 'l1.gender', operator: 'eq', value: Gender.FEMALE },
      ],
    });
  });

  it('buildSimpleFilter with single condition returns condition', () => {
    const expr = buildSimpleFilter([{ field: 'l1.age', value: AgeRange.AGE_26_30 }]);
    expect(expr).toEqual({ field: 'l1.age', operator: 'eq', value: AgeRange.AGE_26_30 });
  });

  it('buildEnumFilter creates in condition', () => {
    const cond = buildEnumFilter('l1.age', [AgeRange.AGE_26_30, AgeRange.AGE_31_35]);
    expect(cond).toEqual({
      field: 'l1.age',
      operator: 'in',
      value: [AgeRange.AGE_26_30, AgeRange.AGE_31_35],
    });
  });

  it('buildRangeFilter creates gte+lte conditions', () => {
    const expr = buildRangeFilter('l2.salary', 10000, 30000);
    expect(expr).toEqual({
      and: [
        { field: 'l2.salary', operator: 'gte', value: 10000 },
        { field: 'l2.salary', operator: 'lte', value: 30000 },
      ],
    });
  });

  it('buildRangeFilter with only min', () => {
    const expr = buildRangeFilter('l2.salary', 10000);
    expect(expr).toEqual({ field: 'l2.salary', operator: 'gte', value: 10000 });
  });

  it('buildBooleanFilter creates eq condition', () => {
    expect(buildBooleanFilter('l2.isVerified', true)).toEqual({
      field: 'l2.isVerified',
      operator: 'eq',
      value: true,
    });
  });

  it('buildTagsFilter creates in condition', () => {
    expect(buildTagsFilter('l2.interests', ['music', 'hiking'])).toEqual({
      field: 'l2.interests',
      operator: 'in',
      value: ['music', 'hiking'],
    });
  });

  it('buildNotFilter creates NOT wrapper', () => {
    const inner = { field: 'l1.age', operator: 'eq', value: AgeRange.UNDER_18 };
    expect(buildNotFilter(inner)).toEqual({ not: inner });
  });

  it('buildAndFilter combines expressions', () => {
    const a = { field: 'a', operator: 'eq' as const, value: 1 };
    const b = { field: 'b', operator: 'eq' as const, value: 2 };
    expect(buildAndFilter(a, b)).toEqual({ and: [a, b] });
  });

  it('buildOrFilter combines expressions', () => {
    const a = { field: 'a', operator: 'eq' as const, value: 1 };
    const b = { field: 'b', operator: 'eq' as const, value: 2 };
    expect(buildOrFilter(a, b)).toEqual({ or: [a, b] });
  });

  it('builders integrate with filterAgents', () => {
    const filter = buildAndFilter(
      buildEnumFilter('l1.age', [AgeRange.AGE_26_30]),
      buildTagsFilter('l2.interests', ['music'])
    );
    const result = filterAgents(testAgents, filter);
    expect(result.matched).toHaveLength(2);
    expect(result.matched.map(a => a.agentId)).toEqual(['agent-1', 'agent-3']);
  });
});
