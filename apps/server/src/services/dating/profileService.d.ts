import type { DatingProfile, CreateDatingProfileRequest, UpdateDatingProfileRequest } from '@bridgeai/shared';
/**
 * Get or create dating profile for an agent
 */
export declare function getOrCreateProfile(agentId: string, userId: string): Promise<DatingProfile>;
/**
 * Get dating profile by agent ID
 */
export declare function getProfileByAgentId(agentId: string, userId: string): Promise<DatingProfile | null>;
/**
 * Create a new dating profile
 */
export declare function createProfile(data: CreateDatingProfileRequest, userId: string): Promise<DatingProfile>;
/**
 * Update dating profile
 */
export declare function updateProfile(agentId: string, userId: string, data: UpdateDatingProfileRequest): Promise<DatingProfile>;
/**
 * Delete dating profile
 */
export declare function deleteProfile(agentId: string, userId: string): Promise<void>;
/**
 * Update AI extracted data
 */
export declare function updateAIExtractedData(agentId: string, userId: string, extractedData: Record<string, unknown>, confidence: number): Promise<DatingProfile>;
/**
 * Check profile completeness
 */
export declare function checkCompleteness(profile: Partial<DatingProfile>): {
    complete: boolean;
    missingFields: string[];
    score: number;
};
//# sourceMappingURL=profileService.d.ts.map