/**
 * Agent Location Routes
 * Agent 位置相关 API 路由
 */
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { updateAgentLocation, getAgentLocation } from '../services/agentLocationService';
import { getAgentLocationPrivacy, setAgentLocationPrivacy, } from '../services/agentLocationPrivacyService';
import { prisma } from '../db/client';
const router = Router();
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
router.put('/agents/update', authenticate, async (req, res, next) => {
    try {
        const parsed = updateLocationSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
            });
        }
        const agentId = req.user?.agentId;
        if (!agentId) {
            return res.status(403).json({
                success: false,
                error: { code: 'NO_AGENT', message: 'User does not have an agent' },
            });
        }
        const success = await updateAgentLocation(agentId, parsed.data.location, parsed.data.coordinates);
        if (!success) {
            return res.status(404).json({
                success: false,
                error: { code: 'UPDATE_FAILED', message: 'Failed to update agent location' },
            });
        }
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/location/agents/:agentId
 * Get agent's location (privacy-aware)
 */
router.get('/agents/:agentId', authenticate, async (req, res, next) => {
    try {
        const { agentId } = req.params;
        const requestingUserId = req.user?.id;
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
    }
    catch (error) {
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
        const requestingUserId = req.user?.id;
        // Verify ownership - the agent must belong to the requesting user
        const agent = await prisma.agent.findFirst({
            where: { id: agentId, userId: requestingUserId },
        });
        if (!agent) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'You do not own this agent' },
            });
        }
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
    }
    catch (error) {
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
    }
    catch (error) {
        next(error);
    }
});
export default router;
//# sourceMappingURL=agentLocationRoutes.js.map