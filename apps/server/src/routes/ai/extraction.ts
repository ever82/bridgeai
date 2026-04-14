/**
 * AI Extraction Routes
 * AI需求提取API端点
 * 提供需求提取、批量提取、WebSocket实时反馈等功能
 */

import { Router, Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { getL2Schema, L2Schema } from '@visionshare/shared';
import { demandExtractionService, DemandExtractionRequest } from '../../services/ai/demandExtractionService';
import { demandToL2Mapper, MappingResult } from '../../services/ai/mappers/demandToL2Mapper';
import { extractionValidator, ValidationReport } from '../../services/ai/validators/extractionValidator';
import { extractL2FromL3, ExtractionResult } from '../../services/ai/extractionService';
import { processNaturalLanguageDemand } from '../../services/ai/consumerDemandAI';
import { logger } from '../../utils/logger';
import offerExtractionRoutes from './offerExtraction';

const router: Router = Router();

// Mount offer extraction routes
router.use('/', offerExtractionRoutes);

// Active WebSocket connections
const activeConnections: Map<string, WebSocket> = new Map();

/**
 * POST /api/v1/ai/extract-demand
 * 需求提取主端点
 */
router.post('/extract-demand', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { text, scene, context, options } = req.body;
  const userId = req.user?.id;

  try {
    logger.info('Extract demand request received', {
      textLength: text?.length,
      scene,
      userId,
    });

    // Validate request
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Text is required',
        },
      });
    }

    if (!scene || typeof scene !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Scene is required',
        },
      });
    }

    // Get schema for the scene
    const schema = getL2Schema(scene);
    if (!schema) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SCENE',
          message: `Scene not found: ${scene}`,
        },
      });
    }

    // Build extraction request
    const extractionRequest: DemandExtractionRequest = {
      text,
      scene,
      context: context || {},
      options: {
        extractEntities: true,
        classifyIntent: true,
        requireClarification: options?.requireClarification ?? true,
        language: options?.language || 'zh-CN',
        ...options,
      },
    };

    // Step 1: Extract demand using new service
    const demand = await demandExtractionService.extract(extractionRequest);

    // Step 2: Map to L2
    const mappingResult = demandToL2Mapper.map(demand, schema);

    // Step 3: Validate
    const validationReport = extractionValidator.validate(
      mappingResult.data,
      schema,
      demand,
      {
        checkCompleteness: true,
        checkBusinessRules: true,
        checkRanges: true,
        checkFormats: true,
        strictMode: options?.strictMode ?? false,
      }
    );

    // Step 4: Determine if clarification is needed
    const clarificationNeeded =
      demand.clarificationNeeded ||
      validationReport.confirmationNeeded ||
      mappingResult.conflicts.length > 0;

    // Step 5: Build response
    const response = {
      success: true,
      data: {
        // Original demand extraction
        demand: {
          id: demand.id,
          rawText: demand.rawText,
          intent: demand.intent,
          entities: demand.entities,
          confidence: demand.confidence,
          clarificationNeeded: demand.clarificationNeeded,
          clarificationQuestions: demand.clarificationQuestions,
        },
        // Mapped L2 data
        l2Data: mappingResult.data,
        mapping: {
          mappedFields: mappingResult.mappedFields,
          unmappedFields: mappingResult.unmappedFields,
          inferredFields: mappingResult.inferredFields,
          conflicts: mappingResult.conflicts,
          transformations: mappingResult.transformations,
        },
        // Validation results
        validation: {
          valid: validationReport.valid,
          completenessScore: validationReport.summary.completenessScore,
          errors: validationReport.errors,
          warnings: validationReport.warnings,
          confirmationNeeded: validationReport.confirmationNeeded,
        },
        // Summary
        summary: {
          scene,
          confidence: demand.confidence,
          clarificationNeeded,
          mappedFieldCount: mappingResult.mappedFields.length,
          requiredFieldCount: schema.fields.filter(f => f.required).length,
          validationPassed: validationReport.valid,
        },
      },
      meta: {
        requestId: `${userId}-${Date.now()}`,
        latencyMs: Date.now() - startTime,
        version: '1.0.0',
      },
    };

    logger.info('Extract demand completed', {
      scene,
      confidence: demand.confidence,
      clarificationNeeded,
      latencyMs: response.meta.latencyMs,
    });

    return res.status(200).json(response);
  } catch (error) {
    logger.error('Extract demand failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      scene,
      userId,
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'EXTRACTION_FAILED',
        message: error instanceof Error ? error.message : 'Extraction failed',
      },
      meta: {
        requestId: `${userId}-${Date.now()}`,
        latencyMs: Date.now() - startTime,
      },
    });
  }
});

/**
 * POST /api/v1/ai/extract-demand/batch
 * 批量需求提取
 */
router.post('/extract-demand/batch', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { items, scene, options } = req.body;
  const userId = req.user?.id;

  try {
    logger.info('Batch extract demand request received', {
      itemCount: items?.length,
      scene,
      userId,
    });

    // Validate request
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Items array is required and must not be empty',
        },
      });
    }

    if (!scene) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Scene is required',
        },
      });
    }

    // Process batch with concurrency limit
    const concurrencyLimit = options?.concurrency || 5;
    const results: BatchExtractionResult[] = [];
    const errors: BatchExtractionError[] = [];

    // Process in chunks
    for (let i = 0; i < items.length; i += concurrencyLimit) {
      const chunk = items.slice(i, i + concurrencyLimit);

      const chunkPromises = chunk.map(async (item: BatchExtractionItem, index: number) => {
        try {
          const extractionRequest: DemandExtractionRequest = {
            text: item.text,
            scene,
            context: item.context || {},
            options: {
              extractEntities: true,
              classifyIntent: true,
              requireClarification: false, // Disable for batch
              ...options,
            },
          };

          const demand = await demandExtractionService.extract(extractionRequest);

          return {
            index: i + index,
            id: item.id,
            success: true,
            demand: {
              intent: demand.intent,
              entities: demand.entities,
              confidence: demand.confidence,
            },
            latencyMs: Date.now() - startTime,
          };
        } catch (error) {
          return {
            index: i + index,
            id: item.id,
            success: false,
            error: error instanceof Error ? error.message : 'Extraction failed',
          };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);

      for (const result of chunkResults) {
        if (result.success) {
          results.push(result as BatchExtractionResult);
        } else {
          errors.push(result as BatchExtractionError);
        }
      }
    }

    const response = {
      success: true,
      data: {
        results,
        errors,
        summary: {
          total: items.length,
          success: results.length,
          failed: errors.length,
          successRate: Math.round((results.length / items.length) * 100),
        },
      },
      meta: {
        requestId: `${userId}-${Date.now()}`,
        latencyMs: Date.now() - startTime,
        version: '1.0.0',
      },
    };

    logger.info('Batch extract demand completed', {
      scene,
      total: items.length,
      success: results.length,
      failed: errors.length,
      latencyMs: response.meta.latencyMs,
    });

    return res.status(200).json(response);
  } catch (error) {
    logger.error('Batch extract demand failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      scene,
      userId,
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'BATCH_EXTRACTION_FAILED',
        message: error instanceof Error ? error.message : 'Batch extraction failed',
      },
    });
  }
});

/**
 * POST /api/v1/ai/extract-demand/:id/confirm
 * 确认提取结果
 */
router.post('/extract-demand/:id/confirm', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { corrections, confirmed } = req.body;
  const userId = req.user?.id;

  try {
    logger.info('Confirm extraction request received', {
      extractionId: id,
      userId,
      hasCorrections: !!corrections,
    });

    if (!confirmed) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NOT_CONFIRMED',
          message: 'Extraction not confirmed',
        },
      });
    }

    // TODO: Store confirmation and corrections
    // This would typically update a database record

    const response = {
      success: true,
      data: {
        extractionId: id,
        confirmed: true,
        corrections: corrections || {},
        confirmedAt: new Date().toISOString(),
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    logger.error('Confirm extraction failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      extractionId: id,
      userId,
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'CONFIRMATION_FAILED',
        message: error instanceof Error ? error.message : 'Confirmation failed',
      },
    });
  }
});

/**
 * GET /api/v1/ai/extract-demand/:id/status
 * 获取提取状态
 */
router.get('/extract-demand/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // TODO: Retrieve extraction status from cache/database
    // For now, return a mock response

    const response = {
      success: true,
      data: {
        extractionId: id,
        status: 'completed',
        progress: 100,
        result: null, // Would contain actual result
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    logger.error('Get extraction status failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      extractionId: id,
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_CHECK_FAILED',
        message: error instanceof Error ? error.message : 'Status check failed',
      },
    });
  }
});

/**
 * POST /api/v1/ai/extract-demand/feedback
 * 提交提取反馈
 */
router.post('/extract-demand/feedback', async (req: Request, res: Response) => {
  const { extractionId, rating, feedback, corrections } = req.body;
  const userId = req.user?.id;

  try {
    logger.info('Extraction feedback received', {
      extractionId,
      userId,
      rating,
    });

    // TODO: Store feedback for model improvement

    const response = {
      success: true,
      data: {
        feedbackId: `fb-${Date.now()}`,
        extractionId,
        received: true,
        receivedAt: new Date().toISOString(),
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    logger.error('Submit feedback failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      extractionId,
      userId,
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'FEEDBACK_FAILED',
        message: error instanceof Error ? error.message : 'Feedback submission failed',
      },
    });
  }
});

/**
 * WebSocket handler for real-time extraction
 * WebSocket实时提取反馈
 */
export function handleWebSocketConnection(ws: WebSocket, requestId: string): void {
  logger.info('WebSocket connection established', { requestId });

  activeConnections.set(requestId, ws);

  ws.on('message', async (message: string) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'extract':
          await handleRealtimeExtraction(ws, data.payload);
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        default:
          ws.send(JSON.stringify({
            type: 'error',
            message: `Unknown message type: ${data.type}`,
          }));
      }
    } catch (error) {
      logger.error('WebSocket message handling failed', { error, requestId });
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
      }));
    }
  });

  ws.on('close', () => {
    logger.info('WebSocket connection closed', { requestId });
    activeConnections.delete(requestId);
  });

  ws.on('error', (error) => {
    logger.error('WebSocket error', { error, requestId });
    activeConnections.delete(requestId);
  });

  // Send initial connection confirmation
  ws.send(JSON.stringify({
    type: 'connected',
    requestId,
    timestamp: Date.now(),
  }));
}

/**
 * Handle real-time extraction via WebSocket
 */
async function handleRealtimeExtraction(ws: WebSocket, payload: any): Promise<void> {
  const { text, scene, options } = payload;
  const requestId = `ws-${Date.now()}`;

  try {
    // Send initial progress
    ws.send(JSON.stringify({
      type: 'progress',
      requestId,
      stage: 'started',
      progress: 0,
      message: 'Starting extraction...',
    }));

    // Validate
    const schema = getL2Schema(scene);
    if (!schema) {
      ws.send(JSON.stringify({
        type: 'error',
        requestId,
        message: `Scene not found: ${scene}`,
      }));
      return;
    }

    // Progress: 25%
    ws.send(JSON.stringify({
      type: 'progress',
      requestId,
      stage: 'extracting',
      progress: 25,
      message: 'Extracting entities and intent...',
    }));

    // Extract
    const extractionRequest: DemandExtractionRequest = {
      text,
      scene,
      options: {
        extractEntities: true,
        classifyIntent: true,
        requireClarification: options?.requireClarification ?? true,
      },
    };

    const demand = await demandExtractionService.extract(extractionRequest);

    // Progress: 50%
    ws.send(JSON.stringify({
      type: 'progress',
      requestId,
      stage: 'mapping',
      progress: 50,
      message: 'Mapping to L2 schema...',
      partialResult: {
        entities: demand.entities.length,
        intent: demand.intent.intent,
        confidence: demand.confidence,
      },
    }));

    // Map
    const mappingResult = demandToL2Mapper.map(demand, schema);

    // Progress: 75%
    ws.send(JSON.stringify({
      type: 'progress',
      requestId,
      stage: 'validating',
      progress: 75,
      message: 'Validating results...',
      partialResult: {
        mappedFields: mappingResult.mappedFields.length,
        conflicts: mappingResult.conflicts.length,
      },
    }));

    // Validate
    const validationReport = extractionValidator.validate(
      mappingResult.data,
      schema,
      demand
    );

    // Progress: 100%
    ws.send(JSON.stringify({
      type: 'complete',
      requestId,
      stage: 'completed',
      progress: 100,
      data: {
        demand: {
          rawText: demand.rawText,
          intent: demand.intent,
          entities: demand.entities,
          confidence: demand.confidence,
          clarificationNeeded: demand.clarificationNeeded,
          clarificationQuestions: demand.clarificationQuestions,
        },
        l2Data: mappingResult.data,
        mapping: {
          mappedFields: mappingResult.mappedFields,
          unmappedFields: mappingResult.unmappedFields,
          conflicts: mappingResult.conflicts,
        },
        validation: {
          valid: validationReport.valid,
          completenessScore: validationReport.summary.completenessScore,
          errors: validationReport.errors,
          warnings: validationReport.warnings,
        },
      },
    }));
  } catch (error) {
    logger.error('Real-time extraction failed', { error, requestId });
    ws.send(JSON.stringify({
      type: 'error',
      requestId,
      message: error instanceof Error ? error.message : 'Extraction failed',
    }));
  }
}

/**
 * GET /api/v1/ai/scenes/:scene/config
 * 获取场景配置
 */
router.get('/scenes/:scene/config', async (req: Request, res: Response) => {
  const { scene } = req.params;

  try {
    const schema = getL2Schema(scene);
    if (!schema) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SCENE_NOT_FOUND',
          message: `Scene not found: ${scene}`,
        },
      });
    }

    const response = {
      success: true,
      data: {
        scene,
        schema: {
          id: schema.id,
          version: schema.version,
          title: schema.title,
          description: schema.description,
          fields: schema.fields.map(f => ({
            id: f.id,
            type: f.type,
            label: f.label,
            description: f.description,
            required: f.required,
            options: f.options,
            min: f.min,
            max: f.max,
            validation: f.validation,
          })),
          groups: schema.groups,
          steps: schema.steps,
        },
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    logger.error('Get scene config failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      scene,
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'CONFIG_FETCH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch config',
      },
    });
  }
});

// Type definitions
interface BatchExtractionItem {
  id: string;
  text: string;
  context?: Record<string, any>;
}

interface BatchExtractionResult {
  index: number;
  id: string;
  success: true;
  demand: {
    intent: any;
    entities: any[];
    confidence: number;
  };
  latencyMs: number;
}

interface BatchExtractionError {
  index: number;
  id: string;
  success: false;
  error: string;
}

/**
 * POST /api/v1/ai/extract-consumer-demand
 * Consumer demand extraction (AD001 - AI Integration)
 * 消费者需求 AI 提取端点
 */
router.post('/extract-consumer-demand', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { text, agentId, options } = req.body;
  const userId = req.user?.id;

  try {
    logger.info('Consumer demand extraction request received', {
      textLength: text?.length,
      agentId,
      userId,
    });

    // Validate request
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Text is required',
        },
      });
    }

    // Process natural language demand
    const result = await processNaturalLanguageDemand(text, {
      userId,
      requireConfirmation: options?.requireConfirmation ?? true,
      previousContext: options?.context,
    });

    const response = {
      success: true,
      data: {
        extractedData: result.extractedData,
        needsClarification: result.needsClarification,
        clarificationQuestions: result.clarificationQuestions,
        summary: result.summary,
        agentId,
      },
      meta: {
        requestId: `${userId}-${Date.now()}`,
        latencyMs: Date.now() - startTime,
        version: '1.0.0',
      },
    };

    logger.info('Consumer demand extraction completed', {
      confidence: result.extractedData.confidence,
      needsClarification: result.needsClarification,
      latencyMs: response.meta.latencyMs,
    });

    return res.status(200).json(response);
  } catch (error) {
    logger.error('Consumer demand extraction failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      agentId,
      userId,
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'EXTRACTION_FAILED',
        message: error instanceof Error ? error.message : 'Extraction failed',
      },
      meta: {
        requestId: `${userId}-${Date.now()}`,
        latencyMs: Date.now() - startTime,
      },
    });
  }
});

export default router;
