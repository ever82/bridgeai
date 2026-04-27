/**
 * Match Query Routes
 *
 * HTTP API surface for the matching query engine. Wires the
 * `MatchQueryService` to authenticated endpoints under /api/v1/matches.
 */
import { Router, Response } from 'express';
import { FilterDSL } from '@bridgeai/shared';

import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/common';
import { ApiResponse } from '../utils/response';
import { AppError } from '../errors/AppError';
import {
  matchQueryService,
  MatchQueryValidationError,
} from '../services/matching/matchQueryService';

const router: Router = Router();

function requireUser(req: AuthenticatedRequest): string {
  if (!req.user?.id) {
    throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
  }
  return req.user.id;
}

/**
 * @route POST /api/v1/matches/query
 * @desc Execute a FilterDSL query against matches via the QueryEngine
 * @access Private
 */
router.post(
  '/query',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = requireUser(req);
    const dsl = req.body as FilterDSL;

    try {
      const result = await matchQueryService.execute(dsl, {
        userId,
        useCache: req.query.cache !== 'false',
      });

      res.json(
        ApiResponse.success(result.data, undefined, {
          executionTime: result.executionTime,
          planId: result.planId,
          cached: result.cached,
        })
      );
    } catch (err) {
      if (err instanceof MatchQueryValidationError) {
        throw new AppError(err.message, 'INVALID_FILTER', 400, { errors: err.errors });
      }
      throw err;
    }
  })
);

/**
 * @route POST /api/v1/matches/query/compile
 * @desc Compile a FilterDSL query into an execution plan without executing it
 * @access Private
 */
router.post(
  '/query/compile',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    requireUser(req);
    const dsl = req.body as FilterDSL;

    try {
      const plan = matchQueryService.compile(dsl);
      res.json(ApiResponse.success(plan));
    } catch (err) {
      if (err instanceof MatchQueryValidationError) {
        throw new AppError(err.message, 'INVALID_FILTER', 400, { errors: err.errors });
      }
      throw err;
    }
  })
);

/**
 * @route POST /api/v1/matches/query/parallel
 * @desc Execute several FilterDSL queries in parallel
 * @access Private
 */
router.post(
  '/query/parallel',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = requireUser(req);
    const body = req.body as { queries?: FilterDSL[]; maxConcurrency?: number };
    if (!body || !Array.isArray(body.queries) || body.queries.length === 0) {
      throw new AppError('queries[] is required', 'INVALID_REQUEST', 400);
    }

    try {
      const results = await matchQueryService.executeParallel(body.queries, {
        userId,
        maxConcurrency: body.maxConcurrency,
      });
      res.json(ApiResponse.success(results));
    } catch (err) {
      if (err instanceof MatchQueryValidationError) {
        throw new AppError(err.message, 'INVALID_FILTER', 400, { errors: err.errors });
      }
      throw err;
    }
  })
);

/**
 * @route GET /api/v1/matches/query/stats
 * @desc Engine + subscription statistics
 * @access Private
 */
router.get(
  '/query/stats',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    requireUser(req);
    res.json(ApiResponse.success(matchQueryService.getStats()));
  })
);

/**
 * @route POST /api/v1/matches/subscriptions
 * @desc Create a real-time subscription for a FilterDSL query
 * @access Private
 *
 * Subscriptions deliver events through the `/matchSubscriptions` Socket.IO
 * namespace. The client may also poll the GET endpoints below.
 */
router.post(
  '/subscriptions',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = requireUser(req);
    const body = req.body as { query?: FilterDSL; filters?: Record<string, unknown> };
    if (!body?.query) {
      throw new AppError('query is required', 'INVALID_REQUEST', 400);
    }

    try {
      const subscription = await matchQueryService.createSubscription(
        userId,
        body.query,
        body.filters
      );
      res.status(201).json(ApiResponse.success(subscription));
    } catch (err) {
      if (err instanceof MatchQueryValidationError) {
        throw new AppError(err.message, 'INVALID_FILTER', 400, { errors: err.errors });
      }
      throw err;
    }
  })
);

/**
 * @route GET /api/v1/matches/subscriptions
 * @desc List the caller's active subscriptions
 * @access Private
 */
router.get(
  '/subscriptions',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = requireUser(req);
    res.json(ApiResponse.success(matchQueryService.listUserSubscriptions(userId)));
  })
);

/**
 * @route DELETE /api/v1/matches/subscriptions/:id
 * @desc Remove a subscription
 * @access Private
 */
router.delete(
  '/subscriptions/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    requireUser(req);
    const removed = matchQueryService.removeSubscription(req.params.id);
    if (!removed) {
      throw new AppError('Subscription not found', 'NOT_FOUND', 404);
    }
    res.json(ApiResponse.success({ id: req.params.id, removed: true }));
  })
);

export default router;
