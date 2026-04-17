import type {
  DatingProfile,
  ProfileQualityResult,
  ProfileQualityMetrics,
  InterestPreferences,
} from '@bridgeai/shared';

/**
 * Calculate profile quality metrics
 */
export function calculateProfileQuality(profile: DatingProfile): ProfileQualityResult {
  const completenessMetrics = calculateCompletenessMetrics(profile);
  const richnessMetrics = calculateRichnessMetrics(profile);
  const matchPotentialMetrics = calculateMatchPotentialMetrics(profile);

  const overallScore = Math.round(
    completenessMetrics.score * 0.4 +
    richnessMetrics.score * 0.3 +
    matchPotentialMetrics.score * 0.3
  );

  const recommendations = generateRecommendations(profile, {
    completeness: completenessMetrics,
    richness: richnessMetrics,
    matchPotential: matchPotentialMetrics,
  });

  return {
    overallScore,
    metrics: {
      completenessScore: completenessMetrics.score,
      richnessScore: richnessMetrics.score,
      matchPotentialScore: matchPotentialMetrics.score,
      missingCriticalFields: completenessMetrics.missingCriticalFields,
      suggestions: richnessMetrics.suggestions,
    },
    recommendations,
  };
}

/**
 * Calculate completeness metrics
 */
function calculateCompletenessMetrics(profile: DatingProfile): {
  score: number;
  missingCriticalFields: string[];
} {
  const requiredSections = [
    { field: 'basicConditions', weight: 25, critical: true },
    { field: 'personality', weight: 15, critical: false },
    { field: 'interests', weight: 20, critical: true },
    { field: 'lifestyle', weight: 15, critical: false },
    { field: 'expectations', weight: 20, critical: true },
    { field: 'description', weight: 5, critical: false },
  ];

  let score = 0;
  const missingCriticalFields: string[] = [];

  requiredSections.forEach(section => {
    const value = (profile as any)[section.field];
    const isFilled = isSectionFilled(section.field, value);

    if (isFilled) {
      score += section.weight;
    } else if (section.critical) {
      missingCriticalFields.push(section.field);
    }
  });

  return { score, missingCriticalFields };
}

/**
 * Check if a section is filled
 */
function isSectionFilled(field: string, value: any): boolean {
  if (value === undefined || value === null) return false;

  switch (field) {
    case 'basicConditions':
      return value.ageRange || value.education || value.location;
    case 'personality':
      return value.mbti?.length > 0 || value.traits?.length > 0;
    case 'interests':
      return value.interests?.length > 0;
    case 'lifestyle':
      return value.sleepSchedule || value.smoking || value.drinking;
    case 'expectations':
      return value.purpose !== undefined;
    case 'description':
      return typeof value === 'string' && value.length >= 50;
    default:
      return false;
  }
}

/**
 * Calculate richness metrics
 */
function calculateRichnessMetrics(profile: DatingProfile): {
  score: number;
  suggestions: string[];
} {
  let score = 0;
  const suggestions: string[] = [];

  // Description richness
  if (profile.description) {
    const descLength = profile.description.length;
    if (descLength >= 200) {
      score += 30;
    } else if (descLength >= 100) {
      score += 20;
      suggestions.push('添加更多个人描述，至少200字可以提高匹配成功率');
    } else if (descLength >= 50) {
      score += 10;
      suggestions.push('个人描述较简短，建议详细描述自己的性格、爱好和期望');
    } else {
      suggestions.push('个人描述太短，建议至少写100字以上');
    }
  } else {
    suggestions.push('添加个人描述，让其他用户更好地了解你');
  }

  // Interests richness
  const interests = profile.interests?.interests || [];
  if (interests.length >= 5) {
    score += 25;
  } else if (interests.length >= 3) {
    score += 15;
    suggestions.push(`再添加${5 - interests.length}个兴趣爱好，达到5个以上更好`);
  } else if (interests.length > 0) {
    score += 5;
    suggestions.push('多添加几个兴趣爱好，至少3个以上');
  } else {
    suggestions.push('添加兴趣爱好，增加共同话题的机会');
  }

  // Personality details
  if (profile.personality?.mbti?.length > 0) {
    score += 15;
  } else {
    suggestions.push('添加MBTI性格类型，帮助找到性格匹配的对象');
  }

  if (profile.personality?.traits?.length > 0) {
    score += 15;
  } else {
    suggestions.push('描述你的性格特质，让他人了解你的性格');
  }

  // Lifestyle details
  if (profile.lifestyle) {
    const lifestyleFields = ['sleepSchedule', 'smoking', 'drinking', 'exercise', 'diet'];
    const filledCount = lifestyleFields.filter(f => (profile.lifestyle as any)?.[f]).length;
    score += Math.min(filledCount * 3, 15);

    if (filledCount < 3) {
      suggestions.push('完善生活方式信息，帮助找到生活习惯相似的对象');
    }
  }

  return { score, suggestions };
}

/**
 * Calculate match potential metrics
 */
function calculateMatchPotentialMetrics(profile: DatingProfile): {
  score: number;
} {
  let score = 50; // Base score

  // Has clear dating purpose
  if (profile.expectations?.purpose) {
    score += 15;
  }

  // Has location preference (local matching)
  if (profile.basicConditions?.location?.city) {
    score += 10;
  }

  // Has age preference
  if (profile.basicConditions?.ageRange) {
    score += 5;
  }

  // Has education preference
  if (profile.basicConditions?.education) {
    score += 5;
  }

  // Has photos preference
  if (profile.basicConditions?.hasPhoto) {
    score += 5;
  }

  // Verified profile preference
  if (profile.basicConditions?.isVerified) {
    score += 5;
  }

  // AI extraction confidence
  if (profile.aiExtractionConfidence) {
    score += Math.min(profile.aiExtractionConfidence * 5, 5);
  }

  return { score: Math.min(score, 100) };
}

/**
 * Generate recommendations for profile improvement
 */
function generateRecommendations(
  profile: DatingProfile,
  metrics: {
    completeness: { score: number; missingCriticalFields: string[] };
    richness: { score: number; suggestions: string[] };
    matchPotential: { score: number };
  }
): ProfileQualityResult['recommendations'] {
  const recommendations: ProfileQualityResult['recommendations'] = [];

  // Critical missing fields
  metrics.completeness.missingCriticalFields.forEach(field => {
    recommendations.push({
      field,
      priority: 'high',
      suggestion: getFieldSuggestion(field),
    });
  });

  // Richness suggestions
  if (metrics.completeness.score < 60) {
    recommendations.push({
      field: 'general',
      priority: 'high',
      suggestion: '完善基础信息，至少完成60%以上的资料填写',
    });
  }

  // Description suggestion
  if (!profile.description || profile.description.length < 100) {
    recommendations.push({
      field: 'description',
      priority: 'high',
      suggestion: '添加详细的个人介绍，描述你的性格、爱好、工作和交友期望',
    });
  }

  // Interests suggestion
  const interests = profile.interests?.interests || [];
  if (interests.length < 3) {
    recommendations.push({
      field: 'interests',
      priority: 'medium',
      suggestion: `添加${3 - interests.length}个或更多兴趣爱好，增加共同话题`,
    });
  }

  // Photos suggestion
  recommendations.push({
    field: 'photos',
    priority: 'medium',
    suggestion: '上传真实照片可以显著提高匹配成功率',
  });

  // Privacy settings suggestion
  if (profile.privacySettings?.profileVisibility === 'PRIVATE') {
    recommendations.push({
      field: 'privacySettings',
      priority: 'low',
      suggestion: '将资料可见性设为公开或匹配后可见，增加被发现的机会',
    });
  }

  return recommendations;
}

/**
 * Get suggestion for a specific field
 */
function getFieldSuggestion(field: string): string {
  const suggestions: Record<string, string> = {
    basicConditions: '填写基础条件（年龄、身高、学历等），帮助系统推荐合适的对象',
    interests: '添加兴趣爱好，增加找到共同话题的机会',
    expectations: '说明你的交友目的，帮助找到志同道合的人',
  };
  return suggestions[field] || `完善${field}信息`;
}

/**
 * Check if profile is ready for matching
 */
export function isProfileReadyForMatching(profile: DatingProfile): {
  ready: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Check completeness
  if ((profile.completenessScore || 0) < 60) {
    reasons.push('资料完整度不足60%，请完善更多信息');
  }

  // Check critical fields
  if (!profile.expectations?.purpose) {
    reasons.push('未填写交友目的');
  }

  if (!profile.basicConditions?.location?.city) {
    reasons.push('未填写所在城市');
  }

  if (!profile.interests?.interests || profile.interests.interests.length === 0) {
    reasons.push('未添加兴趣爱好');
  }

  // Check if active
  if (!profile.isActive) {
    reasons.push('资料未激活');
  }

  return {
    ready: reasons.length === 0,
    reasons,
  };
}

/**
 * Get missing fields list
 */
export function getMissingFields(profile: DatingProfile): string[] {
  const missing: string[] = [];

  if (!profile.basicConditions?.ageRange) missing.push('ageRange');
  if (!profile.basicConditions?.education) missing.push('education');
  if (!profile.basicConditions?.location?.city) missing.push('city');
  if (!profile.expectations?.purpose) missing.push('datingPurpose');
  if (!profile.interests?.interests?.length) missing.push('interests');
  if (!profile.description || profile.description.length < 50) missing.push('description');

  return missing;
}

/**
 * Calculate profile completeness percentage
 */
export function calculateCompletenessPercentage(profile: DatingProfile): number {
  const weights = {
    basicConditions: 30,
    personality: 15,
    interests: 20,
    lifestyle: 15,
    expectations: 15,
    description: 5,
  };

  let totalWeight = 0;
  let filledWeight = 0;

  // Basic conditions
  totalWeight += weights.basicConditions;
  if (profile.basicConditions) {
    const bc = profile.basicConditions;
    let bcScore = 0;
    if (bc.ageRange) bcScore += 25;
    if (bc.heightRange) bcScore += 15;
    if (bc.education) bcScore += 25;
    if (bc.location?.city) bcScore += 20;
    if (bc.income) bcScore += 15;
    filledWeight += (weights.basicConditions * bcScore) / 100;
  }

  // Personality
  totalWeight += weights.personality;
  if (profile.personality?.mbti?.length || profile.personality?.traits?.length) {
    filledWeight += weights.personality;
  }

  // Interests
  totalWeight += weights.interests;
  if (profile.interests?.interests?.length) {
    filledWeight += weights.interests;
  }

  // Lifestyle
  totalWeight += weights.lifestyle;
  if (profile.lifestyle?.sleepSchedule || profile.lifestyle?.smoking) {
    filledWeight += weights.lifestyle;
  }

  // Expectations
  totalWeight += weights.expectations;
  if (profile.expectations?.purpose) {
    filledWeight += weights.expectations;
  }

  // Description
  totalWeight += weights.description;
  if (profile.description && profile.description.length >= 50) {
    filledWeight += weights.description;
  }

  return Math.round((filledWeight / totalWeight) * 100);
}
