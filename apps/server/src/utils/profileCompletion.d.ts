import type { L1Profile, ProfileCompletionResult } from '@bridgeai/shared';
/**
 * Calculate L1 profile completion percentage
 */
export declare function calculateL1Completion(l1Data: L1Profile | null): ProfileCompletionResult;
/**
 * Get missing field labels for display
 */
export declare function getMissingFieldLabels(missingFields: (keyof L1Profile)[]): string[];
/**
 * Get completion status message
 */
export declare function getCompletionMessage(percentage: number): string;
//# sourceMappingURL=profileCompletion.d.ts.map