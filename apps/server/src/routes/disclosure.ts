/**
 * Disclosure Routes
 * 信息披露控制路由
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { DisclosureLevel, RelationshipStage, DISCLOSURE_LEVEL_INFO } from '@bridgeai/shared';

import { disclosureService } from '../services/disclosureService';
import { disclosureAuditService } from '../services/disclosureAuditService';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const agentIdSchema = z.object({
  agentId: z.string().min(1),
});

const updateSettingsSchema = z.object({
  fieldDisclosures: z
    .array(
      z.object({
        fieldName: z.string(),
        level: z.nativeEnum(DisclosureLevel),
        isDisclosable: z.boolean().optional(),
      })
    )
    .optional(),
  defaultLevel: z.nativeEnum(DisclosureLevel).optional(),
  strictMode: z.boolean().optional(),
});

const bulkUpdateSchema = z.object({
  fieldUpdates: z.array(
    z.object({
      fieldName: z.string(),
      level: z.nativeEnum(DisclosureLevel),
    })
  ),
  notifyAffectedUsers: z.boolean().default(false),
});

const checkAccessSchema = z.object({
  fieldName: z.string().min(1),
  viewerId: z.string().min(1),
});

const previewSchema = z.object({
  agentData: z.record(z.unknown()),
});

// ============================================
// Disclosure Settings Routes
// ============================================

/**
 * GET /api/v1/disclosure/:agentId/settings
 * Get disclosure settings for an agent
 */
router.get('/:agentId/settings', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agentId } = agentIdSchema.parse(req.params);
    const settings = await disclosureService.getDisclosureSettings(agentId);
    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error('Failed to get disclosure settings', { error });
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to get disclosure settings' });
    }
  }
});

/**
 * PUT /api/v1/disclosure/:agentId/settings
 * Update disclosure settings for an agent
 */
router.put('/:agentId/settings', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agentId } = agentIdSchema.parse(req.params);
    const updates = updateSettingsSchema.parse(req.body);
    const userId = req.user?.id || '';
    const settings = await disclosureService.updateDisclosureSettings(agentId, updates, userId);
    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error('Failed to update disclosure settings', { error });
    res.status(400).json({ success: false, error: 'Failed to update disclosure settings' });
  }
});

/**
 * POST /api/v1/disclosure/:agentId/bulk
 * Bulk update disclosure levels
 */
router.post('/:agentId/bulk', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agentId } = agentIdSchema.parse(req.params);
    const { fieldUpdates, notifyAffectedUsers } = bulkUpdateSchema.parse(req.body);
    const userId = req.user?.id || '';
    const settings = await disclosureService.bulkUpdateDisclosure(
      agentId,
      fieldUpdates,
      userId,
      notifyAffectedUsers
    );
    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error('Failed to bulk update disclosure', { error });
    res.status(400).json({ success: false, error: 'Failed to bulk update disclosure' });
  }
});

/**
 * POST /api/v1/disclosure/:agentId/reset
 * Reset disclosure settings to defaults
 */
router.post('/:agentId/reset', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agentId } = agentIdSchema.parse(req.params);
    const userId = req.user?.id || '';
    const settings = await disclosureService.resetToDefaults(agentId, userId);
    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error('Failed to reset disclosure settings', { error });
    res.status(400).json({ success: false, error: 'Failed to reset disclosure settings' });
  }
});

// ============================================
// Access Check Routes
// ============================================

/**
 * POST /api/v1/disclosure/:agentId/check
 * Check if a viewer can access a specific field
 */
router.post('/:agentId/check', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agentId } = agentIdSchema.parse(req.params);
    const { fieldName, viewerId } = checkAccessSchema.parse(req.body);
    const result = await disclosureService.canViewField(agentId, fieldName, viewerId);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to check disclosure access', { error });
    res.status(400).json({ success: false, error: 'Failed to check access' });
  }
});

/**
 * POST /api/v1/disclosure/:agentId/filter
 * Filter agent data based on viewer permissions
 */
router.post('/:agentId/filter', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agentId } = agentIdSchema.parse(req.params);
    const { agentData } = previewSchema.parse(req.body);
    const viewerId = req.user?.id || '';
    const filtered = await disclosureService.filterAgentData(agentId, agentData, viewerId);
    res.json({ success: true, data: filtered });
  } catch (error) {
    logger.error('Failed to filter agent data', { error });
    res.status(400).json({ success: false, error: 'Failed to filter data' });
  }
});

// ============================================
// Preview Routes
// ============================================

/**
 * GET /api/v1/disclosure/:agentId/preview
 * Preview what different viewer roles can see
 */
router.get('/:agentId/preview', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agentId } = agentIdSchema.parse(req.params);
    const settings = await disclosureService.getDisclosureSettings(agentId);
    const stages: RelationshipStage[] = [
      RelationshipStage.NONE,
      RelationshipStage.MATCHED,
      RelationshipStage.CHATTED,
      RelationshipStage.REFERRED,
    ];

    const stageDescriptions: Record<RelationshipStage, string> = {
      [RelationshipStage.NONE]: '陌生人（无关系）',
      [RelationshipStage.MATCHED]: '已匹配的用户',
      [RelationshipStage.CHATTED]: '已私聊的用户',
      [RelationshipStage.REFERRED]: '经引荐的用户',
    };

    const previews = stages.map(stage => {
      const visibleFields: string[] = [];
      const hiddenFields: string[] = [];

      for (const field of settings.fieldDisclosures) {
        const requiredStage = getStageForLevel(field.level);
        if (getStageOrder(stage) >= getStageOrder(requiredStage) && field.isDisclosable) {
          visibleFields.push(field.fieldName);
        } else {
          hiddenFields.push(field.fieldName);
        }
      }

      const sampleView: Record<string, unknown> = {};
      for (const fieldName of visibleFields) {
        sampleView[fieldName] = maskFieldForPreview(fieldName, stage);
      }

      return {
        viewerStage: stage,
        viewerDescription: stageDescriptions[stage],
        visibleFields,
        hiddenFields,
        sampleView,
      };
    });

    res.json({ success: true, data: previews });
  } catch (error) {
    logger.error('Failed to generate disclosure preview', { error });
    res.status(500).json({ success: false, error: 'Failed to generate preview' });
  }
});

// ============================================
// History & Audit Routes
// ============================================

/**
 * GET /api/v1/disclosure/:agentId/history
 * Get disclosure change history for an agent
 */
router.get('/:agentId/history', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agentId } = agentIdSchema.parse(req.params);
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await disclosureAuditService.getChangeHistory(agentId, limit);
    res.json({ success: true, data: history });
  } catch (error) {
    logger.error('Failed to get disclosure history', { error });
    res.status(500).json({ success: false, error: 'Failed to get history' });
  }
});

/**
 * GET /api/v1/disclosure/:agentId/access-log
 * Get access audit log for an agent
 */
router.get(
  '/:agentId/access-log',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { agentId } = agentIdSchema.parse(req.params);
      const log = await disclosureAuditService.getAccessLog(agentId, {
        limit: parseInt(req.query.limit as string) || 100,
      });
      res.json({ success: true, data: log });
    } catch (error) {
      logger.error('Failed to get access log', { error });
      res.status(500).json({ success: false, error: 'Failed to get access log' });
    }
  }
);

/**
 * GET /api/v1/disclosure/:agentId/stats
 * Get disclosure statistics
 */
router.get('/:agentId/stats', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agentId } = agentIdSchema.parse(req.params);
    const stats = await disclosureAuditService.getDisclosureStats(agentId);
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Failed to get disclosure stats', { error });
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

/**
 * GET /api/v1/disclosure/levels
 * Get all available disclosure levels with metadata
 */
router.get('/levels/info', (_req, res: Response) => {
  res.json({ success: true, data: DISCLOSURE_LEVEL_INFO });
});

// ============================================
// Helper functions
// ============================================

function getStageForLevel(level: DisclosureLevel): RelationshipStage {
  switch (level) {
    case DisclosureLevel.PUBLIC:
      return RelationshipStage.NONE;
    case DisclosureLevel.AFTER_MATCH:
      return RelationshipStage.MATCHED;
    case DisclosureLevel.AFTER_CHAT:
      return RelationshipStage.CHATTED;
    case DisclosureLevel.AFTER_REFERRAL:
      return RelationshipStage.REFERRED;
    default:
      return RelationshipStage.REFERRED;
  }
}

function getStageOrder(stage: RelationshipStage): number {
  const order: Record<RelationshipStage, number> = {
    [RelationshipStage.NONE]: 0,
    [RelationshipStage.MATCHED]: 1,
    [RelationshipStage.CHATTED]: 2,
    [RelationshipStage.REFERRED]: 3,
  };
  return order[stage];
}

function maskFieldForPreview(fieldName: string, stage: RelationshipStage): string {
  const sensitiveFields = ['phone', 'email', 'contact', 'socialLinks'];
  if (sensitiveFields.includes(fieldName) && stage === RelationshipStage.NONE) {
    return '***';
  }
  return `(${fieldName}的值)`;
}

export default router;
