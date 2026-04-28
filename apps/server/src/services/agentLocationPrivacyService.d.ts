/**
 * Agent Location Privacy Service
 * Agent 位置隐私服务
 */
export type LocationPrivacyLevel = 'EXACT' | 'DISTRICT' | 'CITY' | 'PROVINCE' | 'HIDDEN';
export interface AgentLocationPrivacySettings {
    privacyLevel: LocationPrivacyLevel;
    showExactCoords: boolean;
    hideFromPublic: boolean;
}
/**
 * Get agent location privacy settings
 */
export declare function getAgentLocationPrivacy(agentId: string): Promise<AgentLocationPrivacySettings | null>;
/**
 * Create or update agent location privacy settings
 */
export declare function setAgentLocationPrivacy(agentId: string, settings: Partial<AgentLocationPrivacySettings>): Promise<boolean>;
/**
 * Apply privacy filter to agent location data
 * Returns sanitized location data based on privacy level
 */
export declare function applyPrivacyFilter(agentId: string, locationData: {
    location?: any;
    latitude?: number | null;
    longitude?: number | null;
}): Promise<{
    location?: any;
    latitude?: number | null;
    longitude?: number | null;
    privacyApplied: boolean;
}>;
/**
 * Delete agent location privacy settings
 */
export declare function deleteAgentLocationPrivacy(agentId: string): Promise<boolean>;
//# sourceMappingURL=agentLocationPrivacyService.d.ts.map