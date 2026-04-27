import {
  evaluateCondition,
  evaluateExpression,
  evaluateRangeOverlap,
  filterItems,
  getPathValue,
  getOperatorsForType,
  getSceneFilterSchema,
  getAllSceneFilterSchemas,
} from '../attributeFilter';
import { FilterExpression, AndFilter, OrFilter, NotFilter } from '../filter';
import { AgeRange, Gender } from '../agentProfile';

// ============================================
// getPathValue
// ============================================

describe('getPathValue', () => {
  it('extracts top-level value', () => {
    expect(getPathValue({ name: 'Alice' }, 'name')).toBe('Alice');
  });

  it('extracts nested value', () => {
    const obj = { l1: { age: AgeRange.AGE_26_30, gender: Gender.FEMALE } };
    expect(getPathValue(obj, 'l1.age')).toBe(AgeRange.AGE_26_30);
  });

  it('extracts deeply nested value', () => {
    const obj = { l1: { location: { city: 'Shanghai' } } };
    expect(getPathValue(obj, 'l1.location.city')).toBe('Shanghai');
  });

  it('returns undefined for missing path', () => {
    expect(getPathValue({ l1: {} }, 'l1.age')).toBeUndefined();
  });

  it('returns undefined for null intermediate', () => {
    expect(getPathValue({ l1: null }, 'l1.age')).toBeUndefined();
  });
});

// ============================================
// evaluateCondition
// ============================================

describe('evaluateCondition', () => {
  const data = {
    l1: {
      age: AgeRange.AGE_26_30,
      gender: Gender.FEMALE,
      location: { city: 'Beijing' },
      occupation: 'Engineer',
    },
    l2: {
      interests: ['music', 'hiking', 'photography'],
      salary: { min: 15000, max: 30000 },
      isVerified: true,
      description: 'Software Engineer',
    },
  };

  // eq
  it('eq: matches equal value', () => {
    expect(
      evaluateCondition(data, { field: 'l1.gender', operator: 'eq', value: Gender.FEMALE })
    ).toBe(true);
  });

  it('eq: rejects unequal value', () => {
    expect(
      evaluateCondition(data, { field: 'l1.gender', operator: 'eq', value: Gender.MALE })
    ).toBe(false);
  });

  // ne
  it('ne: matches unequal value', () => {
    expect(
      evaluateCondition(data, { field: 'l1.gender', operator: 'ne', value: Gender.MALE })
    ).toBe(true);
  });

  it('ne: rejects equal value', () => {
    expect(
      evaluateCondition(data, { field: 'l1.gender', operator: 'ne', value: Gender.FEMALE })
    ).toBe(false);
  });

  // in - enum
  it('in: matches when value in array', () => {
    expect(
      evaluateCondition(data, {
        field: 'l1.gender',
        operator: 'in',
        value: [Gender.FEMALE, Gender.OTHER],
      })
    ).toBe(true);
  });

  it('in: rejects when value not in array', () => {
    expect(
      evaluateCondition(data, { field: 'l1.gender', operator: 'in', value: [Gender.MALE] })
    ).toBe(false);
  });

  // in - tags (overlap)
  it('in: detects overlap for array values', () => {
    expect(
      evaluateCondition(data, { field: 'l2.interests', operator: 'in', value: ['music', 'sports'] })
    ).toBe(true);
  });

  it('in: rejects when no overlap', () => {
    expect(
      evaluateCondition(data, {
        field: 'l2.interests',
        operator: 'in',
        value: ['sports', 'cooking'],
      })
    ).toBe(false);
  });

  // nin - tags
  it('nin: passes when no excluded values present', () => {
    expect(
      evaluateCondition(data, {
        field: 'l2.interests',
        operator: 'nin',
        value: ['sports', 'cooking'],
      })
    ).toBe(true);
  });

  it('nin: fails when excluded value present', () => {
    expect(
      evaluateCondition(data, {
        field: 'l2.interests',
        operator: 'nin',
        value: ['music', 'sports'],
      })
    ).toBe(false);
  });

  // contains
  it('contains: matches substring', () => {
    expect(
      evaluateCondition(data, { field: 'l1.occupation', operator: 'contains', value: 'engine' })
    ).toBe(true);
  });

  it('contains: case insensitive', () => {
    expect(
      evaluateCondition(data, { field: 'l2.description', operator: 'contains', value: 'software' })
    ).toBe(true);
  });

  // boolean
  it('eq: matches boolean value', () => {
    expect(evaluateCondition(data, { field: 'l2.isVerified', operator: 'eq', value: true })).toBe(
      true
    );
    expect(evaluateCondition(data, { field: 'l2.isVerified', operator: 'eq', value: false })).toBe(
      false
    );
  });

  // exists
  it('exists: true when field present', () => {
    expect(evaluateCondition(data, { field: 'l1.age', operator: 'exists', value: true })).toBe(
      true
    );
  });

  it('exists: false when field absent', () => {
    expect(
      evaluateCondition(data, { field: 'l1.nonExistent', operator: 'exists', value: true })
    ).toBe(false);
  });

  // gt/lt/gte/lte
  it('numeric comparisons work', () => {
    expect(evaluateCondition({ score: 10 }, { field: 'score', operator: 'gt', value: 5 })).toBe(
      true
    );
    expect(evaluateCondition({ score: 10 }, { field: 'score', operator: 'gt', value: 15 })).toBe(
      false
    );
    expect(evaluateCondition({ score: 10 }, { field: 'score', operator: 'gte', value: 10 })).toBe(
      true
    );
    expect(evaluateCondition({ score: 10 }, { field: 'score', operator: 'lt', value: 15 })).toBe(
      true
    );
    expect(evaluateCondition({ score: 10 }, { field: 'score', operator: 'lte', value: 10 })).toBe(
      true
    );
  });

  // startsWith / endsWith
  it('startsWith: matches prefix', () => {
    expect(
      evaluateCondition(data, { field: 'l1.occupation', operator: 'startsWith', value: 'eng' })
    ).toBe(true);
  });

  it('endsWith: matches suffix', () => {
    expect(
      evaluateCondition(data, { field: 'l1.occupation', operator: 'endsWith', value: 'neer' })
    ).toBe(true);
  });
});

// ============================================
// evaluateRangeOverlap
// ============================================

describe('evaluateRangeOverlap', () => {
  const data = {
    l2: {
      salary: { min: 15000, max: 30000 },
      age: { min: 25, max: 35 },
    },
  };

  it('overlapping range passes gte', () => {
    expect(
      evaluateRangeOverlap(data, 'l2.salary', [
        { field: 'l2.salary', operator: 'gte', value: 20000 },
      ])
    ).toBe(true);
  });

  it('non-overlapping range fails gte', () => {
    expect(
      evaluateRangeOverlap(data, 'l2.salary', [
        { field: 'l2.salary', operator: 'gte', value: 35000 },
      ])
    ).toBe(false);
  });

  it('overlapping range passes lte', () => {
    expect(
      evaluateRangeOverlap(data, 'l2.salary', [
        { field: 'l2.salary', operator: 'lte', value: 20000 },
      ])
    ).toBe(true);
  });

  it('combined gte+lte within range', () => {
    expect(
      evaluateRangeOverlap(data, 'l2.salary', [
        { field: 'l2.salary', operator: 'gte', value: 15000 },
        { field: 'l2.salary', operator: 'lte', value: 30000 },
      ])
    ).toBe(true);
  });

  it('eq inside range passes', () => {
    expect(
      evaluateRangeOverlap(data, 'l2.salary', [
        { field: 'l2.salary', operator: 'eq', value: 20000 },
      ])
    ).toBe(true);
  });

  it('eq outside range fails', () => {
    expect(
      evaluateRangeOverlap(data, 'l2.salary', [
        { field: 'l2.salary', operator: 'eq', value: 35000 },
      ])
    ).toBe(false);
  });

  it('returns false for missing range data', () => {
    expect(
      evaluateRangeOverlap({ l2: {} }, 'l2.salary', [
        { field: 'l2.salary', operator: 'gte', value: 10000 },
      ])
    ).toBe(false);
  });
});

// ============================================
// evaluateExpression (AND / OR / NOT)
// ============================================

describe('evaluateExpression', () => {
  const data = {
    l1: { age: AgeRange.AGE_26_30, gender: Gender.FEMALE },
    l2: { interests: ['music', 'hiking'] },
  };

  it('AND: all conditions must match', () => {
    const expr: AndFilter = {
      and: [
        { field: 'l1.gender', operator: 'eq', value: Gender.FEMALE },
        { field: 'l1.age', operator: 'in', value: [AgeRange.AGE_26_30, AgeRange.AGE_31_35] },
      ],
    };
    expect(evaluateExpression(data, expr)).toBe(true);
  });

  it('AND: fails if any condition fails', () => {
    const expr: AndFilter = {
      and: [
        { field: 'l1.gender', operator: 'eq', value: Gender.FEMALE },
        { field: 'l1.age', operator: 'eq', value: AgeRange.UNDER_18 },
      ],
    };
    expect(evaluateExpression(data, expr)).toBe(false);
  });

  it('OR: passes if any condition matches', () => {
    const expr: OrFilter = {
      or: [
        { field: 'l1.gender', operator: 'eq', value: Gender.MALE },
        { field: 'l1.age', operator: 'eq', value: AgeRange.AGE_26_30 },
      ],
    };
    expect(evaluateExpression(data, expr)).toBe(true);
  });

  it('OR: fails if no condition matches', () => {
    const expr: OrFilter = {
      or: [
        { field: 'l1.gender', operator: 'eq', value: Gender.MALE },
        { field: 'l1.age', operator: 'eq', value: AgeRange.UNDER_18 },
      ],
    };
    expect(evaluateExpression(data, expr)).toBe(false);
  });

  it('NOT: inverts result', () => {
    const expr: NotFilter = {
      not: { field: 'l1.gender', operator: 'eq', value: Gender.MALE },
    };
    expect(evaluateExpression(data, expr)).toBe(true);
  });

  it('nested AND/OR/NOT', () => {
    const expr: FilterExpression = {
      and: [
        { field: 'l1.gender', operator: 'eq', value: Gender.FEMALE },
        {
          or: [
            { field: 'l1.age', operator: 'eq', value: AgeRange.AGE_18_25 },
            { field: 'l2.interests', operator: 'in', value: ['music'] },
          ],
        },
        {
          not: { field: 'l1.age', operator: 'eq', value: AgeRange.UNDER_18 },
        },
      ],
    };
    expect(evaluateExpression(data, expr)).toBe(true);
  });
});

// ============================================
// filterItems
// ============================================

describe('filterItems', () => {
  const agents = [
    {
      agentId: '1',
      l1: { age: AgeRange.AGE_26_30, gender: Gender.FEMALE, location: { city: 'Beijing' } },
    },
    {
      agentId: '2',
      l1: { age: AgeRange.AGE_31_35, gender: Gender.MALE, location: { city: 'Shanghai' } },
    },
    {
      agentId: '3',
      l1: { age: AgeRange.AGE_18_25, gender: Gender.FEMALE, location: { city: 'Beijing' } },
    },
    {
      agentId: '4',
      l1: { age: AgeRange.OVER_60, gender: Gender.OTHER, location: { city: 'Guangzhou' } },
    },
  ];

  it('filters by single condition', () => {
    const result = filterItems(agents, {
      field: 'l1.gender',
      operator: 'eq',
      value: Gender.FEMALE,
    });
    expect(result.matched).toHaveLength(2);
    expect(result.matched.map(a => a.agentId)).toEqual(['1', '3']);
    expect(result.total).toBe(4);
  });

  it('filters by OR condition', () => {
    const result = filterItems(agents, {
      or: [
        { field: 'l1.location.city', operator: 'eq', value: 'Beijing' },
        { field: 'l1.location.city', operator: 'eq', value: 'Shanghai' },
      ],
    });
    expect(result.matched).toHaveLength(3);
    expect(result.matchCount).toBe(3);
  });

  it('filters by AND condition', () => {
    const result = filterItems(agents, {
      and: [
        { field: 'l1.gender', operator: 'eq', value: Gender.FEMALE },
        { field: 'l1.location.city', operator: 'eq', value: 'Beijing' },
      ],
    });
    expect(result.matched).toHaveLength(2);
  });

  it('filters by NOT condition', () => {
    const result = filterItems(agents, {
      not: { field: 'l1.gender', operator: 'eq', value: Gender.MALE },
    });
    expect(result.matched).toHaveLength(3);
    expect(result.unmatched).toHaveLength(1);
    expect(result.unmatched[0].agentId).toBe('2');
  });

  it('returns empty matched for no matches', () => {
    const result = filterItems(agents, {
      field: 'l1.location.city',
      operator: 'eq',
      value: 'Shenzhen',
    });
    expect(result.matched).toHaveLength(0);
    expect(result.unmatched).toHaveLength(4);
  });

  it('handles FilterDSL with pagination', () => {
    const result = filterItems(agents, {
      where: { field: 'l1.gender', operator: 'eq', value: Gender.FEMALE },
    });
    expect(result.matched).toHaveLength(2);
  });

  it('handles empty items array', () => {
    const result = filterItems([], { field: 'l1.age', operator: 'exists', value: true });
    expect(result.matched).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

// ============================================
// getOperatorsForType
// ============================================

describe('getOperatorsForType', () => {
  it('returns operators for enum type', () => {
    expect(getOperatorsForType('enum')).toEqual(['eq', 'ne', 'in', 'nin']);
  });

  it('returns operators for range type', () => {
    expect(getOperatorsForType('range')).toEqual(['gte', 'lte', 'gt', 'lt', 'eq']);
  });

  it('returns operators for boolean type', () => {
    expect(getOperatorsForType('boolean')).toEqual(['eq']);
  });

  it('returns operators for tags type', () => {
    expect(getOperatorsForType('tags')).toEqual(['in', 'nin', 'eq']);
  });
});

// ============================================
// Scene filter schemas
// ============================================

describe('Scene filter schemas', () => {
  it('returns schema for agentdate', () => {
    const schema = getSceneFilterSchema('agentdate');
    expect(schema).toBeDefined();
    expect(schema!.sceneId).toBe('agentdate');
    expect(schema!.fields.length).toBeGreaterThan(0);
  });

  it('returns schema for agentjob', () => {
    const schema = getSceneFilterSchema('agentjob');
    expect(schema).toBeDefined();
    expect(schema!.fields.some(f => f.id === 'expectedSalary')).toBe(true);
    expect(schema!.fields.some(f => f.id === 'skills')).toBe(true);
  });

  it('returns schema for visionshare', () => {
    const schema = getSceneFilterSchema('visionshare');
    expect(schema).toBeDefined();
    expect(schema!.fields.some(f => f.id === 'contentType')).toBe(true);
  });

  it('returns schema for agentad', () => {
    const schema = getSceneFilterSchema('agentad');
    expect(schema).toBeDefined();
    expect(schema!.fields.some(f => f.id === 'adType')).toBe(true);
  });

  it('getAllSceneFilterSchemas returns all 4', () => {
    const all = getAllSceneFilterSchemas();
    expect(all).toHaveLength(4);
    const ids = all.map(s => s.sceneId).sort();
    expect(ids).toEqual(['agentad', 'agentdate', 'agentjob', 'visionshare']);
  });
});
