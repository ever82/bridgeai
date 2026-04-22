/**
 * Consumer Demand Routes
 * 消费者需求画像 API 路由
 */

import { Router, Request, Response } from 'express';

import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/common';
import { ApiResponse } from '../utils/response';
import * as consumerDemandService from '../services/consumerDemandService';
import { AppError } from '../errors/AppError';

const router: Router = Router();

/**
 * @route POST /api/v1/agents/consumer
 * @desc Create a new consumer Agent for AgentAd scenario
 * @access Private
 */
router.post(
  '/agents/consumer',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { name, description, initialConfig } = req.body;

    const agent = await consumerDemandService.createConsumerAgent(req.user.id, {
      name,
      description,
      role: 'CONSUMER' as any,
      initialConfig,
    });

    res.status(201).json(ApiResponse.success(agent, 'Consumer agent created successfully'));
  })
);

/**
 * @route GET /api/v1/agents/consumer/:agentId
 * @desc Get consumer agent with full profile
 * @access Private
 */
router.get(
  '/agents/consumer/:agentId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { agentId } = req.params;
    const agent = await consumerDemandService.getConsumerAgent(agentId, req.user.id);

    res.json(ApiResponse.success(agent));
  })
);

/**
 * @route PUT /api/v1/agents/consumer/:agentId/categories
 * @desc Configure categories for consumer demand (max 5)
 * @access Private
 */
router.put(
  '/agents/consumer/:agentId/categories',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { agentId } = req.params;
    const { categoryIds } = req.body;

    if (!Array.isArray(categoryIds)) {
      throw new AppError('categoryIds must be an array', 'INVALID_INPUT', 400);
    }

    const agent = await consumerDemandService.configureCategories(agentId, req.user.id, categoryIds);

    res.json(ApiResponse.success(agent, 'Categories configured successfully'));
  })
);

/**
 * @route PUT /api/v1/agents/consumer/:agentId/budget
 * @desc Configure budget for consumer demand
 * @access Private
 */
router.put(
  '/agents/consumer/:agentId/budget',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { agentId } = req.params;
    const { budget } = req.body;

    if (!budget || typeof budget !== 'object') {
      throw new AppError('Budget configuration is required', 'INVALID_INPUT', 400);
    }

    const agent = await consumerDemandService.configureBudget(agentId, req.user.id, budget);

    res.json(ApiResponse.success(agent, 'Budget configured successfully'));
  })
);

/**
 * @route PUT /api/v1/agents/consumer/:agentId/preferences
 * @desc Configure brand and merchant preferences
 * @access Private
 */
router.put(
  '/agents/consumer/:agentId/preferences',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { agentId } = req.params;
    const { brandPreference, merchantPreference } = req.body;

    const agent = await consumerDemandService.configurePreferences(agentId, req.user.id, {
      brandPreference,
      merchantPreference,
    });

    res.json(ApiResponse.success(agent, 'Preferences configured successfully'));
  })
);

/**
 * @route PUT /api/v1/agents/consumer/:agentId/timeline
 * @desc Configure timeline and urgency
 * @access Private
 */
router.put(
  '/agents/consumer/:agentId/timeline',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { agentId } = req.params;
    const { timeline } = req.body;

    if (!timeline || typeof timeline !== 'object') {
      throw new AppError('Timeline configuration is required', 'INVALID_INPUT', 400);
    }

    const agent = await consumerDemandService.configureTimeline(agentId, req.user.id, timeline);

    res.json(ApiResponse.success(agent, 'Timeline configured successfully'));
  })
);

/**
 * @route PUT /api/v1/agents/consumer/:agentId/location
 * @desc Configure location for consumer demand
 * @access Private
 */
router.put(
  '/agents/consumer/:agentId/location',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { agentId } = req.params;
    const { location } = req.body;

    if (!location || typeof location !== 'object') {
      throw new AppError('Location configuration is required', 'INVALID_INPUT', 400);
    }

    if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      throw new AppError('Latitude and longitude are required', 'INVALID_INPUT', 400);
    }

    const agent = await consumerDemandService.configureLocation(agentId, req.user.id, location);

    res.json(ApiResponse.success(agent, 'Location configured successfully'));
  })
);

/**
 * @route POST /api/v1/agents/consumer/:agentId/ai-extract
 * @desc Apply AI extracted demand data to consumer profile
 * @access Private
 */
router.post(
  '/agents/consumer/:agentId/ai-extract',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { agentId } = req.params;
    const { extractedData } = req.body;

    if (!extractedData || typeof extractedData !== 'object') {
      throw new AppError('Extracted data is required', 'INVALID_INPUT', 400);
    }

    const agent = await consumerDemandService.applyAIExtractedData(
      agentId,
      req.user.id,
      extractedData
    );

    res.json(ApiResponse.success(agent, 'AI extracted data applied successfully'));
  })
);

/**
 * @route GET /api/v1/agents/consumer/:agentId/preview
 * @desc Get demand profile preview
 * @access Private
 */
router.get(
  '/agents/consumer/:agentId/preview',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { agentId } = req.params;
    const preview = await consumerDemandService.previewDemandProfile(agentId, req.user.id);

    res.json(ApiResponse.success({ preview, agentId }));
  })
);

/**
 * @route POST /api/v1/agents/consumer/:agentId/publish
 * @desc Publish consumer demand
 * @access Private
 */
router.post(
  '/agents/consumer/:agentId/publish',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { agentId } = req.params;
    const result = await consumerDemandService.publishDemand(agentId, req.user.id);

    res.json(ApiResponse.success(result));
  })
);

/**
 * @route POST /api/v1/agents/consumer/:agentId/complete
 * @desc Complete all configuration steps at once
 * @access Private
 */
router.post(
  '/agents/consumer/:agentId/complete',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { agentId } = req.params;
    const {
      categoryIds,
      budget,
      brandPreference,
      merchantPreference,
      timeline,
      location,
      publish = false,
    } = req.body;

    // Apply all configurations
    if (categoryIds) {
      await consumerDemandService.configureCategories(agentId, req.user.id, categoryIds);
    }

    if (budget) {
      await consumerDemandService.configureBudget(agentId, req.user.id, budget);
    }

    if (brandPreference || merchantPreference) {
      await consumerDemandService.configurePreferences(agentId, req.user.id, {
        brandPreference,
        merchantPreference,
      });
    }

    if (timeline) {
      await consumerDemandService.configureTimeline(agentId, req.user.id, timeline);
    }

    if (location) {
      await consumerDemandService.configureLocation(agentId, req.user.id, location);
    }

    // Get updated agent
    let agent = await consumerDemandService.getConsumerAgent(agentId, req.user.id);

    // Optionally publish
    if (publish) {
      await consumerDemandService.publishDemand(agentId, req.user.id);
      agent = await consumerDemandService.getConsumerAgent(agentId, req.user.id);
    }

    res.json(ApiResponse.success(agent, 'Configuration completed successfully'));
  })
);

export default router;
