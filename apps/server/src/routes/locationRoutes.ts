/**
 * Location Routes
 * 位置相关 API 路由
 */

import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  getProvinces,
  getCitiesByProvince,
  getDistrictsByCity,
  getLocationHierarchy,
  getLocationNameByCode,
  searchLocations,
  searchAgentsByLocation,
  findAgentsWithinRadius,
  getDistanceBetweenAgents,
} from '../services/locationSearchService';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const locationFilterSchema = z.object({
  province: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().max(100).default(20),
});

const radiusSearchSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(0.1).max(1000),
  agentType: z.string().optional(),
  excludeAgentId: z.string().optional(),
});

const distanceSchema = z.object({
  agentId1: z.string().uuid(),
  agentId2: z.string().uuid(),
});

/**
 * GET /api/location/provinces
 * Get all provinces
 */
router.get('/provinces', async (req, res, next) => {
  try {
    const provinces = await getProvinces();
    res.json({
      success: true,
      data: provinces,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/location/cities/:provinceCode
 * Get cities by province code
 */
router.get('/cities/:provinceCode', async (req, res, next) => {
  try {
    const { provinceCode } = req.params;
    const cities = await getCitiesByProvince(provinceCode);
    res.json({
      success: true,
      data: cities,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/location/districts/:cityCode
 * Get districts by city code
 */
router.get('/districts/:cityCode', async (req, res, next) => {
  try {
    const { cityCode } = req.params;
    const districts = await getDistrictsByCity(cityCode);
    res.json({
      success: true,
      data: districts,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/location/hierarchy
 * Get location hierarchy
 * Query params: provinceCode, cityCode
 */
router.get('/hierarchy', async (req, res, next) => {
  try {
    const { provinceCode, cityCode } = req.query;
    const hierarchy = await getLocationHierarchy(
      provinceCode as string,
      cityCode as string
    );
    res.json({
      success: true,
      data: hierarchy,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/location/search
 * Search locations by keyword
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUERY',
          message: 'Query parameter q is required',
        },
      });
    }

    const results = await searchLocations(q);
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/location/name/:code
 * Get location name by code
 */
router.get('/name/:code', async (req, res, next) => {
  try {
    const { code } = req.params;
    const name = await getLocationNameByCode(code);

    if (!name) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LOCATION_NOT_FOUND',
          message: 'Location not found for the given code',
        },
      });
    }

    res.json({
      success: true,
      data: { code, name },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/location/agents
 * Search agents by location
 */
router.get('/agents', authenticate, validate({ query: locationFilterSchema }), async (req, res, next) => {
  try {
    const { province, city, district, lat, lng, radius, page, limit } = req.query;

    const filter: any = {};
    if (province) filter.province = province;
    if (city) filter.city = city;
    if (district) filter.district = district;

    if (lat && lng && radius) {
      filter.withinRadius = {
        center: {
          latitude: parseFloat(lat as string),
          longitude: parseFloat(lng as string),
        },
        radiusKm: parseFloat(radius as string),
      };
    }

    const results = await searchAgentsByLocation(
      filter,
      parseInt(page as string) || 1,
      parseInt(limit as string) || 20
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/location/agents/nearby
 * Find agents within radius
 */
router.get(
  '/agents/nearby',
  authenticate,
  validate({ query: radiusSearchSchema }),
  async (req, res, next) => {
    try {
      const { lat, lng, radius, agentType, excludeAgentId } = req.query;

      const results = await findAgentsWithinRadius(
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
  }
);

/**
 * GET /api/location/distance
 * Calculate distance between two agents
 */
router.get(
  '/distance',
  authenticate,
  validate({ query: distanceSchema }),
  async (req, res, next) => {
    try {
      const { agentId1, agentId2 } = req.query;

      const distance = await getDistanceBetweenAgents(
        agentId1 as string,
        agentId2 as string
      );

      if (distance === null) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'DISTANCE_CALCULATION_FAILED',
            message: 'Unable to calculate distance. One or both agents may not have location data.',
          },
        });
      }

      res.json({
        success: true,
        data: {
          agentId1,
          agentId2,
          distanceKm: distance,
          distanceMeters: distance * 1000,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
