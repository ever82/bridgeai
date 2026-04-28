import type { DatingProfile, ProfileQualityResult } from '@bridgeai/shared';
/**
 * Calculate profile quality metrics
 */
export declare function calculateProfileQuality(profile: DatingProfile): ProfileQualityResult;
/**
 * Check if profile is ready for matching
 */
export declare function isProfileReadyForMatching(profile: DatingProfile): {
    ready: boolean;
    reasons: string[];
};
/**
 * Get missing fields list
 */
export declare function getMissingFields(profile: DatingProfile): string[];
/**
 * Calculate profile completeness percentage
 */
export declare function calculateCompletenessPercentage(profile: DatingProfile): number;
//# sourceMappingURL=profileQualityService.d.ts.map