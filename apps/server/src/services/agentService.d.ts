import { AgentType, AgentStatus } from '@prisma/client';
export { AgentType, AgentStatus };
export interface Agent {
    id: string;
    userId: string;
    type: AgentType;
    name: string;
    description: string | null;
    status: AgentStatus;
    config: Record<string, any> | null;
    latitude: number | null;
    longitude: number | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateAgentInput {
    type: AgentType;
    name: string;
    description?: string;
    config?: Record<string, any>;
    latitude?: number;
    longitude?: number;
}
export interface UpdateAgentInput {
    name?: string;
    description?: string;
    config?: Record<string, any>;
    latitude?: number;
    longitude?: number;
}
export interface AgentFilterOptions {
    type?: AgentType;
    status?: AgentStatus;
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'name';
    sortOrder?: 'asc' | 'desc';
}
export interface AgentListResult {
    agents: Agent[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}
/**
 * Create a new agent
 */
export declare function createAgent(userId: string, input: CreateAgentInput): Promise<Agent>;
/**
 * Generate initial personality config for an agent based on its scene type.
 * NP-268: Adopted by agentService.createAgent to bootstrap behavior guidelines.
 */
export declare function generateAgentPersonality(type: AgentType): {
    traits: string[];
    communicationStyle: string;
};
/**
 * Get agent by ID
 */
export declare function getAgentById(agentId: string, userId?: string): Promise<Agent | null>;
/**
 * Get agents by user ID
 */
export declare function getAgentsByUserId(userId: string, options?: AgentFilterOptions): Promise<AgentListResult>;
/**
 * Update agent
 */
export declare function updateAgent(agentId: string, userId: string, input: UpdateAgentInput): Promise<Agent>;
/**
 * Update agent status
 */
export declare function updateAgentStatus(agentId: string, userId: string, newStatus: AgentStatus): Promise<Agent>;
/**
 * Delete agent
 */
export declare function deleteAgent(agentId: string, userId: string): Promise<void>;
/**
 * Get agent status history
 */
export declare function getAgentStatusHistory(agentId: string, userId?: string): Promise<any[]>;
//# sourceMappingURL=agentService.d.ts.map