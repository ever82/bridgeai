import {
  Agent,
  AgentType,
  AgentStatus,
  AgentListResponse,
  CreateAgentRequest,
  UpdateAgentRequest,
} from '@bridgeai/shared';

import { api } from './client';

interface GetAgentsParams {
  page?: number;
  limit?: number;
  type?: AgentType;
  status?: AgentStatus;
  search?: string;
  ownerId?: string;
}

export const agentsApi = {
  getAgents: (params?: GetAgentsParams) => api.get<AgentListResponse>('/agents', { params }),

  getAgent: (agentId: string) => api.get<{ data: Agent }>(`/agents/${agentId}`),

  createAgent: (data: CreateAgentRequest) => api.post<{ data: Agent }>('/agents', data),

  updateAgent: (agentId: string, data: UpdateAgentRequest) =>
    api.patch<{ data: Agent }>(`/agents/${agentId}`, data),

  deleteAgent: (agentId: string) => api.delete<void>(`/agents/${agentId}`),

  updateAgentStatus: (agentId: string, status: AgentStatus) =>
    api.patch<{ data: Agent }>(`/agents/${agentId}/status`, { status }),
};
