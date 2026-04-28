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
import { SceneCapability, SceneId } from '@bridgeai/shared';
/**
 * Check if a capability is enabled for a scene
 */
export declare function isCapabilityEnabled(sceneId: SceneId, capabilityId: string): boolean;
/**
 * Get all enabled capabilities for a scene
 */
export declare function getEnabledCapabilities(sceneId: SceneId): SceneCapability[];
/**
 * Get all capabilities for a scene (including disabled)
 */
export declare function getAllCapabilities(sceneId: SceneId): SceneCapability[];
/**
 * Get a specific capability
 */
export declare function getCapability(sceneId: SceneId, capabilityId: string): SceneCapability | undefined;
/**
 * Check if all dependencies for a capability are satisfied
 */
export declare function areDependenciesSatisfied(sceneId: SceneId, capabilityId: string): boolean;
/**
 * Check if a capability has circular dependencies
 */
export declare function hasCircularDependencies(sceneId: SceneId, capabilityId: string, visited?: Set<string>): boolean;
/**
 * Get capability config
 */
export declare function getCapabilityConfig<T = Record<string, any>>(sceneId: SceneId, capabilityId: string): T | undefined;
/**
 * Validate capability version
 */
export declare function validateCapabilityVersion(sceneId: SceneId, capabilityId: string, minVersion: string): boolean;
/**
 * Get missing dependencies for a capability
 */
export declare function getMissingDependencies(sceneId: SceneId, capabilityId: string): string[];
/**
 * Get capability status with details
 */
export declare function getCapabilityStatus(sceneId: SceneId, capabilityId: string): {
    enabled: boolean;
    available: boolean;
    missingDependencies: string[];
    hasCircularDeps: boolean;
};
/**
 * Check if multiple capabilities are all enabled
 */
export declare function areAllCapabilitiesEnabled(sceneId: SceneId, capabilityIds: string[]): boolean;
/**
 * Check if any of the capabilities is enabled
 */
export declare function isAnyCapabilityEnabled(sceneId: SceneId, capabilityIds: string[]): boolean;
/**
 * Get capabilities by category
 */
export declare function getCapabilitiesByTag(sceneId: SceneId, tag: string): SceneCapability[];
/**
 * Get scene capabilities summary
 */
export declare function getSceneCapabilitiesSummary(sceneId: SceneId): {
    total: number;
    enabled: number;
    available: number;
    withDependencies: number;
};
/**
 * Get all scenes capability summary
 */
export declare function getAllScenesCapabilitySummary(): Record<SceneId, {
    total: number;
    enabled: number;
    available: number;
}>;
//# sourceMappingURL=sceneCapabilityService.d.ts.map