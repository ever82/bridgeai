/**
 * Vision API Routes
 * 图像分析与Vision API端点
 */
import { Router } from 'express';
import multer from 'multer';
import { authenticate as authenticateToken } from '../../middleware/auth';
import { logger } from '../../utils/logger';
import { getVisionCache } from '../../utils/visionResultCache';
import { ImageAnalysisService } from '../../services/ai/imageAnalysisService';
import { ImageModerationService } from '../../services/ai/imageModerationService';
import { OCRService } from '../../services/ai/ocrService';
import { ImageSearchService } from '../../services/ai/imageSearchService';
import { GPT4VisionAdapter } from '../../services/ai/adapters/vision/gpt4Vision';
import { ClaudeVisionAdapter } from '../../services/ai/adapters/vision/claudeVision';
const router = Router();
// 配置multer用于图像上传
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 10, // 最多10个文件
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
// 初始化Vision适配器和服务
let cachedAdapter = null;
let analysisService = null;
let moderationService = null;
let ocrService = null;
let searchService = null;
/**
 * 获取Vision适配器（优先使用GPT-4V，回退到Claude）
 */
function getVisionAdapter() {
    if (cachedAdapter) {
        return cachedAdapter;
    }
    // 优先使用GPT-4V
    if (process.env.OPENAI_API_KEY) {
        return new GPT4VisionAdapter({
            apiKey: process.env.OPENAI_API_KEY,
            apiUrl: process.env.OPENAI_API_URL,
            organization: process.env.OPENAI_ORGANIZATION,
        });
    }
    // 回退到Claude
    if (process.env.CLAUDE_API_KEY) {
        return new ClaudeVisionAdapter({
            apiKey: process.env.CLAUDE_API_KEY,
            apiUrl: process.env.CLAUDE_API_URL,
        });
    }
    throw new Error('No Vision API key configured');
}
/**
 * 确保服务已初始化
 */
async function ensureServices() {
    if (!analysisService) {
        const adapter = getVisionAdapter();
        cachedAdapter = adapter;
        await adapter.initialize();
        analysisService = new ImageAnalysisService({ adapter });
        moderationService = new ImageModerationService({
            adapter,
            safetyThreshold: 0.7,
            strictMode: false,
        });
        ocrService = new OCRService({
            adapter,
            supportHandwriting: true,
            minConfidence: 0.6,
        });
        searchService = new ImageSearchService({ adapter });
        logger.info('Vision services initialized');
    }
}
/**
 * 将上传的文件转换为ImageInput
 */
function fileToImageInput(file) {
    const base64Data = file.buffer.toString('base64');
    return {
        type: 'base64',
        data: base64Data,
        mimeType: file.mimetype,
    };
}
/**
 * @route   POST /api/v1/ai/vision/analyze
 * @desc    分析图像内容（场景、物体、活动等）
 * @access  Private
 */
router.post('/analyze', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        await ensureServices();
        let imageInput;
        // 支持多种输入方式
        if (req.file) {
            // 上传的文件
            imageInput = fileToImageInput(req.file);
        }
        else if (req.body.imageUrl) {
            // URL输入
            imageInput = {
                type: 'url',
                data: req.body.imageUrl,
            };
        }
        else if (req.body.imageBase64) {
            // Base64输入
            imageInput = {
                type: 'base64',
                data: req.body.imageBase64,
                mimeType: req.body.mimeType || 'image/jpeg',
            };
        }
        else {
            return res.status(400).json({
                success: false,
                error: 'No image provided. Upload a file, provide imageUrl, or imageBase64.',
            });
        }
        // 尝试从缓存获取结果
        const cache = getVisionCache();
        const cacheKey = cache.generateKey(imageInput.data, 'analyze');
        const cachedResult = cache.get(cacheKey);
        let result;
        if (cachedResult) {
            result = cachedResult;
        }
        else {
            // 执行图像分析
            result = await analysisService.analyze(imageInput, {
                userId: req.user?.id,
                requestId: req.id,
                timestamp: new Date(),
                source: 'api',
            });
            cache.set(cacheKey, result);
        }
        res.json({
            success: true,
            data: {
                scene_description: result.sceneDescription,
                detected_objects: result.detectedObjects.map(obj => ({
                    label: obj.label,
                    confidence: obj.confidence,
                    bounding_box: obj.boundingBox,
                })),
                activity_tags: result.activityTags,
                visual_features: {
                    dominant_colors: result.visualFeatures.dominantColors,
                    brightness: result.visualFeatures.brightness,
                    contrast: result.visualFeatures.contrast,
                    sharpness: result.visualFeatures.sharpness,
                    has_faces: result.visualFeatures.hasFaces,
                    face_count: result.visualFeatures.faceCount,
                },
                confidence: result.confidence,
                processing_time_ms: result.processingTimeMs,
            },
        });
    }
    catch (error) {
        logger.error('Image analysis failed:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Image analysis failed',
        });
    }
});
/**
 * @route   POST /api/v1/ai/vision/analyze/batch
 * @desc    批量分析多张图像
 * @access  Private
 */
router.post('/analyze/batch', authenticateToken, upload.array('images', 10), async (req, res) => {
    try {
        await ensureServices();
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No images provided',
            });
        }
        const imageInputs = files.map(fileToImageInput);
        const results = await analysisService.analyzeBatch(imageInputs, {
            userId: req.user?.id,
            requestId: req.id,
            timestamp: new Date(),
            source: 'api',
        });
        res.json({
            success: true,
            data: {
                results: results.map((result, index) => ({
                    index,
                    scene_description: result.sceneDescription,
                    detected_objects: result.detectedObjects,
                    activity_tags: result.activityTags,
                    visual_features: result.visualFeatures,
                    confidence: result.confidence,
                    processing_time_ms: result.processingTimeMs,
                })),
                total: results.length,
            },
        });
    }
    catch (error) {
        logger.error('Batch image analysis failed:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Batch analysis failed',
        });
    }
});
/**
 * @route   POST /api/v1/ai/vision/moderate
 * @desc    审核图像内容安全性
 * @access  Private
 */
router.post('/moderate', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        await ensureServices();
        let imageInput;
        if (req.file) {
            imageInput = fileToImageInput(req.file);
        }
        else if (req.body.imageUrl) {
            imageInput = {
                type: 'url',
                data: req.body.imageUrl,
            };
        }
        else if (req.body.imageBase64) {
            imageInput = {
                type: 'base64',
                data: req.body.imageBase64,
                mimeType: req.body.mimeType || 'image/jpeg',
            };
        }
        else {
            return res.status(400).json({
                success: false,
                error: 'No image provided',
            });
        }
        // 尝试从缓存获取结果
        const modCache = getVisionCache();
        const modCacheKey = modCache.generateKey(imageInput.data, 'moderate');
        const modCachedResult = modCache.get(modCacheKey);
        let modResult;
        if (modCachedResult) {
            modResult = modCachedResult;
        }
        else {
            modResult = await moderationService.moderate(imageInput, {
                userId: req.user?.id,
                requestId: req.id,
            });
            modCache.set(modCacheKey, modResult);
        }
        res.json({
            success: true,
            data: {
                is_safe: modResult.isSafe,
                violation_type: modResult.violationType,
                violation_details: modResult.violationDetails,
                confidence_score: modResult.confidenceScore,
                category_scores: {
                    nsfw: modResult.categoryScores.nsfw,
                    violence: modResult.categoryScores.violence,
                    gore: modResult.categoryScores.gore,
                    hate: modResult.categoryScores.hate,
                    harassment: modResult.categoryScores.harassment,
                    self_harm: modResult.categoryScores.selfHarm,
                    illegal: modResult.categoryScores.illegal,
                    privacy: modResult.categoryScores.privacy,
                    spam: modResult.categoryScores.spam,
                },
                processing_time_ms: modResult.processingTimeMs,
            },
        });
    }
    catch (error) {
        logger.error('Image moderation failed:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Image moderation failed',
        });
    }
});
/**
 * @route   POST /api/v1/ai/vision/ocr
 * @desc    OCR文字识别
 * @access  Private
 */
router.post('/ocr', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        await ensureServices();
        let imageInput;
        if (req.file) {
            imageInput = fileToImageInput(req.file);
        }
        else if (req.body.imageUrl) {
            imageInput = {
                type: 'url',
                data: req.body.imageUrl,
            };
        }
        else if (req.body.imageBase64) {
            imageInput = {
                type: 'base64',
                data: req.body.imageBase64,
                mimeType: req.body.mimeType || 'image/jpeg',
            };
        }
        else {
            return res.status(400).json({
                success: false,
                error: 'No image provided',
            });
        }
        // 尝试从缓存获取结果
        const ocrCache = getVisionCache();
        const ocrCacheKey = ocrCache.generateKey(imageInput.data, 'ocr');
        const ocrCachedResult = ocrCache.get(ocrCacheKey);
        let ocrResult;
        if (ocrCachedResult) {
            ocrResult = ocrCachedResult;
        }
        else {
            ocrResult = await ocrService.extractText(imageInput, {
                language: req.body.language,
                detectHandwriting: req.body.detectHandwriting !== 'false',
                preserveLayout: req.body.preserveLayout === 'true',
            });
            ocrCache.set(ocrCacheKey, ocrResult);
        }
        res.json({
            success: true,
            data: {
                extracted_text: ocrResult.extractedText,
                language: ocrResult.language,
                detected_languages: ocrResult.detectedLanguages,
                is_handwritten: ocrResult.isHandwritten,
                confidence: ocrResult.confidence,
                text_blocks: ocrResult.textBlocks.map(block => ({
                    text: block.text,
                    language: block.language,
                    confidence: block.confidence,
                    bounding_box: block.boundingBox,
                })),
                processing_time_ms: ocrResult.processingTimeMs,
            },
        });
    }
    catch (error) {
        logger.error('OCR failed:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'OCR failed',
        });
    }
});
/**
 * @route   POST /api/v1/ai/vision/search
 * @desc    通过文本搜索图像（AI相册检索）
 * @access  Private
 */
router.post('/search', authenticateToken, async (req, res) => {
    try {
        await ensureServices();
        const { query, top_k = 10, filters } = req.body;
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required',
            });
        }
        const results = await searchService.searchByText(query, {
            topK: top_k,
            filters,
        });
        res.json({
            success: true,
            data: {
                query,
                results: results.map(r => ({
                    image_id: r.imageId,
                    url: r.url,
                    similarity: r.similarity,
                    metadata: r.metadata,
                })),
                total: results.length,
            },
        });
    }
    catch (error) {
        logger.error('Image search failed:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Image search failed',
        });
    }
});
/**
 * @route   POST /api/v1/ai/vision/recommend/confirm
 * @desc    确认推荐的照片（AC VS-003-AC-2: 符合条件的照片推荐给用户确认）
 * @access  Private
 */
router.post('/recommend/confirm', authenticateToken, async (req, res) => {
    try {
        const { imageIds, action, reason } = req.body;
        if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'imageIds array is required',
            });
        }
        if (!['accept', 'reject'].includes(action)) {
            return res.status(400).json({
                success: false,
                error: 'action must be "accept" or "reject"',
            });
        }
        logger.info(`Recommendation ${action} for ${imageIds.length} images`, {
            userId: req.user?.id,
            imageIds,
            reason,
        });
        res.json({
            success: true,
            data: {
                confirmed: imageIds,
                action,
                reason: reason || null,
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        logger.error('Recommendation confirmation failed:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Confirmation failed',
        });
    }
});
/**
 * @route   POST /api/v1/ai/vision/search/similar
 * @desc    通过图像搜索相似图像
 * @access  Private
 */
router.post('/search/similar', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        await ensureServices();
        let imageInput;
        if (req.file) {
            imageInput = fileToImageInput(req.file);
        }
        else if (req.body.imageUrl) {
            imageInput = {
                type: 'url',
                data: req.body.imageUrl,
            };
        }
        else if (req.body.imageBase64) {
            imageInput = {
                type: 'base64',
                data: req.body.imageBase64,
                mimeType: req.body.mimeType || 'image/jpeg',
            };
        }
        else {
            return res.status(400).json({
                success: false,
                error: 'No image provided',
            });
        }
        const results = await searchService.searchByImage(imageInput, {
            topK: req.body.top_k || 10,
        });
        res.json({
            success: true,
            data: {
                results: results.map(r => ({
                    image_id: r.imageId,
                    url: r.url,
                    similarity: r.similarity,
                    metadata: r.metadata,
                })),
                total: results.length,
            },
        });
    }
    catch (error) {
        logger.error('Similar image search failed:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Similar image search failed',
        });
    }
});
/**
 * @route   POST /api/v1/ai/vision/index
 * @desc    将图像添加到搜索索引
 * @access  Private
 */
router.post('/index', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        await ensureServices();
        let imageInput;
        if (req.file) {
            imageInput = fileToImageInput(req.file);
        }
        else if (req.body.imageUrl) {
            imageInput = {
                type: 'url',
                data: req.body.imageUrl,
            };
        }
        else if (req.body.imageBase64) {
            imageInput = {
                type: 'base64',
                data: req.body.imageBase64,
                mimeType: req.body.mimeType || 'image/jpeg',
            };
        }
        else {
            return res.status(400).json({
                success: false,
                error: 'No image provided',
            });
        }
        const imageId = req.body.imageId || `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const embedding = await searchService.indexImage(imageId, imageInput, {
            url: req.body.imageUrl ||
                (req.file
                    ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
                    : undefined),
            tags: req.body.tags || [],
            userId: req.user?.id,
        });
        res.json({
            success: true,
            data: {
                image_id: imageId,
                dimension: embedding.dimension,
                model: embedding.model,
            },
        });
    }
    catch (error) {
        logger.error('Image indexing failed:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Image indexing failed',
        });
    }
});
/**
 * @route   POST /api/v1/ai/vision/describe
 * @desc    生成图像描述
 * @access  Private
 */
router.post('/describe', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        await ensureServices();
        let imageInput;
        if (req.file) {
            imageInput = fileToImageInput(req.file);
        }
        else if (req.body.imageUrl) {
            imageInput = {
                type: 'url',
                data: req.body.imageUrl,
            };
        }
        else if (req.body.imageBase64) {
            imageInput = {
                type: 'base64',
                data: req.body.imageBase64,
                mimeType: req.body.mimeType || 'image/jpeg',
            };
        }
        else {
            return res.status(400).json({
                success: false,
                error: 'No image provided',
            });
        }
        // 尝试从缓存获取结果
        const descCache = getVisionCache();
        const descCacheKey = descCache.generateKey(imageInput.data, 'describe');
        const descCachedResult = descCache.get(descCacheKey);
        let description;
        if (descCachedResult) {
            description = descCachedResult;
        }
        else {
            description = await analysisService.generateDescription(imageInput, {
                maxLength: req.body.max_length || 200,
                detail: req.body.detail || 'normal',
                language: req.body.language || 'zh',
            });
            descCache.set(descCacheKey, description);
        }
        res.json({
            success: true,
            data: {
                description,
            },
        });
    }
    catch (error) {
        logger.error('Image description failed:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Image description failed',
        });
    }
});
/**
 * @route   GET /api/v1/ai/vision/health
 * @desc    Vision服务健康检查
 * @access  Private
 */
router.get('/health', authenticateToken, async (req, res) => {
    try {
        await ensureServices();
        const adapter = cachedAdapter;
        const isHealthy = await adapter.healthCheck();
        res.json({
            success: true,
            data: {
                status: isHealthy ? 'healthy' : 'unhealthy',
                provider: adapter.provider,
                supports_images: adapter.supportsImages,
            },
        });
    }
    catch (error) {
        res.status(503).json({
            success: false,
            data: {
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error',
            },
        });
    }
});
export default router;
//# sourceMappingURL=vision.js.map