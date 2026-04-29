/**
 * Vision Privacy Routes
 * 隐私脱敏 API 端点 - 图像敏感内容检测与脱敏处理
 */
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticate as authenticateToken } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/common';
import { detectSensitiveContent, stripExifFromImage, calculatePrivacyRisk, getRiskLevel, } from '../../services/ai/sensitiveContentDetection';
import { desensitizeImage, applyMultiStageDesensitization, previewDesensitization, getRecommendedMethod, calculateDefaultIntensity, } from '../../services/image/desensitization';
import { getPredefinedTemplates, createDefaultPolicy, updatePolicy, } from '../../services/privacy/desensitizationPolicy';
// Allowed sensitive types
const ALLOWED_SENSITIVE_TYPES = [
    'face',
    'license_plate',
    'text',
    'address',
    'sensitive_object',
    'qr_code',
    'barcode',
];
// Zod schema for bounding box validation
const boundingBoxSchema = z.object({
    x: z.number().min(0, 'x must be >= 0'),
    y: z.number().min(0, 'y must be >= 0'),
    width: z.number().positive('width must be positive'),
    height: z.number().positive('height must be positive'),
});
// Zod schema for a single detection
const detectionSchema = z.object({
    type: z.enum(ALLOWED_SENSITIVE_TYPES, {
        errorMap: () => ({ message: `type must be one of: ${ALLOWED_SENSITIVE_TYPES.join(', ')}` }),
    }),
    boundingBox: boundingBoxSchema,
    confidence: z.number().min(0, 'confidence must be >= 0').max(1, 'confidence must be <= 1'),
    metadata: z.record(z.unknown()).optional(),
});
// Zod schema for detection array
const detectionsArraySchema = z.array(detectionSchema);
// Allowed desensitization methods
const ALLOWED_METHODS = ['blur', 'pixelate', 'blackout', 'mask', 'redact'];
// Zod schema for desensitization region (multi-desensitize)
const regionSchema = z.object({
    boundingBox: boundingBoxSchema,
    method: z.enum(ALLOWED_METHODS, {
        errorMap: () => ({ message: `method must be one of: ${ALLOWED_METHODS.join(', ')}` }),
    }),
    intensity: z.number().int().min(1).max(100),
});
// Zod schema for regions array
const regionsArraySchema = z.array(regionSchema);
const router = Router();
// Configure multer for image uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 1,
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
        }
    },
});
/**
 * POST /api/v1/ai/privacy/analyze
 * Analyze image for sensitive content
 */
router.post('/analyze', authenticateToken, upload.single('image'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image provided' });
    }
    const imageBuffer = req.file.buffer;
    const types = req.body.types?.split(',') || [
        'face',
        'license_plate',
        'text',
        'address',
    ];
    const minConfidence = parseFloat(req.body.minConfidence) || 0.7;
    // Strip EXIF first for privacy
    const { cleanedBuffer, hadGpsData } = await stripExifFromImage(imageBuffer);
    // Detect sensitive content
    const analysisResult = await detectSensitiveContent(cleanedBuffer, {
        types,
        minConfidence,
        maxResults: 50,
        timeoutMs: 30000,
    });
    // Calculate privacy risk
    const riskScore = calculatePrivacyRisk(analysisResult.detections);
    const riskLevel = getRiskLevel(riskScore);
    res.json({
        success: true,
        data: {
            detections: analysisResult.detections,
            imageWidth: analysisResult.imageWidth,
            imageHeight: analysisResult.imageHeight,
            processingTimeMs: analysisResult.processingTime,
            riskScore,
            riskLevel,
            hadGpsData,
            exifStripped: true,
        },
    });
}));
/**
 * POST /api/v1/ai/privacy/desensitize
 * Apply desensitization to detected regions
 */
router.post('/desensitize', authenticateToken, upload.single('image'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image provided' });
    }
    const imageBuffer = req.file.buffer;
    let rawDetections = req.body.detections;
    if (typeof rawDetections === 'string') {
        try {
            rawDetections = JSON.parse(rawDetections);
        }
        catch {
            return res.status(400).json({ success: false, error: 'Invalid JSON in detections' });
        }
    }
    const method = req.body.method || 'blur';
    const intensity = req.body.intensity !== undefined ? parseInt(req.body.intensity, 10) : 70;
    // Validate detections schema
    const validationResult = detectionsArraySchema.safeParse(rawDetections);
    if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        return res
            .status(400)
            .json({ success: false, error: `Invalid detections: ${errors.join('; ')}` });
    }
    const detections = validationResult.data;
    // Strip EXIF first
    const { cleanedBuffer } = await stripExifFromImage(imageBuffer);
    // Apply desensitization
    const desensitizationResult = await desensitizeImage(cleanedBuffer, detections, {
        method: method,
        intensity,
    });
    // Return base64 encoded processed image
    const processedBase64 = desensitizationResult.processedImageBuffer.toString('base64');
    res.json({
        success: true,
        data: {
            processedImage: `data:image/jpeg;base64,${processedBase64}`,
            appliedRegions: desensitizationResult.appliedRegions,
            processingTimeMs: desensitizationResult.processingTime,
        },
    });
}));
/**
 * POST /api/v1/ai/privacy/multi-desensitize
 * Apply different desensitization methods to different regions
 */
router.post('/multi-desensitize', authenticateToken, upload.single('image'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image provided' });
    }
    const imageBuffer = req.file.buffer;
    let rawRegions = req.body.regions;
    if (typeof rawRegions === 'string') {
        try {
            rawRegions = JSON.parse(rawRegions);
        }
        catch {
            return res.status(400).json({ success: false, error: 'Invalid JSON in regions' });
        }
    }
    // Validate regions schema
    const regionsResult = regionsArraySchema.safeParse(rawRegions);
    if (!regionsResult.success) {
        const errors = regionsResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        return res
            .status(400)
            .json({ success: false, error: `Invalid regions: ${errors.join('; ')}` });
    }
    const regions = regionsResult.data;
    // Strip EXIF first
    const { cleanedBuffer } = await stripExifFromImage(imageBuffer);
    // Apply multi-stage desensitization
    const result = await applyMultiStageDesensitization(cleanedBuffer, regions);
    const processedBase64 = result.processedImageBuffer.toString('base64');
    res.json({
        success: true,
        data: {
            processedImage: `data:image/jpeg;base64,${processedBase64}`,
            appliedRegions: result.appliedRegions,
            processingTimeMs: result.processingTime,
            steps: result.steps,
            originalSize: result.originalSize,
            processedSize: result.processedSize,
        },
    });
}));
/**
 * POST /api/v1/ai/privacy/preview
 * Preview desensitization effect on a region
 */
router.post('/preview', authenticateToken, upload.single('image'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image provided' });
    }
    const imageBuffer = req.file.buffer;
    let rawBoundingBox = req.body.boundingBox;
    if (typeof rawBoundingBox === 'string') {
        try {
            rawBoundingBox = JSON.parse(rawBoundingBox);
        }
        catch {
            return res.status(400).json({ success: false, error: 'Invalid JSON in boundingBox' });
        }
    }
    // Validate boundingBox schema
    const bboxResult = boundingBoxSchema.safeParse(rawBoundingBox);
    if (!bboxResult.success) {
        const errors = bboxResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        return res
            .status(400)
            .json({ success: false, error: `Invalid boundingBox: ${errors.join('; ')}` });
    }
    const boundingBox = bboxResult.data;
    const method = req.body.method || 'blur';
    const intensity = req.body.intensity !== undefined ? parseInt(req.body.intensity, 10) : 50;
    const previewBuffer = await previewDesensitization(imageBuffer, boundingBox, method, intensity);
    const previewBase64 = previewBuffer.toString('base64');
    res.json({
        success: true,
        data: {
            previewImage: `data:image/jpeg;base64,${previewBase64}`,
        },
    });
}));
/**
 * POST /api/v1/ai/privacy/strip-exif
 * Strip EXIF metadata from image
 */
router.post('/strip-exif', authenticateToken, upload.single('image'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image provided' });
    }
    const imageBuffer = req.file.buffer;
    const { cleanedBuffer, exifData, hadGpsData } = await stripExifFromImage(imageBuffer);
    const cleanedBase64 = cleanedBuffer.toString('base64');
    res.json({
        success: true,
        data: {
            cleanedImage: `data:image/jpeg;base64,${cleanedBase64}`,
            exifData,
            hadGpsData,
        },
    });
}));
/**
 * GET /api/v1/ai/privacy/recommendations/:contentType
 * Get recommended desensitization method and intensity for a content type
 */
router.get('/recommendations/:contentType', authenticateToken, asyncHandler(async (req, res) => {
    const contentType = req.params.contentType;
    const confidence = parseFloat(req.query.confidence) || 0.8;
    const method = getRecommendedMethod(contentType);
    const intensity = calculateDefaultIntensity(contentType, confidence);
    res.json({
        success: true,
        data: {
            recommendedMethod: method,
            recommendedIntensity: intensity,
        },
    });
}));
// In-memory store for user policy configurations (replace with DB in production)
const userPolicies = new Map();
/**
 * GET /api/v1/ai/privacy/policy/templates
 * Get all available desensitization templates
 */
router.get('/policy/templates', authenticateToken, asyncHandler(async (req, res) => {
    const templates = getPredefinedTemplates();
    res.json({
        success: true,
        data: { templates },
    });
}));
/**
 * GET /api/v1/ai/privacy/policy
 * Get current user's desensitization policy configuration
 */
router.get('/policy', authenticateToken, asyncHandler(async (req, res) => {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    let policy = userPolicies.get(userId);
    if (!policy) {
        policy = createDefaultPolicy(userId);
        userPolicies.set(userId, policy);
    }
    res.json({
        success: true,
        data: { policy },
    });
}));
/**
 * PUT /api/v1/ai/privacy/policy
 * Update current user's desensitization policy configuration
 */
router.put('/policy', authenticateToken, asyncHandler(async (req, res) => {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    let policy = userPolicies.get(userId);
    if (!policy) {
        policy = createDefaultPolicy(userId);
    }
    const { activeTemplateId, customRules, whitelist, autoDesensitize, defaultMethod } = req.body;
    const updatedPolicy = updatePolicy(policy, {
        ...(activeTemplateId !== undefined && { activeTemplateId }),
        ...(customRules !== undefined && { customRules }),
        ...(whitelist !== undefined && { whitelist }),
        ...(autoDesensitize !== undefined && { autoDesensitize }),
        ...(defaultMethod !== undefined && { defaultMethod }),
    });
    userPolicies.set(userId, updatedPolicy);
    res.json({
        success: true,
        data: { policy: updatedPolicy },
    });
}));
export default router;
//# sourceMappingURL=privacy.js.map