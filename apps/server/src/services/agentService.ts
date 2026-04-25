import { AgentType, AgentStatus } from '@prisma/client';

import { prisma } from '../db/client';
import { AppError } from '../errors/AppError';

// Re-export Prisma enums for backward compatibility
export { AgentType, AgentStatus };

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
function isValidStatusTransition(currentStatus: AgentStatus, newStatus: AgentStatus): boolean {
  if (currentStatus === newStatus) return true;
  const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  return validTransitions.includes(newStatus);
}

/**
 * Sanitize agent name — strip HTML/script tags to prevent XSS storage.
 * Returns the stripped name.
 */
function sanitizeName(name: string): string {
  return name.replace(/<[^>]*>/g, '').trim();
}

/**
 * Validate latitude/longitude bounds (WGS84).
 */
function validateCoordinates(lat?: number, lon?: number): void {
  if (lat !== undefined && (lat < -90 || lat > 90)) {
    throw new AppError(
      `Invalid latitude: ${lat}. Must be between -90 and 90.`,
      'INVALID_COORDINATES',
      400
    );
  }
  if (lon !== undefined && (lon < -180 || lon > 180)) {
    throw new AppError(
      `Invalid longitude: ${lon}. Must be between -180 and 180.`,
      'INVALID_COORDINATES',
      400
    );
  }
}

/**
 * Validate and sanitize agent name, returns sanitized name.
 */
function validateAndSanitizeName(name: string, fieldName: string = 'name'): string {
  const trimmed = sanitizeName(name);
  if (trimmed.length === 0) {
    throw new AppError(`${fieldName} is required`, 'AGENT_NAME_REQUIRED', 400);
  }
  if (trimmed.length > 100) {
    throw new AppError(`${fieldName} must be less than 100 characters`, 'AGENT_NAME_TOO_LONG', 400);
  }
  return trimmed;
}

/**
 * Create a new agent
 */
export async function createAgent(userId: string, input: CreateAgentInput): Promise<Agent> {
  // Validate agent type
  if (!Object.values(AgentType).includes(input.type)) {
    throw new AppError(
      `Invalid agent type: ${input.type}. Valid types are: ${Object.values(AgentType).join(', ')}`,
      'INVALID_AGENT_TYPE',
      400
    );
  }

  // Validate and sanitize name (XSS prevention)
  const sanitizedName = validateAndSanitizeName(input.name);

  // Validate coordinates (WGS84 bounds)
  validateCoordinates(input.latitude, input.longitude);

  // Generate initial personality based on agent type
  const personality = generateAgentPersonality(input.type);
  const initialConfig = {
    ...(input.config || {}),
    personality,
  };

  const agent = await prisma.agent.create({
    data: {
      userId,
      type: input.type,
      name: sanitizedName,
      description: input.description || null,
      status: AgentStatus.DRAFT,
      config: initialConfig,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      isActive: true,
      statusHistory: {
        create: {
          status: AgentStatus.DRAFT,
          reason: 'Agent created',
        },
      },
    },
  });

  // NP-270/NP-271: Create initial profile for the agent (best-effort).
  // The profile is created empty via getOrCreateProfile and serves as the mechanism
  // for reading the owner's L1/L2/L3 data (NP-271). NP-277: any failure here is
  // intentionally swallowed so agent creation succeeds even with empty profile data.
  try {
    const { getOrCreateProfile } = await import('./agentProfileService');
    await getOrCreateProfile(agent.id);
  } catch {
    // Profile creation is best-effort, don't fail agent creation
  }

  return mapPrismaAgentToAgent(agent);
}

/**
 * Generate initial personality config for an agent based on its scene type.
 * NP-268: Adopted by agentService.createAgent to bootstrap behavior guidelines.
 */
export function generateAgentPersonality(type: AgentType): {
  traits: string[];
  communicationStyle: string;
} {
  switch (type) {
    case AgentType.VISIONSHARE:
      return { traits: ['地理敏感', '价格敏锐', '视觉导向'], communicationStyle: 'friendly' };
    case AgentType.AGENTDATE:
      return { traits: ['社交活跃', '情感细腻', '谨慎匹配'], communicationStyle: 'warm' };
    case AgentType.AGENTJOB:
      return { traits: ['技能导向', '效率优先', '职业敏感'], communicationStyle: 'professional' };
    case AgentType.AGENTAD:
      return { traits: ['消费敏感', '优惠追踪', '预算控制'], communicationStyle: 'direct' };
    case AgentType.DEMAND:
      return { traits: ['需求清晰', '匹配高效'], communicationStyle: 'direct' };
    case AgentType.SUPPLY:
      return { traits: ['资源丰富', '响应及时'], communicationStyle: 'professional' };
    default:
      return { traits: [], communicationStyle: 'neutral' };
  }
}

/**
 * Get agent by ID
 */
export async function getAgentById(agentId: string, userId?: string): Promise<Agent | null> {
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
    page: rawPage = 1,
    limit: rawLimit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  // Probe fix: enforce bounds on pagination parameters
  const page = Math.max(1, rawPage);
  const limit = Math.min(100, Math.max(1, rawLimit));

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

  // Validate and sanitize name if provided (XSS prevention)
  const sanitizedName = input.name !== undefined ? validateAndSanitizeName(input.name) : agent.name;

  // Validate coordinates if provided
  validateCoordinates(
    input.latitude !== undefined ? input.latitude : undefined,
    input.longitude !== undefined ? input.longitude : undefined
  );

  const updatedAgent = await prisma.agent.update({
    where: { id: agentId },
    data: {
      name: sanitizedName,
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
    data: {
      status: newStatus,
      statusHistory: {
        create: {
          status: newStatus,
          reason: `Status changed from ${currentStatus} to ${newStatus}`,
        },
      },
    },
  });

  return mapPrismaAgentToAgent(updatedAgent);
}

/**
 * Delete agent
 */
export async function deleteAgent(agentId: string, userId: string): Promise<void> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  if (agent.userId !== userId) {
    throw new AppError('Unauthorized to delete this agent', 'UNAUTHORIZED', 403);
  }

  // NP-276: Check for active matches before archiving.
  // Demand: OPEN/MATCHED considered active. Supply: AVAILABLE/BUSY considered active.
  const activeDemands = await prisma.demand.count({
    where: { agentId, status: { in: ['OPEN', 'MATCHED'] } },
  });
  const activeSupplies = await prisma.supply.count({
    where: { agentId, status: { in: ['AVAILABLE', 'BUSY'] } },
  });
  if (activeDemands > 0 || activeSupplies > 0) {
    throw new AppError(
      `Cannot archive agent: ${activeDemands + activeSupplies} active matches found. Please resolve them first.`,
      'AGENT_HAS_ACTIVE_MATCHES',
      409
    );
  }

  await prisma.agent.update({
    where: { id: agentId },
    data: {
      status: AgentStatus.ARCHIVED,
      isActive: false,
      statusHistory: {
        create: {
          status: AgentStatus.ARCHIVED,
          reason: 'Agent archived (soft delete)',
        },
      },
    },
  });
}

/**
 * Get agent status history
 */
export async function getAgentStatusHistory(agentId: string, userId?: string): Promise<any[]> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  // If userId is provided, verify ownership
  if (userId && agent.userId !== userId) {
    throw new AppError('Agent not found or access denied', 'AGENT_NOT_FOUND', 404);
  }

  const history = await prisma.agentStatusHistory.findMany({
    where: { agentId },
    orderBy: { createdAt: 'asc' },
  });

  return history.map((entry: { status: string; createdAt: Date; reason: string | null }) => ({
    status: entry.status,
    changedAt: entry.createdAt,
    reason: entry.reason,
  }));
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
