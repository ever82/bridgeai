/**
 * Geo-Fence Routes
 * 地理围栏 API 路由
 */

import { Router } from 'express';
import { z } from 'zod';

import { authenticate, optionalAuth } from '../middleware/auth';
import {
  createGeoFence,
  getGeoFence,
  listGeoFences,
  updateGeoFence,
  deleteGeoFence,
  checkPointInFence,
  checkMultipleFences,
  findContainingFences,
  createCircularFence,
} from '../services/geoFenceService';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const createGeoFenceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['POLYGON', 'CIRCLE', 'RECTANGLE']).default('POLYGON'),
  coordinates: z.array(z.array(z.array(z.number()))).min(1),
  centerLat: z.number().min(-90).max(90).optional(),
  centerLng: z.number().min(-180).max(180).optional(),
  radiusMeters: z.number().positive().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateGeoFenceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  coordinates: z.array(z.array(z.array(z.number()))).min(1).optional(),
  centerLat: z.number().min(-90).max(90).optional(),
  centerLng: z.number().min(-180).max(180).optional(),
  radiusMeters: z.number().positive().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const pointCheckSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

const multipleCheckSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  fenceIds: z.string().transform(s => s.split(',')).pipe(z.array(z.string().uuid())),
});

const createCircularFenceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  centerLat: z.number().min(-90).max(90),
  centerLng: z.number().min(-180).max(180),
  radiusMeters: z.number().positive().min(10).max(100000),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

/**
 * GET /api/geofences
 * List all geo-fences
 */
router.get('/', async (req, res, next) => {
  try {
    const { createdBy, active } = req.query;
    const fences = await listGeoFences({
      createdBy: createdBy as string,
      activeOnly: active === 'true',
    });
    res.json({ success: true, data: fences });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/geofences
 * Create a new geo-fence
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const parsed = createGeoFenceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
      });
    }

    const fence = await createGeoFence({
      ...parsed.data,
      createdBy: req.user!.id,
    });

    res.status(201).json({ success: true, data: fence });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/geofences/circle
 * Create a circular geo-fence
 */
router.post('/circle', authenticate, async (req, res, next) => {
  try {
    const parsed = createCircularFenceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
      });
    }

    const fence = await createCircularFence(parsed.data.name, {
      latitude: parsed.data.centerLat,
      longitude: parsed.data.centerLng,
    }, parsed.data.radiusMeters, {
      description: parsed.data.description,
      createdBy: req.user!.id,
      color: parsed.data.color,
    });

    res.status(201).json({ success: true, data: fence });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/geofences/:id
 * Get geo-fence by ID
 */
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const fence = await getGeoFence(req.params.id);
    if (!fence) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Geo-fence not found' },
      });
    }
    res.json({ success: true, data: fence });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/geofences/:id
 * Update geo-fence
 */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const existing = await getGeoFence(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Geo-fence not found' },
      });
    }

    if (existing.createdBy && existing.createdBy !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot update geo-fence created by another user' },
      });
    }

    const parsed = updateGeoFenceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
      });
    }

    const fence = await updateGeoFence(req.params.id, parsed.data);
    res.json({ success: true, data: fence });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/geofences/:id
 * Delete geo-fence
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const existing = await getGeoFence(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Geo-fence not found' },
      });
    }

    if (existing.createdBy && existing.createdBy !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot delete geo-fence created by another user' },
      });
    }

    await deleteGeoFence(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/geofences/:id/check
 * Check if a point is inside a geo-fence
 */
router.post('/:id/check', async (req, res, next) => {
  try {
    const parsed = pointCheckSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
      });
    }

    const result = await checkPointInFence({
      latitude: parsed.data.lat,
      longitude: parsed.data.lng,
    }, req.params.id);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/geofences/check-multiple
 * Check a point against multiple geo-fences
 */
router.post('/check-multiple', async (req, res, next) => {
  try {
    const parsed = multipleCheckSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
      });
    }

    const results = await checkMultipleFences(
      { latitude: parsed.data.lat, longitude: parsed.data.lng },
      parsed.data.fenceIds
    );

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/geofences/find-containing
 * Find all geo-fences containing a point
 */
router.get('/find/containing', async (req, res, next) => {
  try {
    const parsed = pointCheckSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
      });
    }

    const fences = await findContainingFences({
      latitude: parsed.data.lat,
      longitude: parsed.data.lng,
    });

    res.json({ success: true, data: fences });
  } catch (error) {
    next(error);
  }
});

export default router;
