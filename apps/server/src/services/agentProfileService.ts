import type {
  L1Profile,
  L2Profile,
  UpdateL1ProfileRequest,
  UpdateL2ProfileRequest,
  UpdateL3ProfileRequest,
} from '@bridgeai/shared';
import { AgeRange, EducationLevel, Gender } from '@bridgeai/shared';

// Re-export for route usage
export { calculateL1Completion } from '../utils/profileCompletion';

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
  l3MediaUrls: string[] | null;
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
    where.sceneId = null;
  }

  let profile = await prisma.agentProfile.findFirst({
    where,
  });

  if (!profile) {
    // Create default profile
    profile = await prisma.agentProfile.create({
      data: {
        agentId,
        sceneId: sceneId || null,
        l1Data: {},
        l2Data: {},
        l3Description: null,
        l3MediaUrls: null,
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

  // Update profile and record change history atomically
  const updatedProfile = await prisma.$transaction(async tx => {
    const updated = await tx.agentProfile.update({
      where: { id: profile.id },
      data: {
        l1Data: updatedL1Data as any,
      },
    });
    await tx.profileHistory.create({
      data: {
        profileId: profile.id,
        layer: 'L1',
        action: 'update',
        oldValue: profile.l1Data as any,
        newValue: updatedL1Data as any,
        changedBy: userId,
      },
    });
    return updated;
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

  // Validate data
  const validation = validateL2Data(data);
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

  // Update profile and record change history atomically
  const updatedProfile = await prisma.$transaction(async tx => {
    const updated = await tx.agentProfile.update({
      where: { id: profile.id },
      data: {
        l2Data: updatedL2Data as any,
      },
    });
    await tx.profileHistory.create({
      data: {
        profileId: profile.id,
        layer: 'L2',
        action: 'update',
        oldValue: profile.l2Data as any,
        newValue: updatedL2Data as any,
        changedBy: userId,
      },
    });
    return updated;
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

  // Update profile and record change history atomically
  const updatedProfile = await prisma.$transaction(async tx => {
    const updated = await tx.agentProfile.update({
      where: { id: profile.id },
      data: {
        l3Description: data.description,
        l3MediaUrls: data.mediaUrls ?? null,
      },
    });
    await tx.profileHistory.create({
      data: {
        profileId: profile.id,
        layer: 'L3',
        action: 'update',
        oldValue: { description: profile.l3Description, mediaUrls: profile.l3MediaUrls },
        newValue: { description: data.description, mediaUrls: data.mediaUrls ?? null },
        changedBy: userId,
      },
    });
    return updated;
  });

  return updatedProfile.l3Description || '';
}

/**
 * Validate L2 data
 */
function validateL2Data(data: UpdateL2ProfileRequest): {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
} {
  const errors: Array<{ field: string; message: string }> = [];

  // Validate description length
  if (data.description !== undefined) {
    if (data.description.length > 2000) {
      errors.push({
        field: 'description',
        message: 'Description must be less than 2000 characters',
      });
    }
  }

  // Validate requirements array
  if (data.requirements !== undefined) {
    if (!Array.isArray(data.requirements)) {
      errors.push({
        field: 'requirements',
        message: 'Requirements must be an array',
      });
    } else {
      for (let i = 0; i < data.requirements.length; i++) {
        if (typeof data.requirements[i] !== 'string' || data.requirements[i].length > 200) {
          errors.push({
            field: `requirements[${i}]`,
            message: 'Each requirement must be a string under 200 characters',
          });
        }
      }
      if (data.requirements.length > 20) {
        errors.push({
          field: 'requirements',
          message: 'Requirements must have at most 20 items',
        });
      }
    }
  }

  // Validate capabilities array
  if (data.capabilities !== undefined) {
    if (!Array.isArray(data.capabilities)) {
      errors.push({
        field: 'capabilities',
        message: 'Capabilities must be an array',
      });
    } else {
      for (let i = 0; i < data.capabilities.length; i++) {
        if (typeof data.capabilities[i] !== 'string' || data.capabilities[i].length > 200) {
          errors.push({
            field: `capabilities[${i}]`,
            message: 'Each capability must be a string under 200 characters',
          });
        }
      }
      if (data.capabilities.length > 20) {
        errors.push({
          field: 'capabilities',
          message: 'Capabilities must have at most 20 items',
        });
      }
    }
  }

  // Validate preferences array
  if (data.preferences !== undefined) {
    if (!Array.isArray(data.preferences)) {
      errors.push({
        field: 'preferences',
        message: 'Preferences must be an array',
      });
    } else {
      for (let i = 0; i < data.preferences.length; i++) {
        if (typeof data.preferences[i] !== 'string' || data.preferences[i].length > 200) {
          errors.push({
            field: `preferences[${i}]`,
            message: 'Each preference must be a string under 200 characters',
          });
        }
      }
      if (data.preferences.length > 20) {
        errors.push({
          field: 'preferences',
          message: 'Preferences must have at most 20 items',
        });
      }
    }
  }

  // Validate constraints array
  if (data.constraints !== undefined) {
    if (!Array.isArray(data.constraints)) {
      errors.push({
        field: 'constraints',
        message: 'Constraints must be an array',
      });
    } else {
      for (let i = 0; i < data.constraints.length; i++) {
        if (typeof data.constraints[i] !== 'string' || data.constraints[i].length > 200) {
          errors.push({
            field: `constraints[${i}]`,
            message: 'Each constraint must be a string under 200 characters',
          });
        }
      }
      if (data.constraints.length > 20) {
        errors.push({
          field: 'constraints',
          message: 'Constraints must have at most 20 items',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
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
    l3MediaUrls: prismaProfile.l3MediaUrls as string[] | null,
    sceneConfig: prismaProfile.sceneConfig as Record<string, any> | null,
    isActive: prismaProfile.isActive,
    createdAt: prismaProfile.createdAt,
    updatedAt: prismaProfile.updatedAt,
  };
}
