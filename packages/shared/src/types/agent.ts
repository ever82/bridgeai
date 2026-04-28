/**
 * Agent types shared between client and server
 */

export enum AgentType {
  VISIONSHARE = 'VISIONSHARE',
  AGENTDATE = 'AGENTDATE',
  AGENTJOB = 'AGENTJOB',
  AGENTAD = 'AGENTAD',
  DEMAND = 'DEMAND',
  SUPPLY = 'SUPPLY',
}

export enum AgentStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
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
  isPublic: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface CreateAgentRequest {
  type: AgentType;
  name: string;
  description?: string;
  avatar?: string;
  config?: Record<string, any>;
  latitude?: number;
  longitude?: number;
  isPublic?: boolean;
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  avatar?: string;
  config?: Record<string, any>;
  latitude?: number;
  longitude?: number;
  isPublic?: boolean;
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

// Agent type display names
export const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  [AgentType.VISIONSHARE]: 'Vision Share',
  [AgentType.AGENTDATE]: 'Agent Date',
  [AgentType.AGENTJOB]: 'Agent Job',
  [AgentType.AGENTAD]: 'Agent Ad',
  [AgentType.DEMAND]: 'Demand',
  [AgentType.SUPPLY]: 'Supply',
};

// Agent status display names
export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  [AgentStatus.DRAFT]: 'Draft',
  [AgentStatus.ACTIVE]: 'Active',
  [AgentStatus.PAUSED]: 'Paused',
  [AgentStatus.ARCHIVED]: 'Archived',
};

// Agent type colors for UI
export const AGENT_TYPE_COLORS: Record<AgentType, string> = {
  [AgentType.VISIONSHARE]: '#4CAF50',
  [AgentType.AGENTDATE]: '#E91E63',
  [AgentType.AGENTJOB]: '#2196F3',
  [AgentType.AGENTAD]: '#FF9800',
  [AgentType.DEMAND]: '#9C27B0',
  [AgentType.SUPPLY]: '#00BCD4',
};

// Agent status colors for UI
export const AGENT_STATUS_COLORS: Record<AgentStatus, string> = {
  [AgentStatus.DRAFT]: '#9E9E9E',
  [AgentStatus.ACTIVE]: '#4CAF50',
  [AgentStatus.PAUSED]: '#FFC107',
  [AgentStatus.ARCHIVED]: '#757575',
};

// Valid status transitions for UI
export const VALID_STATUS_TRANSITIONS: Record<AgentStatus, AgentStatus[]> = {
  [AgentStatus.DRAFT]: [AgentStatus.ACTIVE, AgentStatus.ARCHIVED],
  [AgentStatus.ACTIVE]: [AgentStatus.PAUSED, AgentStatus.ARCHIVED],
  [AgentStatus.PAUSED]: [AgentStatus.ACTIVE, AgentStatus.ARCHIVED],
  [AgentStatus.ARCHIVED]: [],
};
