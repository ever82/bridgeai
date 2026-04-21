import type {
  DatingProfile,
  CreateDatingProfileRequest,
  UpdateDatingProfileRequest,
  BasicConditions,
  PersonalityPreferences,
  InterestPreferences,
  Lifestyle,
  RelationshipExpectations,
  PrivacySettings,
  ProfileQualityResult,
} from '@bridgeai/shared';
import { VisibilityLevel } from '@bridgeai/shared';

import { prisma } from '../../db/client';
import { AppError } from '../../errors/AppError';

// Prisma client with any-type alias for non-existent models
const _prisma = prisma as any;

// Default privacy settings
const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  profileVisibility: VisibilityLevel.PUBLIC,
  fieldVisibility: {
    basicInfo: VisibilityLevel.PUBLIC,
    photos: VisibilityLevel.PUBLIC,
    income: VisibilityLevel.MATCHED_ONLY,
    location: VisibilityLevel.MATCHED_ONLY,
    contactInfo: VisibilityLevel.PRIVATE,
    personalDetails: VisibilityLevel.PUBLIC,
  },
  allowScreenshot: false,
  showOnlineStatus: true,
  hideFromSearch: false,
} as unknown as PrivacySettings;

/**
 * Get or create dating profile for an agent
 */
export async function getOrCreateProfile(
  agentId: string,
  userId: string
): Promise<DatingProfile> {
  // Check if agent exists and belongs to user
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  if (agent.userId !== userId) {
    throw new AppError('Unauthorized to access this agent', 'UNAUTHORIZED', 403);
  }

  const _prisma = prisma as any;
// Check if profile exists
  let profile = await _prisma.datingProfile.findUnique({
    where: { agentId },
  });

  if (!profile) {
    // Create default profile
    profile = await _prisma.datingProfile.create({
      data: {
        agentId,
        userId,
        privacySettings: DEFAULT_PRIVACY_SETTINGS,
        isActive: true,
        isComplete: false,
      },
    });
  }

  return mapPrismaProfileToProfile(profile);
}

/**
 * Get dating profile by agent ID
 */
export async function getProfileByAgentId(
  agentId: string,
  userId: string
): Promise<DatingProfile | null> {
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

  const profile = await _prisma.datingProfile.findUnique({
    where: { agentId },
  });

  if (!profile) {
    return null;
  }

  return mapPrismaProfileToProfile(profile);
}

/**
 * Create a new dating profile
 */
export async function createProfile(
  data: CreateDatingProfileRequest,
  userId: string
): Promise<DatingProfile> {
  // Check if agent exists and belongs to user
  const agent = await prisma.agent.findUnique({
    where: { id: data.agentId },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  if (agent.userId !== userId) {
    throw new AppError('Unauthorized to create profile for this agent', 'UNAUTHORIZED', 403);
  }

  // Check if profile already exists
  const existing = await _prisma.datingProfile.findUnique({
    where: { agentId: data.agentId },
  });

  if (existing) {
    throw new AppError('Dating profile already exists for this agent', 'PROFILE_EXISTS', 409);
  }

  // Validate data
  const validation = validateProfileData(data as any);
  if (!validation.valid) {
    throw new AppError(
      `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
      'VALIDATION_ERROR',
      400
    );
  }

  // Calculate completeness
  const completeness = calculateCompleteness(data as unknown as Partial<DatingProfile>);

  // Create profile
  const profile = await _prisma.datingProfile.create({
    data: {
      agentId: data.agentId,
      userId,
      basicConditions: data.basicConditions as any,
      personality: data.personality as any,
      interests: data.interests as any,
      lifestyle: data.lifestyle as any,
      expectations: data.expectations as any,
      description: data.description,
      privacySettings: {
        ...DEFAULT_PRIVACY_SETTINGS,
        ...(data.privacySettings as any),
      } as any,
      completenessScore: completeness.score,
      isComplete: completeness.isComplete,
    } as any,
  });

  return mapPrismaProfileToProfile(profile);
}

/**
 * Update dating profile
 */
export async function updateProfile(
  agentId: string,
  userId: string,
  data: UpdateDatingProfileRequest
): Promise<DatingProfile> {
  // Check if profile exists
  const existing = await _prisma.datingProfile.findUnique({
    where: { agentId },
  });

  if (!existing) {
    throw new AppError('Dating profile not found', 'PROFILE_NOT_FOUND', 404);
  }

  if (existing.userId !== userId) {
    throw new AppError('Unauthorized to update this profile', 'UNAUTHORIZED', 403);
  }

  // Validate data
  const validation = validateProfileData(data as any);
  if (!validation.valid) {
    throw new AppError(
      `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
      'VALIDATION_ERROR',
      400
    );
  }

  // Merge with existing data
  const mergedData = {
    basicConditions: data.basicConditions !== undefined
      ? { ...existing.basicConditions, ...data.basicConditions }
      : existing.basicConditions,
    personality: data.personality !== undefined
      ? { ...existing.personality, ...data.personality }
      : existing.personality,
    interests: data.interests !== undefined
      ? { ...existing.interests, ...data.interests }
      : existing.interests,
    lifestyle: data.lifestyle !== undefined
      ? { ...existing.lifestyle, ...data.lifestyle }
      : existing.lifestyle,
    expectations: data.expectations !== undefined
      ? { ...existing.expectations, ...data.expectations }
      : existing.expectations,
    description: data.description !== undefined
      ? data.description
      : existing.description,
    privacySettings: data.privacySettings !== undefined
      ? { ...existing.privacySettings, ...(data.privacySettings as any) }
      : existing.privacySettings,
  } as any;

  // Calculate completeness
  const completeness = calculateCompleteness({
    agentId,
    ...mergedData,
  });

  // Update profile
  const profile = await _prisma.datingProfile.update({
    where: { agentId },
    data: {
      ...mergedData,
      completenessScore: completeness.score,
      isComplete: completeness.isComplete,
    } as any,
  });

  return mapPrismaProfileToProfile(profile);
}

/**
 * Delete dating profile
 */
export async function deleteProfile(
  agentId: string,
  userId: string
): Promise<void> {
  const profile = await _prisma.datingProfile.findUnique({
    where: { agentId },
  });

  if (!profile) {
    throw new AppError('Dating profile not found', 'PROFILE_NOT_FOUND', 404);
  }

  if (profile.userId !== userId) {
    throw new AppError('Unauthorized to delete this profile', 'UNAUTHORIZED', 403);
  }

  await _prisma.datingProfile.delete({
    where: { agentId },
  });
}

/**
 * Update AI extracted data
 */
export async function updateAIExtractedData(
  agentId: string,
  userId: string,
  extractedData: Record<string, any>,
  confidence: number
): Promise<DatingProfile> {
  const profile = await _prisma.datingProfile.findUnique({
    where: { agentId },
  });

  if (!profile) {
    throw new AppError('Dating profile not found', 'PROFILE_NOT_FOUND', 404);
  }

  if (profile.userId !== userId) {
    throw new AppError('Unauthorized to update this profile', 'UNAUTHORIZED', 403);
  }

  const updated = await _prisma.datingProfile.update({
    where: { agentId },
    data: {
      aiExtractedData: extractedData,
      aiExtractionConfidence: confidence,
    },
  });

  return mapPrismaProfileToProfile(updated);
}

/**
 * Check profile completeness
 */
export function checkCompleteness(profile: Partial<DatingProfile>): {
  complete: boolean;
  missingFields: string[];
  score: number;
} {
  const sections = [
    { name: 'basicConditions', weight: 25, check: (p: any) => p.basicConditions && Object.keys(p.basicConditions).length > 0 },
    { name: 'personality', weight: 15, check: (p: any) => p.personality && Object.keys(p.personality).length > 0 },
    { name: 'interests', weight: 20, check: (p: any) => p.interests && p.interests.interests && p.interests.interests.length > 0 },
    { name: 'lifestyle', weight: 20, check: (p: any) => p.lifestyle && Object.keys(p.lifestyle).length > 0 },
    { name: 'expectations', weight: 15, check: (p: any) => p.expectations && p.expectations.purpose },
    { name: 'description', weight: 5, check: (p: any) => p.description && p.description.length > 10 },
  ];

  let score = 0;
  const missingFields: string[] = [];

  sections.forEach(section => {
    if (section.check(profile)) {
      score += section.weight;
    } else {
      missingFields.push(section.name);
    }
  });

  return {
    complete: score >= 80,
    missingFields,
    score,
  };
}

/**
 * Calculate profile completeness
 */
function calculateCompleteness(data: Partial<DatingProfile>): {
  score: number;
  isComplete: boolean;
} {
  const result = checkCompleteness(data);
  return {
    score: result.score,
    isComplete: result.complete,
  };
}

/**
 * Validate profile data
 */
function validateProfileData(data: Partial<DatingProfile>): {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
} {
  const errors: Array<{ field: string; message: string }> = [];

  // Validate description length
  if (data.description !== undefined && data.description !== null) {
    if (data.description.length > 2000) {
      errors.push({
        field: 'description',
        message: 'Description must be less than 2000 characters',
      });
    }
  }

  // Validate basic conditions
  if (data.basicConditions) {
    const { location } = data.basicConditions;
    if (location && location.radiusKm !== undefined) {
      if (location.radiusKm < 0 || location.radiusKm > 500) {
        errors.push({
          field: 'basicConditions.location.radiusKm',
          message: 'Radius must be between 0 and 500 km',
        });
      }
    }
  }

  // Validate interests
  if (data.interests) {
    if (data.interests.interests && data.interests.interests.length > 20) {
      errors.push({
        field: 'interests.interests',
        message: 'Cannot have more than 20 interests',
      });
    }
    if (data.interests.customInterests && data.interests.customInterests.length > 10) {
      errors.push({
        field: 'interests.customInterests',
        message: 'Cannot have more than 10 custom interests',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Map Prisma profile to DatingProfile interface
 */
function mapPrismaProfileToProfile(prismaProfile: any): DatingProfile {
  return {
    id: prismaProfile.id,
    agentId: prismaProfile.agentId,
    userId: prismaProfile.userId,
    basicConditions: prismaProfile.basicConditions as BasicConditions | undefined,
    personality: prismaProfile.personality as PersonalityPreferences | undefined,
    interests: prismaProfile.interests as InterestPreferences | undefined,
    lifestyle: prismaProfile.lifestyle as Lifestyle | undefined,
    expectations: prismaProfile.expectations as RelationshipExpectations | undefined,
    description: prismaProfile.description,
    aiExtractedData: prismaProfile.aiExtractedData as Record<string, any> | undefined,
    aiExtractionConfidence: prismaProfile.aiExtractionConfidence,
    privacySettings: prismaProfile.privacySettings as PrivacySettings,
    completenessScore: prismaProfile.completenessScore,
    qualityScore: prismaProfile.qualityScore,
    isActive: prismaProfile.isActive,
    isComplete: prismaProfile.isComplete,
    createdAt: prismaProfile.createdAt.toISOString(),
    updatedAt: prismaProfile.updatedAt.toISOString(),
  };
}
