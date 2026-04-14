/**
 * Capability Types
 * 能力类型定义
 */

import { SceneId } from './scene';

// ============================================
// Capability Status
// ============================================

export interface CapabilityStatus {
  enabled: boolean;
  available: boolean;
  missingDependencies: string[];
  hasCircularDeps: boolean;
}

// ============================================
// Capability Summary
// ============================================

export interface CapabilitySummary {
  total: number;
  enabled: number;
  available: number;
  withDependencies: number;
}

// ============================================
// Capability Requirement
// ============================================

export interface CapabilityRequirement {
  capabilityId: string;
  minVersion?: string;
  config?: Record<string, any>;
}

// ============================================
// Capability Check Result
// ============================================

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

// ============================================
// Capability Config Types
// ============================================

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

// ============================================
// Capability Registry
// ============================================

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

export type CapabilityCategory =
  | 'media'
  | 'communication'
  | 'matching'
  | 'payment'
  | 'verification'
  | 'analytics'
  | 'social'
  | 'other';

// ============================================
// Scene Capability Mapping
// ============================================

export interface SceneCapabilityMapping {
  sceneId: SceneId;
  capabilityId: string;
  enabled: boolean;
  config?: Record<string, any>;
}

// ============================================
// Capability Version Info
// ============================================

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

// ============================================
// Capability Permission
// ============================================

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

// ============================================
// Feature Flag
// ============================================

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
