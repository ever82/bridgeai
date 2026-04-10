/**
 * AI Extraction Routes
 * 需求提取API端点
 *
 * Provides:
 * - POST /api/v1/ai/extract-demand - Extract demand from natural language
 * - POST /api/v1/ai/extract-batch - Batch extraction
 * - POST /api/v1/ai/validate-extraction - Validate extraction result
 * - POST /api/v1/ai/confirm-extraction - Confirm/correct extraction
 * - WebSocket support for real-time feedback
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { DemandExtractionService, ExtractionRequest } from '../../services/ai/demandExtractionService';
import { DemandToL2Mapper } from '../../services/ai/mappers/demandToL2Mapper';
import { ExtractionValidator } from '../../services/ai/validators/extractionValidator';
import { getL2Schema } from '@visionshare/shared';
import logger from '../../utils/logger';
import { Server as SocketIOServer } from 'socket.io';

const router = Router();

// Initialize services
const extractionService = new DemandExtractionService();
const mapper = new DemandToL2Mapper();
const validator = new ExtractionValidator();

let serviceInitialized = false;

/**
 * Ensure services are initialized
 */
async function ensureService(): Promise<void> {
  if (!serviceInitialized) {
    await extractionService.initialize();
    serviceInitialized = true;
    logger.info('Demand extraction services initialized');
  }
}

// Validation schemas
const extractDemandSchema = z.object({
  text: z.string().min(1).max(5000).describe('Natural language text to extract from'),
  scene: z.string().min(1).describe('Scene code (e.g., VISIONSHARE, AGENTDATE)'),
  agentId: z.string().optional().describe('Optional agent ID for context'),
  context: z.object({
    previousDemands: z.array(z.any()).optional(),
    userPreferences: z.record(z.any()).optional(),
    conversationHistory: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })).optional(),
  }).optional(),
});

const batchExtractSchema = z.object({
  requests: z.array(extractDemandSchema).min(1).max(10).describe('Batch of extraction requests'),
  options: z.object({
    continueOnError: z.boolean().optional().default(true),
    priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
  }).optional(),
});

const validateExtractionSchema = z.object({
  data: z.record(z.any()).describe('Extracted data to validate'),
  scene: z.string().describe('Scene code for schema lookup'),
});

const confirmExtractionSchema = z.object({
  extractionId: z.string().describe('Extraction ID to confirm'),
  confirmed: z.boolean().describe('Whether the extraction is confirmed'),
  corrections: z.record(z.any()).optional().describe('Field corrections if any'),
  confirmedFields: z.array(z.string()).optional().describe('List of confirmed field IDs'),
  feedback: z.string().optional().describe('Optional user feedback'),
});

const sceneConfigSchema = z.object({
  scene: z.string().describe('Scene code'),
});

/**
 * @route   POST /api/v1/ai/extract-demand
 * @desc    Extract structured demand from natural language text
 * @access  Private
 *
 * Request body:
 * {
 *   "text": "我想找个周末下午能一起拍照的朋友",
 *   "scene": "VISIONSHARE",
 *   "agentId": "optional-agent-id"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "demand": { ... },
 *     "mappedData": { ... },
 *     "validation": { ... },
 *     "clarificationNeeded": false
 *   }
 * }
 */
router.post(
  '/extract-demand',
  authenticateToken,
  validateRequest(extractDemandSchema),
  async (req: Request, res: Response) => {
    try {
      await ensureService();

      const { text, scene, agentId, context } = req.body;
      const userId = req.user?.id;

      logger.info('Extract demand request', { scene, agentId, userId, textLength: text.length });

      // Validate scene exists
      const schema = getL2Schema(scene);
      if (!schema) {
        return res.status(400).json({
          success: false,
          error: `Invalid scene: ${scene}. Available scenes: VISIONSHARE, AGENTDATE, AGENTJOB, AGENTAD`,
        });
      }

      // Perform extraction
      const extractionRequest: ExtractionRequest = {
        text,
        scene,
        agentId,
        userId,
        context,
      };

      const demand = await extractionService.extract(extractionRequest);

      // Map to L2 model
      const mappingResult = mapper.map(demand);

      // Validate extraction
      const validationResult = validator.validate(mappingResult.data, scene);

      // Build response
      const response = {
        success: true,
        data: {
          extraction: {
            id: demand.id,
            scene: demand.scene,
            intent: demand.intent,
            entities: demand.entities,
            confidence: demand.confidence,
            fieldConfidence: demand.fieldConfidence,
            extractedAt: demand.extractedAt.toISOString(),
          },
          mappedData: {
            attributes: mappingResult.data,
            mappedFields: mappingResult.mappedFields,
            unmappedFields: mappingResult.unmappedFields,
            standardizedFields: mappingResult.standardizedFields,
            inferredFields: mappingResult.inferredFields,
          },
          validation: {
            valid: validationResult.valid,
            isComplete: validationResult.isComplete,
            canProceed: validationResult.canProceed,
            errors: validationResult.errors,
            warnings: validationResult.warnings,
            missingRequired: validationResult.missingRequired,
            suggestions: validationResult.suggestions,
          },
          conflicts: mappingResult.conflicts,
          clarificationNeeded: demand.clarificationNeeded ||
                               !validationResult.isComplete ||
                               validationResult.errors.length > 0,
          suggestedQuestions: demand.suggestedQuestions,
        },
      };

      res.json(response);
    } catch (error) {
      logger.error('Extract demand failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        scene: req.body.scene,
      });

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Extraction failed',
      });
    }
  }
);

/**
 * @route   POST /api/v1/ai/extract-batch
 * @desc    Batch extract demands from multiple texts
 * @access  Private
 */
router.post(
  '/extract-batch',
  authenticateToken,
  validateRequest(batchExtractSchema),
  async (req: Request, res: Response) => {
    try {
      await ensureService();

      const { requests, options } = req.body;
      const userId = req.user?.id;

      logger.info('Batch extract request', { count: requests.length, userId });

      const results = [];
      const errors = [];

      for (let i = 0; i < requests.length; i++) {
        const request = requests[i];

        try {
          const extractionRequest: ExtractionRequest = {
            ...request,
            userId,
          };

          const demand = await extractionService.extract(extractionRequest);
          const mappingResult = mapper.map(demand);
          const validationResult = validator.validate(mappingResult.data, request.scene);

          results.push({
            index: i,
            success: true,
            extraction: {
              id: demand.id,
              scene: demand.scene,
              confidence: demand.confidence,
              extractedAt: demand.extractedAt.toISOString(),
            },
            mappedData: mappingResult.data,
            validation: validationResult,
            clarificationNeeded: demand.clarificationNeeded || !validationResult.isComplete,
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Extraction failed';
          errors.push({
            index: i,
            success: false,
            error: errorMsg,
          });

          if (!options?.continueOnError) {
            break;
          }
        }
      }

      res.json({
        success: true,
        data: {
          total: requests.length,
          successful: results.length,
          failed: errors.length,
          results,
          errors: options?.continueOnError ? errors : undefined,
        },
      });
    } catch (error) {
      logger.error('Batch extract failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Batch extraction failed',
      });
    }
  }
);

/**
 * @route   POST /api/v1/ai/validate-extraction
 * @desc    Validate extracted data against schema
 * @access  Private
 */
router.post(
  '/validate-extraction',
  authenticateToken,
  validateRequest(validateExtractionSchema),
  async (req: Request, res: Response) => {
    try {
      const { data, scene } = req.body;

      // Validate scene exists
      const schema = getL2Schema(scene);
      if (!schema) {
        return res.status(400).json({
          success: false,
          error: `Invalid scene: ${scene}`,
        });
      }

      const validationResult = validator.validate(data, scene);
      const confirmationSummary = validator.getConfirmationSummary(data, scene);

      res.json({
        success: true,
        data: {
          validation: validationResult,
          confirmation: confirmationSummary,
        },
      });
    } catch (error) {
      logger.error('Validate extraction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      });
    }
  }
);

/**
 * @route   POST /api/v1/ai/confirm-extraction
 * @desc    Confirm or correct extraction result
 * @access  Private
 */
router.post(
  '/confirm-extraction',
  authenticateToken,
  validateRequest(confirmExtractionSchema),
  async (req: Request, res: Response) => {
    try {
      const { extractionId, confirmed, corrections, confirmedFields, feedback } = req.body;
      const userId = req.user?.id;

      logger.info('Extraction confirmation', {
        extractionId,
        confirmed,
        userId,
        hasCorrections: !!corrections && Object.keys(corrections).length > 0,
      });

      // Record confirmation status
      validator.recordConfirmation({
        extractionId,
        confirmed,
        confirmedFields: confirmedFields || [],
        correctedFields: corrections
          ? Object.entries(corrections).map(([field, correctedValue]) => ({
              field,
              originalValue: null, // Would be retrieved from original extraction
              correctedValue,
            }))
          : [],
        rejectedFields: confirmed ? [] : (confirmedFields || []),
        confirmedAt: confirmed ? new Date() : undefined,
      });

      res.json({
        success: true,
        data: {
          extractionId,
          confirmed,
          recordedAt: new Date().toISOString(),
          feedback: feedback || null,
        },
      });
    } catch (error) {
      logger.error('Confirm extraction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Confirmation failed',
      });
    }
  }
);

/**
 * @route   GET /api/v1/ai/scene-config/:scene
 * @desc    Get scene configuration and schema
 * @access  Private
 */
router.get(
  '/scene-config/:scene',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { scene } = req.params;
      const schema = getL2Schema(scene);

      if (!schema) {
        return res.status(404).json({
          success: false,
          error: `Scene not found: ${scene}`,
        });
      }

      res.json({
        success: true,
        data: {
          scene,
          schema: {
            id: schema.id,
            version: schema.version,
            title: schema.title,
            description: schema.description,
            fields: schema.fields,
            groups: schema.groups,
            steps: schema.steps,
          },
        },
      });
    } catch (error) {
      logger.error('Get scene config failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get scene config',
      });
    }
  }
);

/**
 * @route   GET /api/v1/ai/scenes
 * @desc    Get list of available scenes
 * @access  Private
 */
router.get(
  '/scenes',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { getAllL2Schemas } = await import('@visionshare/shared');
      const schemas = getAllL2Schemas();

      res.json({
        success: true,
        data: {
          scenes: schemas.map(s => ({
            id: s.scene,
            title: s.title,
            description: s.description,
            version: s.version,
            fieldCount: s.fields.length,
          })),
        },
      });
    } catch (error) {
      logger.error('Get scenes failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get scenes',
      });
    }
  }
);

/**
 * Setup WebSocket handlers for real-time extraction feedback
 * @param io - Socket.IO server instance
 */
export function setupExtractionWebSocket(io: SocketIOServer): void {
  io.on('connection', (socket) => {
    logger.info('Client connected to extraction WebSocket', { socketId: socket.id });

    // Handle real-time extraction requests
    socket.on('extract-demand-stream', async (data: {
      text: string;
      scene: string;
      requestId: string;
    }) => {
      try {
        await ensureService();

        const { text, scene, requestId } = data;

        // Emit start event
        socket.emit('extraction-progress', {
          requestId,
          status: 'started',
          progress: 0,
        });

        // Get schema
        const schema = getL2Schema(scene);
        if (!schema) {
          socket.emit('extraction-error', {
            requestId,
            error: `Invalid scene: ${scene}`,
          });
          return;
        }

        // Emit progress
        socket.emit('extraction-progress', {
          requestId,
          status: 'extracting',
          progress: 30,
        });

        // Perform extraction
        const extractionRequest: ExtractionRequest = {
          text,
          scene,
        };

        const demand = await extractionService.extract(extractionRequest);

        socket.emit('extraction-progress', {
          requestId,
          status: 'mapping',
          progress: 60,
        });

        // Map to L2
        const mappingResult = mapper.map(demand);

        socket.emit('extraction-progress', {
          requestId,
          status: 'validating',
          progress: 80,
        });

        // Validate
        const validationResult = validator.validate(mappingResult.data, scene);

        socket.emit('extraction-progress', {
          requestId,
          status: 'completed',
          progress: 100,
        });

        // Emit result
        socket.emit('extraction-result', {
          requestId,
          demand: {
            id: demand.id,
            scene: demand.scene,
            intent: demand.intent,
            entities: demand.entities,
            confidence: demand.confidence,
            extractedAt: demand.extractedAt.toISOString(),
          },
          mappedData: mappingResult.data,
          validation: validationResult,
          clarificationNeeded: demand.clarificationNeeded || !validationResult.isComplete,
        });
      } catch (error) {
        logger.error('WebSocket extraction failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          socketId: socket.id,
        });

        socket.emit('extraction-error', {
          requestId: data.requestId,
          error: error instanceof Error ? error.message : 'Extraction failed',
        });
      }
    });

    socket.on('disconnect', () => {
      logger.info('Client disconnected from extraction WebSocket', { socketId: socket.id });
    });
  });
}

export default router;
