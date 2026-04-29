/**
 * Saved Filter Service
 * 保存筛选器服务
 */
import crypto from 'crypto';
import { prisma } from '../db/client';
import { logger } from '../utils/logger';
/**
 * Create a saved filter
 */
export async function createSavedFilter(userId, input) {
    try {
        const savedFilter = await prisma.savedFilter.create({
            data: {
                userId,
                name: input.name,
                description: input.description,
                category: input.category,
                filter: input.filter,
                isPublic: input.isPublic || false,
                usageCount: 0,
            },
        });
        logger.info('Saved filter created', {
            id: savedFilter.id,
            userId,
            name: input.name,
        });
        return {
            id: savedFilter.id,
            userId: savedFilter.userId,
            name: savedFilter.name,
            description: savedFilter.description,
            category: savedFilter.category,
            filter: savedFilter.filter,
            isPublic: savedFilter.isPublic,
            usageCount: savedFilter.usageCount,
            createdAt: savedFilter.createdAt,
            updatedAt: savedFilter.updatedAt,
        };
    }
    catch (error) {
        logger.error('Failed to create saved filter', { error, userId, input });
        throw error;
    }
}
/**
 * Get saved filter by ID
 */
export async function getSavedFilter(id, userId) {
    try {
        const savedFilter = await prisma.savedFilter.findFirst({
            where: {
                id,
                OR: [
                    { userId },
                    { isPublic: true },
                ],
            },
        });
        if (!savedFilter)
            return null;
        return {
            id: savedFilter.id,
            userId: savedFilter.userId,
            name: savedFilter.name,
            description: savedFilter.description,
            category: savedFilter.category,
            filter: savedFilter.filter,
            isPublic: savedFilter.isPublic,
            usageCount: savedFilter.usageCount,
            createdAt: savedFilter.createdAt,
            updatedAt: savedFilter.updatedAt,
        };
    }
    catch (error) {
        logger.error('Failed to get saved filter', { error, id, userId });
        throw error;
    }
}
/**
 * Get all saved filters for a user
 */
export async function getSavedFiltersByUser(userId, options) {
    try {
        const where = {};
        if (options?.category) {
            where.category = options.category;
        }
        if (options?.includePublic) {
            where.OR = [
                { userId },
                { isPublic: true },
            ];
        }
        else {
            where.userId = userId;
        }
        const [filters, total] = await Promise.all([
            prisma.savedFilter.findMany({
                where,
                skip: options?.page ? (options.page - 1) * (options?.limit || 20) : 0,
                take: options?.limit || 20,
                orderBy: { usageCount: 'desc' },
            }),
            prisma.savedFilter.count({ where }),
        ]);
        return {
            items: filters.map(f => ({
                id: f.id,
                userId: f.userId,
                name: f.name,
                description: f.description,
                category: f.category,
                filter: f.filter,
                isPublic: f.isPublic,
                usageCount: f.usageCount,
                createdAt: f.createdAt,
                updatedAt: f.updatedAt,
            })),
            total,
        };
    }
    catch (error) {
        logger.error('Failed to get saved filters', { error, userId, options });
        throw error;
    }
}
/**
 * Update a saved filter
 */
export async function updateSavedFilter(id, userId, input) {
    try {
        // Check ownership
        const existing = await prisma.savedFilter.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return null;
        }
        const updated = await prisma.savedFilter.update({
            where: { id },
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.category !== undefined && { category: input.category }),
                ...(input.filter && { filter: input.filter }),
                ...(input.isPublic !== undefined && { isPublic: input.isPublic }),
                updatedAt: new Date(),
            },
        });
        logger.info('Saved filter updated', { id, userId });
        return {
            id: updated.id,
            userId: updated.userId,
            name: updated.name,
            description: updated.description,
            category: updated.category,
            filter: updated.filter,
            isPublic: updated.isPublic,
            usageCount: updated.usageCount,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
        };
    }
    catch (error) {
        logger.error('Failed to update saved filter', { error, id, userId });
        throw error;
    }
}
/**
 * Delete a saved filter
 */
export async function deleteSavedFilter(id, userId) {
    try {
        const existing = await prisma.savedFilter.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return false;
        }
        await prisma.savedFilter.delete({
            where: { id },
        });
        logger.info('Saved filter deleted', { id, userId });
        return true;
    }
    catch (error) {
        logger.error('Failed to delete saved filter', { error, id, userId });
        throw error;
    }
}
/**
 * Increment usage count
 */
export async function incrementUsageCount(id) {
    try {
        await prisma.savedFilter.update({
            where: { id },
            data: {
                usageCount: {
                    increment: 1,
                },
            },
        });
    }
    catch (error) {
        logger.error('Failed to increment usage count', { error, id });
    }
}
/**
 * Get popular saved filters
 */
export async function getPopularSavedFilters(limit = 10) {
    try {
        const filters = await prisma.savedFilter.findMany({
            where: { isPublic: true },
            orderBy: { usageCount: 'desc' },
            take: limit,
        });
        return filters.map(f => ({
            id: f.id,
            userId: f.userId,
            name: f.name,
            description: f.description,
            category: f.category,
            filter: f.filter,
            isPublic: f.isPublic,
            usageCount: f.usageCount,
            createdAt: f.createdAt,
            updatedAt: f.updatedAt,
        }));
    }
    catch (error) {
        logger.error('Failed to get popular saved filters', { error, limit });
        throw error;
    }
}
/**
 * Share a saved filter
 */
export async function shareSavedFilter(id, userId) {
    try {
        const filter = await prisma.savedFilter.findFirst({
            where: { id, userId },
        });
        if (!filter) {
            return null;
        }
        // Generate crypto-secure share token
        const shareToken = crypto.randomBytes(16).toString('hex');
        // Store share token on the filter record
        await prisma.savedFilter.update({
            where: { id },
            data: {
                shareToken,
                updatedAt: new Date(),
            },
        });
        return `/filters/shared/${shareToken}`;
    }
    catch (error) {
        logger.error('Failed to share saved filter', { error, id, userId });
        return null;
    }
}
/**
 * Duplicate a saved filter
 */
export async function duplicateSavedFilter(id, userId, newName) {
    try {
        const existing = await getSavedFilter(id, userId);
        if (!existing) {
            return null;
        }
        const input = {
            name: newName || `${existing.name} (复制)`,
            description: existing.description,
            category: existing.category,
            filter: existing.filter,
            isPublic: false,
        };
        return await createSavedFilter(userId, input);
    }
    catch (error) {
        logger.error('Failed to duplicate saved filter', { error, id, userId });
        throw error;
    }
}
//# sourceMappingURL=savedFilterService.js.map