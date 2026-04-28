/**
 * Disclosure Service
 *
 * Provides disclosure level calculation and access permission verification
 * for agent information disclosure control.
 */
import { DisclosureLevel, RelationshipStage, AgentDisclosureSettings, DisclosureCheckResult } from '@bridgeai/shared';
/**
 * User relationship info
 */
interface UserRelationship {
    hasMatched: boolean;
    hasChatted: boolean;
    hasReferred: boolean;
    matchId?: string;
}
/**
 * Disclosure Service
 */
export declare class DisclosureService {
    /**
     * Get disclosure settings for an agent
     * Creates default settings if none exist
     */
    getDisclosureSettings(agentId: string): Promise<AgentDisclosureSettings>;
    /**
     * Update disclosure settings for an agent
     */
    updateDisclosureSettings(agentId: string, updates: Partial<AgentDisclosureSettings>, changedBy: string): Promise<AgentDisclosureSettings>;
    /**
     * Check if a user can view a specific field of an agent
     * This is the core permission check function
     */
    canViewField(agentId: string, fieldName: string, viewerId: string): Promise<DisclosureCheckResult>;
    /**
     * Get the relationship stage between two users
     */
    getRelationshipStage(userId: string, otherUserId: string): Promise<RelationshipStage>;
    /**
     * Get user relationship information
     */
    getUserRelationship(userId: string, otherUserId: string): Promise<UserRelationship>;
    /**
     * Filter agent data based on disclosure permissions
     * Returns only fields the viewer is allowed to see
     */
    filterAgentData(agentId: string, agentData: Record<string, unknown>, viewerId: string): Promise<Record<string, unknown>>;
    /**
     * Update disclosure level for multiple fields (bulk update)
     */
    bulkUpdateDisclosure(agentId: string, fieldUpdates: {
        fieldName: string;
        level: DisclosureLevel;
    }[], changedBy: string, notifyAffectedUsers?: boolean): Promise<AgentDisclosureSettings>;
    /**
     * Reset disclosure settings to defaults
     */
    resetToDefaults(agentId: string, changedBy: string): Promise<AgentDisclosureSettings>;
    /**
     * Load disclosure settings from database
     */
    private loadSettingsFromDB;
    /**
     * Save disclosure settings to database
     */
    private saveSettingsToDB;
    /**
     * Notify users affected by disclosure changes
     */
    private notifyDisclosureChanges;
}
export declare const disclosureService: DisclosureService;
export default disclosureService;
//# sourceMappingURL=disclosureService.d.ts.map