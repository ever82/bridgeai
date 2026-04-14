/**
 * Match Scoring Utilities
 * 职位匹配度评分工具 - 提供各维度评分函数
 */

/** 权重配置接口 */
export interface MatchWeights {
  skills: number;       // 技能匹配权重
  experience: number;   // 经验评估权重
  salary: number;       // 薪资匹配权重
  location: number;     // 地域/工作方式权重
  culture: number;      // 文化匹配权重
}

/** 默认权重配置 */
export const DEFAULT_WEIGHTS: MatchWeights = {
  skills: 0.35,
  experience: 0.25,
  salary: 0.20,
  location: 0.10,
  culture: 0.10,
};

/** 薪资范围 */
export interface SalaryRange {
  min?: number;
  max?: number;
  currency?: string;
}

/** 经验信息 */
export interface ExperienceInfo {
  years?: number;
  level?: 'entry' | 'junior' | 'mid' | 'senior' | 'expert';
  industries?: string[];
}

/** 位置信息 */
export interface LocationInfo {
  city?: string;
  remote?: boolean;
  workMode?: 'remote' | 'onsite' | 'hybrid';
}

/** 匹配维度详情 */
export interface DimensionScore {
  score: number;        // 0-100
  weight: number;
  weightedScore: number;
  details: Record<string, number | string | boolean>;
}

/** 综合匹配结果 */
export interface CompositeMatchResult {
  totalScore: number;   // 0-100
  dimensions: {
    skills: DimensionScore;
    experience: DimensionScore;
    salary: DimensionScore;
    location: DimensionScore;
    culture: DimensionScore;
  };
  summary: string;
}

/**
 * 计算技能匹配度
 * 关键词匹配 + 语义相似度
 */
export function calculateSkillScore(
  seekerSkills: string[],
  jobRequiredSkills: string[],
  jobPreferredSkills?: string[]
): DimensionScore {
  const details: Record<string, number | string | boolean> = {};

  if (jobRequiredSkills.length === 0 && (!jobPreferredSkills || jobPreferredSkills.length === 0)) {
    return { score: 50, weight: 0, weightedScore: 0, details: { note: 'no skills specified' } };
  }

  const normalize = (s: string) => s.toLowerCase().trim();

  const normalizedSeeker = new Set(seekerSkills.map(normalize));
  const normalizedRequired = jobRequiredSkills.map(normalize);
  const normalizedPreferred = (jobPreferredSkills || []).map(normalize);

  // Required skills matching
  const requiredMatches = normalizedRequired.filter(s => normalizedSeeker.has(s));
  const requiredScore = normalizedRequired.length > 0
    ? (requiredMatches.length / normalizedRequired.length) * 100
    : 50;

  // Preferred skills matching (bonus)
  const preferredMatches = normalizedPreferred.filter(s => normalizedSeeker.has(s));
  const preferredBonus = normalizedPreferred.length > 0
    ? (preferredMatches.length / normalizedPreferred.length) * 20
    : 0;

  // Partial matching - check if seeker skills partially overlap with job skills
  const allJobSkills = [...normalizedRequired, ...normalizedPreferred];
  const partialMatches = allJobSkills.filter(js =>
    !normalizedSeeker.has(js) &&
    Array.from(normalizedSeeker).some(ss =>
      js.includes(ss) || ss.includes(js) || levenshteinSimilarity(js, ss) > 0.7
    )
  );
  const partialBonus = partialMatches.length * 5;

  const rawScore = Math.min(100, requiredScore + preferredBonus + partialBonus);

  details.requiredMatchRate = normalizedRequired.length > 0
    ? `${requiredMatches.length}/${normalizedRequired.length}` : 'N/A';
  details.preferredMatchRate = normalizedPreferred.length > 0
    ? `${preferredMatches.length}/${normalizedPreferred.length}` : 'N/A';
  details.partialMatches = partialMatches.length;
  details.seekerSkillCount = seekerSkills.length;

  return { score: rawScore, weight: 0, weightedScore: 0, details };
}

/**
 * 计算经验匹配度
 * 年限/行业/职级
 */
export function calculateExperienceScore(
  seekerExp: ExperienceInfo,
  jobExp: ExperienceInfo
): DimensionScore {
  const details: Record<string, number | string | boolean> = {};
  let score = 50; // baseline

  // Years of experience matching
  if (seekerExp.years !== undefined && jobExp.years !== undefined) {
    const ratio = seekerExp.years / jobExp.years;
    if (ratio >= 1.0 && ratio <= 2.0) {
      score += 30; // Perfect range
    } else if (ratio >= 0.8) {
      score += 20; // Slightly under
    } else if (ratio > 2.0) {
      score += 15; // Overqualified
    } else {
      score += Math.round(ratio * 15);
    }
    details.yearRatio = Math.round(ratio * 100) / 100;
  }

  // Level matching
  const levelMap: Record<string, number> = {
    'entry': 1, 'junior': 2, 'mid': 3, 'senior': 4, 'expert': 5,
  };
  if (seekerExp.level && jobExp.level) {
    const seekerLevelNum = levelMap[seekerExp.level] || 3;
    const jobLevelNum = levelMap[jobExp.level] || 3;
    const levelDiff = Math.abs(seekerLevelNum - jobLevelNum);
    if (levelDiff === 0) {
      score += 15;
    } else if (levelDiff === 1) {
      score += 10;
    } else {
      score += Math.max(0, 5 - levelDiff * 3);
    }
    details.levelMatch = levelDiff === 0;
  }

  // Industry overlap
  if (seekerExp.industries && jobExp.industries) {
    const normalize = (s: string) => s.toLowerCase().trim();
    const seekerIndustries = new Set(seekerExp.industries.map(normalize));
    const matchCount = jobExp.industries.filter(i => seekerIndustries.has(normalize(i))).length;
    const industryOverlap = jobExp.industries.length > 0
      ? matchCount / jobExp.industries.length : 0;
    score += Math.round(industryOverlap * 5);
    details.industryOverlap = `${matchCount}/${jobExp.industries.length}`;
  }

  const finalScore = Math.min(100, Math.max(0, score));
  return { score: finalScore, weight: 0, weightedScore: 0, details };
}

/**
 * 计算薪资匹配度
 */
export function calculateSalaryScore(
  seekerSalary: SalaryRange,
  jobSalary: SalaryRange
): DimensionScore {
  const details: Record<string, number | string | boolean> = {};

  // If no salary info, return neutral score
  if (!seekerSalary.min && !seekerSalary.max && !jobSalary.min && !jobSalary.max) {
    return { score: 50, weight: 0, weightedScore: 0, details: { note: 'no salary data' } };
  }

  const seekerMin = seekerSalary.min || 0;
  const seekerMax = seekerSalary.max || Infinity;
  const jobMin = jobSalary.min || 0;
  const jobMax = jobSalary.max || Infinity;

  let score = 50;

  // Check overlap
  const overlapMin = Math.max(seekerMin, jobMin);
  const overlapMax = Math.min(seekerMax, jobMax);

  if (overlapMax >= overlapMin) {
    // There is overlap
    score = 80;
    // How well centered is the overlap?
    const seekerMid = (seekerMin + Math.min(seekerMax, 999999)) / 2;
    const jobMid = (jobMin + Math.min(jobMax, 999999)) / 2;
    const midDiff = Math.abs(seekerMid - jobMid);
    const avgMid = (seekerMid + jobMid) / 2;
    const deviation = avgMid > 0 ? midDiff / avgMid : 0;
    score += Math.round((1 - Math.min(deviation, 1)) * 20);
  } else {
    // No overlap - calculate how far apart
    const gap = overlapMin - overlapMax;
    const avgSalary = (seekerMin + Math.min(seekerMax, 999999)) / 2;
    const gapRatio = avgSalary > 0 ? gap / avgSalary : 1;
    score = Math.max(0, Math.round(50 - gapRatio * 100));
  }

  details.seekerRange = `${seekerSalary.min || 0}-${seekerSalary.max || '∞'}`;
  details.jobRange = `${jobSalary.min || 0}-${jobSalary.max || '∞'}`;
  details.hasOverlap = overlapMax >= overlapMin;

  return { score: Math.min(100, Math.max(0, score)), weight: 0, weightedScore: 0, details };
}

/**
 * 计算地域与工作方式兼容性
 */
export function calculateLocationScore(
  seekerLocation: LocationInfo,
  jobLocation: LocationInfo
): DimensionScore {
  const details: Record<string, number | string | boolean> = {};
  let score = 50;

  // Remote compatibility
  if (seekerLocation.remote && jobLocation.workMode === 'remote') {
    score = 100;
    details.match = 'both-remote';
  } else if (seekerLocation.remote || jobLocation.workMode === 'remote') {
    score = 80;
    details.match = 'one-remote';
  }

  // Hybrid compatibility
  if (jobLocation.workMode === 'hybrid' || seekerLocation.workMode === 'hybrid') {
    score = Math.max(score, 70);
    details.match = 'hybrid-compatible';
  }

  // City matching
  if (seekerLocation.city && jobLocation.city) {
    const normalize = (s: string) => s.toLowerCase().replace(/市$/, '').trim();
    if (normalize(seekerLocation.city) === normalize(jobLocation.city)) {
      score = Math.max(score, 90);
      details.match = 'same-city';
    } else {
      score = Math.max(score, 40);
      details.match = 'different-city';
    }
  }

  details.seekerCity = seekerLocation.city || 'not specified';
  details.jobCity = jobLocation.city || 'not specified';

  return { score: Math.min(100, score), weight: 0, weightedScore: 0, details };
}

/**
 * 计算文化匹配度
 */
export function calculateCultureScore(
  seekerCulture: string[],
  jobCulture: string[]
): DimensionScore {
  const details: Record<string, number | string | boolean> = {};

  if (seekerCulture.length === 0 || jobCulture.length === 0) {
    return { score: 50, weight: 0, weightedScore: 0, details: { note: 'no culture data' } };
  }

  const normalize = (s: string) => s.toLowerCase().trim();
  const seekerSet = new Set(seekerCulture.map(normalize));
  const matches = jobCulture.filter(c => seekerSet.has(normalize(c)));

  const overlapRate = matches.length / jobCulture.length;
  const score = Math.round(30 + overlapRate * 70);

  details.overlapRate = `${matches.length}/${jobCulture.length}`;
  details.matchedValues = matches.join(', ');

  return { score: Math.min(100, score), weight: 0, weightedScore: 0, details };
}

/**
 * Levenshtein distance based similarity (0-1)
 */
function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLen = Math.max(a.length, b.length);
  return 1 - matrix[b.length][a.length] / maxLen;
}
