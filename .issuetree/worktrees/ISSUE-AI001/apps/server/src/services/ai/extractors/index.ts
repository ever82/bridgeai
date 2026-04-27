/**
 * Scene Extractors Module
 * 场景提取器模块 - 导出所有场景提取器相关功能
 */

// Export types
export {
  SceneType,
  SceneExtractedData,
  SceneExtractedEntity,
  SceneSpecificExtractor,
  SceneDetectionResult,
  VisionShareData,
  AgentDateData,
  AgentJobData,
  AgentAdData,
  ExtractorRegistryEntry,
} from './types';

// Export base class
export { BaseSceneExtractor } from './baseExtractor';

// Export scene-specific extractors
export { VisionShareExtractor } from './visionShareExtractor';
export { AgentDateExtractor } from './agentDateExtractor';
export { AgentJobExtractor } from './agentJobExtractor';
export { AgentAdExtractor } from './agentAdExtractor';

// Export scene detector
export { SceneDetector, sceneDetector } from './sceneDetector';
