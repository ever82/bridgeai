/**
 * Scene Migration Service
 * 场景迁移服务
 */

import { prisma } from '../db/client';
import {
  SceneMigration,
  SceneId,
  FieldMapping,
  FieldTransformation,
  SceneConfig,
} from '@bridgeai/shared';
import { getSceneConfig, SCENE_IDS } from '@bridgeai/shared';
import { logger } from '../utils/logger';

// Predefined migration rules between scenes
const MIGRATION_RULES: Record<string, Partial<SceneMigration>> = {
  'visionshare:agentdate': {
    fieldMappings: [
      { sourceField: 'content_type', targetField: 'interests' },
      { sourceField: 'style', targetField: 'personality_traits' },
      { sourceField: 'portfolio_url', targetField: 'about_me' },
    ],
    transformations: [
      { field: 'content_type', type: 'convert', config: { to: 'interests' } },
    ],
    warnings: ['内容类型需要手动映射到兴趣爱好'],
  },
  'visionshare:agentjob': {
    fieldMappings: [
      { sourceField: 'skills', targetField: 'skills' },
      { sourceField: 'experience_level', targetField: 'work_experience' },
      { sourceField: 'portfolio_url', targetField: 'portfolio_url' },
    ],
    transformations: [],
    warnings: [],
  },
  'agentdate:visionshare': {
    fieldMappings: [
      { sourceField: 'interests', targetField: 'content_type' },
      { sourceField: 'about_me', targetField: 'portfolio_url' },
    ],
    transformations: [],
    warnings: ['约会资料中的描述可能需要重新整理'],
  },
  'agentjob:visionshare': {
    fieldMappings: [
      { sourceField: 'skills', targetField: 'skills' },
      { sourceField: 'work_experience', targetField: 'experience_level' },
      { sourceField: 'portfolio_url', targetField: 'portfolio_url' },
    ],
    transformations: [],
    warnings: [],
  },
};

/**
 * Generate migration plan between two scenes
 */
export function generateMigrationPlan(
  fromScene: SceneId,
  toScene: SceneId
): SceneMigration {
  const fromConfig = getSceneConfig(fromScene);
  const toConfig = getSceneConfig(toScene);

  if (!fromConfig || !toConfig) {
    throw new Error('Invalid scene IDs');
  }

  // Check for predefined rules
  const ruleKey = `${fromScene}:${toScene}`;
  const predefinedRules = MIGRATION_RULES[ruleKey];

  // Auto-generate field mappings
  const autoMappings = generateAutoMappings(fromConfig, toConfig);

  // Auto-generate transformations
  const autoTransformations = generateAutoTransformations(fromConfig, toConfig);

  // Generate warnings
  const warnings = generateWarnings(fromConfig, toConfig);

  return {
    fromScene,
    toScene,
    fieldMappings: predefinedRules?.fieldMappings || autoMappings,
    transformations: predefinedRules?.transformations || autoTransformations,
    warnings: [...(predefinedRules?.warnings || []), ...warnings],
  };
}

/**
 * Auto-generate field mappings based on field names
 */
function generateAutoMappings(
  fromConfig: SceneConfig,
  toConfig: SceneConfig
): FieldMapping[] {
  const mappings: FieldMapping[] = [];
  const toFieldMap = new Map(toConfig.fields.map(f => [f.name, f]));

  for (const fromField of fromConfig.fields) {
    // Exact match
    if (toFieldMap.has(fromField.name)) {
      mappings.push({
        sourceField: fromField.name,
        targetField: fromField.name,
      });
      continue;
    }

    // Similar name match
    const similarField = toConfig.fields.find(
      toField =>
        toField.name.includes(fromField.name) ||
        fromField.name.includes(toField.name) ||
        toField.label.includes(fromField.label) ||
        fromField.label.includes(toField.label)
    );

    if (similarField) {
      mappings.push({
        sourceField: fromField.name,
        targetField: similarField.name,
      });
    }
  }

  return mappings;
}

/**
 * Auto-generate transformations based on type differences
 */
function generateAutoTransformations(
  fromConfig: SceneConfig,
  toConfig: SceneConfig
): FieldTransformation[] {
  const transformations: FieldTransformation[] = [];

  // Find fields with same name but different types
  for (const fromField of fromConfig.fields) {
    const toField = toConfig.fields.find(f => f.name === fromField.name);
    if (toField && fromField.type !== toField.type) {
      transformations.push({
        field: fromField.name,
        type: 'convert',
        config: {
          fromType: fromField.type,
          toType: toField.type,
        },
      });
    }
  }

  return transformations;
}

/**
 * Generate warnings for data loss
 */
function generateWarnings(
  fromConfig: SceneConfig,
  toConfig: SceneConfig
): string[] {
  const warnings: string[] = [];
  const toFieldNames = new Set(toConfig.fields.map(f => f.name));

  // Find fields that will be lost
  const lostFields = fromConfig.fields.filter(
    f => !toFieldNames.has(f.name)
  );

  if (lostFields.length > 0) {
    warnings.push(
      `以下字段在目标场景中不存在，将被丢弃: ${lostFields.map(f => f.label).join(', ')}`
    );
  }

  // Find required fields in target that don't have mappings
  const mappedFields = new Set(
    fromConfig.fields.map(f => f.name).filter(n => toFieldNames.has(n))
  );
  const unmappedRequired = toConfig.fields.filter(
    f => f.required && !mappedFields.has(f.name)
  );

  if (unmappedRequired.length > 0) {
    warnings.push(
      `以下必填字段需要手动填写: ${unmappedRequired.map(f => f.label).join(', ')}`
    );
  }

  return warnings;
}

/**
 * Preview migration result
 */
export async function previewMigration(
  agentId: string,
  fromScene: SceneId,
  toScene: SceneId
): Promise<{
  migration: SceneMigration;
  currentData: Record<string, any>;
  previewData: Record<string, any>;
  willLoseData: string[];
  needsManualInput: string[];
}> {
  // Get migration plan
  const migration = generateMigrationPlan(fromScene, toScene);

  // Get current profile data
  const profile = await prisma.agentProfile.findFirst({
    where: { agentId, sceneId: fromScene },
  });

  if (!profile) {
    throw new Error('Agent profile not found');
  }

  const currentData = (profile.l2Data as Record<string, any>) || {};

  // Apply transformations to create preview
  const previewData = applyMigrationTransformations(
    currentData,
    migration.fieldMappings,
    migration.transformations
  );

  // Find data that will be lost
  const toConfig = getSceneConfig(toScene);
  const toFieldNames = new Set(toConfig?.fields.map(f => f.name) || []);
  const willLoseData = Object.keys(currentData).filter(
    key => !toFieldNames.has(key)
  );

  // Find fields that need manual input
  const needsManualInput = toConfig?.fields
    .filter(f => f.required && !previewData[f.name])
    .map(f => f.name) || [];

  return {
    migration,
    currentData,
    previewData,
    willLoseData,
    needsManualInput,
  };
}

/**
 * Apply migration transformations
 */
function applyMigrationTransformations(
  data: Record<string, any>,
  mappings: FieldMapping[],
  transformations: FieldTransformation[]
): Record<string, any> {
  const result: Record<string, any> = {};

  // Apply field mappings
  for (const mapping of mappings) {
    if (data[mapping.sourceField] !== undefined) {
      result[mapping.targetField] = data[mapping.sourceField];
    }
  }

  // Apply transformations
  for (const transformation of transformations) {
    if (result[transformation.field] !== undefined) {
      result[transformation.field] = transformField(
        result[transformation.field],
        transformation
      );
    }
  }

  return result;
}

/**
 * Transform a single field
 */
function transformField(
  value: any,
  transformation: FieldTransformation
): any {
  switch (transformation.type) {
    case 'rename':
      // Renaming is handled by mapping
      return value;

    case 'convert':
      // Type conversion
      const { fromType, toType } = transformation.config;
      if (fromType === 'multiselect' && toType === 'select') {
        // Take first value
        return Array.isArray(value) ? value[0] : value;
      }
      if (fromType === 'select' && toType === 'multiselect') {
        // Wrap in array
        return value ? [value] : [];
      }
      return value;

    case 'merge':
      // Merge multiple fields
      const fields = transformation.config.fields as string[];
      return fields.map(f => value).join(' ');

    case 'split':
      // Split field
      const separator = transformation.config.separator as string;
      return value.split(separator);

    default:
      return value;
  }
}

/**
 * Execute migration
 */
export async function executeMigration(
  agentId: string,
  fromScene: SceneId,
  toScene: SceneId,
  manualData?: Record<string, any>
): Promise<{
  success: boolean;
  newProfileId: string;
  migratedFields: string[];
  lostFields: string[];
}> {
  try {
    // Preview first
    const preview = await previewMigration(agentId, fromScene, toScene);

    // Get agent
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Prepare final data
    const finalData = {
      ...preview.previewData,
      ...manualData,
    };

    // Create or update profile for target scene
    const existingProfile = await prisma.agentProfile.findFirst({
      where: { agentId, sceneId: toScene },
    });

    let newProfileId: string;

    if (existingProfile) {
      // Update existing
      await prisma.agentProfile.update({
        where: { id: existingProfile.id },
        data: {
          l2Data: finalData,
          updatedAt: new Date(),
        },
      });
      newProfileId = existingProfile.id;
    } else {
      // Create new
      const newProfile = await prisma.agentProfile.create({
        data: {
          agentId,
          sceneId: toScene,
          l1Data: {},
          l2Data: finalData,
        },
      });
      newProfileId = newProfile.id;
    }

    // Log migration
    logger.info('Scene migration executed', {
      agentId,
      fromScene,
      toScene,
      newProfileId,
    });

    return {
      success: true,
      newProfileId,
      migratedFields: Object.keys(preview.previewData),
      lostFields: preview.willLoseData,
    };
  } catch (error) {
    logger.error('Failed to execute migration', { error, agentId, fromScene, toScene });
    throw error;
  }
}

/**
 * Get migration history
 */
export async function getMigrationHistory(
  agentId: string
): Promise<
  Array<{
    id: string;
    fromScene: SceneId;
    toScene: SceneId;
    status: 'pending' | 'completed' | 'failed';
    createdAt: Date;
  }>
> {
  // In a real implementation, this would query a migration history table
  // For now, return empty
  return [];
}

/**
 * Validate if migration is possible
 */
export function validateMigration(
  fromScene: SceneId,
  toScene: SceneId
): {
  valid: boolean;
  reason?: string;
} {
  if (!SCENE_IDS.includes(fromScene)) {
    return { valid: false, reason: `Invalid source scene: ${fromScene}` };
  }

  if (!SCENE_IDS.includes(toScene)) {
    return { valid: false, reason: `Invalid target scene: ${toScene}` };
  }

  if (fromScene === toScene) {
    return { valid: false, reason: 'Source and target scenes are the same' };
  }

  return { valid: true };
}

/**
 * Estimate data loss
 */
export function estimateDataLoss(
  fromScene: SceneId,
  toScene: SceneId
): {
  willLoseData: boolean;
  lossPercentage: number;
  lostFields: string[];
} {
  const fromConfig = getSceneConfig(fromScene);
  const toConfig = getSceneConfig(toScene);

  if (!fromConfig || !toConfig) {
    return { willLoseData: false, lossPercentage: 0, lostFields: [] };
  }

  const toFieldNames = new Set(toConfig.fields.map(f => f.name));
  const lostFields = fromConfig.fields.filter(f => !toFieldNames.has(f.name));
  const lossPercentage = (lostFields.length / fromConfig.fields.length) * 100;

  return {
    willLoseData: lostFields.length > 0,
    lossPercentage,
    lostFields: lostFields.map(f => f.name),
  };
}
