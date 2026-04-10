/**
 * Scene Template Service
 * 场景模板服务
 */

import { prisma } from '../db/client';
import {
  SceneTemplate,
  SceneTemplateConfig,
  SceneId,
  SCENE_IDS,
} from '@visionshare/shared';
import { logger } from '../utils/logger';
import { getSceneConfig } from '@visionshare/shared';

/**
 * Create a new template
 */
export async function createTemplate(
  userId: string,
  sceneId: SceneId,
  config: SceneTemplateConfig,
  isPublic: boolean = false
): Promise<SceneTemplate> {
  try {
    // Validate scene exists
    if (!SCENE_IDS.includes(sceneId)) {
      throw new Error(`Invalid scene ID: ${sceneId}`);
    }

    const template = await prisma.sceneTemplate.create({
      data: {
        userId,
        sceneId,
        name: config.name,
        description: config.description,
        isPreset: false,
        isDefault: config.isDefault || false,
        fieldValues: config.fieldValues as any,
        isPublic,
        usageCount: 0,
      },
    });

    logger.info('Template created', {
      id: template.id,
      userId,
      sceneId,
      name: config.name,
    });

    return {
      id: template.id,
      sceneId: template.sceneId as SceneId,
      userId: template.userId,
      name: template.name,
      description: template.description,
      isPreset: template.isPreset,
      isDefault: template.isDefault,
      fieldValues: template.fieldValues as Record<string, any>,
      isPublic: template.isPublic,
      usageCount: template.usageCount,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  } catch (error) {
    logger.error('Failed to create template', { error, userId, sceneId, config });
    throw error;
  }
}

/**
 * Get template by ID
 */
export async function getTemplate(
  id: string,
  userId?: string
): Promise<SceneTemplate | null> {
  try {
    const where: any = { id };

    // If userId provided, check ownership or public
    if (userId) {
      where.OR = [
        { userId },
        { isPublic: true },
      ];
    }

    const template = await prisma.sceneTemplate.findFirst({ where });

    if (!template) return null;

    return {
      id: template.id,
      sceneId: template.sceneId as SceneId,
      userId: template.userId,
      name: template.name,
      description: template.description,
      isPreset: template.isPreset,
      isDefault: template.isDefault,
      fieldValues: template.fieldValues as Record<string, any>,
      isPublic: template.isPublic,
      usageCount: template.usageCount,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  } catch (error) {
    logger.error('Failed to get template', { error, id });
    throw error;
  }
}

/**
 * Get templates for a scene
 */
export async function getTemplatesByScene(
  sceneId: SceneId,
  options?: {
    userId?: string;
    includePublic?: boolean;
    includePreset?: boolean;
    page?: number;
    limit?: number;
  }
): Promise<{ items: SceneTemplate[]; total: number }> {
  try {
    const where: any = { sceneId };

    if (options?.userId && options?.includePublic) {
      where.OR = [
        { userId: options.userId },
        { isPublic: true },
        { isPreset: true },
      ];
    } else if (options?.userId) {
      where.userId = options.userId;
    }

    if (options?.includePreset === false) {
      where.isPreset = false;
    }

    const [templates, total] = await Promise.all([
      prisma.sceneTemplate.findMany({
        where,
        skip: options?.page ? (options.page - 1) * (options?.limit || 20) : 0,
        take: options?.limit || 20,
        orderBy: [{ isDefault: 'desc' }, { usageCount: 'desc' }],
      }),
      prisma.sceneTemplate.count({ where }),
    ]);

    return {
      items: templates.map(t => ({
        id: t.id,
        sceneId: t.sceneId as SceneId,
        userId: t.userId,
        name: t.name,
        description: t.description,
        isPreset: t.isPreset,
        isDefault: t.isDefault,
        fieldValues: t.fieldValues as Record<string, any>,
        isPublic: t.isPublic,
        usageCount: t.usageCount,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      total,
    };
  } catch (error) {
    logger.error('Failed to get templates', { error, sceneId, options });
    throw error;
  }
}

/**
 * Get preset templates for a scene
 */
export async function getPresetTemplates(sceneId: SceneId): Promise<SceneTemplate[]> {
  const sceneConfig = getSceneConfig(sceneId);
  if (!sceneConfig) return [];

  // Convert config templates to full template objects
  return sceneConfig.templates.map(t => ({
    ...t,
    sceneId,
    userId: undefined,
    isPublic: true,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

/**
 * Update a template
 */
export async function updateTemplate(
  id: string,
  userId: string,
  updates: Partial<SceneTemplateConfig & { isPublic?: boolean }>
): Promise<SceneTemplate | null> {
  try {
    // Check ownership
    const existing = await prisma.sceneTemplate.findFirst({
      where: { id, userId },
    });

    if (!existing) return null;

    const updated = await prisma.sceneTemplate.update({
      where: { id },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.isDefault !== undefined && { isDefault: updates.isDefault }),
        ...(updates.fieldValues && { fieldValues: updates.fieldValues as any }),
        ...(updates.isPublic !== undefined && { isPublic: updates.isPublic }),
        updatedAt: new Date(),
      },
    });

    logger.info('Template updated', { id, userId });

    return {
      id: updated.id,
      sceneId: updated.sceneId as SceneId,
      userId: updated.userId,
      name: updated.name,
      description: updated.description,
      isPreset: updated.isPreset,
      isDefault: updated.isDefault,
      fieldValues: updated.fieldValues as Record<string, any>,
      isPublic: updated.isPublic,
      usageCount: updated.usageCount,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  } catch (error) {
    logger.error('Failed to update template', { error, id, userId });
    throw error;
  }
}

/**
 * Delete a template
 */
export async function deleteTemplate(
  id: string,
  userId: string
): Promise<boolean> {
  try {
    const existing = await prisma.sceneTemplate.findFirst({
      where: { id, userId },
    });

    if (!existing) return false;

    await prisma.sceneTemplate.delete({ where: { id } });

    logger.info('Template deleted', { id, userId });
    return true;
  } catch (error) {
    logger.error('Failed to delete template', { error, id, userId });
    throw error;
  }
}

/**
 * Apply template to agent profile
 */
export async function applyTemplate(
  templateId: string,
  agentId: string,
  userId: string
): Promise<{
  success: boolean;
  appliedFields: string[];
  skippedFields: string[];
}> {
  try {
    // Get template
    const template = await getTemplate(templateId, userId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Get agent profile
    const profile = await prisma.agentProfile.findFirst({
      where: { agentId },
    });

    if (!profile) {
      throw new Error('Agent profile not found');
    }

    // Get current L2 data
    const currentL2Data = (profile.l2Data as Record<string, any>) || {};

    // Merge template values with current data
    const newL2Data = {
      ...currentL2Data,
      ...template.fieldValues,
    };

    // Update profile
    await prisma.agentProfile.update({
      where: { id: profile.id },
      data: {
        l2Data: newL2Data,
      },
    });

    // Increment usage count
    if (!template.isPreset) {
      await prisma.sceneTemplate.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 } },
      });
    }

    const appliedFields = Object.keys(template.fieldValues);

    logger.info('Template applied', {
      templateId,
      agentId,
      userId,
      appliedFields,
    });

    return {
      success: true,
      appliedFields,
      skippedFields: [],
    };
  } catch (error) {
    logger.error('Failed to apply template', { error, templateId, agentId, userId });
    throw error;
  }
}

/**
 * Duplicate a template
 */
export async function duplicateTemplate(
  id: string,
  userId: string,
  newName?: string
): Promise<SceneTemplate | null> {
  try {
    const template = await getTemplate(id, userId);
    if (!template) return null;

    return await createTemplate(userId, template.sceneId, {
      name: newName || `${template.name} (复制)`,
      description: template.description,
      isDefault: false,
      fieldValues: template.fieldValues,
    }, false);
  } catch (error) {
    logger.error('Failed to duplicate template', { error, id, userId });
    throw error;
  }
}

/**
 * Set default template for user
 */
export async function setDefaultTemplate(
  templateId: string,
  userId: string,
  sceneId: SceneId
): Promise<boolean> {
  try {
    // Clear existing default for this scene
    await prisma.sceneTemplate.updateMany({
      where: { userId, sceneId, isDefault: true },
      data: { isDefault: false },
    });

    // Set new default
    const updated = await prisma.sceneTemplate.updateMany({
      where: { id: templateId, userId },
      data: { isDefault: true },
    });

    return updated.count > 0;
  } catch (error) {
    logger.error('Failed to set default template', { error, templateId, userId, sceneId });
    throw error;
  }
}

/**
 * Get default template for scene
 */
export async function getDefaultTemplate(
  sceneId: SceneId,
  userId: string
): Promise<SceneTemplate | null> {
  try {
    const template = await prisma.sceneTemplate.findFirst({
      where: {
        sceneId,
        userId,
        isDefault: true,
      },
    });

    if (!template) return null;

    return {
      id: template.id,
      sceneId: template.sceneId as SceneId,
      userId: template.userId,
      name: template.name,
      description: template.description,
      isPreset: template.isPreset,
      isDefault: template.isDefault,
      fieldValues: template.fieldValues as Record<string, any>,
      isPublic: template.isPublic,
      usageCount: template.usageCount,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  } catch (error) {
    logger.error('Failed to get default template', { error, sceneId, userId });
    throw error;
  }
}

/**
 * Share a template (make public)
 */
export async function shareTemplate(
  id: string,
  userId: string
): Promise<SceneTemplate | null> {
  return updateTemplate(id, userId, { isPublic: true });
}

/**
 * Search templates
 */
export async function searchTemplates(
  query: string,
  options?: {
    sceneId?: SceneId;
    page?: number;
    limit?: number;
  }
): Promise<{ items: SceneTemplate[]; total: number }> {
  try {
    const where: any = {
      isPublic: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (options?.sceneId) {
      where.sceneId = options.sceneId;
    }

    const [templates, total] = await Promise.all([
      prisma.sceneTemplate.findMany({
        where,
        skip: options?.page ? (options.page - 1) * (options?.limit || 20) : 0,
        take: options?.limit || 20,
        orderBy: { usageCount: 'desc' },
      }),
      prisma.sceneTemplate.count({ where }),
    ]);

    return {
      items: templates.map(t => ({
        id: t.id,
        sceneId: t.sceneId as SceneId,
        userId: t.userId,
        name: t.name,
        description: t.description,
        isPreset: t.isPreset,
        isDefault: t.isDefault,
        fieldValues: t.fieldValues as Record<string, any>,
        isPublic: t.isPublic,
        usageCount: t.usageCount,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      total,
    };
  } catch (error) {
    logger.error('Failed to search templates', { error, query, options });
    throw error;
  }
}
