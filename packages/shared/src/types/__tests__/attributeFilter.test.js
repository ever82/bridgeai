"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const attributeFilter_1 = require("../attributeFilter");
const agentProfile_1 = require("../agentProfile");
// ============================================
// getPathValue
// ============================================
describe('getPathValue', () => {
    it('extracts top-level value', () => {
        expect((0, attributeFilter_1.getPathValue)({ name: 'Alice' }, 'name')).toBe('Alice');
    });
    it('extracts nested value', () => {
        const obj = { l1: { age: agentProfile_1.AgeRange.AGE_26_30, gender: agentProfile_1.Gender.FEMALE } };
        expect((0, attributeFilter_1.getPathValue)(obj, 'l1.age')).toBe(agentProfile_1.AgeRange.AGE_26_30);
    });
    it('extracts deeply nested value', () => {
        const obj = { l1: { location: { city: 'Shanghai' } } };
        expect((0, attributeFilter_1.getPathValue)(obj, 'l1.location.city')).toBe('Shanghai');
    });
    it('returns undefined for missing path', () => {
        expect((0, attributeFilter_1.getPathValue)({ l1: {} }, 'l1.age')).toBeUndefined();
    });
    it('returns undefined for null intermediate', () => {
        expect((0, attributeFilter_1.getPathValue)({ l1: null }, 'l1.age')).toBeUndefined();
    });
});
// ============================================
// evaluateCondition
// ============================================
describe('evaluateCondition', () => {
    const data = {
        l1: {
            age: agentProfile_1.AgeRange.AGE_26_30,
            gender: agentProfile_1.Gender.FEMALE,
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
        expect((0, attributeFilter_1.evaluateCondition)(data, { field: 'l1.gender', operator: 'eq', value: agentProfile_1.Gender.FEMALE })).toBe(true);
    });
    it('eq: rejects unequal value', () => {
        expect((0, attributeFilter_1.evaluateCondition)(data, { field: 'l1.gender', operator: 'eq', value: agentProfile_1.Gender.MALE })).toBe(false);
    });
    // ne
    it('ne: matches unequal value', () => {
        expect((0, attributeFilter_1.evaluateCondition)(data, { field: 'l1.gender', operator: 'ne', value: agentProfile_1.Gender.MALE })).toBe(true);
    });
    it('ne: rejects equal value', () => {
        expect((0, attributeFilter_1.evaluateCondition)(data, { field: 'l1.gender', operator: 'ne', value: agentProfile_1.Gender.FEMALE })).toBe(false);
    });
    // in - enum
    it('in: matches when value in array', () => {
        expect((0, attributeFilter_1.evaluateCondition)(data, {
            field: 'l1.gender',
            operator: 'in',
            value: [agentProfile_1.Gender.FEMALE, agentProfile_1.Gender.OTHER],
        })).toBe(true);
    });
    it('in: rejects when value not in array', () => {
        expect((0, attributeFilter_1.evaluateCondition)(data, { field: 'l1.gender', operator: 'in', value: [agentProfile_1.Gender.MALE] })).toBe(false);
    });
    // in - tags (overlap)
    it('in: detects overlap for array values', () => {
        expect((0, attributeFilter_1.evaluateCondition)(data, { field: 'l2.interests', operator: 'in', value: ['music', 'sports'] })).toBe(true);
    });
    it('in: rejects when no overlap', () => {
        expect((0, attributeFilter_1.evaluateCondition)(data, {
            field: 'l2.interests',
            operator: 'in',
            value: ['sports', 'cooking'],
        })).toBe(false);
    });
    // nin - tags
    it('nin: passes when no excluded values present', () => {
        expect((0, attributeFilter_1.evaluateCondition)(data, {
            field: 'l2.interests',
            operator: 'nin',
            value: ['sports', 'cooking'],
        })).toBe(true);
    });
    it('nin: fails when excluded value present', () => {
        expect((0, attributeFilter_1.evaluateCondition)(data, {
            field: 'l2.interests',
            operator: 'nin',
            value: ['music', 'sports'],
        })).toBe(false);
    });
    // contains
    it('contains: matches substring', () => {
        expect((0, attributeFilter_1.evaluateCondition)(data, { field: 'l1.occupation', operator: 'contains', value: 'engine' })).toBe(true);
    });
    it('contains: case insensitive', () => {
        expect((0, attributeFilter_1.evaluateCondition)(data, { field: 'l2.description', operator: 'contains', value: 'software' })).toBe(true);
    });
    // boolean
    it('eq: matches boolean value', () => {
        expect((0, attributeFilter_1.evaluateCondition)(data, { field: 'l2.isVerified', operator: 'eq', value: true })).toBe(true);
        expect((0, attributeFilter_1.evaluateCondition)(data, { field: 'l2.isVerified', operator: 'eq', value: false })).toBe(false);
    });
    // exists
    it('exists: true when field present', () => {
        expect((0, attributeFilter_1.evaluateCondition)(data, { field: 'l1.age', operator: 'exists', value: true })).toBe(true);
    });
    it('exists: false when field absent', () => {
        expect((0, attributeFilter_1.evaluateCondition)(data, { field: 'l1.nonExistent', operator: 'exists', value: true })).toBe(false);
    });
    // gt/lt/gte/lte
    it('numeric comparisons work', () => {
        expect((0, attributeFilter_1.evaluateCondition)({ score: 10 }, { field: 'score', operator: 'gt', value: 5 })).toBe(true);
        expect((0, attributeFilter_1.evaluateCondition)({ score: 10 }, { field: 'score', operator: 'gt', value: 15 })).toBe(false);
        expect((0, attributeFilter_1.evaluateCondition)({ score: 10 }, { field: 'score', operator: 'gte', value: 10 })).toBe(true);
        expect((0, attributeFilter_1.evaluateCondition)({ score: 10 }, { field: 'score', operator: 'lt', value: 15 })).toBe(true);
        expect((0, attributeFilter_1.evaluateCondition)({ score: 10 }, { field: 'score', operator: 'lte', value: 10 })).toBe(true);
    });
    // startsWith / endsWith
    it('startsWith: matches prefix', () => {
        expect((0, attributeFilter_1.evaluateCondition)(data, { field: 'l1.occupation', operator: 'startsWith', value: 'eng' })).toBe(true);
    });
    it('endsWith: matches suffix', () => {
        expect((0, attributeFilter_1.evaluateCondition)(data, { field: 'l1.occupation', operator: 'endsWith', value: 'neer' })).toBe(true);
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
        expect((0, attributeFilter_1.evaluateRangeOverlap)(data, 'l2.salary', [
            { field: 'l2.salary', operator: 'gte', value: 20000 },
        ])).toBe(true);
    });
    it('non-overlapping range fails gte', () => {
        expect((0, attributeFilter_1.evaluateRangeOverlap)(data, 'l2.salary', [
            { field: 'l2.salary', operator: 'gte', value: 35000 },
        ])).toBe(false);
    });
    it('overlapping range passes lte', () => {
        expect((0, attributeFilter_1.evaluateRangeOverlap)(data, 'l2.salary', [
            { field: 'l2.salary', operator: 'lte', value: 20000 },
        ])).toBe(true);
    });
    it('combined gte+lte within range', () => {
        expect((0, attributeFilter_1.evaluateRangeOverlap)(data, 'l2.salary', [
            { field: 'l2.salary', operator: 'gte', value: 15000 },
            { field: 'l2.salary', operator: 'lte', value: 30000 },
        ])).toBe(true);
    });
    it('eq inside range passes', () => {
        expect((0, attributeFilter_1.evaluateRangeOverlap)(data, 'l2.salary', [
            { field: 'l2.salary', operator: 'eq', value: 20000 },
        ])).toBe(true);
    });
    it('eq outside range fails', () => {
        expect((0, attributeFilter_1.evaluateRangeOverlap)(data, 'l2.salary', [
            { field: 'l2.salary', operator: 'eq', value: 35000 },
        ])).toBe(false);
    });
    it('returns false for missing range data', () => {
        expect((0, attributeFilter_1.evaluateRangeOverlap)({ l2: {} }, 'l2.salary', [
            { field: 'l2.salary', operator: 'gte', value: 10000 },
        ])).toBe(false);
    });
});
// ============================================
// evaluateExpression (AND / OR / NOT)
// ============================================
describe('evaluateExpression', () => {
    const data = {
        l1: { age: agentProfile_1.AgeRange.AGE_26_30, gender: agentProfile_1.Gender.FEMALE },
        l2: { interests: ['music', 'hiking'] },
    };
    it('AND: all conditions must match', () => {
        const expr = {
            and: [
                { field: 'l1.gender', operator: 'eq', value: agentProfile_1.Gender.FEMALE },
                { field: 'l1.age', operator: 'in', value: [agentProfile_1.AgeRange.AGE_26_30, agentProfile_1.AgeRange.AGE_31_35] },
            ],
        };
        expect((0, attributeFilter_1.evaluateExpression)(data, expr)).toBe(true);
    });
    it('AND: fails if any condition fails', () => {
        const expr = {
            and: [
                { field: 'l1.gender', operator: 'eq', value: agentProfile_1.Gender.FEMALE },
                { field: 'l1.age', operator: 'eq', value: agentProfile_1.AgeRange.UNDER_18 },
            ],
        };
        expect((0, attributeFilter_1.evaluateExpression)(data, expr)).toBe(false);
    });
    it('OR: passes if any condition matches', () => {
        const expr = {
            or: [
                { field: 'l1.gender', operator: 'eq', value: agentProfile_1.Gender.MALE },
                { field: 'l1.age', operator: 'eq', value: agentProfile_1.AgeRange.AGE_26_30 },
            ],
        };
        expect((0, attributeFilter_1.evaluateExpression)(data, expr)).toBe(true);
    });
    it('OR: fails if no condition matches', () => {
        const expr = {
            or: [
                { field: 'l1.gender', operator: 'eq', value: agentProfile_1.Gender.MALE },
                { field: 'l1.age', operator: 'eq', value: agentProfile_1.AgeRange.UNDER_18 },
            ],
        };
        expect((0, attributeFilter_1.evaluateExpression)(data, expr)).toBe(false);
    });
    it('NOT: inverts result', () => {
        const expr = {
            not: { field: 'l1.gender', operator: 'eq', value: agentProfile_1.Gender.MALE },
        };
        expect((0, attributeFilter_1.evaluateExpression)(data, expr)).toBe(true);
    });
    it('nested AND/OR/NOT', () => {
        const expr = {
            and: [
                { field: 'l1.gender', operator: 'eq', value: agentProfile_1.Gender.FEMALE },
                {
                    or: [
                        { field: 'l1.age', operator: 'eq', value: agentProfile_1.AgeRange.AGE_18_25 },
                        { field: 'l2.interests', operator: 'in', value: ['music'] },
                    ],
                },
                {
                    not: { field: 'l1.age', operator: 'eq', value: agentProfile_1.AgeRange.UNDER_18 },
                },
            ],
        };
        expect((0, attributeFilter_1.evaluateExpression)(data, expr)).toBe(true);
    });
});
// ============================================
// filterItems
// ============================================
describe('filterItems', () => {
    const agents = [
        {
            agentId: '1',
            l1: { age: agentProfile_1.AgeRange.AGE_26_30, gender: agentProfile_1.Gender.FEMALE, location: { city: 'Beijing' } },
        },
        {
            agentId: '2',
            l1: { age: agentProfile_1.AgeRange.AGE_31_35, gender: agentProfile_1.Gender.MALE, location: { city: 'Shanghai' } },
        },
        {
            agentId: '3',
            l1: { age: agentProfile_1.AgeRange.AGE_18_25, gender: agentProfile_1.Gender.FEMALE, location: { city: 'Beijing' } },
        },
        {
            agentId: '4',
            l1: { age: agentProfile_1.AgeRange.OVER_60, gender: agentProfile_1.Gender.OTHER, location: { city: 'Guangzhou' } },
        },
    ];
    it('filters by single condition', () => {
        const result = (0, attributeFilter_1.filterItems)(agents, {
            field: 'l1.gender',
            operator: 'eq',
            value: agentProfile_1.Gender.FEMALE,
        });
        expect(result.matched).toHaveLength(2);
        expect(result.matched.map(a => a.agentId)).toEqual(['1', '3']);
        expect(result.total).toBe(4);
    });
    it('filters by OR condition', () => {
        const result = (0, attributeFilter_1.filterItems)(agents, {
            or: [
                { field: 'l1.location.city', operator: 'eq', value: 'Beijing' },
                { field: 'l1.location.city', operator: 'eq', value: 'Shanghai' },
            ],
        });
        expect(result.matched).toHaveLength(3);
        expect(result.matchCount).toBe(3);
    });
    it('filters by AND condition', () => {
        const result = (0, attributeFilter_1.filterItems)(agents, {
            and: [
                { field: 'l1.gender', operator: 'eq', value: agentProfile_1.Gender.FEMALE },
                { field: 'l1.location.city', operator: 'eq', value: 'Beijing' },
            ],
        });
        expect(result.matched).toHaveLength(2);
    });
    it('filters by NOT condition', () => {
        const result = (0, attributeFilter_1.filterItems)(agents, {
            not: { field: 'l1.gender', operator: 'eq', value: agentProfile_1.Gender.MALE },
        });
        expect(result.matched).toHaveLength(3);
        expect(result.unmatched).toHaveLength(1);
        expect(result.unmatched[0].agentId).toBe('2');
    });
    it('returns empty matched for no matches', () => {
        const result = (0, attributeFilter_1.filterItems)(agents, {
            field: 'l1.location.city',
            operator: 'eq',
            value: 'Shenzhen',
        });
        expect(result.matched).toHaveLength(0);
        expect(result.unmatched).toHaveLength(4);
    });
    it('handles FilterDSL with pagination', () => {
        const result = (0, attributeFilter_1.filterItems)(agents, {
            where: { field: 'l1.gender', operator: 'eq', value: agentProfile_1.Gender.FEMALE },
        });
        expect(result.matched).toHaveLength(2);
    });
    it('handles empty items array', () => {
        const result = (0, attributeFilter_1.filterItems)([], { field: 'l1.age', operator: 'exists', value: true });
        expect(result.matched).toHaveLength(0);
        expect(result.total).toBe(0);
    });
});
// ============================================
// getOperatorsForType
// ============================================
describe('getOperatorsForType', () => {
    it('returns operators for enum type', () => {
        expect((0, attributeFilter_1.getOperatorsForType)('enum')).toEqual(['eq', 'ne', 'in', 'nin']);
    });
    it('returns operators for range type', () => {
        expect((0, attributeFilter_1.getOperatorsForType)('range')).toEqual(['gte', 'lte', 'gt', 'lt', 'eq']);
    });
    it('returns operators for boolean type', () => {
        expect((0, attributeFilter_1.getOperatorsForType)('boolean')).toEqual(['eq']);
    });
    it('returns operators for tags type', () => {
        expect((0, attributeFilter_1.getOperatorsForType)('tags')).toEqual(['in', 'nin', 'eq']);
    });
});
// ============================================
// Scene filter schemas
// ============================================
describe('Scene filter schemas', () => {
    it('returns schema for agentdate', () => {
        const schema = (0, attributeFilter_1.getSceneFilterSchema)('agentdate');
        expect(schema).toBeDefined();
        expect(schema.sceneId).toBe('agentdate');
        expect(schema.fields.length).toBeGreaterThan(0);
    });
    it('returns schema for agentjob', () => {
        const schema = (0, attributeFilter_1.getSceneFilterSchema)('agentjob');
        expect(schema).toBeDefined();
        expect(schema.fields.some(f => f.id === 'expectedSalary')).toBe(true);
        expect(schema.fields.some(f => f.id === 'skills')).toBe(true);
    });
    it('returns schema for visionshare', () => {
        const schema = (0, attributeFilter_1.getSceneFilterSchema)('visionshare');
        expect(schema).toBeDefined();
        expect(schema.fields.some(f => f.id === 'contentType')).toBe(true);
    });
    it('returns schema for agentad', () => {
        const schema = (0, attributeFilter_1.getSceneFilterSchema)('agentad');
        expect(schema).toBeDefined();
        expect(schema.fields.some(f => f.id === 'adType')).toBe(true);
    });
    it('getAllSceneFilterSchemas returns all 4', () => {
        const all = (0, attributeFilter_1.getAllSceneFilterSchemas)();
        expect(all).toHaveLength(4);
        const ids = all.map(s => s.sceneId).sort();
        expect(ids).toEqual(['agentad', 'agentdate', 'agentjob', 'visionshare']);
    });
});
//# sourceMappingURL=attributeFilter.test.js.map