/**
 * Match Query Routes
 * 匹配查询路由 - Agent 发现和匹配查询 API
 */

import { Router, Response } from 'express';

import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/common';
import { ApiResponse } from '../utils/response';
import { AppError } from '../errors/AppError';
import { matchQueryService, MatchQueryRequest } from '../services/matching/matchQueryService';

const router: Router = Router();

/**
 * @route POST /api/v1/matches/query
 * @desc 查询匹配候选 Agent
 * @access Private
 *
 * Body:
 *   sourceAgentId: string (required)
 *   sceneId?: SceneId
 *   filter?: FilterDSL
 *   limit?: number (default 20)
 *   offset?: number (default 0)
 *   sortBy?: 'relevance' | 'distance' | 'credit' | 'createdAt' | 'score'
 *   sortOrder?: 'asc' | 'desc'
 *   minScore?: number (0-100)
 *   excludeMatched?: boolean (default true)
 *   maxRadius?: number (km)
 */
router.post(
  '/query',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const {
      sourceAgentId,
      sceneId,
      filter,
      limit,
      offset,
      sortBy,
      sortOrder,
      minScore,
      excludeMatched,
      maxRadius,
    } = req.body;

    if (!sourceAgentId) {
      throw new AppError('sourceAgentId is required', 'VALIDATION_ERROR', 400);
    }

    if (limit !== undefined && (limit < 1 || limit > 100)) {
      throw new AppError('limit must be between 1 and 100', 'VALIDATION_ERROR', 400);
    }

    if (minScore !== undefined && (minScore < 0 || minScore > 100)) {
      throw new AppError('minScore must be between 0 and 100', 'VALIDATION_ERROR', 400);
    }

    const queryRequest: MatchQueryRequest = {
      sourceAgentId,
      sceneId,
      filter,
      limit: limit || 20,
      offset: offset || 0,
      sortBy: sortBy || 'relevance',
      sortOrder: sortOrder || 'desc',
      minScore: minScore || 0,
      excludeMatched: excludeMatched !== false,
      maxRadius,
    };

    const result = await matchQueryService.queryMatches(queryRequest);

    res.json(ApiResponse.success(result));
  })
);

/**
 * @route GET /api/v1/matches/suggestions
 * @desc 获取匹配查询建议
 * @access Private
 *
 * Query params:
 *   sceneId?: SceneId
 */
router.get(
  '/suggestions',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const sceneId = req.query.sceneId as any;
    const suggestions = await matchQueryService.getQuerySuggestions(sceneId);

    res.json(ApiResponse.success(suggestions));
  })
);

/**
 * @route GET /api/v1/matches/stats/:agentId
 * @desc 获取 Agent 匹配统计
 * @access Private
 */
router.get(
  '/stats/:agentId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { agentId } = req.params;
    const stats = await matchQueryService.getMatchStats(agentId);

    res.json(ApiResponse.success(stats));
  })
);

/**
 * @route POST /api/v1/matches/cancel
 * @desc 取消匹配（pre-match exit）- 取消 PENDING 状态的匹配
 * @access Private
 *
 * Body:
 *   matchId: string (required)
 */
router.post(
  '/cancel',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { matchId } = req.body;

    if (!matchId) {
      throw new AppError('matchId is required', 'VALIDATION_ERROR', 400);
    }

    const { prisma } = await import('../db/client');

    // Find the match with agent ownership info
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        demand: {
          include: {
            agent: {
              select: { id: true, userId: true },
            },
          },
        },
        supply: {
          include: {
            agent: {
              select: { id: true, userId: true },
            },
          },
        },
      },
    });

    if (!match) {
      throw new AppError('Match not found', 'NOT_FOUND', 404);
    }

    // Verify the user owns one of the agents involved
    const userAgents = await prisma.agent.findMany({
      where: { userId: req.user.id },
      select: { id: true },
    });
    const agentIds = userAgents.map(a => a.id);

    const isParticipant =
      agentIds.includes(match.demand.agentId) || agentIds.includes(match.supply.agentId);

    if (!isParticipant) {
      throw new AppError('Access denied', 'FORBIDDEN', 403);
    }

    // Only PENDING matches can be cancelled
    if (match.status !== 'PENDING') {
      throw new AppError(`Cannot cancel match in ${match.status} status`, 'INVALID_STATE', 409);
    }

    // Update match status to CANCELLED
    const updated = await prisma.match.update({
      where: { id: matchId },
      data: { status: 'CANCELLED' },
    });

    // Notify the other participant via socket
    try {
      const { emitToUser } = await import('../socket');
      const otherUserId =
        match.demand.agent.userId === req.user.id
          ? match.supply.agent.userId
          : match.demand.agent.userId;

      if (otherUserId) {
        emitToUser(otherUserId, 'match:cancelled', {
          matchId,
          cancelledBy: req.user.id,
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      // Socket notification is best-effort; do not fail the request
    }

    res.json(ApiResponse.success(updated));
  })
);

/**
 * @route GET /api/v1/matches
 * @desc 获取当前用户的匹配列表（已有 Match 记录）
 * @access Private
 *
 * Query params:
 *   status?: MatchStatus
 *   page?: number
 *   limit?: number
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { status, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    if (limitNum < 1 || limitNum > 100) {
      throw new AppError('limit must be between 1 and 100', 'VALIDATION_ERROR', 400);
    }

    // Get user's agents
    const { prisma } = await import('../db/client');
    const agents = await prisma.agent.findMany({
      where: { userId: req.user.id },
      select: { id: true },
    });

    const agentIds = agents.map(a => a.id);
    if (agentIds.length === 0) {
      res.json(
        ApiResponse.success({
          matches: [],
          total: 0,
          page: pageNum,
          limit: limitNum,
          hasMore: false,
        })
      );
      return;
    }

    // Find matches where user's agents are involved
    const matchWhere: any = {
      OR: [{ demand: { agentId: { in: agentIds } } }, { supply: { agentId: { in: agentIds } } }],
    };

    if (status) {
      matchWhere.status = status;
    }

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where: matchWhere,
        include: {
          demand: {
            include: {
              agent: {
                select: { id: true, name: true, type: true },
              },
            },
          },
          supply: {
            include: {
              agent: {
                select: { id: true, name: true, type: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.match.count({ where: matchWhere }),
    ]);

    res.json(
      ApiResponse.success({
        matches,
        total,
        page: pageNum,
        limit: limitNum,
        hasMore: pageNum * limitNum < total,
      })
    );
  })
);

/**
 * @route GET /api/v1/matches/:id
 * @desc 获取单个匹配详情
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
    const { prisma } = await import('../db/client');

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        demand: {
          include: {
            agent: {
              select: { id: true, name: true, type: true, userId: true },
            },
          },
        },
        supply: {
          include: {
            agent: {
              select: { id: true, name: true, type: true, userId: true },
            },
          },
        },
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!match) {
      throw new AppError('Match not found', 'NOT_FOUND', 404);
    }

    // Verify user has access to this match
    const userAgents = await prisma.agent.findMany({
      where: { userId: req.user.id },
      select: { id: true },
    });
    const agentIds = userAgents.map(a => a.id);

    const isParticipant =
      agentIds.includes(match.demand.agentId) || agentIds.includes(match.supply.agentId);

    if (!isParticipant) {
      throw new AppError('Access denied', 'FORBIDDEN', 403);
    }

    res.json(ApiResponse.success(match));
  })
);

export default router;
