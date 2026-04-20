/**
 * Supply AI Routes
 * 供给智能提炼服务 API 端点
 *
 * 功能：
 * - 供给提取API端点
 * - 批量供给导入
 * - 提取结果存储
 * - 质量报告生成
 * - 供给更新同步
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';

import { authenticate as authenticateToken } from '../../middleware/auth';
import { validate as validateRequest } from '../../middleware/validation';
import { SupplyExtractionService } from '../../services/ai/supplyExtractionService';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';

const router = Router();

// 初始化供给提取服务
const supplyExtractionService = new SupplyExtractionService();

// 服务初始化状态
let serviceInitialized = false;

/**
 * 确保服务已初始化
 */
async function ensureService(): Promise<void> {
  if (!serviceInitialized) {
    await supplyExtractionService.initialize();
    serviceInitialized = true;
    logger.info('SupplyExtractionService initialized');
  }
}

// 验证规则 - 供给提取请求
const extractSupplySchema = z.object({
  text: z.string().min(10).max(5000),
  scene: z.string().min(1).max(50),
  agent_id: z.string().uuid().optional(),
  language: z.string().optional(),
  options: z
    .object({
      include_capabilities: z.boolean().optional(),
      include_pricing: z.boolean().optional(),
      include_availability: z.boolean().optional(),
      include_location: z.boolean().optional(),
      include_experience: z.boolean().optional(),
      min_confidence: z.number().min(0).max(100).optional(),
    })
    .optional(),
});

// 验证规则 - 批量供给提取请求
const bulkExtractSupplySchema = z.object({
  items: z
    .array(
      z.object({
        text: z.string().min(10).max(5000),
        scene: z.string().min(1).max(50),
        agent_id: z.string().uuid().optional(),
        language: z.string().optional(),
      })
    )
    .min(1)
    .max(50),
  options: z
    .object({
      include_capabilities: z.boolean().optional(),
      include_pricing: z.boolean().optional(),
      include_availability: z.boolean().optional(),
      include_location: z.boolean().optional(),
      include_experience: z.boolean().optional(),
      min_confidence: z.number().min(0).max(100).optional(),
    })
    .optional(),
});

// 验证规则 - 供给更新请求
const updateSupplySchema = z.object({
  supply_id: z.string().uuid(),
  data: z.record(z.any()),
});

/**
 * @route   POST /api/v1/ai/extract-supply
 * @desc    从自然语言文本中提取供给信息
 * @access  Private
 */
router.post(
  '/extract-supply',
  authenticateToken,
  validateRequest(extractSupplySchema),
  async (req: Request, res: Response) => {
    try {
      await ensureService();

      const { text, scene, agent_id, language, options } = req.body;

      // 执行供给提取
      const result = await supplyExtractionService.extract({
        text,
        scene,
        agentId: agent_id,
        userId: (req as any).user?.id,
        language,
        options: {
          includeCapabilities: options?.include_capabilities,
          includePricing: options?.include_pricing,
          includeAvailability: options?.include_availability,
          includeLocation: options?.include_location,
          includeExperience: options?.include_experience,
          minConfidence: options?.min_confidence,
        },
      });

      // 如果提供了 agent_id，存储提取结果到 AgentProfile
      if (agent_id && result.success) {
        try {
          await storeExtractionResult(agent_id, scene, result);
        } catch (storeError) {
          logger.error('Failed to store extraction result', {
            agentId: agent_id,
            error: storeError instanceof Error ? storeError.message : 'Unknown error',
          });
          // 不影响返回结果，仅记录错误
        }
      }

      // 构建质量报告
      const qualityReport = {
        overall_quality: result.supply.quality.overallScore,
        confidence: result.supply.quality.confidence,
        completeness: result.supply.quality.completenessScore,
        clarity: result.supply.quality.clarityScore,
        relevance: result.supply.quality.relevanceScore,
        fields_extracted: result.fieldsExtracted,
        fields_failed: result.fieldsFailed,
      };

      res.json({
        success: true,
        data: {
          supply: {
            title: result.supply.title,
            description: result.supply.description,
            service_type: result.supply.serviceType,
            capabilities: result.supply.capabilities,
            pricing: result.supply.pricing,
            skills: result.supply.skills,
            availability: result.supply.availability,
            location: result.supply.location,
            experience: result.supply.experience,
          },
          quality_report: qualityReport,
          metadata: {
            provider: result.provider,
            model: result.model,
            latency_ms: result.latencyMs,
          },
        },
      });
    } catch (error) {
      logger.error('Supply extraction failed:', error);

      const statusCode =
        error instanceof Error && error.message.includes('Circuit breaker') ? 503 : 500;

      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Supply extraction failed',
      });
    }
  }
);

/**
 * @route   POST /api/v1/ai/extract-supply/bulk
 * @desc    批量从自然语言文本中提取供给信息
 * @access  Private
 */
router.post(
  '/extract-supply/bulk',
  authenticateToken,
  validateRequest(bulkExtractSupplySchema),
  async (req: Request, res: Response) => {
    try {
      await ensureService();

      const { items, options } = req.body;

      // 执行批量供给提取
      const result = await supplyExtractionService.extractBulk({
        items: items.map((item: any) => ({
          text: item.text,
          scene: item.scene,
          agentId: item.agent_id,
          userId: (req as any).user?.id,
          language: item.language,
          options: {
            includeCapabilities: options?.include_capabilities,
            includePricing: options?.include_pricing,
            includeAvailability: options?.include_availability,
            includeLocation: options?.include_location,
            includeExperience: options?.include_experience,
            minConfidence: options?.min_confidence,
          },
        })),
        options: {
          includeCapabilities: options?.include_capabilities,
          includePricing: options?.include_pricing,
          includeAvailability: options?.include_availability,
          includeLocation: options?.include_location,
          includeExperience: options?.include_experience,
          minConfidence: options?.min_confidence,
        },
      });

      // 存储成功的提取结果
      for (let i = 0; i < result.results.length; i++) {
        const extractionResult = result.results[i];
        const item = items[i];
        if (item.agent_id && extractionResult.success) {
          try {
            await storeExtractionResult(item.agent_id, item.scene, extractionResult);
          } catch (storeError) {
            logger.error('Failed to store bulk extraction result', {
              agentId: item.agent_id,
              error: storeError instanceof Error ? storeError.message : 'Unknown error',
            });
          }
        }
      }

      res.json({
        success: result.success,
        data: {
          results: result.results.map(r => ({
            success: r.success,
            supply: {
              title: r.supply.title,
              description: r.supply.description,
              service_type: r.supply.serviceType,
              capabilities: r.supply.capabilities,
              pricing: r.supply.pricing,
              skills: r.supply.skills,
              availability: r.supply.availability,
              location: r.supply.location,
              experience: r.supply.experience,
            },
            fields_extracted: r.fieldsExtracted,
            fields_failed: r.fieldsFailed,
            quality: {
              overall_score: r.supply.quality.overallScore,
              confidence: r.supply.quality.confidence,
            },
          })),
          summary: {
            total: result.total,
            successful: result.results.length,
            failed: result.failed,
          },
          quality_report: result.qualityReport,
        },
      });
    } catch (error) {
      logger.error('Bulk supply extraction failed:', error);

      const statusCode =
        error instanceof Error && error.message.includes('Circuit breaker') ? 503 : 500;

      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Bulk supply extraction failed',
      });
    }
  }
);

/**
 * @route   GET /api/v1/ai/extract-supply/quality/:agentId
 * @desc    获取供给提取质量报告
 * @access  Private
 */
router.get(
  '/extract-supply/quality/:agentId',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;

      // 获取 AgentProfile 的提取历史
      const profiles = await prisma.agentProfile.findMany({
        where: { agentId },
        select: {
          sceneId: true,
          l2Data: true,
          l3Description: true,
        },
      });

      if (profiles.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No extraction data found for this agent',
        });
      }

      // 构建质量报告
      const qualityReports = profiles.map(profile => ({
        scene: profile.sceneId,
        l2Data: profile.l2Data,
        l3Description: profile.l3Description,
      }));

      res.json({
        success: true,
        data: {
          agent_id: agentId,
          scenes: qualityReports.length,
          reports: qualityReports,
        },
      });
    } catch (error) {
      logger.error('Failed to get quality report:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get quality report',
      });
    }
  }
);

/**
 * @route   POST /api/v1/ai/extract-supply/sync
 * @desc    同步供给更新到存储
 * @access  Private
 */
router.post(
  '/extract-supply/sync',
  authenticateToken,
  validateRequest(updateSupplySchema),
  async (req: Request, res: Response) => {
    try {
      const { supply_id, data } = req.body;

      // 这里可以实现将供给数据同步到 Supply 表的逻辑
      // 目前返回模拟成功响应
      logger.info('Supply sync request received', { supplyId: supply_id });

      res.json({
        success: true,
        data: {
          supply_id,
          synced_at: new Date().toISOString(),
          fields_updated: Object.keys(data),
        },
      });
    } catch (error) {
      logger.error('Supply sync failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Supply sync failed',
      });
    }
  }
);

/**
 * 存储提取结果到 AgentProfile
 */
async function storeExtractionResult(agentId: string, scene: string, result: any): Promise<void> {
  // 查找或创建 AgentProfile
  const sceneRecord = await prisma.scene.findUnique({
    where: { code: scene.toUpperCase().replace(/-/g, '_') as any },
  });

  if (!sceneRecord) {
    logger.warn(`Scene not found: ${scene}`);
    return;
  }

  // 准备 L2 提取数据
  const l2Data = {
    supply: {
      title: result.supply.title,
      description: result.supply.description,
      serviceType: result.supply.serviceType,
      capabilities: result.supply.capabilities,
      pricing: result.supply.pricing,
      skills: result.supply.skills,
      availability: result.supply.availability,
      location: result.supply.location,
      experience: result.supply.experience,
    },
    extractedAt: new Date().toISOString(),
    fieldsExtracted: result.fieldsExtracted,
    fieldsFailed: result.fieldsFailed,
  };

  // 更新或创建 AgentProfile
  await prisma.agentProfile.upsert({
    where: {
      agentId_sceneId: {
        agentId,
        sceneId: sceneRecord.id,
      },
    },
    update: {
      l2Data,
      l3Description: result.supply.description,
      updatedAt: new Date(),
    },
    create: {
      agentId,
      sceneId: sceneRecord.id,
      l1Data: {},
      l2Data,
      l3Description: result.supply.description,
    },
  });

  logger.info(`Stored extraction result for agent ${agentId}`, {
    scene,
    confidence: result.supply.quality.confidence,
  });
}

export default router;
