/**
 * Supply Scene Detector
 * 供给场景检测器 - 自动检测供给方文本对应的场景并路由到合适的提取器
 */
import { SupplyExtractor, SupplySceneType, SupplySceneDetectionResult, SupplyExtractedData } from './types';
/**
 * Supply Scene Detector
 * Detects the appropriate scene for a given supply text and routes to the correct extractor
 */
export declare class SupplySceneDetector {
    private extractors;
    constructor();
    /**
     * Register default extractors
     */
    private registerDefaultExtractors;
    /**
     * Register a supply extractor
     */
    register(sceneType: SupplySceneType, extractor: SupplyExtractor): void;
    /**
     * Unregister a supply extractor
     */
    unregister(sceneType: SupplySceneType): void;
    /**
     * Detect the best matching supply scene
     */
    detectScene(text: string): Promise<SupplySceneDetectionResult>;
    /**
     * Get extractor for a specific scene
     */
    getExtractor(sceneType: SupplySceneType): SupplyExtractor | undefined;
    /**
     * Get all registered extractors
     */
    getAllExtractors(): Map<SupplySceneType, SupplyExtractor>;
    /**
     * Auto-detect scene and extract supply data
     */
    detectAndExtract(text: string): Promise<SupplyExtractedData | undefined>;
    /**
     * Extract keywords for a specific scene
     */
    private extractKeywordsForScene;
    /**
     * Check if a scene is supported
     */
    isSceneSupported(sceneType: SupplySceneType): boolean;
    /**
     * Get supported scenes
     */
    getSupportedScenes(): SupplySceneType[];
}
export declare const supplySceneDetector: SupplySceneDetector;
//# sourceMappingURL=supplySceneDetector.d.ts.map