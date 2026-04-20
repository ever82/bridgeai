/**
 * Scene Detector
 * 场景检测器 - 自动检测和路由到对应的场景提取器
 */

import { logger } from '../../../utils/logger';

import { SceneSpecificExtractor, SceneType, SceneDetectionResult } from './types';
import { VisionShareExtractor } from './visionShareExtractor';
import { AgentDateExtractor } from './agentDateExtractor';
import { AgentJobExtractor } from './agentJobExtractor';
import { AgentAdExtractor } from './agentAdExtractor';

/**
 * Scene Detector Service
 * Detects the appropriate scene for a given text and routes to the correct extractor
 */
export class SceneDetector {
  private extractors: Map<SceneType, SceneSpecificExtractor>;

  constructor() {
    this.extractors = new Map();
    this.registerDefaultExtractors();
  }

  /**
   * Register default extractors
   */
  private registerDefaultExtractors(): void {
    this.register('visionshare', new VisionShareExtractor());
    this.register('agentdate', new AgentDateExtractor());
    this.register('agentjob', new AgentJobExtractor());
    this.register('agentad', new AgentAdExtractor());
  }

  /**
   * Register a scene-specific extractor
   */
  register(sceneType: SceneType, extractor: SceneSpecificExtractor): void {
    this.extractors.set(sceneType, extractor);
    logger.info(`Registered scene extractor: ${sceneType}`);
  }

  /**
   * Unregister a scene-specific extractor
   */
  unregister(sceneType: SceneType): void {
    this.extractors.delete(sceneType);
    logger.info(`Unregistered scene extractor: ${sceneType}`);
  }

  /**
   * Detect the best matching scene for the given text
   */
  async detectScene(text: string): Promise<SceneDetectionResult> {
    logger.info('Detecting scene for text', { textLength: text.length });

    const results: Array<{ scene: SceneType; confidence: number }> = [];

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

    if (bestMatch && bestMatch.confidence > 0.5) {
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
  async detectAllScenes(text: string): Promise<SceneDetectionResult[]> {
    logger.info('Detecting all matching scenes', { textLength: text.length });

    const results: SceneDetectionResult[] = [];

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
  getExtractor(sceneType: SceneType): SceneSpecificExtractor | undefined {
    return this.extractors.get(sceneType);
  }

  /**
   * Get all registered extractors
   */
  getAllExtractors(): Map<SceneType, SceneSpecificExtractor> {
    return new Map(this.extractors);
  }

  /**
   * Get extractor for text (auto-detect scene)
   */
  async getExtractorForText(text: string): Promise<SceneSpecificExtractor | undefined> {
    const { scene } = await this.detectScene(text);
    return this.getExtractor(scene);
  }

  /**
   * Extract keywords that matched for a scene
   */
  private extractKeywords(text: string, scene: SceneType): string[] {
    const extractor = this.extractors.get(scene);
    if (!extractor) {
      return [];
    }

    // Access detection keywords from the extractor
    // This is a simplified version - in production, you might want to expose this via the interface
    const keywords: string[] = [];
    const lowerText = text.toLowerCase();

    // Define keyword sets for each scene
    const keywordSets: Record<SceneType, string[]> = {
      visionshare: [
        '摄影', '拍照', '拍摄', '照片', '写真', '摄影师', '模特',
        'photography', 'photo', 'shoot', 'picture',
      ],
      agentdate: [
        '约会', '相亲', '交友', '脱单', '找对象',
        'date', 'dating', 'matchmaking', 'relationship',
        '男朋友', '女朋友', '伴侣', '择偶',
      ],
      agentjob: [
        '工作', '求职', '招聘', '找工作', '应聘',
        'job', 'work', 'career', 'employment',
        '职位', '岗位', '薪资', '工资', '经验', '技能',
      ],
      agentad: [
        '商品', '购买', '买', '卖', '购物',
        'product', 'buy', 'purchase', 'shop', 'shopping',
        '品牌', '预算', '价格', '淘宝', '京东', '拼多多',
      ],
      unknown: [],
    };

    const sceneKeywords = keywordSets[scene] || [];
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
  isSceneSupported(sceneType: SceneType): boolean {
    return this.extractors.has(sceneType);
  }

  /**
   * Get list of supported scenes
   */
  getSupportedScenes(): SceneType[] {
    return Array.from(this.extractors.keys());
  }
}

// Export singleton instance
export const sceneDetector = new SceneDetector();
