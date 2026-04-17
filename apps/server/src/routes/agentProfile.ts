import { Router, Request, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/common';
import { ApiResponse } from '../utils/response';
import { AppError } from '../errors/AppError';
import * as agentProfileService from '../services/agentProfileService';
import { calculateL1Completion } from '../services/agentProfileService';
import type { UpdateL1ProfileRequest } from '@bridgeai/shared';

const router: Router = Router();

/**
 * @route GET /api/v1/agents/:id/profile/l1
 * @desc Get L1 profile for an agent
 * @access Private
 */
router.get(
  '/:id/profile/l1',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const l1Profile = await agentProfileService.getL1Profile(id, req.user.id);

    // Calculate completion
    const completion = calculateL1Completion(l1Profile);

    res.json(ApiResponse.success({
      profile: l1Profile,
      completion,
    }));
  })
);

/**
 * @route PUT /api/v1/agents/:id/profile/l1
 * @desc Update L1 profile for an agent
 * @access Private
 */
router.put(
  '/:id/profile/l1',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const { age, gender, location, occupation, education } = req.body;

    const updateData: UpdateL1ProfileRequest = {
      age,
      gender,
      location,
      occupation,
      education,
    };

    const l1Profile = await agentProfileService.updateL1Profile(
      id,
      req.user.id,
      updateData
    );

    // Calculate completion
    const completion = calculateL1Completion(l1Profile);

    res.json(ApiResponse.success({
      profile: l1Profile,
      completion,
    }, 'L1 profile updated successfully'));
  })
);

/**
 * @route GET /api/v1/agents/:id/profile/completion
 * @desc Get profile completion status for an agent
 * @access Private
 */
router.get(
  '/:id/profile/completion',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const l1Profile = await agentProfileService.getL1Profile(id, req.user.id);
    const completion = calculateL1Completion(l1Profile);

    res.json(ApiResponse.success(completion));
  })
);

/**
 * @route GET /api/v1/agents/:id/profile/l2
 * @desc Get L2 profile for an agent
 * @access Private
 */
router.get(
  '/:id/profile/l2',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const l2Profile = await agentProfileService.getL2Profile(id, req.user.id);

    res.json(ApiResponse.success({ profile: l2Profile }));
  })
);

/**
 * @route PUT /api/v1/agents/:id/profile/l2
 * @desc Update L2 profile for an agent
 * @access Private
 */
router.put(
  '/:id/profile/l2',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const { description, requirements, capabilities, preferences, constraints } = req.body;

    const l2Profile = await agentProfileService.updateL2Profile(
      id,
      req.user.id,
      {
        description,
        requirements,
        capabilities,
        preferences,
        constraints,
      }
    );

    res.json(ApiResponse.success({ profile: l2Profile }, 'L2 profile updated successfully'));
  })
);

/**
 * @route GET /api/v1/agents/:id/profile/l3
 * @desc Get L3 profile for an agent
 * @access Private
 */
router.get(
  '/:id/profile/l3',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const l3Profile = await agentProfileService.getL3Profile(id, req.user.id);

    res.json(ApiResponse.success({ description: l3Profile }));
  })
);

/**
 * @route PUT /api/v1/agents/:id/profile/l3
 * @desc Update L3 profile for an agent
 * @access Private
 */
router.put(
  '/:id/profile/l3',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const { description } = req.body;

    if (!description || typeof description !== 'string') {
      throw new AppError('Description is required', 'DESCRIPTION_REQUIRED', 400);
    }

    const l3Profile = await agentProfileService.updateL3Profile(
      id,
      req.user.id,
      { description }
    );

    res.json(ApiResponse.success({ description: l3Profile }, 'L3 profile updated successfully'));
  })
);

export default router;
