/**
 * Scene Routes
 * 场景配置路由
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  getSceneConfig,
  getAllSceneConfigs,
  getActiveSceneConfigs,
  getSceneInfo,
  getAllSceneInfos,
  hasScene,
  SCENE_IDS,
} from '@visionshare/shared';
import {
  getEnabledCapabilities,
  getCapabilityStatus,
  getSceneCapabilitiesSummary,
  isCapabilityEnabled,
  areAllCapabilitiesEnabled,
} from '../services/sceneCapabilityService';
import {
  getTemplatesByScene,
  getPresetTemplates,
  applyTemplate,
  setDefaultTemplate,
  getDefaultTemplate,
} from '../services/templateService';
import {
  generateMigrationPlan,
  previewMigration,
  executeMigration,
  validateMigration,
  estimateDataLoss,
} from '../services/sceneMigrationService';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const sceneIdSchema = z.object({
  sceneId: z.enum(['visionshare', 'agentdate', 'agentjob', 'agentad']),
});

const templateIdSchema = z.object({
  templateId: z.string().uuid(),
});

const migrationPreviewSchema = z.object({
  fromScene: z.enum(['visionshare', 'agentdate', 'agentjob', 'agentad']),
  toScene: z.enum(['visionshare', 'agentdate', 'agentjob', 'agentad']),
});

const migrationExecuteSchema = z.object({
  fromScene: z.enum(['visionshare', 'agentdate', 'agentjob', 'agentad']),
  toScene: z.enum(['visionshare', 'agentdate', 'agentjob', 'agentad']),
  manualData: z.record(z.any()).optional(),
});

const applyTemplateSchema = z.object({
  templateId: z.string().uuid(),
});

const setDefaultTemplateSchema = z.object({
  templateId: z.string().uuid(),
});

// ============================================
// Scene Configuration Routes
// ============================================

/**
 * GET /api/v1/scenes
 * Get all scenes (info only)
 */
router.get('/', (_req: Request, res: Response) => {
  try {
    const scenes = getAllSceneInfos();
    res.json({
      success: true,
      data: scenes,
    });
  } catch (error) {
    logger.error('Failed to get scenes', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get scenes',
    });
  }
});

/**
 * GET /api/v1/scenes/active
 * Get active scenes
 */
router.get('/active', (_req: Request, res: Response) => {
  try {
    const scenes = getActiveSceneConfigs().map(c => ({
      id: c.id,
      metadata: c.metadata,
      fieldCount: c.fields.length,
      capabilityCount: c.capabilities.length,
      templateCount: c.templates.length,
    }));
    res.json({
      success: true,
      data: scenes,
    });
  } catch (error) {
    logger.error('Failed to get active scenes', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get active scenes',
    });
  }
});

/**
 * GET /api/v1/scenes/:sceneId
 * Get scene configuration
 */
router.get('/:sceneId', validateParams(sceneIdSchema), (req: Request, res: Response) => {
  try {
    const { sceneId } = req.params;
    const config = getSceneConfig(sceneId as any);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Scene not found',
      });
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('Failed to get scene config', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get scene config',
    });
  }
});

/**
 * GET /api/v1/scenes/:sceneId/fields
 * Get scene fields
 */
router.get('/:sceneId/fields', validateParams(sceneIdSchema), (req: Request, res: Response) => {
  try {
    const { sceneId } = req.params;
    const config = getSceneConfig(sceneId as any);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Scene not found',
      });
    }

    res.json({
      success: true,
      data: config.fields,
    });
  } catch (error) {
    logger.error('Failed to get scene fields', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get scene fields',
    });
  }
});

/**
 * GET /api/v1/scenes/:sceneId/ui
 * Get scene UI configuration
 */
router.get('/:sceneId/ui', validateParams(sceneIdSchema), (req: Request, res: Response) => {
  try {
    const { sceneId } = req.params;
    const config = getSceneConfig(sceneId as any);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Scene not found',
      });
    }

    res.json({
      success: true,
      data: config.ui,
    });
  } catch (error) {
    logger.error('Failed to get scene UI config', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get scene UI config',
    });
  }
});

// ============================================
// Scene Capability Routes
// ============================================

/**
 * GET /api/v1/scenes/:sceneId/capabilities
 * Get scene capabilities
 */
router.get('/:sceneId/capabilities', validateParams(sceneIdSchema), (req: Request, res: Response) => {
  try {
    const { sceneId } = req.params;

    if (!hasScene(sceneId as any)) {
      return res.status(404).json({
        success: false,
        error: 'Scene not found',
      });
    }

    const capabilities = getEnabledCapabilities(sceneId as any);

    res.json({
      success: true,
      data: capabilities,
    });
  } catch (error) {
    logger.error('Failed to get scene capabilities', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get scene capabilities',
    });
  }
});

/**
 * GET /api/v1/scenes/:sceneId/capabilities/all
 * Get all scene capabilities (including disabled)
 */
router.get('/:sceneId/capabilities/all', validateParams(sceneIdSchema), (req: Request, res: Response) => {
  try {
    const { sceneId } = req.params;
    const config = getSceneConfig(sceneId as any);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Scene not found',
      });
    }

    const capabilities = config.capabilities.map(cap => ({
      ...cap,
      status: getCapabilityStatus(sceneId as any, cap.id),
    }));

    res.json({
      success: true,
      data: capabilities,
    });
  } catch (error) {
    logger.error('Failed to get all scene capabilities', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get all scene capabilities',
    });
  }
});

/**
 * GET /api/v1/scenes/:sceneId/capabilities/:capabilityId
 * Get specific capability status
 */
router.get('/:sceneId/capabilities/:capabilityId', validateParams(sceneIdSchema), (req: Request, res: Response) => {
  try {
    const { sceneId, capabilityId } = req.params;

    if (!hasScene(sceneId as any)) {
      return res.status(404).json({
        success: false,
        error: 'Scene not found',
      });
    }

    const status = getCapabilityStatus(sceneId as any, capabilityId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('Failed to get capability status', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get capability status',
    });
  }
});

/**
 * GET /api/v1/scenes/:sceneId/capabilities/summary
 * Get capabilities summary
 */
router.get('/:sceneId/capabilities/summary', validateParams(sceneIdSchema), (req: Request, res: Response) => {
  try {
    const { sceneId } = req.params;

    if (!hasScene(sceneId as any)) {
      return res.status(404).json({
        success: false,
        error: 'Scene not found',
      });
    }

    const summary = getSceneCapabilitiesSummary(sceneId as any);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('Failed to get capabilities summary', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get capabilities summary',
    });
  }
});

// ============================================
// Scene Template Routes
// ============================================

/**
 * GET /api/v1/scenes/:sceneId/templates
 * Get scene templates
 */
router.get('/:sceneId/templates', authenticate, validateParams(sceneIdSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sceneId } = req.params;
    const userId = req.user?.id;
    const { includePublic, page, limit } = req.query;

    if (!hasScene(sceneId as any)) {
      return res.status(404).json({
        success: false,
        error: 'Scene not found',
      });
    }

    // Get preset templates
    const presetTemplates = getPresetTemplates(sceneId as any);

    // Get user templates if authenticated
    let userTemplates: any[] = [];
    if (userId) {
      const result = await getTemplatesByScene(sceneId as any, {
        userId,
        includePublic: includePublic === 'true',
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      userTemplates = result.items;
    }

    res.json({
      success: true,
      data: {
        preset: presetTemplates,
        user: userTemplates,
      },
    });
  } catch (error) {
    logger.error('Failed to get scene templates', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get scene templates',
    });
  }
});

/**
 * POST /api/v1/scenes/:sceneId/templates/:templateId/apply
 * Apply template to agent
 */
router.post(
  '/:sceneId/templates/:templateId/apply',
  authenticate,
  validateParams(sceneIdSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sceneId, templateId } = req.params;
      const userId = req.user?.id;
      const { agentId } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      if (!hasScene(sceneId as any)) {
        return res.status(404).json({
          success: false,
          error: 'Scene not found',
        });
      }

      const result = await applyTemplate(templateId, agentId, userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Failed to apply template', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to apply template',
      });
    }
  }
);

/**
 * GET /api/v1/scenes/:sceneId/templates/default
 * Get default template for scene
 */
router.get('/:sceneId/templates/default', authenticate, validateParams(sceneIdSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sceneId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    if (!hasScene(sceneId as any)) {
      return res.status(404).json({
        success: false,
        error: 'Scene not found',
      });
    }

    const template = await getDefaultTemplate(sceneId as any, userId);

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    logger.error('Failed to get default template', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get default template',
    });
  }
});

/**
 * POST /api/v1/scenes/:sceneId/templates/default
 * Set default template for scene
 */
router.post(
  '/:sceneId/templates/default',
  authenticate,
  validateParams(sceneIdSchema),
  validateBody(setDefaultTemplateSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sceneId } = req.params;
      const userId = req.user?.id;
      const { templateId } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      if (!hasScene(sceneId as any)) {
        return res.status(404).json({
          success: false,
          error: 'Scene not found',
        });
      }

      const result = await setDefaultTemplate(templateId, userId, sceneId as any);

      res.json({
        success: true,
        data: { success: result },
      });
    } catch (error) {
      logger.error('Failed to set default template', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to set default template',
      });
    }
  }
);

// ============================================
// Scene Migration Routes
// ============================================

/**
 * POST /api/v1/scenes/migration/validate
 * Validate migration between scenes
 */
router.post('/migration/validate', validateBody(migrationPreviewSchema), (req: Request, res: Response) => {
  try {
    const { fromScene, toScene } = req.body;

    const validation = validateMigration(fromScene, toScene);

    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    logger.error('Failed to validate migration', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to validate migration',
    });
  }
});

/**
 * POST /api/v1/scenes/migration/preview
 * Preview migration
 */
router.post('/migration/preview', authenticate, validateBody(migrationPreviewSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fromScene, toScene } = req.body;
    const { agentId } = req.query;

    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'agentId is required',
      });
    }

    const preview = await previewMigration(agentId as string, fromScene, toScene);

    res.json({
      success: true,
      data: preview,
    });
  } catch (error) {
    logger.error('Failed to preview migration', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to preview migration',
    });
  }
});

/**
 * POST /api/v1/scenes/migration/execute
 * Execute migration
 */
router.post('/migration/execute', authenticate, validateBody(migrationExecuteSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fromScene, toScene, manualData } = req.body;
    const { agentId } = req.query;

    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'agentId is required',
      });
    }

    const result = await executeMigration(agentId as string, fromScene, toScene, manualData);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Failed to execute migration', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to execute migration',
    });
  }
});

/**
 * POST /api/v1/scenes/migration/estimate
 * Estimate data loss
 */
router.post('/migration/estimate', validateBody(migrationPreviewSchema), (req: Request, res: Response) => {
  try {
    const { fromScene, toScene } = req.body;

    const estimate = estimateDataLoss(fromScene, toScene);

    res.json({
      success: true,
      data: estimate,
    });
  } catch (error) {
    logger.error('Failed to estimate migration', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to estimate migration',
    });
  }
});

/**
 * POST /api/v1/scenes/migration/plan
 * Generate migration plan
 */
router.post('/migration/plan', validateBody(migrationPreviewSchema), (req: Request, res: Response) => {
  try {
    const { fromScene, toScene } = req.body;

    const plan = generateMigrationPlan(fromScene, toScene);

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    logger.error('Failed to generate migration plan', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate migration plan',
    });
  }
});

export default router;
