/**
 * Scene Configurations
 * 场景配置导出
 */
import { SceneConfig, SceneId } from '../../types/scene';

import { visionShareConfig } from './visionShare';
import { agentDateConfig } from './agentDate';
import { agentJobConfig } from './agentJob';
import { agentAdConfig } from './agentAd';

export { visionShareConfig, agentDateConfig, agentJobConfig, agentAdConfig };
export declare const sceneRegistry: Map<SceneId, SceneConfig>;
/**
 * Get scene configuration by ID
 */
export declare function getSceneConfig(sceneId: SceneId): SceneConfig | undefined;
/**
 * Get all scene configurations
 */
export declare function getAllSceneConfigs(): SceneConfig[];
/**
 * Get active scene configurations
 */
export declare function getActiveSceneConfigs(): SceneConfig[];
/**
 * Get scene info (lightweight metadata)
 */
export declare function getSceneInfo(sceneId: SceneId): {
  id: SceneId;
  name: string;
  description: string;
  icon: string;
  color: string;
  isActive: boolean;
  fieldCount: number;
  capabilityCount: number;
} | null;
/**
 * Get all scene infos
 */
export declare function getAllSceneInfos(): ({
  id: SceneId;
  name: string;
  description: string;
  icon: string;
  color: string;
  isActive: boolean;
  fieldCount: number;
  capabilityCount: number;
} | null)[];
/**
 * Check if scene exists
 */
export declare function hasScene(sceneId: SceneId): boolean;
/**
 * Register a new scene configuration
 */
export declare function registerScene(config: SceneConfig): void;
/**
 * Unregister a scene configuration
 */
export declare function unregisterScene(sceneId: SceneId): boolean;
//# sourceMappingURL=index.d.ts.map
