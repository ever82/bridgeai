/**
 * Agent types shared between client and server
 */
export declare enum AgentType {
    VISIONSHARE = "VISIONSHARE",
    AGENTDATE = "AGENTDATE",
    AGENTJOB = "AGENTJOB",
    AGENTAD = "AGENTAD"
}
export declare enum AgentStatus {
    DRAFT = "DRAFT",
    ACTIVE = "ACTIVE",
    PAUSED = "PAUSED",
    ARCHIVED = "ARCHIVED"
}
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
    createdAt: string;
    updatedAt: string;
}
export interface CreateAgentRequest {
    type: AgentType;
    name: string;
    description?: string;
    config?: Record<string, any>;
    latitude?: number;
    longitude?: number;
}
export interface UpdateAgentRequest {
    name?: string;
    description?: string;
    config?: Record<string, any>;
    latitude?: number;
    longitude?: number;
}
export interface UpdateAgentStatusRequest {
    status: AgentStatus;
}
export interface AgentListResponse {
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
export interface AgentFilterOptions {
    type?: AgentType;
    status?: AgentStatus;
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'name';
    sortOrder?: 'asc' | 'desc';
}
export interface AgentStatusHistoryEntry {
    status: AgentStatus;
    changedAt: string;
}
export declare const AGENT_TYPE_LABELS: Record<AgentType, string>;
export declare const AGENT_STATUS_LABELS: Record<AgentStatus, string>;
export declare const AGENT_TYPE_COLORS: Record<AgentType, string>;
export declare const AGENT_STATUS_COLORS: Record<AgentStatus, string>;
export declare const VALID_STATUS_TRANSITIONS: Record<AgentStatus, AgentStatus[]>;
//# sourceMappingURL=agent.d.ts.map