import type {
  L1Profile,
  L2Profile,
  ProfileCompletionResult,
  UpdateL1ProfileRequest,
  UpdateL2ProfileRequest,
  UpdateL3ProfileRequest,
} from '@bridgeai/shared';
import { AgeRange, EducationLevel, Gender, L1_FIELD_WEIGHTS } from '@bridgeai/shared';

import { prisma } from '../db/client';
import { AppError } from '../errors/AppError';

// Agent Profile with L1, L2, L3 data
export interface AgentProfile {
  id: string;
  agentId: string;
  sceneId?: string;
  l1Data: L1Profile | null;
  l2Data: L2Profile | null;
  l3Description: string | null;
  sceneConfig: Record<string, any> | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get or create agent profile
 */
export async function getOrCreateProfile(agentId: string, sceneId?: string): Promise<AgentProfile> {
  // Check if agent exists
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  // Build where clause
  const where: any = { agentId };
  if (sceneId) {
    where.sceneId = sceneId;
  } else {
    // Get the base profile (without scene-specific config)
    where.sceneId = '';
  }

  let profile = await prisma.agentProfile.findFirst({
    where,
  });

  if (!profile) {
    // Create default profile
    profile = await prisma.agentProfile.create({
      data: {
        agentId,
        sceneId: sceneId || '',
        l1Data: {},
        l2Data: {},
        l3Description: null,
        sceneConfig: sceneId ? {} : null,
        isActive: true,
      },
    });
  }

  return mapPrismaProfileToProfile(profile);
}

/**
 * Get L1 profile for an agent
 */
export async function getL1Profile(agentId: string, userId: string): Promise<L1Profile | null> {
  // Verify agent ownership
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  if (agent.userId !== userId) {
    throw new AppError('Unauthorized to access this agent', 'UNAUTHORIZED', 403);
  }

  const profile = await getOrCreateProfile(agentId);
  return profile.l1Data;
}

/**
 * Update L1 profile
 */
export async function updateL1Profile(
  agentId: string,
  userId: string,
  data: UpdateL1ProfileRequest
): Promise<L1Profile> {
  // Verify agent ownership
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  if (agent.userId !== userId) {
    throw new AppError('Unauthorized to update this agent', 'UNAUTHORIZED', 403);
  }

  // Validate data
  const validation = validateL1Data(data);
  if (!validation.valid) {
    throw new AppError(
      `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
      'VALIDATION_ERROR',
      400
    );
  }

  // Get or create profile
  const profile = await getOrCreateProfile(agentId);

  // Merge with existing data
  const updatedL1Data: L1Profile = {
    ...profile.l1Data,
    ...data,
  };

  // Remove undefined fields
  Object.keys(updatedL1Data).forEach(key => {
    if (updatedL1Data[key] === undefined) {
      delete updatedL1Data[key];
    }
  });

  // Update profile
  const updatedProfile = await prisma.agentProfile.update({
    where: { id: profile.id },
    data: {
      l1Data: updatedL1Data as any,
    },
  });

  return (updatedProfile.l1Data as L1Profile) || {};
}

/**
 * Get L2 profile for an agent
 */
export async function getL2Profile(agentId: string, userId: string): Promise<L2Profile | null> {
  // Verify agent ownership
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  if (agent.userId !== userId) {
    throw new AppError('Unauthorized to access this agent', 'UNAUTHORIZED', 403);
  }

  const profile = await getOrCreateProfile(agentId);
  return profile.l2Data;
}

/**
 * Update L2 profile
 */
export async function updateL2Profile(
  agentId: string,
  userId: string,
  data: UpdateL2ProfileRequest
): Promise<L2Profile> {
  // Verify agent ownership
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  if (agent.userId !== userId) {
    throw new AppError('Unauthorized to update this agent', 'UNAUTHORIZED', 403);
  }

  // Get or create profile
  const profile = await getOrCreateProfile(agentId);

  // Merge with existing data
  const updatedL2Data: L2Profile = {
    ...profile.l2Data,
    ...data,
  };

  // Remove undefined fields
  Object.keys(updatedL2Data).forEach(key => {
    if (updatedL2Data[key] === undefined) {
      delete updatedL2Data[key];
    }
  });

  // Update profile
  const updatedProfile = await prisma.agentProfile.update({
    where: { id: profile.id },
    data: {
      l2Data: updatedL2Data as any,
    },
  });

  return (updatedProfile.l2Data as L2Profile) || {};
}

/**
 * Get L3 profile for an agent
 */
export async function getL3Profile(agentId: string, userId: string): Promise<string | null> {
  // Verify agent ownership
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  if (agent.userId !== userId) {
    throw new AppError('Unauthorized to access this agent', 'UNAUTHORIZED', 403);
  }

  const profile = await getOrCreateProfile(agentId);
  return profile.l3Description;
}

/**
 * Update L3 profile
 */
export async function updateL3Profile(
  agentId: string,
  userId: string,
  data: UpdateL3ProfileRequest
): Promise<string> {
  // Verify agent ownership
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  if (agent.userId !== userId) {
    throw new AppError('Unauthorized to update this agent', 'UNAUTHORIZED', 403);
  }

  // Validate description
  if (data.description !== undefined && data.description.length > 10000) {
    throw new AppError(
      'L3 description must be less than 10000 characters',
      'VALIDATION_ERROR',
      400
    );
  }

  // Get or create profile
  const profile = await getOrCreateProfile(agentId);

  // Update profile
  const updatedProfile = await prisma.agentProfile.update({
    where: { id: profile.id },
    data: {
      l3Description: data.description,
    },
  });

  return updatedProfile.l3Description || '';
}

/**
 * Calculate L1 profile completion
 */
export function calculateL1Completion(l1Data: L1Profile | null): ProfileCompletionResult {
  const fields = Object.keys(L1_FIELD_WEIGHTS) as (keyof L1Profile)[];
  const totalFields = fields.length;

  if (!l1Data) {
    return {
      l1Percentage: 0,
      l1FilledFields: 0,
      l1TotalFields: totalFields,
      l1MissingFields: fields,
      l1WeightedScore: 0,
    };
  }

  const filledFields = fields.filter(field => {
    const value = l1Data[field];
    return value !== undefined && value !== null && value !== '';
  });

  const missingFields = fields.filter(field => !filledFields.includes(field));

  // Calculate weighted score
  let weightedScore = 0;
  filledFields.forEach(field => {
    weightedScore += L1_FIELD_WEIGHTS[field];
  });

  // Calculate simple percentage
  const percentage = Math.round((filledFields.length / totalFields) * 100);

  return {
    l1Percentage: percentage,
    l1FilledFields: filledFields.length,
    l1TotalFields: totalFields,
    l1MissingFields: missingFields,
    l1WeightedScore: weightedScore,
  };
}

/**
 * Validate L1 data
 */
function validateL1Data(data: UpdateL1ProfileRequest): {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
} {
  const errors: Array<{ field: string; message: string }> = [];

  // Validate age enum
  if (data.age !== undefined) {
    if (!Object.values(AgeRange).includes(data.age)) {
      errors.push({
        field: 'age',
        message: `Invalid age value. Must be one of: ${Object.values(AgeRange).join(', ')}`,
      });
    }
  }

  // Validate gender enum
  if (data.gender !== undefined) {
    if (!Object.values(Gender).includes(data.gender)) {
      errors.push({
        field: 'gender',
        message: `Invalid gender value. Must be one of: ${Object.values(Gender).join(', ')}`,
      });
    }
  }

  // Validate education enum
  if (data.education !== undefined) {
    if (!Object.values(EducationLevel).includes(data.education)) {
      errors.push({
        field: 'education',
        message: `Invalid education value. Must be one of: ${Object.values(EducationLevel).join(', ')}`,
      });
    }
  }

  // Validate occupation length
  if (data.occupation !== undefined) {
    if (data.occupation.length > 100) {
      errors.push({
        field: 'occupation',
        message: 'Occupation must be less than 100 characters',
      });
    }
  }

  // Validate location
  if (data.location !== undefined) {
    if (!data.location.province || !data.location.city) {
      errors.push({
        field: 'location',
        message: 'Location must include province and city',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Map Prisma profile to AgentProfile interface
 */
function mapPrismaProfileToProfile(prismaProfile: any): AgentProfile {
  return {
    id: prismaProfile.id,
    agentId: prismaProfile.agentId,
    sceneId: prismaProfile.sceneId || undefined,
    l1Data: prismaProfile.l1Data as L1Profile | null,
    l2Data: prismaProfile.l2Data as L2Profile | null,
    l3Description: prismaProfile.l3Description,
    sceneConfig: prismaProfile.sceneConfig as Record<string, any> | null,
    isActive: prismaProfile.isActive,
    createdAt: prismaProfile.createdAt,
    updatedAt: prismaProfile.updatedAt,
  };
}
