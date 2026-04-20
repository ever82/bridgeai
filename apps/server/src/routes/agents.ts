import { Router, Response } from 'express';
import { FilterDSL } from '@bridgeai/shared';

import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/common';
import { ApiResponse } from '../utils/response';
import * as agentService from '../services/agentService';
import { AppError } from '../errors/AppError';
import { createAgentSchema } from '../schemas/agentSchemas';
import { buildPrismaQuery, validateFilterDSL } from '../utils/queryBuilder';
import { prisma } from '../db/client';
import { filterAndSort, FilterCriteria } from '../services/smartFilter';
import { SortingStrategy } from '../utils/sorting';
import { getRecommendationsForUser } from '../services/recommendation';

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

    const validated = createAgentSchema.safeParse(req.body);
    if (!validated.success) {
      throw new AppError(
        `Validation error: ${validated.error.issues.map(i => i.message).join(', ')}`,
        'VALIDATION_ERROR',
        400
      );
    }

    const { type, name, description, config, latitude, longitude } = validated.data;

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
 * @route GET /api/v1/agents/search
 * @desc Search agents with smart filtering and sorting
 * @access Private
 */
router.get(
  '/search',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const {
      skills,
      minRating,
      maxHourlyRate,
      availability,
      location,
      language,
      experienceYears,
      verified,
      sortBy = 'relevance',
      sortOrder = 'desc',
      page = '1',
      limit = '20',
    } = req.query;

    // Build filter criteria
    const criteria: FilterCriteria = {
      skills: skills ? (skills as string).split(',') : undefined,
      minRating: minRating ? parseFloat(minRating as string) : undefined,
      maxHourlyRate: maxHourlyRate ? parseFloat(maxHourlyRate as string) : undefined,
      availability: availability !== undefined ? availability === 'true' : undefined,
      location: location as string | undefined,
      language: language ? (language as string).split(',') : undefined,
      experienceYears: experienceYears ? parseInt(experienceYears as string, 10) : undefined,
      verified: verified !== undefined ? verified === 'true' : undefined,
    };

    // Fetch agents with DB-level pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const agents = await prisma.agent.findMany({
      where: { userId: req.user.id },
      include: {
        profile: true,
      },
      take: limitNum,
      skip,
    });

    // Apply smart filtering and sorting
    const results = filterAndSort(
      agents as any,
      criteria,
      sortBy as SortingStrategy,
      sortOrder as 'asc' | 'desc'
    );

    const total = await prisma.agent.count({ where: { userId: req.user.id } });

    res.json(ApiResponse.success({
      agents: results.map(r => ({
        ...r.agent,
        matchScore: r.score,
        matchDetails: r.matchDetails,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + limitNum < total,
      },
      filters: {
        applied: criteria,
        sortBy,
        sortOrder,
      },
    }));
  })
);

/**
 * @route GET /api/v1/agents/sort-options
 * @desc Get available sorting options
 * @access Private
 */
router.get(
  '/sort-options',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const options = [
      { value: 'relevance', label: 'Best Match', description: 'Most relevant to your search' },
      { value: 'rating', label: 'Highest Rated', description: 'By customer rating' },
      { value: 'price', label: 'Price', description: 'Lowest to highest hourly rate' },
      { value: 'experience', label: 'Experience', description: 'Years of experience' },
      { value: 'activity', label: 'Recently Active', description: 'Most recent activity' },
      { value: 'credit', label: 'Credit Score', description: 'Platform credit score' },
      { value: 'composite', label: 'Overall Score', description: 'Combined ranking' },
    ];

    res.json(ApiResponse.success({ options }));
  })
);

/**
 * @route GET /api/v1/agents/recommended
 * @desc Get personalized agent recommendations
 * @access Private
 */
router.get(
  '/recommended',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const skip = (page - 1) * limit;

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where: { userId: req.user.id },
        include: {
          profile: true,
        },
        take: limit,
        skip,
      }),
      prisma.agent.count({ where: { userId: req.user.id } }),
    ]);

    const recommendations = await getRecommendationsForUser(
      req.user.id,
      agents as any
    );

    res.json(ApiResponse.success({
      agents: recommendations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      explanation: 'Based on your preferences and past interactions',
    }));
  })
);

/**
 * @route GET /api/v1/agents/filter-suggestions
 * @desc Get popular filter suggestions
 * @access Private
 */
router.get(
  '/filter-suggestions',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const suggestions = [
      { label: 'Top Rated', criteria: { minRating: 4.5, verified: true } },
      { label: 'Available Now', criteria: { availability: true, minRating: 4.0 } },
      { label: 'Best Value', criteria: { verified: true, maxHourlyRate: 50 } },
      { label: 'Expert Level', criteria: { experienceYears: 5, verified: true } },
    ];

    res.json(ApiResponse.success({ suggestions }));
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
