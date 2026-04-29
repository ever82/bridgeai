import { AgeRange, EducationLevel, Gender, getL2Schema } from '@bridgeai/shared';
// Re-export for route usage
export { calculateL1Completion } from '../utils/profileCompletion';
import { prisma } from '../db/client';
import { AppError } from '../errors/AppError';
import { validateL2Data as schemaValidateL2Data } from '../utils/l2Validation';
/**
 * Get or create agent profile
 */
export async function getOrCreateProfile(agentId, sceneId) {
    // Check if agent exists
    const agent = await prisma.agent.findUnique({
        where: { id: agentId },
    });
    if (!agent) {
        throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
    }
    // Build where clause
    const where = { agentId };
    if (sceneId) {
        where.sceneId = sceneId;
    }
    else {
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
export async function getL1Profile(agentId, userId) {
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
export async function updateL1Profile(agentId, userId, data) {
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
        throw new AppError(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`, 'VALIDATION_ERROR', 400);
    }
    // Get or create profile
    const profile = await getOrCreateProfile(agentId);
    // Merge with existing data
    const updatedL1Data = {
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
    const updatedProfile = await prisma.$transaction(async (tx) => {
        const updated = await tx.agentProfile.update({
            where: { id: profile.id },
            data: {
                l1Data: updatedL1Data,
            },
        });
        await tx.profileHistory.create({
            data: {
                profileId: profile.id,
                layer: 'L1',
                action: 'update',
                oldValue: profile.l1Data,
                newValue: updatedL1Data,
                changedBy: userId,
            },
        });
        return updated;
    });
    return updatedProfile.l1Data || {};
}
/**
 * Get L2 profile for an agent
 */
export async function getL2Profile(agentId, userId) {
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
 * Get L2 profile for an agent by scene
 */
export async function getL2ProfileByScene(agentId, userId, sceneId) {
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
    const profile = await getOrCreateProfile(agentId, sceneId);
    return profile.l2Data;
}
/**
 * Update L2 profile
 */
export async function updateL2Profile(agentId, userId, data, sceneId) {
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
    // Schema-driven validation when sceneId is provided
    const effectiveSceneId = sceneId;
    if (effectiveSceneId) {
        const schema = getL2Schema(effectiveSceneId);
        if (schema) {
            const validation = schemaValidateL2Data(data, schema);
            if (!validation.valid) {
                throw new AppError(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`, 'VALIDATION_ERROR', 400);
            }
        }
    }
    // Get or create profile
    const profile = await getOrCreateProfile(agentId);
    // Merge with existing data
    const updatedL2Data = {
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
    const updatedProfile = await prisma.$transaction(async (tx) => {
        const updated = await tx.agentProfile.update({
            where: { id: profile.id },
            data: {
                l2Data: updatedL2Data,
            },
        });
        await tx.profileHistory.create({
            data: {
                profileId: profile.id,
                layer: 'L2',
                action: 'update',
                oldValue: profile.l2Data,
                newValue: updatedL2Data,
                changedBy: userId,
            },
        });
        return updated;
    });
    return updatedProfile.l2Data || {};
}
/**
 * Get L3 profile for an agent
 */
export async function getL3Profile(agentId, userId) {
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
export async function updateL3Profile(agentId, userId, data) {
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
        throw new AppError('L3 description must be less than 10000 characters', 'VALIDATION_ERROR', 400);
    }
    // Get or create profile
    const profile = await getOrCreateProfile(agentId);
    // Update profile and record change history atomically
    const updatedProfile = await prisma.$transaction(async (tx) => {
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
 * Validate L1 data
 */
function validateL1Data(data) {
    const errors = [];
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
function mapPrismaProfileToProfile(prismaProfile) {
    return {
        id: prismaProfile.id,
        agentId: prismaProfile.agentId,
        sceneId: prismaProfile.sceneId || undefined,
        l1Data: prismaProfile.l1Data,
        l2Data: prismaProfile.l2Data,
        l3Description: prismaProfile.l3Description,
        l3MediaUrls: prismaProfile.l3MediaUrls,
        sceneConfig: prismaProfile.sceneConfig,
        isActive: prismaProfile.isActive,
        createdAt: prismaProfile.createdAt,
        updatedAt: prismaProfile.updatedAt,
    };
}
//# sourceMappingURL=agentProfileService.js.map