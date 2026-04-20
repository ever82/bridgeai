/**
 * Scene Capability Service
 * 场景能力服务
 *
 * Manages scene capabilities including:
 * - Capability checks
 * - Dependency validation
 * - Version management
 * - Feature toggling
 */

import {
  SceneCapability,
  SceneId,
  SCENE_IDS,
} from '@bridgeai/shared';
import { getSceneConfig } from '@bridgeai/shared';

import { logger } from '../utils/logger';

// Capability version cache
const capabilityVersionCache = new Map<string, { version: string; checkedAt: Date }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a capability is enabled for a scene
 */
export function isCapabilityEnabled(
  sceneId: SceneId,
  capabilityId: string
): boolean {
  const sceneConfig = getSceneConfig(sceneId);
  if (!sceneConfig) {
    logger.warn('Scene not found', { sceneId });
    return false;
  }

  const capability = sceneConfig.capabilities.find(c => c.id === capabilityId);
  if (!capability) {
    return false;
  }

  // Check if dependencies are satisfied
  if (!areDependenciesSatisfied(sceneId, capabilityId)) {
    return false;
  }

  return capability.enabled;
}

/**
 * Get all enabled capabilities for a scene
 */
export function getEnabledCapabilities(sceneId: SceneId): SceneCapability[] {
  const sceneConfig = getSceneConfig(sceneId);
  if (!sceneConfig) {
    return [];
  }

  return sceneConfig.capabilities.filter(capability => {
    if (!capability.enabled) return false;
    return areDependenciesSatisfied(sceneId, capability.id);
  });
}

/**
 * Get all capabilities for a scene (including disabled)
 */
export function getAllCapabilities(sceneId: SceneId): SceneCapability[] {
  const sceneConfig = getSceneConfig(sceneId);
  if (!sceneConfig) {
    return [];
  }

  return sceneConfig.capabilities;
}

/**
 * Get a specific capability
 */
export function getCapability(
  sceneId: SceneId,
  capabilityId: string
): SceneCapability | undefined {
  const sceneConfig = getSceneConfig(sceneId);
  if (!sceneConfig) {
    return undefined;
  }

  return sceneConfig.capabilities.find(c => c.id === capabilityId);
}

/**
 * Check if all dependencies for a capability are satisfied
 */
export function areDependenciesSatisfied(
  sceneId: SceneId,
  capabilityId: string
): boolean {
  const sceneConfig = getSceneConfig(sceneId);
  if (!sceneConfig) {
    return false;
  }

  const capability = sceneConfig.capabilities.find(c => c.id === capabilityId);
  if (!capability) {
    return false;
  }

  // Check each dependency
  for (const depId of capability.dependencies) {
    const depCapability = sceneConfig.capabilities.find(c => c.id === depId);
    if (!depCapability) {
      logger.warn('Capability dependency not found', {
        sceneId,
        capabilityId,
        dependencyId: depId,
      });
      return false;
    }

    if (!depCapability.enabled) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a capability has circular dependencies
 */
export function hasCircularDependencies(
  sceneId: SceneId,
  capabilityId: string,
  visited: Set<string> = new Set()
): boolean {
  if (visited.has(capabilityId)) {
    return true;
  }

  const sceneConfig = getSceneConfig(sceneId);
  if (!sceneConfig) {
    return false;
  }

  const capability = sceneConfig.capabilities.find(c => c.id === capabilityId);
  if (!capability || capability.dependencies.length === 0) {
    return false;
  }

  visited.add(capabilityId);

  for (const depId of capability.dependencies) {
    if (hasCircularDependencies(sceneId, depId, new Set(visited))) {
      return true;
    }
  }

  return false;
}

/**
 * Get capability config
 */
export function getCapabilityConfig<T = Record<string, any>>(
  sceneId: SceneId,
  capabilityId: string
): T | undefined {
  const capability = getCapability(sceneId, capabilityId);
  return capability?.config as T | undefined;
}

/**
 * Validate capability version
 */
export function validateCapabilityVersion(
  sceneId: SceneId,
  capabilityId: string,
  minVersion: string
): boolean {
  const capability = getCapability(sceneId, capabilityId);
  if (!capability) {
    return false;
  }

  return compareVersions(capability.version, minVersion) >= 0;
}

/**
 * Compare semantic versions
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }

  return 0;
}

/**
 * Get missing dependencies for a capability
 */
export function getMissingDependencies(
  sceneId: SceneId,
  capabilityId: string
): string[] {
  const sceneConfig = getSceneConfig(sceneId);
  if (!sceneConfig) {
    return [];
  }

  const capability = sceneConfig.capabilities.find(c => c.id === capabilityId);
  if (!capability) {
    return [];
  }

  return capability.dependencies.filter(depId => {
    const depCapability = sceneConfig.capabilities.find(c => c.id === depId);
    return !depCapability || !depCapability.enabled;
  });
}

/**
 * Get capability status with details
 */
export function getCapabilityStatus(
  sceneId: SceneId,
  capabilityId: string
): {
  enabled: boolean;
  available: boolean;
  missingDependencies: string[];
  hasCircularDeps: boolean;
} {
  const sceneConfig = getSceneConfig(sceneId);
  const capability = sceneConfig?.capabilities.find(c => c.id === capabilityId);

  if (!capability) {
    return {
      enabled: false,
      available: false,
      missingDependencies: [],
      hasCircularDeps: false,
    };
  }

  const missingDependencies = getMissingDependencies(sceneId, capabilityId);
  const hasCircularDeps = hasCircularDependencies(sceneId, capabilityId);
  const available = capability.enabled &&
    missingDependencies.length === 0 &&
    !hasCircularDeps;

  return {
    enabled: capability.enabled,
    available,
    missingDependencies,
    hasCircularDeps,
  };
}

/**
 * Check if multiple capabilities are all enabled
 */
export function areAllCapabilitiesEnabled(
  sceneId: SceneId,
  capabilityIds: string[]
): boolean {
  return capabilityIds.every(id => isCapabilityEnabled(sceneId, id));
}

/**
 * Check if any of the capabilities is enabled
 */
export function isAnyCapabilityEnabled(
  sceneId: SceneId,
  capabilityIds: string[]
): boolean {
  return capabilityIds.some(id => isCapabilityEnabled(sceneId, id));
}

/**
 * Get capabilities by category
 */
export function getCapabilitiesByTag(
  sceneId: SceneId,
  tag: string
): SceneCapability[] {
  const sceneConfig = getSceneConfig(sceneId);
  if (!sceneConfig) {
    return [];
  }

  // Tags can be extracted from capability name or description
  // This is a simple implementation that checks if tag is in name or description
  return sceneConfig.capabilities.filter(capability =>
    capability.name.includes(tag) ||
    capability.description.includes(tag)
  );
}

/**
 * Clear capability version cache
 */
export function clearCapabilityCache(): void {
  capabilityVersionCache.clear();
  logger.info('Capability version cache cleared');
}

/**
 * Get scene capabilities summary
 */
export function getSceneCapabilitiesSummary(sceneId: SceneId): {
  total: number;
  enabled: number;
  available: number;
  withDependencies: number;
} {
  const sceneConfig = getSceneConfig(sceneId);
  if (!sceneConfig) {
    return { total: 0, enabled: 0, available: 0, withDependencies: 0 };
  }

  const capabilities = sceneConfig.capabilities;
  const enabled = capabilities.filter(c => c.enabled).length;
  const available = capabilities.filter(c =>
    c.enabled && areDependenciesSatisfied(sceneId, c.id)
  ).length;
  const withDependencies = capabilities.filter(c => c.dependencies.length > 0).length;

  return {
    total: capabilities.length,
    enabled,
    available,
    withDependencies,
  };
}

/**
 * Get all scenes capability summary
 */
export function getAllScenesCapabilitySummary(): Record<SceneId, {
  total: number;
  enabled: number;
  available: number;
}> {
  const summary: Record<SceneId, { total: number; enabled: number; available: number }> = {} as any;

  for (const sceneId of SCENE_IDS) {
    const sceneConfig = getSceneConfig(sceneId);
    if (sceneConfig) {
      const capabilities = sceneConfig.capabilities;
      const enabled = capabilities.filter(c => c.enabled).length;
      const available = capabilities.filter(c =>
        c.enabled && areDependenciesSatisfied(sceneId, c.id)
      ).length;

      summary[sceneId] = {
        total: capabilities.length,
        enabled,
        available,
      };
    }
  }

  return summary;
}
