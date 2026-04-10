/**
 * Scene Configurations
 * 场景配置导出
 */

import { visionShareConfig } from './visionShare';
import { agentDateConfig } from './agentDate';
import { agentJobConfig } from './agentJob';
import { agentAdConfig } from './agentAd';

export {
  visionShareConfig,
  agentDateConfig,
  agentJobConfig,
  agentAdConfig,
};

// Scene registry
import { SceneConfig, SceneId } from '../../types/scene';

export const sceneRegistry: Map<SceneId, SceneConfig> = new Map([
  ['visionshare', visionShareConfig],
  ['agentdate', agentDateConfig],
  ['agentjob', agentJobConfig],
  ['agentad', agentAdConfig],
]);

/**
 * Get scene configuration by ID
 */
export function getSceneConfig(sceneId: SceneId): SceneConfig | undefined {
  return sceneRegistry.get(sceneId);
}

/**
 * Get all scene configurations
 */
export function getAllSceneConfigs(): SceneConfig[] {
  return Array.from(sceneRegistry.values());
}

/**
 * Get active scene configurations
 */
export function getActiveSceneConfigs(): SceneConfig[] {
  return Array.from(sceneRegistry.values()).filter(s => s.metadata.isActive);
}

/**
 * Get scene info (lightweight metadata)
 */
export function getSceneInfo(sceneId: SceneId) {
  const config = sceneRegistry.get(sceneId);
  if (!config) return null;

  return {
    id: config.id,
    name: config.metadata.name,
    description: config.metadata.description,
    icon: config.metadata.icon,
    color: config.metadata.color,
    isActive: config.metadata.isActive,
    fieldCount: config.fields.length,
    capabilityCount: config.capabilities.length,
  };
}

/**
 * Get all scene infos
 */
export function getAllSceneInfos() {
  return getAllSceneConfigs()
    .map(c => getSceneInfo(c.id))
    .filter(Boolean);
}

/**
 * Check if scene exists
 */
export function hasScene(sceneId: SceneId): boolean {
  return sceneRegistry.has(sceneId);
}

/**
 * Register a new scene configuration
 */
export function registerScene(config: SceneConfig): void {
  sceneRegistry.set(config.id, config);
}

/**
 * Unregister a scene configuration
 */
export function unregisterScene(sceneId: SceneId): boolean {
  return sceneRegistry.delete(sceneId);
}
