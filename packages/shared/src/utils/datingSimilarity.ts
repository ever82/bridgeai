/**
 * Dating Similarity Utilities
 * 约会相似度计算工具 - 多维度匹配评分
 */

import type {
  BasicConditions,
  PersonalityPreferences,
  InterestPreferences,
  Lifestyle,
  RelationshipExpectations,
  DatingProfile,
  LocationPreference,
} from '../types/dating';
import {
  AgeRangePreference,
  EducationPreference,
  HeightRange,
  IncomeRange,
  MBTIType,
  PersonalityTrait,
  SleepSchedule,
  SmokingHabit,
  DrinkingHabit,
  PetPreference,
  ExerciseFrequency,
  DietPreference,
  DatingPurpose,
  FamilyPlan,
} from '../types/dating';

// ============================================
// 权重配置
// ============================================

export interface SimilarityWeights {
  basicConditions: number; // 基础条件权重
  personality: number; // 性格权重
  interests: number; // 兴趣权重
  lifestyle: number; // 生活方式权重
  expectations: number; // 关系期望权重
  complementary: number; // 互补性权重
  geoProximity: number; // 地理位置接近度权重
}

export const DEFAULT_WEIGHTS: SimilarityWeights = {
  basicConditions: 0.2,
  personality: 0.2,
  interests: 0.15,
  lifestyle: 0.15,
  expectations: 0.15,
  complementary: 0.1,
  geoProximity: 0.05,
};

// ============================================
// 相似度评分结果
// ============================================

export interface DimensionScore {
  dimension: string;
  score: number; // 0-100
  weight: number;
  weightedScore: number;
  details: string[];
}

export interface SimilarityResult {
  totalScore: number; // 0-100 综合匹配度
  dimensions: DimensionScore[];
  highlights: string[]; // 匹配亮点（用于展示）
  warnings: string[]; // 潜在不匹配点
}

// ============================================
// 辅助函数
// ============================================

function enumOrdinal(value: string, order: string[]): number {
  const idx = order.indexOf(value);
  return idx >= 0 ? idx : order.length / 2;
}

function ageRangeMidpoint(range: AgeRangePreference | undefined): number {
  if (!range || range === AgeRangePreference.NO_PREFERENCE) return 30;
  const midpoints: Record<string, number> = {
    [AgeRangePreference.UNDER_20]: 18,
    [AgeRangePreference.AGE_20_25]: 22,
    [AgeRangePreference.AGE_26_30]: 28,
    [AgeRangePreference.AGE_31_35]: 33,
    [AgeRangePreference.AGE_36_40]: 38,
    [AgeRangePreference.AGE_41_50]: 45,
    [AgeRangePreference.OVER_50]: 55,
  };
  return midpoints[range] ?? 30;
}

function heightRangeMidpoint(range: HeightRange | undefined): number {
  if (!range || range === HeightRange.NO_PREFERENCE) return 170;
  const midpoints: Record<string, number> = {
    [HeightRange.BELOW_150]: 145,
    [HeightRange.HEIGHT_150_160]: 155,
    [HeightRange.HEIGHT_160_170]: 165,
    [HeightRange.HEIGHT_170_180]: 175,
    [HeightRange.HEIGHT_180_190]: 185,
    [HeightRange.ABOVE_190]: 195,
  };
  return midpoints[range] ?? 170;
}

function educationRank(edu: EducationPreference | undefined): number {
  if (!edu || edu === EducationPreference.NO_PREFERENCE) return 2;
  const order = [
    EducationPreference.HIGH_SCHOOL,
    EducationPreference.ASSOCIATE,
    EducationPreference.BACHELOR,
    EducationPreference.MASTER,
    EducationPreference.DOCTORATE,
  ];
  return enumOrdinal(edu, order);
}

function incomeRank(income: IncomeRange | undefined): number {
  if (!income || income === IncomeRange.NO_PREFERENCE) return 2;
  const order = [
    IncomeRange.BELOW_5K,
    IncomeRange.INCOME_5K_10K,
    IncomeRange.INCOME_10K_20K,
    IncomeRange.INCOME_20K_50K,
    IncomeRange.ABOVE_50K,
  ];
  return enumOrdinal(income, order);
}

// ============================================
// 各维度相似度计算
// ============================================

/**
 * 基础条件相似度 (0-100)
 */
export function calculateBasicConditionsSimilarity(
  profile: BasicConditions | undefined,
  target: BasicConditions | undefined
): { score: number; details: string[] } {
  if (!profile || !target) return { score: 50, details: ['基础条件信息不完整'] };

  const details: string[] = [];
  let totalScore = 0;
  let factors = 0;

  // 年龄范围
  if (profile.ageRange && profile.ageRange !== AgeRangePreference.NO_PREFERENCE) {
    const ageDiff = Math.abs(
      ageRangeMidpoint(profile.ageRange) -
        ageRangeMidpoint(target.ageRange ?? AgeRangePreference.NO_PREFERENCE)
    );
    const ageScore = Math.max(0, 100 - ageDiff * 5);
    totalScore += ageScore;
    factors++;
    if (ageScore >= 70) details.push('年龄范围匹配');
  }

  // 身高范围
  if (profile.heightRange && profile.heightRange !== HeightRange.NO_PREFERENCE) {
    const heightDiff = Math.abs(
      heightRangeMidpoint(profile.heightRange) -
        heightRangeMidpoint(target.heightRange ?? HeightRange.NO_PREFERENCE)
    );
    const heightScore = Math.max(0, 100 - heightDiff * 2);
    totalScore += heightScore;
    factors++;
    if (heightScore >= 70) details.push('身高范围匹配');
  }

  // 学历
  if (profile.education && profile.education !== EducationPreference.NO_PREFERENCE) {
    const eduDiff = Math.abs(educationRank(profile.education) - educationRank(target.education));
    const eduScore = Math.max(0, 100 - eduDiff * 20);
    totalScore += eduScore;
    factors++;
    if (eduScore >= 70) details.push('学历背景匹配');
  }

  // 收入
  if (profile.income && profile.income !== IncomeRange.NO_PREFERENCE) {
    const incomeDiff = Math.abs(incomeRank(profile.income) - incomeRank(target.income));
    const incomeScore = Math.max(0, 100 - incomeDiff * 20);
    totalScore += incomeScore;
    factors++;
  }

  return {
    score: factors > 0 ? totalScore / factors : 50,
    details,
  };
}

/**
 * 性格相似度 (0-100)
 */
export function calculatePersonalitySimilarity(
  profile: PersonalityPreferences | undefined,
  target: PersonalityPreferences | undefined
): { score: number; details: string[] } {
  if (!profile || !target) return { score: 50, details: ['性格偏好信息不完整'] };

  const details: string[] = [];
  let totalScore = 0;
  let factors = 0;

  // MBTI 兼容性
  if (profile.mbti && profile.mbti.length > 0 && profile.mbti[0] !== MBTIType.NO_PREFERENCE) {
    const targetMbti = target.mbti?.[0];
    if (targetMbti && targetMbti !== MBTIType.NO_PREFERENCE) {
      const mbtiScore = calculateMBTICompatibility(profile.mbti, targetMbti);
      totalScore += mbtiScore;
      factors++;
      if (mbtiScore >= 70) details.push('MBTI性格类型契合');
    }
  }

  // 特质匹配
  const preferredTraits = profile.preferredTraits ?? [];
  const targetTraits = target.traits ?? [];
  if (preferredTraits.length > 0 && targetTraits.length > 0) {
    const matchedTraits = preferredTraits.filter(t => targetTraits.includes(t));
    const traitScore = (matchedTraits.length / preferredTraits.length) * 100;
    totalScore += traitScore;
    factors++;
    if (matchedTraits.length > 0) {
      details.push(`拥有${matchedTraits.length}个你偏好的性格特质`);
    }
  }

  // 排斥特质检查
  const dislikedTraits = profile.dislikedTraits ?? [];
  if (dislikedTraits.length > 0 && targetTraits.length > 0) {
    const hasDisliked = dislikedTraits.some(t => targetTraits.includes(t));
    if (hasDisliked) {
      totalScore = Math.max(0, totalScore - 20);
      details.push('存在不太偏好的性格特质');
    }
  }

  return {
    score: factors > 0 ? totalScore / factors : 50,
    details,
  };
}

/**
 * MBTI 兼容性矩阵
 */
const MBTI_COMPAT_GROUPS: Record<string, string[]> = {
  NT: ['INTJ', 'INTP', 'ENTJ', 'ENTP'],
  NF: ['INFJ', 'INFP', 'ENFJ', 'ENFP'],
  SJ: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'],
  SP: ['ISTP', 'ISFP', 'ESTP', 'ESFP'],
};

function getMBTIGroup(mbti: string): string {
  for (const [group, types] of Object.entries(MBTI_COMPAT_GROUPS)) {
    if (types.includes(mbti)) return group;
  }
  return 'NT';
}

function calculateMBTICompatibility(preferred: MBTIType[], targetMbti: MBTIType): number {
  // 如果目标在偏好列表中，高分
  if (preferred.includes(targetMbti)) return 90;

  const targetGroup = getMBTIGroup(targetMbti);
  // 检查同组兼容性
  const hasSameGroup = preferred.some(p => getMBTIGroup(p) === targetGroup);
  if (hasSameGroup) return 75;

  // 经典互补配对：NT-NF, SJ-SP
  const compatPairs: Record<string, string> = { NT: 'NF', NF: 'NT', SJ: 'SP', SP: 'SJ' };
  const hasComplement = preferred.some(p => compatPairs[getMBTIGroup(p)] === targetGroup);
  if (hasComplement) return 65;

  return 40;
}

/**
 * 兴趣相似度 (0-100)
 */
export function calculateInterestsSimilarity(
  profile: InterestPreferences | undefined,
  target: InterestPreferences | undefined
): { score: number; details: string[] } {
  if (!profile || !target) return { score: 50, details: ['兴趣信息不完整'] };

  const details: string[] = [];
  const profileCategories = new Set(profile.interests.map(i => i.category));
  const targetCategories = new Set(target.interests.map(i => i.category));

  // 共同兴趣类别
  const shared = [...profileCategories].filter(c => targetCategories.has(c));
  const union = new Set([...profileCategories, ...targetCategories]);
  const jaccardScore = union.size > 0 ? (shared.length / union.size) * 100 : 50;

  if (shared.length > 0) {
    details.push(`${shared.length}个共同兴趣爱好`);
  }

  // 偏好兴趣匹配
  const preferredInPartner = profile.preferredInPartner ?? [];
  if (preferredInPartner.length > 0) {
    const matchedPreferred = preferredInPartner.filter(c => targetCategories.has(c));
    if (matchedPreferred.length > 0) {
      details.push(`拥有${matchedPreferred.length}个你期待的兴趣`);
    }
  }

  // 检查具体兴趣名称匹配
  const profileNames = new Set(profile.interests.map(i => i.name.toLowerCase()));
  const targetNames = new Set(target.interests.map(i => i.name.toLowerCase()));
  const exactMatches = [...profileNames].filter(n => targetNames.has(n));
  if (exactMatches.length > 0) {
    details.push(`${exactMatches.length}个完全相同的兴趣`);
  }

  return {
    score: jaccardScore,
    details,
  };
}

/**
 * 生活方式相似度 (0-100)
 */
export function calculateLifestyleSimilarity(
  profile: Lifestyle | undefined,
  target: Lifestyle | undefined
): { score: number; details: string[] } {
  if (!profile || !target) return { score: 50, details: ['生活方式信息不完整'] };

  const details: string[] = [];
  let totalScore = 0;
  let factors = 0;

  // 作息时间
  if (profile.sleepSchedule) {
    const sleepMatch =
      profile.sleepSchedule === target.sleepSchedule ||
      profile.sleepSchedule === SleepSchedule.FLEXIBLE ||
      target.sleepSchedule === SleepSchedule.FLEXIBLE;
    totalScore += sleepMatch ? 100 : 40;
    factors++;
    if (sleepMatch) details.push('作息时间相近');
  }

  // 吸烟
  if (profile.smoking && profile.smoking !== SmokingHabit.NO_PREFERENCE) {
    const smokeMatch =
      profile.smoking === target.smoking || target.smoking === SmokingHabit.NO_PREFERENCE;
    totalScore += smokeMatch ? 100 : 50;
    factors++;
  }

  // 饮酒
  if (profile.drinking && profile.drinking !== DrinkingHabit.NO_PREFERENCE) {
    const drinkMatch =
      profile.drinking === target.drinking || target.drinking === DrinkingHabit.NO_PREFERENCE;
    totalScore += drinkMatch ? 100 : 50;
    factors++;
  }

  // 宠物
  if (profile.pets && profile.pets !== PetPreference.NO_PREFERENCE) {
    const petCompatible =
      profile.pets === target.pets ||
      target.pets === PetPreference.NO_PREFERENCE ||
      (profile.pets !== PetPreference.ALLERGIC && target.pets !== PetPreference.ALLERGIC);
    totalScore += petCompatible ? 100 : 30;
    factors++;
    if (petCompatible && profile.pets === target.pets) details.push('宠物偏好一致');
  }

  // 运动
  if (profile.exercise && profile.exercise !== ExerciseFrequency.NO_PREFERENCE) {
    const exerciseMatch =
      profile.exercise === target.exercise || target.exercise === ExerciseFrequency.NO_PREFERENCE;
    totalScore += exerciseMatch ? 100 : 50;
    factors++;
  }

  // 饮食
  if (profile.diet && profile.diet !== DietPreference.NO_PREFERENCE) {
    const dietMatch = profile.diet === target.diet || target.diet === DietPreference.NO_PREFERENCE;
    totalScore += dietMatch ? 100 : 50;
    factors++;
  }

  // 社交频率
  if (profile.socialFrequency && target.socialFrequency) {
    const socialMatch = profile.socialFrequency === target.socialFrequency;
    totalScore += socialMatch ? 100 : 50;
    factors++;
    if (socialMatch) details.push('社交偏好相近');
  }

  return {
    score: factors > 0 ? totalScore / factors : 50,
    details,
  };
}

/**
 * 关系期望相似度 (0-100)
 */
export function calculateExpectationsSimilarity(
  profile: RelationshipExpectations | undefined,
  target: RelationshipExpectations | undefined
): { score: number; details: string[] } {
  if (!profile || !target) return { score: 50, details: ['关系期望信息不完整'] };

  const details: string[] = [];
  let totalScore = 0;
  let factors = 0;

  // 交往目的
  if (profile.purpose) {
    const purposeMatch = profile.purpose === target.purpose;
    // 部分兼容：认真交往 & 以结婚为目的
    const semiCompat =
      !purposeMatch &&
      ((profile.purpose === DatingPurpose.SERIOUS_RELATIONSHIP &&
        target.purpose === DatingPurpose.MARRIAGE) ||
        (profile.purpose === DatingPurpose.MARRIAGE &&
          target.purpose === DatingPurpose.SERIOUS_RELATIONSHIP) ||
        (profile.purpose === DatingPurpose.FRIENDSHIP_FIRST &&
          target.purpose === DatingPurpose.COMPANIONSHIP) ||
        (profile.purpose === DatingPurpose.COMPANIONSHIP &&
          target.purpose === DatingPurpose.FRIENDSHIP_FIRST));
    totalScore += purposeMatch ? 100 : semiCompat ? 70 : 30;
    factors++;
    if (purposeMatch) details.push('交往目的一致');
  }

  // 节奏
  if (profile.pace) {
    const paceMatch = profile.pace === target.pace;
    totalScore += paceMatch ? 100 : 50;
    factors++;
  }

  // 家庭计划
  if (profile.familyPlan) {
    const familyMatch =
      profile.familyPlan === target.familyPlan ||
      profile.familyPlan === FamilyPlan.OPEN_MINDED ||
      target.familyPlan === FamilyPlan.OPEN_MINDED;
    totalScore += familyMatch ? 100 : 40;
    factors++;
    if (familyMatch) details.push('家庭规划一致');
  }

  // 异地接受度
  if (profile.longDistance) {
    const ldMatch = profile.longDistance === target.longDistance;
    totalScore += ldMatch ? 100 : 50;
    factors++;
  }

  return {
    score: factors > 0 ? totalScore / factors : 50,
    details,
  };
}

/**
 * 互补性评分 (0-100)
 * 性格/技能互补性评估
 */
export function calculateComplementaryScore(
  profile: PersonalityPreferences | undefined,
  target: PersonalityPreferences | undefined
): { score: number; details: string[] } {
  if (!profile || !target) return { score: 50, details: [] };

  const details: string[] = [];
  let score = 50;

  // 内向-外向互补
  const profileTraits = profile.traits ?? [];
  const targetTraits = target.traits ?? [];
  const hasIntrovert = (t: PersonalityTrait[]) => t.includes(PersonalityTrait.INTROVERTED);
  const hasExtrovert = (t: PersonalityTrait[]) => t.includes(PersonalityTrait.EXTROVERTED);

  if (
    (hasIntrovert(profileTraits) && hasExtrovert(targetTraits)) ||
    (hasExtrovert(profileTraits) && hasIntrovert(targetTraits))
  ) {
    score += 15;
    details.push('性格内外向互补');
  }

  // 理性-感性互补
  const hasRational = (t: PersonalityTrait[]) => t.includes(PersonalityTrait.RATIONAL);
  const hasEmotional = (t: PersonalityTrait[]) => t.includes(PersonalityTrait.EMOTIONAL);
  if (
    (hasRational(profileTraits) && hasEmotional(targetTraits)) ||
    (hasEmotional(profileTraits) && hasRational(targetTraits))
  ) {
    score += 10;
    details.push('理性与感性互补');
  }

  // 冒险-稳重互补
  const hasAdventurous = (t: PersonalityTrait[]) => t.includes(PersonalityTrait.ADVENTUROUS);
  const hasStable = (t: PersonalityTrait[]) => t.includes(PersonalityTrait.STABLE);
  if (
    (hasAdventurous(profileTraits) && hasStable(targetTraits)) ||
    (hasStable(profileTraits) && hasAdventurous(targetTraits))
  ) {
    score += 10;
    details.push('冒险与稳重互补');
  }

  return { score: Math.min(100, score), details };
}

/**
 * 地理位置接近度 (0-100)
 */
export function calculateGeoProximity(
  profileLoc: LocationPreference | undefined,
  targetLoc: LocationPreference | undefined
): { score: number; details: string[] } {
  if (!profileLoc || !targetLoc) return { score: 50, details: ['位置信息不完整'] };

  const details: string[] = [];

  // 同城
  if (profileLoc.city && targetLoc.city) {
    if (profileLoc.city === targetLoc.city) {
      details.push('同城');
      return { score: 100, details };
    }
  }

  // 同省
  if (profileLoc.province && targetLoc.province) {
    if (profileLoc.province === targetLoc.province) {
      details.push('同省');
      return { score: 70, details };
    }
  }

  return { score: 30, details: ['不同城市'] };
}

// ============================================
// 综合匹配度计算
// ============================================

/**
 * 计算两个约会画像的综合匹配度 (0-100)
 */
export function calculateDatingSimilarity(
  profileA: DatingProfile,
  profileB: DatingProfile,
  weights: Partial<SimilarityWeights> = {}
): SimilarityResult {
  const w = { ...DEFAULT_WEIGHTS, ...weights };
  const dimensions: DimensionScore[] = [];
  const highlights: string[] = [];
  const warnings: string[] = [];

  // 1. 基础条件
  const basic = calculateBasicConditionsSimilarity(
    profileA.basicConditions,
    profileB.basicConditions
  );
  dimensions.push({
    dimension: 'basicConditions',
    score: basic.score,
    weight: w.basicConditions,
    weightedScore: basic.score * w.basicConditions,
    details: basic.details,
  });
  highlights.push(...basic.details.filter(d => !d.includes('不完整')));

  // 2. 性格
  const personality = calculatePersonalitySimilarity(profileA.personality, profileB.personality);
  dimensions.push({
    dimension: 'personality',
    score: personality.score,
    weight: w.personality,
    weightedScore: personality.score * w.personality,
    details: personality.details,
  });
  highlights.push(...personality.details);

  // 3. 兴趣
  const interests = calculateInterestsSimilarity(profileA.interests, profileB.interests);
  dimensions.push({
    dimension: 'interests',
    score: interests.score,
    weight: w.interests,
    weightedScore: interests.score * w.interests,
    details: interests.details,
  });
  highlights.push(...interests.details);

  // 4. 生活方式
  const lifestyle = calculateLifestyleSimilarity(profileA.lifestyle, profileB.lifestyle);
  dimensions.push({
    dimension: 'lifestyle',
    score: lifestyle.score,
    weight: w.lifestyle,
    weightedScore: lifestyle.score * w.lifestyle,
    details: lifestyle.details,
  });
  highlights.push(...lifestyle.details);

  // 5. 关系期望
  const expectations = calculateExpectationsSimilarity(
    profileA.expectations,
    profileB.expectations
  );
  dimensions.push({
    dimension: 'expectations',
    score: expectations.score,
    weight: w.expectations,
    weightedScore: expectations.score * w.expectations,
    details: expectations.details,
  });
  highlights.push(...expectations.details);

  // 6. 互补性
  const complementary = calculateComplementaryScore(profileA.personality, profileB.personality);
  dimensions.push({
    dimension: 'complementary',
    score: complementary.score,
    weight: w.complementary,
    weightedScore: complementary.score * w.complementary,
    details: complementary.details,
  });
  highlights.push(...complementary.details);

  // 7. 地理位置
  const geo = calculateGeoProximity(
    profileA.basicConditions?.location,
    profileB.basicConditions?.location
  );
  dimensions.push({
    dimension: 'geoProximity',
    score: geo.score,
    weight: w.geoProximity,
    weightedScore: geo.score * w.geoProximity,
    details: geo.details,
  });
  highlights.push(...geo.details);

  // 计算总分
  const totalWeight = Object.values(w).reduce((a, b) => a + b, 0);
  const totalScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.weightedScore, 0) / totalWeight
  );

  // 生成警告
  dimensions.forEach(d => {
    if (d.score < 40) {
      warnings.push(`${d.dimension}维度匹配度较低(${Math.round(d.score)}分)`);
    }
  });

  return {
    totalScore: Math.max(0, Math.min(100, totalScore)),
    dimensions,
    highlights,
    warnings,
  };
}
