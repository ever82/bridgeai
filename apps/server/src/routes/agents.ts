import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/common';
import { ApiResponse } from '../utils/response';
import * as agentService from '../services/agentService';
import { AppError } from '../errors/AppError';

const router: Router = Router();

/**
 * @route POST /api/v1/agents
 * @desc Create a new agent
 * @access Private
 */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { type, name, description, config, latitude, longitude } = req.body;

    const agent = await agentService.createAgent(req.user.id, {
      type,
      name,
      description,
      config,
      latitude,
      longitude,
    });

    res.status(201).json(ApiResponse.success(agent, 'Agent created successfully'));
  })
);

/**
 * @route GET /api/v1/agents
 * @desc Get all agents for the current user with optional filtering
 * @access Private
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const {
      type,
      status,
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const result = await agentService.getAgentsByUserId(req.user.id, {
      type: type as agentService.AgentType,
      status: status as agentService.AgentStatus,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      sortBy: sortBy as 'createdAt' | 'updatedAt' | 'name',
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.json(ApiResponse.success(result));
  })
);

/**
 * @route GET /api/v1/agents/:id
 * @desc Get a specific agent by ID
 * @access Private
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const agent = await agentService.getAgentById(id, req.user.id);

    if (!agent) {
      throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
    }

    res.json(ApiResponse.success(agent));
  })
);

/**
 * @route PUT /api/v1/agents/:id
 * @desc Update an agent
 * @access Private
 */
router.put(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const { name, description, config, latitude, longitude } = req.body;

    const agent = await agentService.updateAgent(id, req.user.id, {
      name,
      description,
      config,
      latitude,
      longitude,
    });

    res.json(ApiResponse.success(agent, 'Agent updated successfully'));
  })
);

/**
 * @route PATCH /api/v1/agents/:id/status
 * @desc Update agent status
 * @access Private
 */
router.patch(
  '/:id/status',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(agentService.AgentStatus).includes(status)) {
      throw new AppError(
        `Invalid status. Valid statuses are: ${Object.values(agentService.AgentStatus).join(', ')}`,
        'INVALID_STATUS',
        400
      );
    }

    const agent = await agentService.updateAgentStatus(id, req.user.id, status);

    res.json(ApiResponse.success(agent, 'Agent status updated successfully'));
  })
);

/**
 * @route GET /api/v1/agents/:id/history
 * @desc Get agent status history
 * @access Private
 */
router.get(
  '/:id/history',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const history = await agentService.getAgentStatusHistory(id);

    res.json(ApiResponse.success(history));
  })
);

/**
 * @route DELETE /api/v1/agents/:id
 * @desc Delete an agent
 * @access Private
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    await agentService.deleteAgent(id, req.user.id);

    res.json(ApiResponse.success(null, 'Agent deleted successfully'));
  })
);

export default router;
