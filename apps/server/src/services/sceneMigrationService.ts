/**
 * Scene Migration Service
 * 场景迁移服务
 */

import {
  SceneMigration,
  SceneId,
  FieldMapping,
  FieldTransformation,
  SceneConfig,
} from '@bridgeai/shared';
import { getSceneConfig, SCENE_IDS } from '@bridgeai/shared';

import { prisma } from '../db/client';
import { logger } from '../utils/logger';

// Predefined migration rules between scenes
const MIGRATION_RULES: Record<string, Partial<SceneMigration>> = {
  'visionshare:agentdate': {
    fieldMappings: [
      { sourceField: 'content_type', targetField: 'interests' },
      { sourceField: 'style', targetField: 'personality_traits' },
      { sourceField: 'portfolio_url', targetField: 'about_me' },
    ],
    transformations: [{ field: 'content_type', type: 'convert', config: { to: 'interests' } }],
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

  // agentad ↔ visionshare
  'visionshare:agentad': {
    fieldMappings: [
      { sourceField: 'content_type', targetField: 'product_category' },
      { sourceField: 'skills', targetField: 'key_features' },
      { sourceField: 'portfolio_url', targetField: 'website_url' },
      { sourceField: 'price_range', targetField: 'price_info' },
      { sourceField: 'availability', targetField: 'business_hours' },
    ],
    transformations: [
      { field: 'content_type', type: 'convert', config: { to: 'product_category' } },
    ],
    warnings: ['视觉内容类型需要手动映射到产品类别', '需要补充广告推广目标'],
  },
  'agentad:visionshare': {
    fieldMappings: [
      { sourceField: 'product_category', targetField: 'content_type' },
      { sourceField: 'key_features', targetField: 'skills' },
      { sourceField: 'website_url', targetField: 'portfolio_url' },
      { sourceField: 'price_info', targetField: 'price_range' },
    ],
    transformations: [
      { field: 'product_category', type: 'convert', config: { to: 'content_type' } },
    ],
    warnings: ['广告产品类别需要手动映射到视觉内容类型'],
  },

  // agentad ↔ agentdate
  'agentdate:agentad': {
    fieldMappings: [
      { sourceField: 'interests', targetField: 'product_category' },
      { sourceField: 'about_me', targetField: 'product_description' },
      { sourceField: 'occupation', targetField: 'product_name' },
      { sourceField: 'location_preference', targetField: 'location' },
    ],
    transformations: [
      {
        field: 'interests',
        type: 'convert',
        config: { fromType: 'multiselect', toType: 'select' },
      },
    ],
    warnings: ['约会兴趣需要手动映射到产品类别', '需要补充广告类型和推广目标'],
  },
  'agentad:agentdate': {
    fieldMappings: [
      { sourceField: 'product_category', targetField: 'interests' },
      { sourceField: 'product_description', targetField: 'about_me' },
      { sourceField: 'product_name', targetField: 'occupation' },
      { sourceField: 'location', targetField: 'location_preference' },
    ],
    transformations: [
      {
        field: 'product_category',
        type: 'convert',
        config: { fromType: 'select', toType: 'multiselect' },
      },
    ],
    warnings: ['产品类别需要手动映射到兴趣爱好', '需要补充约会目的和性别偏好'],
  },

  // agentad ↔ agentjob
  'agentjob:agentad': {
    fieldMappings: [
      { sourceField: 'skills', targetField: 'key_features' },
      { sourceField: 'career_summary', targetField: 'product_description' },
      { sourceField: 'portfolio_url', targetField: 'website_url' },
      { sourceField: 'expected_salary', targetField: 'budget_range' },
      { sourceField: 'work_location', targetField: 'location' },
    ],
    transformations: [],
    warnings: ['求职技能需要手动映射到产品特点', '需要补充广告类型和推广目标'],
  },
  'agentad:agentjob': {
    fieldMappings: [
      { sourceField: 'key_features', targetField: 'skills' },
      { sourceField: 'product_description', targetField: 'career_summary' },
      { sourceField: 'website_url', targetField: 'portfolio_url' },
      { sourceField: 'budget_range', targetField: 'expected_salary' },
      { sourceField: 'location', targetField: 'work_location' },
    ],
    transformations: [],
    warnings: ['广告产品特点需要手动映射到求职技能', '需要补充求职类型和职位类别'],
  },

  // agentdate ↔ agentjob
  'agentdate:agentjob': {
    fieldMappings: [
      { sourceField: 'occupation', targetField: 'job_category' },
      { sourceField: 'education', targetField: 'education' },
      { sourceField: 'about_me', targetField: 'career_summary' },
      { sourceField: 'interests', targetField: 'skills' },
      { sourceField: 'lifestyle', targetField: 'work_location' },
    ],
    transformations: [
      { field: 'interests', type: 'convert', config: { fromType: 'multiselect', toType: 'tags' } },
    ],
    warnings: ['约会职业需要手动映射到职位类别', '需要补充求职类型和目标职位'],
  },
  'agentjob:agentdate': {
    fieldMappings: [
      { sourceField: 'job_category', targetField: 'occupation' },
      { sourceField: 'education', targetField: 'education' },
      { sourceField: 'career_summary', targetField: 'about_me' },
      { sourceField: 'skills', targetField: 'interests' },
    ],
    transformations: [
      { field: 'skills', type: 'convert', config: { fromType: 'tags', toType: 'multiselect' } },
    ],
    warnings: ['求职技能需要手动映射到兴趣爱好', '需要补充约会目的和性别偏好'],
  },
};

/**
 * Generate migration plan between two scenes
 */
export function generateMigrationPlan(fromScene: SceneId, toScene: SceneId): SceneMigration {
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
function generateAutoMappings(fromConfig: SceneConfig, toConfig: SceneConfig): FieldMapping[] {
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
function generateWarnings(fromConfig: SceneConfig, toConfig: SceneConfig): string[] {
  const warnings: string[] = [];
  const toFieldNames = new Set(toConfig.fields.map(f => f.name));

  // Find fields that will be lost
  const lostFields = fromConfig.fields.filter(f => !toFieldNames.has(f.name));

  if (lostFields.length > 0) {
    warnings.push(
      `以下字段在目标场景中不存在，将被丢弃: ${lostFields.map(f => f.label).join(', ')}`
    );
  }

  // Find required fields in target that don't have mappings
  const mappedFields = new Set(fromConfig.fields.map(f => f.name).filter(n => toFieldNames.has(n)));
  const unmappedRequired = toConfig.fields.filter(f => f.required && !mappedFields.has(f.name));

  if (unmappedRequired.length > 0) {
    warnings.push(`以下必填字段需要手动填写: ${unmappedRequired.map(f => f.label).join(', ')}`);
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
  const willLoseData = Object.keys(currentData).filter(key => !toFieldNames.has(key));

  // Find fields that need manual input
  const needsManualInput =
    toConfig?.fields.filter(f => f.required && !previewData[f.name]).map(f => f.name) || [];

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
      result[transformation.field] = transformField(result[transformation.field], transformation);
    }
  }

  return result;
}

/**
 * Transform a single field
 */
function transformField(value: any, transformation: FieldTransformation): any {
  switch (transformation.type) {
    case 'rename':
      // Renaming is handled by mapping
      return value;

    case 'convert': {
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
    }

    case 'merge': {
      // Merge multiple fields
      const fields = transformation.config.fields as string[];
      return fields.map(() => value).join(' ');
    }

    case 'split': {
      // Split field
      const separator = transformation.config.separator as string;
      return value.split(separator);
    }

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
export async function getMigrationHistory(_agentId: string): Promise<
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
