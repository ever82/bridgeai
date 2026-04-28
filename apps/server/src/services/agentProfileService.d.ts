import type { L1Profile, L2Profile, UpdateL1ProfileRequest, UpdateL2ProfileRequest, UpdateL3ProfileRequest } from '@bridgeai/shared';
export { calculateL1Completion } from '../utils/profileCompletion';
export interface AgentProfile {
    id: string;
    agentId: string;
    sceneId?: string;
    l1Data: L1Profile | null;
    l2Data: L2Profile | null;
    l3Description: string | null;
    l3MediaUrls: string[] | null;
    sceneConfig: Record<string, any> | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Get or create agent profile
 */
export declare function getOrCreateProfile(agentId: string, sceneId?: string): Promise<AgentProfile>;
/**
 * Get L1 profile for an agent
 */
export declare function getL1Profile(agentId: string, userId: string): Promise<L1Profile | null>;
/**
 * Update L1 profile
 */
export declare function updateL1Profile(agentId: string, userId: string, data: UpdateL1ProfileRequest): Promise<L1Profile>;
/**
 * Get L2 profile for an agent
 */
export declare function getL2Profile(agentId: string, userId: string): Promise<L2Profile | null>;
/**
 * Update L2 profile
 */
export declare function updateL2Profile(agentId: string, userId: string, data: UpdateL2ProfileRequest): Promise<L2Profile>;
/**
 * Get L3 profile for an agent
 */
export declare function getL3Profile(agentId: string, userId: string): Promise<string | null>;
/**
 * Update L3 profile
 */
export declare function updateL3Profile(agentId: string, userId: string, data: UpdateL3ProfileRequest): Promise<string>;
//# sourceMappingURL=agentProfileService.d.ts.map