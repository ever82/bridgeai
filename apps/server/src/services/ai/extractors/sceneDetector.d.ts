/**
 * Scene Detector
 * 场景检测器 - 自动检测和路由到对应的场景提取器
 */
import { SceneSpecificExtractor, SceneType, SceneDetectionResult } from './types';
/**
 * Scene Detector Service
 * Detects the appropriate scene for a given text and routes to the correct extractor
 */
export declare class SceneDetector {
    private extractors;
    constructor();
    /**
     * Register default extractors
     */
    private registerDefaultExtractors;
    /**
     * Register a scene-specific extractor
     */
    register(sceneType: SceneType, extractor: SceneSpecificExtractor): void;
    /**
     * Unregister a scene-specific extractor
     */
    unregister(sceneType: SceneType): void;
    /**
     * Detect the best matching scene for the given text
     */
    detectScene(text: string): Promise<SceneDetectionResult>;
    /**
     * Detect all matching scenes (for multi-scene detection)
     */
    detectAllScenes(text: string): Promise<SceneDetectionResult[]>;
    /**
     * Get extractor for a specific scene
     */
    getExtractor(sceneType: SceneType): SceneSpecificExtractor | undefined;
    /**
     * Get all registered extractors
     */
    getAllExtractors(): Map<SceneType, SceneSpecificExtractor>;
    /**
     * Get extractor for text (auto-detect scene)
     */
    getExtractorForText(text: string): Promise<SceneSpecificExtractor | undefined>;
    /**
     * Extract keywords that matched for a scene
     */
    private extractKeywords;
    /**
     * Check if a scene is supported
     */
    isSceneSupported(sceneType: SceneType): boolean;
    /**
     * Get list of supported scenes
     */
    getSupportedScenes(): SceneType[];
}
export declare const sceneDetector: SceneDetector;
//# sourceMappingURL=sceneDetector.d.ts.map