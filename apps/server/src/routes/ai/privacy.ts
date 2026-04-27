/**
 * Vision Privacy Routes
 * 隐私脱敏 API 端点 - 图像敏感内容检测与脱敏处理
 */

import { Router } from 'express';
import multer from 'multer';

import { authenticate as authenticateToken } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/common';
import {
  detectSensitiveContent,
  stripExifFromImage,
  calculatePrivacyRisk,
  getRiskLevel,
} from '../../services/ai/sensitiveContentDetection';
import {
  desensitizeImage,
  applyMultiStageDesensitization,
  previewDesensitization,
  getRecommendedMethod,
  calculateDefaultIntensity,
  DesensitizationMethod,
} from '../../services/image/desensitization';

const router: Router = Router();

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
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  },
});

/**
 * POST /api/v1/ai/privacy/analyze
 * Analyze image for sensitive content
 */
router.post(
  '/analyze',
  authenticateToken,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }

    const imageBuffer = req.file.buffer;
    const types = (req.body.types as string)?.split(',') || [
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
  })
);

/**
 * POST /api/v1/ai/privacy/desensitize
 * Apply desensitization to detected regions
 */
router.post(
  '/desensitize',
  authenticateToken,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }

    const imageBuffer = req.file.buffer;
    const detections =
      typeof req.body.detections === 'string'
        ? JSON.parse(req.body.detections)
        : req.body.detections;
    const method = (req.body.method as string) || 'blur';
    const intensity = parseInt(req.body.intensity, 10) || 70;

    if (!Array.isArray(detections) || detections.length === 0) {
      return res.status(400).json({ success: false, error: 'No detections provided' });
    }

    // Strip EXIF first
    const { cleanedBuffer } = await stripExifFromImage(imageBuffer);

    // Apply desensitization
    const result = await desensitizeImage(cleanedBuffer, detections, {
      method: method as DesensitizationMethod,
      intensity,
    });

    // Return base64 encoded processed image
    const processedBase64 = result.processedImageBuffer.toString('base64');

    res.json({
      success: true,
      data: {
        processedImage: `data:image/jpeg;base64,${processedBase64}`,
        appliedRegions: result.appliedRegions,
        processingTimeMs: result.processingTime,
      },
    });
  })
);

/**
 * POST /api/v1/ai/privacy/multi-desensitize
 * Apply different desensitization methods to different regions
 */
router.post(
  '/multi-desensitize',
  authenticateToken,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }

    const imageBuffer = req.file.buffer;
    const regions =
      typeof req.body.regions === 'string' ? JSON.parse(req.body.regions) : req.body.regions;

    if (!Array.isArray(regions) || regions.length === 0) {
      return res.status(400).json({ success: false, error: 'No regions provided' });
    }

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
  })
);

/**
 * POST /api/v1/ai/privacy/preview
 * Preview desensitization effect on a region
 */
router.post(
  '/preview',
  authenticateToken,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }

    const imageBuffer = req.file.buffer;
    const boundingBox =
      typeof req.body.boundingBox === 'string'
        ? JSON.parse(req.body.boundingBox)
        : req.body.boundingBox;
    const method = (req.body.method as string) || 'blur';
    const intensity = parseInt(req.body.intensity, 10) || 50;

    if (!boundingBox) {
      return res.status(400).json({ success: false, error: 'No boundingBox provided' });
    }

    const previewBuffer = await previewDesensitization(
      imageBuffer,
      boundingBox,
      method as DesensitizationMethod,
      intensity
    );
    const previewBase64 = previewBuffer.toString('base64');

    res.json({
      success: true,
      data: {
        previewImage: `data:image/jpeg;base64,${previewBase64}`,
      },
    });
  })
);

/**
 * POST /api/v1/ai/privacy/strip-exif
 * Strip EXIF metadata from image
 */
router.post(
  '/strip-exif',
  authenticateToken,
  upload.single('image'),
  asyncHandler(async (req, res) => {
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
  })
);

/**
 * GET /api/v1/ai/privacy/recommendations/:contentType
 * Get recommended desensitization method and intensity for a content type
 */
router.get(
  '/recommendations/:contentType',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const contentType = req.params.contentType;
    const confidence = parseFloat(req.query.confidence as string) || 0.8;

    const method = getRecommendedMethod(contentType);
    const intensity = calculateDefaultIntensity(contentType, confidence);

    res.json({
      success: true,
      data: {
        recommendedMethod: method,
        recommendedIntensity: intensity,
      },
    });
  })
);

export default router;
