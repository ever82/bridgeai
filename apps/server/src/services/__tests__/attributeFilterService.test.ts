/**
 * Tests for Attribute Filter Service (server-side)
 */

import { SceneId } from '@bridgeai/shared';

import {
  validateAttributeFilter,
  filterAgentsByAttributes,
  visionShareFilterBuilder,
  agentDateFilterBuilder,
  agentJobFilterBuilder,
  agentAdFilterBuilder,
  calculateTagOverlap,
  matchesAttributeFilter,
  AttributeFilterOptions,
} from '../attributeFilterService';

// ============================================
// Test data
// ============================================

const mockAgentProfile = {
  l1Data: {
    age: 'AGE_26_30',
    gender: 'FEMALE',
    location: { city: 'Beijing', province: 'Beijing' },
    education: 'BACHELOR',
    occupation: 'Designer',
    interests: ['music', 'hiking', 'photography'],
    personalityTraits: ['introverted', 'creative'],
    datingPurpose: 'serious_relationship',
    expectedSalary: { min: 30000, max: 50000 },
    skills: ['product', 'agile', 'data analysis'],
    workExperience: { min: 8, max: 12 },
    jobType: 'full_time',
    contentType: 'photography',
    purpose: 'showcase',
    style: 'modern',
    priceRange: { min: 100, max: 500 },
    adType: 'product',
    productCategory: 'electronics',
    budgetRange: { min: 10000, max: 50000 },
    hasChildren: false,
  },
};

// ============================================
// validateAttributeFilter
// ============================================

describe('validateAttributeFilter', () => {
  it('returns valid for correct agentdate filters', () => {
    const result = validateAttributeFilter('agentdate', {
      age: { include: ['AGE_26_30'] },
      gender: { include: ['FEMALE'] },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects invalid field names', () => {
    const result = validateAttributeFilter('agentdate', {
      nonexistent: { include: ['value'] },
    } as any);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      {
        field: 'nonexistent',
        message: 'Field "nonexistent" is not filterable for scene "agentdate"',
      },
    ]);
  });

  it('detects invalid enum values', () => {
    const result = validateAttributeFilter('agentdate', {
      gender: { include: ['INVALID_GENDER'] },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      { field: 'gender', message: 'Invalid enum value "INVALID_GENDER" for field "gender"' },
    ]);
  });

  it('detects min > max in range filter', () => {
    const result = validateAttributeFilter('agentdate', {
      incomeRange: { min: 50000, max: 10000 },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      { field: 'incomeRange', message: 'min cannot be greater than max for field "incomeRange"' },
    ]);
  });

  it('detects empty tags array', () => {
    const result = validateAttributeFilter('agentdate', {
      interests: { tags: [] },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      { field: 'interests', message: 'tags must be a non-empty array for field "interests"' },
    ]);
  });

  it('detects invalid minOverlap value', () => {
    const result = validateAttributeFilter('agentdate', {
      interests: { tags: ['music'], minOverlap: 1.5 },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      { field: 'interests', message: 'minOverlap must be between 0 and 1 for field "interests"' },
    ]);
  });

  it('returns valid for correct agentjob filters', () => {
    const result = validateAttributeFilter('agentjob', {
      jobType: { include: ['full_time'] },
      expectedSalary: { min: 10000, max: 50000 },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid for correct visionshare filters', () => {
    const result = validateAttributeFilter('visionshare', {
      contentType: { include: ['photography'] },
      priceRange: { min: 100, max: 500 },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid for correct agentad filters', () => {
    const result = validateAttributeFilter('agentad', {
      adType: { include: ['product'] },
      budgetRange: { min: 10000, max: 50000 },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('ignores undefined/null values', () => {
    const result = validateAttributeFilter('agentdate', {
      age: undefined,
      gender: null,
    } as any);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ============================================
// filterAgentsByAttributes
// ============================================

describe('filterAgentsByAttributes', () => {
  // Note: filterAgentsByAttributes is an async function that queries Prisma.
  // We test its validation logic and structure here.

  it('throws on invalid filters', async () => {
    await expect(
      filterAgentsByAttributes({
        sceneId: 'agentdate' as SceneId,
        filters: { nonexistent: { include: ['x'] } } as any,
      })
    ).rejects.toThrow('Invalid attribute filters');
  });

  it('accepts valid filter options', async () => {
    // Since this hits the database, we just verify the function accepts valid options
    // and would attempt a DB query (which may fail due to no DB connection in tests)
    const options: AttributeFilterOptions = {
      sceneId: 'agentdate',
      filters: {
        age: { include: ['AGE_26_30'] },
      },
      combinationMode: 'and',
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    // We verify the options structure is valid by checking validateAttributeFilter
    const validation = validateAttributeFilter(options.sceneId, options.filters);
    expect(validation.valid).toBe(true);
  });

  it('accepts OR combination mode', async () => {
    const options: AttributeFilterOptions = {
      sceneId: 'agentjob',
      filters: {
        jobType: { include: ['full_time'] },
        education: { include: ['BACHELOR'] },
      },
      combinationMode: 'or',
    };
    const validation = validateAttributeFilter(options.sceneId, options.filters);
    expect(validation.valid).toBe(true);
  });

  it('accepts additionalWhere clause', async () => {
    const options: AttributeFilterOptions = {
      sceneId: 'agentdate',
      filters: {
        gender: { include: ['FEMALE'] },
      },
      additionalWhere: { status: 'active' },
    };
    const validation = validateAttributeFilter(options.sceneId, options.filters);
    expect(validation.valid).toBe(true);
  });
});

// ============================================
// Convenience Builders
// ============================================

describe('visionShareFilterBuilder', () => {
  it('builds a complete VisionShare filter', () => {
    const filter = visionShareFilterBuilder()
      .contentType(['photography', 'video'], ['3d'])
      .purpose(['showcase'])
      .style(['modern', 'minimalist'])
      .priceRange(100, 500)
      .skillsOverlap(['photoshop', 'lightroom'], 0.7)
      .build();

    expect(filter).toEqual({
      contentType: { include: ['photography', 'video'], exclude: ['3d'] },
      purpose: { include: ['showcase'] },
      style: { include: ['modern', 'minimalist'] },
      priceRange: { min: 100, max: 500 },
      skillsOverlap: { tags: ['photoshop', 'lightroom'], minOverlap: 0.7 },
    });
  });

  it('builds a minimal VisionShare filter', () => {
    const filter = visionShareFilterBuilder().contentType(['photography']).build();

    expect(filter).toEqual({
      contentType: { include: ['photography'] },
    });
  });
});

describe('agentDateFilterBuilder', () => {
  it('builds a complete AgentDate filter', () => {
    const filter = agentDateFilterBuilder()
      .ageRange(25, 35)
      .gender(['FEMALE'], ['MALE'])
      .maritalStatus(['single'])
      .hasChildren(false)
      .incomeRange(10000, 50000)
      .education(['BACHELOR', 'MASTER'])
      .interestsOverlap(['music', 'hiking'], 0.5)
      .build();

    expect(filter).toEqual({
      ageRange: { min: 25, max: 35 },
      gender: { include: ['FEMALE'], exclude: ['MALE'] },
      maritalStatus: { include: ['single'] },
      hasChildren: false,
      incomeRange: { min: 10000, max: 50000 },
      education: { include: ['BACHELOR', 'MASTER'] },
      interestsOverlap: { tags: ['music', 'hiking'], minOverlap: 0.5 },
    });
  });

  it('builds a minimal AgentDate filter', () => {
    const filter = agentDateFilterBuilder().gender(['FEMALE']).build();

    expect(filter).toEqual({
      gender: { include: ['FEMALE'] },
    });
  });
});

describe('agentJobFilterBuilder', () => {
  it('builds a complete AgentJob filter', () => {
    const filter = agentJobFilterBuilder()
      .jobType(['full_time', 'contract'])
      .jobCategory(['technology'])
      .expectedSalary(20000, 50000)
      .workLocation(['remote', 'hybrid'])
      .skillsOverlap(['javascript', 'typescript'], 0.8)
      .education(['BACHELOR', 'MASTER'])
      .build();

    expect(filter).toEqual({
      jobType: { include: ['full_time', 'contract'] },
      jobCategory: { include: ['technology'] },
      expectedSalary: { min: 20000, max: 50000 },
      workLocation: { include: ['remote', 'hybrid'] },
      skillsOverlap: { tags: ['javascript', 'typescript'], minOverlap: 0.8 },
      education: { include: ['BACHELOR', 'MASTER'] },
    });
  });

  it('builds a minimal AgentJob filter', () => {
    const filter = agentJobFilterBuilder().jobType(['full_time']).build();

    expect(filter).toEqual({
      jobType: { include: ['full_time'] },
    });
  });
});

describe('agentAdFilterBuilder', () => {
  it('builds a complete AgentAd filter', () => {
    const filter = agentAdFilterBuilder()
      .adType(['product', 'service'])
      .productCategory(['electronics', 'fashion'])
      .budgetRange(10000, 100000)
      .keyFeaturesOverlap(['innovative', 'affordable'], 0.6)
      .build();

    expect(filter).toEqual({
      adType: { include: ['product', 'service'] },
      productCategory: { include: ['electronics', 'fashion'] },
      budgetRange: { min: 10000, max: 100000 },
      keyFeaturesOverlap: { tags: ['innovative', 'affordable'], minOverlap: 0.6 },
    });
  });

  it('builds a minimal AgentAd filter', () => {
    const filter = agentAdFilterBuilder().adType(['product']).build();

    expect(filter).toEqual({
      adType: { include: ['product'] },
    });
  });
});

// ============================================
// calculateTagOverlap
// ============================================

describe('calculateTagOverlap', () => {
  it('calculates full overlap', () => {
    expect(calculateTagOverlap(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(1);
  });

  it('calculates partial overlap', () => {
    expect(calculateTagOverlap(['a', 'b', 'c'], ['a', 'd'])).toBe(1 / 3);
  });

  it('returns 0 for no overlap', () => {
    expect(calculateTagOverlap(['a', 'b'], ['c', 'd'])).toBe(0);
  });

  it('returns 0 when first array is empty', () => {
    expect(calculateTagOverlap([], ['a', 'b'])).toBe(0);
  });

  it('returns 0 when second array is empty', () => {
    expect(calculateTagOverlap(['a', 'b'], [])).toBe(0);
  });

  it('calculates overlap with duplicates in second array', () => {
    expect(calculateTagOverlap(['a', 'b'], ['a', 'a', 'b'])).toBe(1);
  });
});

// ============================================
// matchesAttributeFilter
// ============================================

describe('matchesAttributeFilter', () => {
  it('matches enum include filter', () => {
    const result = matchesAttributeFilter(
      mockAgentProfile,
      { gender: { include: ['FEMALE'] } },
      'agentdate'
    );
    expect(result).toBe(true);
  });

  it('fails enum include filter when value not in list', () => {
    const result = matchesAttributeFilter(
      mockAgentProfile,
      { gender: { include: ['MALE'] } },
      'agentdate'
    );
    expect(result).toBe(false);
  });

  it('fails enum exclude filter when value is excluded', () => {
    const result = matchesAttributeFilter(
      mockAgentProfile,
      { gender: { exclude: ['FEMALE'] } },
      'agentdate'
    );
    expect(result).toBe(false);
  });

  it('matches enum exclude filter when value is not excluded', () => {
    const result = matchesAttributeFilter(
      mockAgentProfile,
      { gender: { exclude: ['MALE'] } },
      'agentdate'
    );
    expect(result).toBe(true);
  });

  it('matches range filter within bounds', () => {
    const result = matchesAttributeFilter(
      mockAgentProfile,
      { priceRange: { min: 50, max: 600 } },
      'visionshare'
    );
    expect(result).toBe(true);
  });

  it('fails range filter when value below min', () => {
    const result = matchesAttributeFilter(
      mockAgentProfile,
      { priceRange: { min: 600 } },
      'visionshare'
    );
    expect(result).toBe(false);
  });

  it('fails range filter when value above max', () => {
    const result = matchesAttributeFilter(
      mockAgentProfile,
      { priceRange: { max: 50 } },
      'visionshare'
    );
    expect(result).toBe(false);
  });

  it('matches tags overlap filter with sufficient overlap', () => {
    const result = matchesAttributeFilter(
      mockAgentProfile,
      { interests: { tags: ['music', 'hiking'], minOverlap: 0.5 } },
      'agentdate'
    );
    expect(result).toBe(true);
  });

  it('fails tags overlap filter with insufficient overlap', () => {
    const result = matchesAttributeFilter(
      mockAgentProfile,
      { interests: { tags: ['music', 'sports', 'gaming', 'reading'], minOverlap: 0.5 } },
      'agentdate'
    );
    expect(result).toBe(false);
  });

  it('uses default minOverlap of 0.5 for tags', () => {
    const result = matchesAttributeFilter(
      mockAgentProfile,
      { interests: { tags: ['music', 'hiking'] } },
      'agentdate'
    );
    expect(result).toBe(true);
  });

  it('matches boolean filter', () => {
    const result = matchesAttributeFilter(mockAgentProfile, { hasChildren: false }, 'agentdate');
    expect(result).toBe(true);
  });

  it('fails boolean filter when value differs', () => {
    const result = matchesAttributeFilter(mockAgentProfile, { hasChildren: true }, 'agentdate');
    expect(result).toBe(false);
  });

  it('ignores undefined/null filter values', () => {
    const result = matchesAttributeFilter(
      mockAgentProfile,
      { gender: undefined, age: null } as any,
      'agentdate'
    );
    expect(result).toBe(true);
  });

  it('handles missing profile value gracefully for tags', () => {
    const result = matchesAttributeFilter(
      { l1Data: {} },
      { interests: { tags: ['music'] } },
      'agentdate'
    );
    expect(result).toBe(true); // missing array value is skipped
  });

  it('handles missing profile value gracefully for range', () => {
    const result = matchesAttributeFilter(
      { l1Data: {} },
      { priceRange: { min: 100 } },
      'visionshare'
    );
    expect(result).toBe(true); // missing numeric value is skipped
  });

  it('handles multiple filter conditions (all must match)', () => {
    const result = matchesAttributeFilter(
      mockAgentProfile,
      {
        gender: { include: ['FEMALE'] },
        education: { include: ['BACHELOR'] },
      },
      'agentdate'
    );
    expect(result).toBe(true);
  });

  it('fails when any of multiple conditions fails', () => {
    const result = matchesAttributeFilter(
      mockAgentProfile,
      {
        gender: { include: ['FEMALE'] },
        education: { include: ['MASTER'] },
      },
      'agentdate'
    );
    expect(result).toBe(false);
  });
});
