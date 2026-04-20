import { Router, Request, Response } from 'express';
import type {
  CreateDatingProfileRequest,
  UpdateDatingProfileRequest,
} from '@bridgeai/shared';

import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/common';
import { ApiResponse } from '../../utils/response';
import { AppError } from '../../errors/AppError';
import * as profileService from '../../services/dating/profileService';
import * as qualityService from '../../services/dating/profileQualityService';

const router: Router = Router();

/**
 * @route GET /api/v1/dating/agents/:agentId/profile
 * @desc Get dating profile for an agent
 * @access Private
 */
router.get(
  '/agents/:agentId/profile',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { agentId } = req.params;
    const profile = await profileService.getProfileByAgentId(agentId, req.user.id);

    if (!profile) {
      throw new AppError('Dating profile not found', 'PROFILE_NOT_FOUND', 404);
    }

    // Calculate quality metrics
    const quality = qualityService.calculateProfileQuality(profile);

    res.json(ApiResponse.success({
      profile,
      quality,
      completion: {
        percentage: quality.metrics.completenessScore,
        filledSections: quality.metrics.completenessScore > 0 ? Math.round(quality.metrics.completenessScore / 20) : 0,
        totalSections: 5,
      },
    }));
  })
);

/**
 * @route POST /api/v1/dating/agents/:agentId/profile
 * @desc Create dating profile for an agent
 * @access Private
 */
router.post(
  '/agents/:agentId/profile',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { agentId } = req.params;
    const {
      basicConditions,
      personality,
      interests,
      lifestyle,
      expectations,
      description,
      privacySettings,
    } = req.body;

    const data: CreateDatingProfileRequest = {
      agentId,
      basicConditions,
      personality,
      interests,
      lifestyle,
      expectations,
      description,
      privacySettings,
    };

    const profile = await profileService.createProfile(data, req.user.id);

    res.status(201).json(ApiResponse.success(
      { profile },
      'Dating profile created successfully'
    ));
  })
);

/**
 * @route PUT /api/v1/dating/agents/:agentId/profile
 * @desc Update dating profile for an agent
 * @access Private
 */
router.put(
  '/agents/:agentId/profile',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { agentId } = req.params;
    const {
      basicConditions,
      personality,
      interests,
      lifestyle,
      expectations,
      description,
      privacySettings,
    } = req.body;

    const data: UpdateDatingProfileRequest = {
      basicConditions,
      personality,
      interests,
      lifestyle,
      expectations,
      description,
      privacySettings,
    };

    const profile = await profileService.updateProfile(agentId, req.user.id, data);

    // Calculate updated quality metrics
    const quality = qualityService.calculateProfileQuality(profile);

    res.json(ApiResponse.success(
      {
        profile,
        quality,
        completion: {
          percentage: quality.metrics.completenessScore,
          filledSections: quality.metrics.completenessScore > 0 ? Math.round(quality.metrics.completenessScore / 20) : 0,
          totalSections: 5,
        },
      },
      'Dating profile updated successfully'
    ));
  })
);

/**
 * @route DELETE /api/v1/dating/agents/:agentId/profile
 * @desc Delete dating profile for an agent
 * @access Private
 */
router.delete(
  '/agents/:agentId/profile',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { agentId } = req.params;
    await profileService.deleteProfile(agentId, req.user.id);

    res.json(ApiResponse.success(null, 'Dating profile deleted successfully'));
  })
);

/**
 * @route GET /api/v1/dating/agents/:agentId/profile/completeness
 * @desc Get profile completeness status
 * @access Private
 */
router.get(
  '/agents/:agentId/profile/completeness',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { agentId } = req.params;
    const profile = await profileService.getProfileByAgentId(agentId, req.user.id);

    if (!profile) {
      throw new AppError('Dating profile not found', 'PROFILE_NOT_FOUND', 404);
    }

    const completeness = profileService.checkCompleteness(profile);
    const quality = qualityService.calculateProfileQuality(profile);
    const readyForMatching = qualityService.isProfileReadyForMatching(profile);

    res.json(ApiResponse.success({
      completeness,
      quality: quality.metrics,
      readyForMatching,
    }));
  })
);

/**
 * @route GET /api/v1/dating/agents/:agentId/profile/quality
 * @desc Get profile quality assessment
 * @access Private
 */
router.get(
  '/agents/:agentId/profile/quality',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { agentId } = req.params;
    const profile = await profileService.getProfileByAgentId(agentId, req.user.id);

    if (!profile) {
      throw new AppError('Dating profile not found', 'PROFILE_NOT_FOUND', 404);
    }

    const quality = qualityService.calculateProfileQuality(profile);

    res.json(ApiResponse.success(quality));
  })
);

export default router;
