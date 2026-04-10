import { prisma } from '../db/client';
import { AppError } from '../errors/AppError';

// Agent Types
export enum AgentType {
  VISIONSHARE = 'VISIONSHARE',
  AGENTDATE = 'AGENTDATE',
  AGENTJOB = 'AGENTJOB',
  AGENTAD = 'AGENTAD',
}

// Agent Status
export enum AgentStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
}

// Agent interface
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

// Create Agent input
export interface CreateAgentInput {
  type: AgentType;
  name: string;
  description?: string;
  config?: Record<string, any>;
  latitude?: number;
  longitude?: number;
}

// Update Agent input
export interface UpdateAgentInput {
  name?: string;
  description?: string;
  config?: Record<string, any>;
  latitude?: number;
  longitude?: number;
}

// Agent filter options
export interface AgentFilterOptions {
  type?: AgentType;
  status?: AgentStatus;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

// Agent list result
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

// Valid status transitions
const VALID_STATUS_TRANSITIONS: Record<AgentStatus, AgentStatus[]> = {
  [AgentStatus.DRAFT]: [AgentStatus.ACTIVE, AgentStatus.ARCHIVED],
  [AgentStatus.ACTIVE]: [AgentStatus.PAUSED, AgentStatus.ARCHIVED],
  [AgentStatus.PAUSED]: [AgentStatus.ACTIVE, AgentStatus.ARCHIVED],
  [AgentStatus.ARCHIVED]: [], // Archived agents cannot transition to other states
};

/**
 * Validate status transition
 */
function isValidStatusTransition(
  currentStatus: AgentStatus,
  newStatus: AgentStatus
): boolean {
  if (currentStatus === newStatus) return true;
  const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  return validTransitions.includes(newStatus);
}

/**
 * Create a new agent
 */
export async function createAgent(
  userId: string,
  input: CreateAgentInput
): Promise<Agent> {
  // Validate agent type
  if (!Object.values(AgentType).includes(input.type)) {
    throw new AppError(
      `Invalid agent type: ${input.type}. Valid types are: ${Object.values(AgentType).join(', ')}`,
      'INVALID_AGENT_TYPE',
      400
    );
  }

  // Validate name
  if (!input.name || input.name.trim().length === 0) {
    throw new AppError('Agent name is required', 'AGENT_NAME_REQUIRED', 400);
  }

  if (input.name.length > 100) {
    throw new AppError('Agent name must be less than 100 characters', 'AGENT_NAME_TOO_LONG', 400);
  }

  const agent = await prisma.agent.create({
    data: {
      userId,
      type: input.type,
      name: input.name.trim(),
      description: input.description || null,
      status: AgentStatus.DRAFT,
      config: input.config || {},
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      isActive: true,
    },
  });

  return mapPrismaAgentToAgent(agent);
}

/**
 * Get agent by ID
 */
export async function getAgentById(
  agentId: string,
  userId?: string
): Promise<Agent | null> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) return null;

  // If userId is provided, verify ownership
  if (userId && agent.userId !== userId) {
    throw new AppError('Agent not found or access denied', 'AGENT_NOT_FOUND', 404);
  }

  return mapPrismaAgentToAgent(agent);
}

/**
 * Get agents by user ID
 */
export async function getAgentsByUserId(
  userId: string,
  options: AgentFilterOptions = {}
): Promise<AgentListResult> {
  const {
    type,
    status,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = { userId };
  if (type) where.type = type;
  if (status) where.status = status;

  // Get total count
  const total = await prisma.agent.count({ where });

  // Get agents
  const agents = await prisma.agent.findMany({
    where,
    skip,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
  });

  const totalPages = Math.ceil(total / limit);

  return {
    agents: agents.map(mapPrismaAgentToAgent),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Update agent
 */
export async function updateAgent(
  agentId: string,
  userId: string,
  input: UpdateAgentInput
): Promise<Agent> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  if (agent.userId !== userId) {
    throw new AppError('Unauthorized to update this agent', 'UNAUTHORIZED', 403);
  }

  // Validate name if provided
  if (input.name !== undefined) {
    if (input.name.trim().length === 0) {
      throw new AppError('Agent name is required', 'AGENT_NAME_REQUIRED', 400);
    }
    if (input.name.length > 100) {
      throw new AppError('Agent name must be less than 100 characters', 'AGENT_NAME_TOO_LONG', 400);
    }
  }

  const updatedAgent = await prisma.agent.update({
    where: { id: agentId },
    data: {
      name: input.name?.trim() ?? agent.name,
      description: input.description !== undefined ? input.description : agent.description,
      config: input.config !== undefined ? (input.config as any) : (agent.config as any),
      latitude: input.latitude !== undefined ? input.latitude : agent.latitude,
      longitude: input.longitude !== undefined ? input.longitude : agent.longitude,
    },
  });

  return mapPrismaAgentToAgent(updatedAgent);
}

/**
 * Update agent status
 */
export async function updateAgentStatus(
  agentId: string,
  userId: string,
  newStatus: AgentStatus
): Promise<Agent> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  if (agent.userId !== userId) {
    throw new AppError('Unauthorized to update this agent', 'UNAUTHORIZED', 403);
  }

  // Validate status transition
  const currentStatus = agent.status as AgentStatus;
  if (!isValidStatusTransition(currentStatus, newStatus)) {
    throw new AppError(
      `Invalid status transition from ${currentStatus} to ${newStatus}`,
      'INVALID_STATUS_TRANSITION',
      400
    );
  }

  const updatedAgent = await prisma.agent.update({
    where: { id: agentId },
    data: { status: newStatus },
  });

  return mapPrismaAgentToAgent(updatedAgent);
}

/**
 * Delete agent
 */
export async function deleteAgent(
  agentId: string,
  userId: string
): Promise<void> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  if (agent.userId !== userId) {
    throw new AppError('Unauthorized to delete this agent', 'UNAUTHORIZED', 403);
  }

  await prisma.agent.delete({
    where: { id: agentId },
  });
}

/**
 * Get agent status history (placeholder - would require a separate table for full implementation)
 */
export async function getAgentStatusHistory(agentId: string): Promise<any[]> {
  // This is a placeholder - in a full implementation, we would have a separate
  // AgentStatusHistory table to track all status changes
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { status: true, updatedAt: true },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  return [
    {
      status: agent.status,
      changedAt: agent.updatedAt,
    },
  ];
}

/**
 * Map Prisma agent to Agent interface
 */
function mapPrismaAgentToAgent(prismaAgent: any): Agent {
  return {
    id: prismaAgent.id,
    userId: prismaAgent.userId,
    type: prismaAgent.type as AgentType,
    name: prismaAgent.name,
    description: prismaAgent.description,
    status: prismaAgent.status as AgentStatus,
    config: prismaAgent.config as Record<string, any> | null,
    latitude: prismaAgent.latitude,
    longitude: prismaAgent.longitude,
    isActive: prismaAgent.isActive,
    createdAt: prismaAgent.createdAt,
    updatedAt: prismaAgent.updatedAt,
  };
}
