import { VisibilityLevel } from '@bridgeai/shared';
import { prisma } from '../../db/client';
import { AppError } from '../../errors/AppError';
// Default privacy settings
const DEFAULT_PRIVACY_SETTINGS = {
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
};
/**
 * Get or create dating profile for an agent
 */
export async function getOrCreateProfile(agentId, userId) {
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
    // Check if profile exists
    let profile = await prisma.datingProfile.findUnique({
        where: { agentId },
    });
    if (!profile) {
        // Create default profile
        profile = await prisma.datingProfile.create({
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
export async function getProfileByAgentId(agentId, userId) {
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
    const profile = await prisma.datingProfile.findUnique({
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
export async function createProfile(data, userId) {
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
    const existing = await prisma.datingProfile.findUnique({
        where: { agentId: data.agentId },
    });
    if (existing) {
        throw new AppError('Dating profile already exists for this agent', 'PROFILE_EXISTS', 409);
    }
    // Validate data
    const validation = validateProfileData(data);
    if (!validation.valid) {
        throw new AppError(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`, 'VALIDATION_ERROR', 400);
    }
    // Calculate completeness
    const completeness = calculateCompleteness(data);
    // Create profile
    const profile = await prisma.datingProfile.create({
        data: {
            agentId: data.agentId,
            userId,
            basicConditions: data.basicConditions,
            personality: data.personality,
            interests: data.interests,
            lifestyle: data.lifestyle,
            expectations: data.expectations,
            description: data.description,
            privacySettings: {
                ...DEFAULT_PRIVACY_SETTINGS,
                ...data.privacySettings,
            },
            completenessScore: completeness.score,
            isComplete: completeness.isComplete,
        },
    });
    return mapPrismaProfileToProfile(profile);
}
/**
 * Update dating profile
 */
export async function updateProfile(agentId, userId, data) {
    // Check if profile exists
    const existing = await prisma.datingProfile.findUnique({
        where: { agentId },
    });
    if (!existing) {
        throw new AppError('Dating profile not found', 'PROFILE_NOT_FOUND', 404);
    }
    if (existing.userId !== userId) {
        throw new AppError('Unauthorized to update this profile', 'UNAUTHORIZED', 403);
    }
    // Validate data
    const validation = validateProfileData(data);
    if (!validation.valid) {
        throw new AppError(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`, 'VALIDATION_ERROR', 400);
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
        description: data.description !== undefined ? data.description : existing.description,
        privacySettings: data.privacySettings !== undefined
            ? { ...existing.privacySettings, ...data.privacySettings }
            : existing.privacySettings,
    };
    // Calculate completeness
    const completeness = calculateCompleteness({
        agentId,
        ...mergedData,
    });
    // Update profile
    const profile = await prisma.datingProfile.update({
        where: { agentId },
        data: {
            basicConditions: mergedData.basicConditions,
            personality: mergedData.personality,
            interests: mergedData.interests,
            lifestyle: mergedData.lifestyle,
            expectations: mergedData.expectations,
            description: mergedData.description,
            privacySettings: mergedData.privacySettings,
            completenessScore: completeness.score,
            isComplete: completeness.isComplete,
        },
    });
    return mapPrismaProfileToProfile(profile);
}
/**
 * Delete dating profile
 */
export async function deleteProfile(agentId, userId) {
    const profile = await prisma.datingProfile.findUnique({
        where: { agentId },
    });
    if (!profile) {
        throw new AppError('Dating profile not found', 'PROFILE_NOT_FOUND', 404);
    }
    if (profile.userId !== userId) {
        throw new AppError('Unauthorized to delete this profile', 'UNAUTHORIZED', 403);
    }
    await prisma.datingProfile.delete({
        where: { agentId },
    });
}
/**
 * Update AI extracted data
 */
export async function updateAIExtractedData(agentId, userId, extractedData, confidence) {
    const profile = await prisma.datingProfile.findUnique({
        where: { agentId },
    });
    if (!profile) {
        throw new AppError('Dating profile not found', 'PROFILE_NOT_FOUND', 404);
    }
    if (profile.userId !== userId) {
        throw new AppError('Unauthorized to update this profile', 'UNAUTHORIZED', 403);
    }
    const updated = await prisma.datingProfile.update({
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
export function checkCompleteness(profile) {
    const sections = [
        {
            name: 'basicConditions',
            weight: 25,
            check: (p) => p.basicConditions && Object.keys(p.basicConditions).length > 0,
        },
        {
            name: 'personality',
            weight: 15,
            check: (p) => p.personality && Object.keys(p.personality).length > 0,
        },
        {
            name: 'interests',
            weight: 20,
            check: (p) => p.interests && p.interests.interests && p.interests.interests.length > 0,
        },
        {
            name: 'lifestyle',
            weight: 20,
            check: (p) => p.lifestyle && Object.keys(p.lifestyle).length > 0,
        },
        {
            name: 'expectations',
            weight: 15,
            check: (p) => p.expectations && p.expectations.purpose,
        },
        {
            name: 'description',
            weight: 5,
            check: (p) => !!(p.description && p.description.length > 10),
        },
    ];
    let score = 0;
    const missingFields = [];
    sections.forEach(section => {
        if (section.check(profile)) {
            score += section.weight;
        }
        else {
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
function calculateCompleteness(data) {
    const result = checkCompleteness(data);
    return {
        score: result.score,
        isComplete: result.complete,
    };
}
/**
 * Validate profile data
 */
function validateProfileData(data) {
    const errors = [];
    // Validate agentId (required for create requests)
    if ('agentId' in data && data.agentId !== undefined) {
        if (typeof data.agentId !== 'string' || data.agentId.trim() === '') {
            errors.push({
                field: 'agentId',
                message: 'agentId must be a non-empty string',
            });
        }
        else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.agentId)) {
            errors.push({
                field: 'agentId',
                message: 'agentId must be a valid UUID',
            });
        }
    }
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
        if (data.basicConditions.education !== undefined) {
            if (typeof data.basicConditions.education !== 'string' || data.basicConditions.education.trim() === '') {
                errors.push({
                    field: 'basicConditions.education',
                    message: 'Education must be a non-empty string',
                });
            }
        }
        if (data.basicConditions.income !== undefined) {
            if (typeof data.basicConditions.income !== 'string' || data.basicConditions.income.trim() === '') {
                errors.push({
                    field: 'basicConditions.income',
                    message: 'Income must be a non-empty string',
                });
            }
        }
    }
    // Validate personality is an object
    if (data.personality !== undefined) {
        if (typeof data.personality !== 'object' || data.personality === null || Array.isArray(data.personality)) {
            errors.push({
                field: 'personality',
                message: 'Personality must be an object',
            });
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
        // Validate each interest has a category
        if (Array.isArray(data.interests.interests)) {
            data.interests.interests.forEach((interest, index) => {
                if (!interest || typeof interest !== 'object') {
                    errors.push({
                        field: `interests.interests[${index}]`,
                        message: 'Each interest must be an object',
                    });
                }
                else if (!interest.category || typeof interest.category !== 'string' || interest.category.trim() === '') {
                    errors.push({
                        field: `interests.interests[${index}].category`,
                        message: 'Each interest must have a non-empty category',
                    });
                }
            });
        }
    }
    // Validate lifestyle enum fields
    if (data.lifestyle) {
        const validSmokingValues = ['NEVER', 'OCCASIONALLY', 'REGULARLY', 'QUITTING', 'NO_PREFERENCE'];
        const validDrinkingValues = ['NEVER', 'SOCIALLY', 'REGULARLY', 'NO_PREFERENCE'];
        if (data.lifestyle.smoking !== undefined) {
            if (!validSmokingValues.includes(data.lifestyle.smoking)) {
                errors.push({
                    field: 'lifestyle.smoking',
                    message: `Smoking must be one of: ${validSmokingValues.join(', ')}`,
                });
            }
        }
        if (data.lifestyle.drinking !== undefined) {
            if (!validDrinkingValues.includes(data.lifestyle.drinking)) {
                errors.push({
                    field: 'lifestyle.drinking',
                    message: `Drinking must be one of: ${validDrinkingValues.join(', ')}`,
                });
            }
        }
    }
    // Validate privacy settings
    if (data.privacySettings) {
        const validVisibilityValues = ['PUBLIC', 'MATCHED_ONLY', 'VERIFIED_ONLY', 'PRIVATE'];
        if (data.privacySettings.profileVisibility !== undefined) {
            if (!validVisibilityValues.includes(data.privacySettings.profileVisibility)) {
                errors.push({
                    field: 'privacySettings.profileVisibility',
                    message: `Profile visibility must be one of: ${validVisibilityValues.join(', ')}`,
                });
            }
        }
    }
    // Validate expectations
    if (data.expectations) {
        if (data.expectations.purpose !== undefined) {
            if (typeof data.expectations.purpose !== 'string' || data.expectations.purpose.trim() === '') {
                errors.push({
                    field: 'expectations.purpose',
                    message: 'Purpose must be a non-empty string',
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
 * Map Prisma profile to DatingProfile interface
 */
function mapPrismaProfileToProfile(prismaProfile) {
    return {
        id: prismaProfile.id,
        agentId: prismaProfile.agentId,
        userId: prismaProfile.userId,
        basicConditions: prismaProfile.basicConditions,
        personality: prismaProfile.personality,
        interests: prismaProfile.interests,
        lifestyle: prismaProfile.lifestyle,
        expectations: prismaProfile.expectations,
        description: prismaProfile.description,
        aiExtractedData: prismaProfile.aiExtractedData,
        aiExtractionConfidence: prismaProfile.aiExtractionConfidence,
        privacySettings: prismaProfile.privacySettings,
        completenessScore: prismaProfile.completenessScore,
        qualityScore: prismaProfile.qualityScore,
        isActive: prismaProfile.isActive,
        isComplete: prismaProfile.isComplete,
        createdAt: prismaProfile.createdAt.toISOString(),
        updatedAt: prismaProfile.updatedAt.toISOString(),
    };
}
//# sourceMappingURL=profileService.js.map