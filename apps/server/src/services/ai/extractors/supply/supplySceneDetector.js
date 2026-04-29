/**
 * Supply Scene Detector
 * 供给场景检测器 - 自动检测供给方文本对应的场景并路由到合适的提取器
 */
import { logger } from '../../../../utils/logger';
import { VisionShareSupplyExtractor } from './visionShareSupplyExtractor';
import { JobSupplyExtractor } from './jobSupplyExtractor';
import { AdSupplyExtractor } from './adSupplyExtractor';
/**
 * Supply Scene Detector
 * Detects the appropriate scene for a given supply text and routes to the correct extractor
 */
export class SupplySceneDetector {
    extractors;
    constructor() {
        this.extractors = new Map();
        this.registerDefaultExtractors();
    }
    /**
     * Register default extractors
     */
    registerDefaultExtractors() {
        this.register('visionshare', new VisionShareSupplyExtractor());
        this.register('agentjob', new JobSupplyExtractor());
        this.register('agentad', new AdSupplyExtractor());
    }
    /**
     * Register a supply extractor
     */
    register(sceneType, extractor) {
        this.extractors.set(sceneType, extractor);
        logger.info(`Registered supply extractor: ${sceneType}`);
    }
    /**
     * Unregister a supply extractor
     */
    unregister(sceneType) {
        this.extractors.delete(sceneType);
        logger.info(`Unregistered supply extractor: ${sceneType}`);
    }
    /**
     * Detect the best matching supply scene
     */
    async detectScene(text) {
        logger.info('Detecting supply scene', { textLength: text.length });
        const results = [];
        for (const [sceneType, extractor] of this.extractors.entries()) {
            const { canHandle, confidence } = await extractor.canHandle(text);
            if (canHandle) {
                results.push({ scene: sceneType, confidence });
            }
        }
        results.sort((a, b) => b.confidence - a.confidence);
        const bestMatch = results[0];
        const alternativeScenes = results.slice(1);
        if (bestMatch && bestMatch.confidence > 0.3) {
            const keywords = this.extractKeywordsForScene(text, bestMatch.scene);
            logger.info('Supply scene detected', {
                scene: bestMatch.scene,
                confidence: bestMatch.confidence,
            });
            return {
                scene: bestMatch.scene,
                confidence: bestMatch.confidence,
                keywords,
                alternativeScenes,
            };
        }
        logger.info('No supply scene detected, defaulting to unknown');
        return {
            scene: 'unknown',
            confidence: 0,
            keywords: [],
            alternativeScenes: [],
        };
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
     * Auto-detect scene and extract supply data
     */
    async detectAndExtract(text) {
        const { scene } = await this.detectScene(text);
        if (scene === 'unknown') {
            return undefined;
        }
        const extractor = this.getExtractor(scene);
        if (!extractor) {
            return undefined;
        }
        return extractor.extract(text);
    }
    /**
     * Extract keywords for a specific scene
     */
    extractKeywordsForScene(text, scene) {
        const keywordSets = {
            visionshare: [
                '摄影师', '摄影服务', '拍照', '拍摄', '写真', '镜头', '相机',
                '单反', '微单', '作品集', '摄影棚', '工作室',
            ],
            agentjob: [
                '求职', '找工作', '应聘', '技能', '经验', '简历',
                '薪资', '面试', '学历', '项目', '技术栈',
            ],
            agentad: [
                '出售', '供应', '商品', '产品', '优惠', '折扣',
                '库存', '现货', '包邮', '促销', '店铺', '商家',
            ],
            unknown: [],
        };
        const keywords = [];
        const lowerText = text.toLowerCase();
        for (const keyword of keywordSets[scene] || []) {
            if (lowerText.includes(keyword.toLowerCase())) {
                keywords.push(keyword);
            }
        }
        return Array.from(new Set(keywords));
    }
    /**
     * Check if a scene is supported
     */
    isSceneSupported(sceneType) {
        return this.extractors.has(sceneType);
    }
    /**
     * Get supported scenes
     */
    getSupportedScenes() {
        return Array.from(this.extractors.keys());
    }
}
// Singleton instance
export const supplySceneDetector = new SupplySceneDetector();
//# sourceMappingURL=supplySceneDetector.js.map