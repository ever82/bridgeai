import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/common';
import { ApiResponse } from '../utils/response';
import * as agentService from '../services/agentService';
import { AppError } from '../errors/AppError';
import { buildPrismaQuery, validateFilterDSL } from '../utils/queryBuilder';
import { FilterDSL } from '@visionshare/shared';
import { prisma } from '../db/client';
import { logger } from '../utils/logger';

const router: Router = Router();

/**
 * @route POST /api/v1/agents/filter
 * @desc Filter agents with complex queries
 * @access Private
 */
router.post(
  '/filter',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const filterDSL: FilterDSL = req.body;

    // Validate filter DSL
    const validation = validateFilterDSL(filterDSL);
    if (!validation.valid) {
      throw new AppError(
        `Invalid filter: ${validation.errors.join(', ')}`,
        'INVALID_FILTER',
        400
      );
    }

    // Build Prisma query
    const query = buildPrismaQuery(filterDSL);

    // Add user filter
    const where = {
      AND: [
        { userId: req.user.id },
        query.where,
      ],
    };

    // Execute query
    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        orderBy: query.orderBy,
        skip: query.skip,
        take: query.take,
        include: {
          profile: true,
        },
      }),
      prisma.agent.count({ where }),
    ]);

    const page = filterDSL.pagination?.page || 1;
    const limit = filterDSL.pagination?.limit || 20;

    res.json(ApiResponse.success({
      items: agents,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    }));
  })
);

/**
 * @route GET /api/v1/agents/suggestions
 * @desc Get filter suggestions for a field
 * @access Private
 */
router.get(
  '/suggestions',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { field, query: searchQuery, limit = '10' } = req.query;

    if (!field) {
      throw new AppError('Field is required', 'INVALID_REQUEST', 400);
    }

    // Get distinct values for the field
    // This is a simplified implementation - in production, you'd want
    // to handle different field types and JSON path queries
    const suggestions = await prisma.agent.findMany({
      where: {
        userId: req.user.id,
      },
      select: {
        name: field === 'name' ? true : undefined,
        type: field === 'type' ? true : undefined,
        status: field === 'status' ? true : undefined,
      } as any,
      distinct: [field as string],
      take: parseInt(limit as string, 10),
    });

    // Extract unique values
    const values = suggestions
      .map((a: any) => a[field as string])
      .filter((v: any) => v !== null && v !== undefined)
      .filter((v: any) =>
        !searchQuery ||
        v.toString().toLowerCase().includes((searchQuery as string).toLowerCase())
      );

    res.json(ApiResponse.success({
      field,
      values: values.map((v: any) => ({ value: v, count: 1 })),
    }));
  })
);

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
