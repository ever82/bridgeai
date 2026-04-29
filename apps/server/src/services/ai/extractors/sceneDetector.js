/**
 * Scene Detector
 * 场景检测器 - 自动检测和路由到对应的场景提取器
 */
import { logger } from '../../../utils/logger';
import { VisionShareExtractor } from './visionShareExtractor';
import { AgentDateExtractor } from './agentDateExtractor';
import { AgentJobExtractor } from './agentJobExtractor';
import { AgentAdExtractor } from './agentAdExtractor';
/**
 * Scene Detector Service
 * Detects the appropriate scene for a given text and routes to the correct extractor
 */
export class SceneDetector {
    extractors;
    constructor() {
        this.extractors = new Map();
        this.registerDefaultExtractors();
    }
    /**
     * Register default extractors
     */
    registerDefaultExtractors() {
        this.register('visionshare', new VisionShareExtractor());
        this.register('agentdate', new AgentDateExtractor());
        this.register('agentjob', new AgentJobExtractor());
        this.register('agentad', new AgentAdExtractor());
    }
    /**
     * Register a scene-specific extractor
     */
    register(sceneType, extractor) {
        this.extractors.set(sceneType, extractor);
        logger.info(`Registered scene extractor: ${sceneType}`);
    }
    /**
     * Unregister a scene-specific extractor
     */
    unregister(sceneType) {
        this.extractors.delete(sceneType);
        logger.info(`Unregistered scene extractor: ${sceneType}`);
    }
    /**
     * Detect the best matching scene for the given text
     */
    async detectScene(text) {
        logger.info('Detecting scene for text', { textLength: text.length });
        const results = [];
        // Check each extractor
        for (const [sceneType, extractor] of this.extractors.entries()) {
            const { canHandle, confidence } = await extractor.canHandle(text);
            if (canHandle) {
                results.push({ scene: sceneType, confidence });
            }
        }
        // Sort by confidence (descending)
        results.sort((a, b) => b.confidence - a.confidence);
        // Get the best match
        const bestMatch = results[0];
        if (bestMatch && bestMatch.confidence >= 0.4) {
            logger.info('Scene detected', {
                scene: bestMatch.scene,
                confidence: bestMatch.confidence,
            });
            return {
                scene: bestMatch.scene,
                confidence: bestMatch.confidence,
                keywords: this.extractKeywords(text, bestMatch.scene),
            };
        }
        logger.info('No scene detected with high confidence, defaulting to unknown');
        return {
            scene: 'unknown',
            confidence: 0,
            keywords: [],
        };
    }
    /**
     * Detect all matching scenes (for multi-scene detection)
     */
    async detectAllScenes(text) {
        logger.info('Detecting all matching scenes', { textLength: text.length });
        const results = [];
        for (const [sceneType, extractor] of this.extractors.entries()) {
            const { canHandle, confidence } = await extractor.canHandle(text);
            if (canHandle) {
                results.push({
                    scene: sceneType,
                    confidence,
                    keywords: this.extractKeywords(text, sceneType),
                });
            }
        }
        // Sort by confidence (descending)
        return results.sort((a, b) => b.confidence - a.confidence);
    }
    /**
     * Get extractor for a specific scene
     */
    getExtractor(sceneType) {
        return this.extractors.get(sceneType);
    }
    /**
     * Get all registered extractors
     */
    getAllExtractors() {
        return new Map(this.extractors);
    }
    /**
     * Get extractor for text (auto-detect scene)
     */
    async getExtractorForText(text) {
        const { scene } = await this.detectScene(text);
        return this.getExtractor(scene);
    }
    /**
     * Extract keywords that matched for a scene
     */
    extractKeywords(text, scene) {
        const extractor = this.extractors.get(scene);
        if (!extractor) {
            return [];
        }
        const keywords = [];
        const lowerText = text.toLowerCase();
        const sceneKeywords = extractor.getDetectionKeywords();
        for (const keyword of sceneKeywords) {
            if (lowerText.includes(keyword.toLowerCase())) {
                keywords.push(keyword);
            }
        }
        return Array.from(new Set(keywords)); // Remove duplicates
    }
    /**
     * Check if a scene is supported
     */
    isSceneSupported(sceneType) {
        return this.extractors.has(sceneType);
    }
    /**
     * Get list of supported scenes
     */
    getSupportedScenes() {
        return Array.from(this.extractors.keys());
    }
}
// Export singleton instance
export const sceneDetector = new SceneDetector();
//# sourceMappingURL=sceneDetector.js.map