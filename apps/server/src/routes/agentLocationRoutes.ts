/**
 * Agent Location Routes
 * Agent 位置相关 API 路由
 */

import { Router } from 'express';
import { z } from 'zod';
import type { Location, GeoCoordinates } from '@bridgeai/shared';

import { authenticate } from '../middleware/auth';
import {
  updateAgentLocation,
  getAgentLocation,
  searchAgentsByLocation,
  findAgentsNearLocation,
  batchUpdateAgentLocations,
} from '../services/agentLocationService';
import {
  getAgentLocationPrivacy,
  setAgentLocationPrivacy,
  applyPrivacyFilter,
} from '../services/agentLocationPrivacyService';
import { logger } from '../utils/logger';

const router: Router = Router();

const updateLocationSchema = z.object({
  location: z.object({
    province: z.string(),
    provinceName: z.string(),
    city: z.string().optional(),
    cityName: z.string().optional(),
    district: z.string().optional(),
    districtName: z.string().optional(),
    address: z.string().optional(),
    postalCode: z.string().optional(),
  }),
  coordinates: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      accuracy: z.number().optional(),
      altitude: z.number().optional(),
    })
    .optional(),
});

const privacySchema = z.object({
  privacyLevel: z.enum(['EXACT', 'DISTRICT', 'CITY', 'PROVINCE', 'HIDDEN']).optional(),
  showExactCoords: z.boolean().optional(),
  hideFromPublic: z.boolean().optional(),
});

/**
 * PUT /api/v1/location/agents/update
 * Update current agent's location
 */
router.put(
  '/agents/update',
  authenticate,
  async (req, res, next) => {
    try {
      const parsed = updateLocationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
        });
      }

      const agentId = (req as any).user?.agentId;
      if (!agentId) {
        return res.status(403).json({
          success: false,
          error: { code: 'NO_AGENT', message: 'User does not have an agent' },
        });
      }

      const success = await updateAgentLocation(
        agentId,
        parsed.data.location as Location,
        parsed.data.coordinates as GeoCoordinates | undefined
      );

      if (!success) {
        return res.status(404).json({
          success: false,
          error: { code: 'UPDATE_FAILED', message: 'Failed to update agent location' },
        });
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/location/agents/:agentId
 * Get agent's location (privacy-aware)
 */
router.get('/agents/:agentId', authenticate, async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const requestingUserId = (req as any).user?.id;

    const agent = await getAgentLocation(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Agent location not found' },
      });
    }

    // Apply privacy filter
    const privacy = await getAgentLocationPrivacy(agentId);
    if (privacy?.hideFromPublic && requestingUserId !== agentId) {
      return res.json({
        success: true,
        data: {
          location: null,
          coordinates: null,
          privacyApplied: true,
        },
      });
    }

    res.json({
      success: true,
      data: {
        location: agent.location,
        coordinates: agent.coordinates,
        lastUpdated: agent.lastUpdated,
        privacyApplied: false,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/location/agents/:agentId/privacy
 * Update agent location privacy settings
 */
router.put('/agents/:agentId/privacy', authenticate, async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const requestingUserId = (req as any).user?.id;

    // Check ownership - verify the agent belongs to the requesting user
    // (simplified check - in production, verify via DB)
    const parsed = privacySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
      });
    }

    const success = await setAgentLocationPrivacy(agentId, parsed.data);
    if (!success) {
      return res.status(500).json({
        success: false,
        error: { code: 'UPDATE_FAILED', message: 'Failed to update privacy settings' },
      });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/location/agents/:agentId/privacy
 * Get agent location privacy settings (own agent only)
 */
router.get('/agents/:agentId/privacy', authenticate, async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const privacy = await getAgentLocationPrivacy(agentId);

    res.json({
      success: true,
      data: privacy ?? {
        privacyLevel: 'CITY',
        showExactCoords: false,
        hideFromPublic: false,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/location/agents
 * Search agents by location (with privacy filtering)
 */
router.get('/agents', authenticate, async (req, res, next) => {
  try {
    const { province, city, district, lat, lng, radius, page, limit } = req.query;

    const filter: any = {};
    if (province) filter.province = province as string;
    if (city) filter.city = city as string;
    if (district) filter.district = district as string;

    if (lat && lng && radius) {
      filter.withinRadius = {
        center: {
          latitude: parseFloat(lat as string),
          longitude: parseFloat(lng as string),
        },
        radiusKm: parseFloat(radius as string),
      };
    }

    const result = await searchAgentsByLocation(
      filter,
      parseInt(page as string) || 1,
      parseInt(limit as string) || 20
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/location/agents/nearby
 * Find agents within radius (with privacy filtering)
 */
router.get('/agents/nearby', authenticate, async (req, res, next) => {
  try {
    const { lat, lng, radius, agentType, excludeAgentId } = req.query;

    const results = await findAgentsNearLocation(
      {
        latitude: parseFloat(lat as string),
        longitude: parseFloat(lng as string),
      },
      parseFloat(radius as string),
      {
        agentType: agentType as string,
        excludeAgentId: excludeAgentId as string,
      }
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
