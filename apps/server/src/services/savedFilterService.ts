/**
 * Saved Filter Service
 * 保存筛选器服务
 */

import { prisma } from '../db/client';
import { FilterDSL, SavedFilter, SavedFilterInput } from '@bridgeai/shared';
import { logger } from '../utils/logger';

/**
 * Create a saved filter
 */
export async function createSavedFilter(
  userId: string,
  input: SavedFilterInput
): Promise<SavedFilter> {
  try {
    const savedFilter = await prisma.savedFilter.create({
      data: {
        userId,
        name: input.name,
        description: input.description,
        category: input.category,
        filter: input.filter as any,
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
      filter: savedFilter.filter as FilterDSL,
      isPublic: savedFilter.isPublic,
      usageCount: savedFilter.usageCount,
      createdAt: savedFilter.createdAt,
      updatedAt: savedFilter.updatedAt,
    };
  } catch (error) {
    logger.error('Failed to create saved filter', { error, userId, input });
    throw error;
  }
}

/**
 * Get saved filter by ID
 */
export async function getSavedFilter(
  id: string,
  userId: string
): Promise<SavedFilter | null> {
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

    if (!savedFilter) return null;

    return {
      id: savedFilter.id,
      userId: savedFilter.userId,
      name: savedFilter.name,
      description: savedFilter.description,
      category: savedFilter.category,
      filter: savedFilter.filter as FilterDSL,
      isPublic: savedFilter.isPublic,
      usageCount: savedFilter.usageCount,
      createdAt: savedFilter.createdAt,
      updatedAt: savedFilter.updatedAt,
    };
  } catch (error) {
    logger.error('Failed to get saved filter', { error, id, userId });
    throw error;
  }
}

/**
 * Get all saved filters for a user
 */
export async function getSavedFiltersByUser(
  userId: string,
  options?: {
    category?: string;
    includePublic?: boolean;
    page?: number;
    limit?: number;
  }
): Promise<{ items: SavedFilter[]; total: number }> {
  try {
    const where: any = {};

    if (options?.category) {
      where.category = options.category;
    }

    if (options?.includePublic) {
      where.OR = [
        { userId },
        { isPublic: true },
      ];
    } else {
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
        filter: f.filter as FilterDSL,
        isPublic: f.isPublic,
        usageCount: f.usageCount,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
      total,
    };
  } catch (error) {
    logger.error('Failed to get saved filters', { error, userId, options });
    throw error;
  }
}

/**
 * Update a saved filter
 */
export async function updateSavedFilter(
  id: string,
  userId: string,
  input: Partial<SavedFilterInput>
): Promise<SavedFilter | null> {
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
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.filter && { filter: input.filter as any }),
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
      filter: updated.filter as FilterDSL,
      isPublic: updated.isPublic,
      usageCount: updated.usageCount,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  } catch (error) {
    logger.error('Failed to update saved filter', { error, id, userId });
    throw error;
  }
}

/**
 * Delete a saved filter
 */
export async function deleteSavedFilter(
  id: string,
  userId: string
): Promise<boolean> {
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
  } catch (error) {
    logger.error('Failed to delete saved filter', { error, id, userId });
    throw error;
  }
}

/**
 * Increment usage count
 */
export async function incrementUsageCount(id: string): Promise<void> {
  try {
    await prisma.savedFilter.update({
      where: { id },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to increment usage count', { error, id });
  }
}

/**
 * Get popular saved filters
 */
export async function getPopularSavedFilters(
  limit: number = 10
): Promise<SavedFilter[]> {
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
      filter: f.filter as FilterDSL,
      isPublic: f.isPublic,
      usageCount: f.usageCount,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));
  } catch (error) {
    logger.error('Failed to get popular saved filters', { error, limit });
    throw error;
  }
}

/**
 * Share a saved filter
 */
export async function shareSavedFilter(
  id: string,
  userId: string
): Promise<string | null> {
  try {
    const filter = await prisma.savedFilter.findFirst({
      where: { id, userId },
    });

    if (!filter) {
      return null;
    }

    // Generate share token
    const shareToken = `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // In production, store this token and link it to the filter
    // For now, just return a URL
    return `/filters/shared/${shareToken}`;
  } catch (error) {
    logger.error('Failed to share saved filter', { error, id, userId });
    return null;
  }
}

/**
 * Duplicate a saved filter
 */
export async function duplicateSavedFilter(
  id: string,
  userId: string,
  newName?: string
): Promise<SavedFilter | null> {
  try {
    const existing = await getSavedFilter(id, userId);

    if (!existing) {
      return null;
    }

    const input: SavedFilterInput = {
      name: newName || `${existing.name} (复制)`,
      description: existing.description,
      category: existing.category,
      filter: existing.filter,
      isPublic: false,
    };

    return await createSavedFilter(userId, input);
  } catch (error) {
    logger.error('Failed to duplicate saved filter', { error, id, userId });
    throw error;
  }
}
