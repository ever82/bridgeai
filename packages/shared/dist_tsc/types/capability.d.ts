/**
 * Capability Types
 * 能力类型定义
 */
import { SceneId } from './scene';
export interface CapabilityStatus {
    enabled: boolean;
    available: boolean;
    missingDependencies: string[];
    hasCircularDeps: boolean;
}
export interface CapabilitySummary {
    total: number;
    enabled: number;
    available: number;
    withDependencies: number;
}
export interface CapabilityRequirement {
    capabilityId: string;
    minVersion?: string;
    config?: Record<string, any>;
}
export interface CapabilityCheckResult {
    allowed: boolean;
    reason?: string;
    missingCapabilities?: string[];
    versionMismatch?: Array<{
        capabilityId: string;
        required: string;
        actual: string;
    }>;
}
export interface ImageUploadConfig {
    maxFileSize: number;
    allowedFormats: string[];
    maxImages: number;
}
export interface VideoUploadConfig {
    maxFileSize: number;
    allowedFormats: string[];
    maxDuration: number;
}
export interface ImageAdsConfig {
    maxFileSize: number;
    allowedFormats: string[];
    recommendedSize: string;
}
export interface CapabilityRegistry {
    capabilities: Map<string, RegisteredCapability>;
    register(capability: RegisteredCapability): void;
    unregister(capabilityId: string): void;
    get(capabilityId: string): RegisteredCapability | undefined;
    getAll(): RegisteredCapability[];
}
export interface RegisteredCapability {
    id: string;
    name: string;
    description: string;
    category: CapabilityCategory;
    version: string;
    scenes: SceneId[];
    dependencies: string[];
    configSchema?: Record<string, any>;
}
export type CapabilityCategory = 'media' | 'communication' | 'matching' | 'payment' | 'verification' | 'analytics' | 'social' | 'other';
export interface SceneCapabilityMapping {
    sceneId: SceneId;
    capabilityId: string;
    enabled: boolean;
    config?: Record<string, any>;
}
export interface CapabilityVersionInfo {
    capabilityId: string;
    currentVersion: string;
    minSupportedVersion: string;
    latestVersion: string;
    changelog: VersionChangelog[];
}
export interface VersionChangelog {
    version: string;
    date: string;
    changes: string[];
    breaking: boolean;
}
export interface CapabilityPermission {
    capabilityId: string;
    allowedRoles: string[];
    allowedUsers?: string[];
    deniedUsers?: string[];
    conditions?: CapabilityCondition[];
}
export interface CapabilityCondition {
    type: 'credit_score' | 'verification' | 'subscription' | 'custom';
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in';
    value: any;
}
export interface FeatureFlag {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    targetScenes: SceneId[];
    rolloutPercentage: number;
    allowedUsers: string[];
    startDate?: Date;
    endDate?: Date;
}
//# sourceMappingURL=capability.d.ts.map