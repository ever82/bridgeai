import type { L1Profile, ProfileCompletionResult } from '@bridgeai/shared';
import { L1_FIELD_WEIGHTS, L1_FIELD_LABELS } from '@bridgeai/shared';

/**
 * Calculate L1 profile completion percentage
 */
export function calculateL1Completion(l1Data: L1Profile | null): ProfileCompletionResult {
  const fields = Object.keys(L1_FIELD_WEIGHTS) as (keyof L1Profile)[];
  const totalFields = fields.length;

  if (!l1Data) {
    return {
      l1Percentage: 0,
      l1FilledFields: 0,
      l1TotalFields: totalFields,
      l1MissingFields: fields,
      l1WeightedScore: 0,
    };
  }

  const filledFields = fields.filter(field => {
    const value = l1Data[field];
    return value !== undefined && value !== null && value !== '';
  });

  const missingFields = fields.filter(field => !filledFields.includes(field));

  // Calculate weighted score
  let weightedScore = 0;
  filledFields.forEach(field => {
    weightedScore += L1_FIELD_WEIGHTS[field];
  });

  // Calculate simple percentage
  const percentage = Math.round((filledFields.length / totalFields) * 100);

  return {
    l1Percentage: percentage,
    l1FilledFields: filledFields.length,
    l1TotalFields: totalFields,
    l1MissingFields: missingFields,
    l1WeightedScore: weightedScore,
  };
}

/**
 * Get missing field labels for display
 */
export function getMissingFieldLabels(missingFields: (keyof L1Profile)[]): string[] {
  return missingFields.map(field => L1_FIELD_LABELS[field] || String(field)) as string[];
}

/**
 * Get completion status message
 */
export function getCompletionMessage(percentage: number): string {
  if (percentage === 0) {
    return '开始完善您的档案吧';
  } else if (percentage < 30) {
    return '档案刚开始，继续完善';
  } else if (percentage < 60) {
    return '档案进行中，加油';
  } else if (percentage < 100) {
    return '快完成了，再完善一下';
  } else {
    return '档案已完成！';
  }
}
