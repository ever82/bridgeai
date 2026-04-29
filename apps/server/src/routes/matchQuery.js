/**
 * Match Query Routes
 * 匹配查询路由 - Agent 发现和匹配查询 API
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/common';
import { ApiResponse } from '../utils/response';
import { AppError } from '../errors/AppError';
import { matchQueryService } from '../services/matching/matchQueryService';
const router = Router();
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
router.post('/query', authenticate, asyncHandler(async (req, res) => {
    if (!req.user) {
        throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const { sourceAgentId, sceneId, filter, limit, offset, sortBy, sortOrder, minScore, excludeMatched, maxRadius, } = req.body;
    if (!sourceAgentId) {
        throw new AppError('sourceAgentId is required', 'VALIDATION_ERROR', 400);
    }
    if (limit !== undefined && (limit < 1 || limit > 100)) {
        throw new AppError('limit must be between 1 and 100', 'VALIDATION_ERROR', 400);
    }
    if (minScore !== undefined && (minScore < 0 || minScore > 100)) {
        throw new AppError('minScore must be between 0 and 100', 'VALIDATION_ERROR', 400);
    }
    const queryRequest = {
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
}));
/**
 * @route GET /api/v1/matches/suggestions
 * @desc 获取匹配查询建议
 * @access Private
 *
 * Query params:
 *   sceneId?: SceneId
 */
router.get('/suggestions', authenticate, asyncHandler(async (req, res) => {
    if (!req.user) {
        throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const sceneId = req.query.sceneId;
    const suggestions = await matchQueryService.getQuerySuggestions(sceneId);
    res.json(ApiResponse.success(suggestions));
}));
/**
 * @route GET /api/v1/matches/stats/:agentId
 * @desc 获取 Agent 匹配统计
 * @access Private
 */
router.get('/stats/:agentId', authenticate, asyncHandler(async (req, res) => {
    if (!req.user) {
        throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const { agentId } = req.params;
    const stats = await matchQueryService.getMatchStats(agentId);
    res.json(ApiResponse.success(stats));
}));
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
router.get('/', authenticate, asyncHandler(async (req, res) => {
    if (!req.user) {
        throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }
    const { status, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
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
        res.json(ApiResponse.success({
            matches: [],
            total: 0,
            page: pageNum,
            limit: limitNum,
            hasMore: false,
        }));
        return;
    }
    // Find matches where user's agents are involved
    const matchWhere = {
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
    res.json(ApiResponse.success({
        matches,
        total,
        page: pageNum,
        limit: limitNum,
        hasMore: pageNum * limitNum < total,
    }));
}));
/**
 * @route GET /api/v1/matches/:id
 * @desc 获取单个匹配详情
 * @access Private
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
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
    const isParticipant = agentIds.includes(match.demand.agentId) || agentIds.includes(match.supply.agentId);
    if (!isParticipant) {
        throw new AppError('Access denied', 'FORBIDDEN', 403);
    }
    res.json(ApiResponse.success(match));
}));
export default router;
//# sourceMappingURL=matchQuery.js.map