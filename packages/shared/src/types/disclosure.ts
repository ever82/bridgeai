/**
 * Disclosure Level Types
 *
 * Defines disclosure levels and field-level disclosure control
 * for protecting user privacy in the matching process.
 */

/**
 * Disclosure levels for agent information
 * Controls visibility based on relationship stage
 */
export enum DisclosureLevel {
  /** Information visible to anyone */
  PUBLIC = 'PUBLIC',
  /** Information visible after matching */
  AFTER_MATCH = 'AFTER_MATCH',
  /** Information visible after private chat */
  AFTER_CHAT = 'AFTER_CHAT',
  /** Information visible after referral */
  AFTER_REFERRAL = 'AFTER_REFERRAL',
}

/**
 * Field disclosure configuration
 * Defines which disclosure level applies to each field
 */
export interface FieldDisclosure {
  /** Field name */
  fieldName: string;
  /** Current disclosure level */
  level: DisclosureLevel;
  /** Whether this field can be disclosed */
  isDisclosable: boolean;
  /** Default level for this field */
  defaultLevel: DisclosureLevel;
}

/**
 * Agent disclosure settings
 * Complete disclosure configuration for an agent
 */
export interface AgentDisclosureSettings {
  /** Agent ID */
  agentId: string;
  /** User ID who owns the agent */
  userId: string;
  /** Field-level disclosure configurations */
  fieldDisclosures: FieldDisclosure[];
  /** Default disclosure level for unspecified fields */
  defaultLevel: DisclosureLevel;
  /** Whether to use strict mode (hide unspecified fields) */
  strictMode: boolean;
  /** Last updated timestamp */
  updatedAt: string;
  /** Created timestamp */
  createdAt: string;
}

/**
 * User relationship stage with another user
 * Determines what information can be disclosed
 */
export enum RelationshipStage {
  /** No relationship - public visibility only */
  NONE = 'NONE',
  /** Users have matched */
  MATCHED = 'MATCHED',
  /** Users have engaged in private chat */
  CHATTED = 'CHATTED',
  /** One user has referred the other */
  REFERRED = 'REFERRED',
}

/**
 * Disclosure check result
 */
export interface DisclosureCheckResult {
  /** Whether the field can be viewed */
  canView: boolean;
  /** The field's disclosure level */
  fieldLevel: DisclosureLevel;
  /** Current relationship stage */
  relationshipStage: RelationshipStage;
  /** Reason for denial (if canView is false) */
  denialReason?: string;
}

/**
 * Disclosure audit log entry
 */
export interface DisclosureAuditEntry {
  /** Entry ID */
  id: string;
  /** Agent ID */
  agentId: string;
  /** Field name that was accessed */
  fieldName: string;
  /** User who accessed the field */
  accessedBy: string;
  /** Owner of the agent */
  ownerId: string;
  /** Whether access was granted */
  accessGranted: boolean;
  /** Timestamp of access */
  timestamp: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Disclosure change record
 */
export interface DisclosureChangeRecord {
  /** Record ID */
  id: string;
  /** Agent ID */
  agentId: string;
  /** Field name that was changed */
  fieldName: string;
  /** Previous disclosure level */
  previousLevel: DisclosureLevel;
  /** New disclosure level */
  newLevel: DisclosureLevel;
  /** User who made the change */
  changedBy: string;
  /** Timestamp of change */
  changedAt: string;
  /** Whether affected users were notified */
  notificationSent: boolean;
}

/**
 * Disclosure preview for different viewer roles
 */
export interface DisclosurePreview {
  /** Viewer role/stage */
  viewerStage: RelationshipStage;
  /** Viewer description */
  viewerDescription: string;
  /** Fields visible at this stage */
  visibleFields: string[];
  /** Fields hidden at this stage */
  hiddenFields: string[];
  /** Sample data showing what viewer would see */
  sampleView: Record<string, unknown>;
}

/**
 * Bulk disclosure update request
 */
export interface BulkDisclosureUpdateRequest {
  /** Agent ID */
  agentId: string;
  /** Fields to update */
  fieldUpdates: {
    fieldName: string;
    level: DisclosureLevel;
  }[];
  /** Whether to notify affected users */
  notifyAffectedUsers: boolean;
}

/**
 * Disclosure level display metadata
 */
export interface DisclosureLevelInfo {
  /** Level identifier */
  level: DisclosureLevel;
  /** Display name */
  name: string;
  /** Description of who can see */
  description: string;
  /** Icon identifier */
  icon: string;
  /** Color code for UI */
  color: string;
  /** Order for sorting (lower = more permissive) */
  order: number;
}

/**
 * Disclosure level metadata for UI display
 */
export const DISCLOSURE_LEVEL_INFO: Record<DisclosureLevel, DisclosureLevelInfo> = {
  [DisclosureLevel.PUBLIC]: {
    level: DisclosureLevel.PUBLIC,
    name: '公开',
    description: '任何人可见',
    icon: 'globe',
    color: '#4CAF50',
    order: 0,
  },
  [DisclosureLevel.AFTER_MATCH]: {
    level: DisclosureLevel.AFTER_MATCH,
    name: '匹配后可见',
    description: '匹配成功后可见',
    icon: 'handshake',
    color: '#2196F3',
    order: 1,
  },
  [DisclosureLevel.AFTER_CHAT]: {
    level: DisclosureLevel.AFTER_CHAT,
    name: '私聊后可见',
    description: '私聊交流后可见',
    icon: 'message-circle',
    color: '#FF9800',
    order: 2,
  },
  [DisclosureLevel.AFTER_REFERRAL]: {
    level: DisclosureLevel.AFTER_REFERRAL,
    name: '引荐后可见',
    description: '经人引荐后可见',
    icon: 'user-plus',
    color: '#9C27B0',
    order: 3,
  },
};

/**
 * Default field disclosure configurations
 * Sensible defaults for common agent fields
 */
export const DEFAULT_FIELD_DISCLOSURES: FieldDisclosure[] = [
  { fieldName: 'name', level: DisclosureLevel.PUBLIC, isDisclosable: true, defaultLevel: DisclosureLevel.PUBLIC },
  { fieldName: 'avatar', level: DisclosureLevel.PUBLIC, isDisclosable: true, defaultLevel: DisclosureLevel.PUBLIC },
  { fieldName: 'bio', level: DisclosureLevel.PUBLIC, isDisclosable: true, defaultLevel: DisclosureLevel.PUBLIC },
  { fieldName: 'industry', level: DisclosureLevel.PUBLIC, isDisclosable: true, defaultLevel: DisclosureLevel.PUBLIC },
  { fieldName: 'location', level: DisclosureLevel.AFTER_MATCH, isDisclosable: true, defaultLevel: DisclosureLevel.AFTER_MATCH },
  { fieldName: 'contact', level: DisclosureLevel.AFTER_CHAT, isDisclosable: true, defaultLevel: DisclosureLevel.AFTER_CHAT },
  { fieldName: 'email', level: DisclosureLevel.AFTER_CHAT, isDisclosable: true, defaultLevel: DisclosureLevel.AFTER_CHAT },
  { fieldName: 'phone', level: DisclosureLevel.AFTER_REFERRAL, isDisclosable: true, defaultLevel: DisclosureLevel.AFTER_REFERRAL },
  { fieldName: 'company', level: DisclosureLevel.AFTER_MATCH, isDisclosable: true, defaultLevel: DisclosureLevel.AFTER_MATCH },
  { fieldName: 'socialLinks', level: DisclosureLevel.AFTER_CHAT, isDisclosable: true, defaultLevel: DisclosureLevel.AFTER_CHAT },
];

/**
 * Get the minimum relationship stage required to view a disclosure level
 */
export function getRequiredStage(level: DisclosureLevel): RelationshipStage {
  switch (level) {
    case DisclosureLevel.PUBLIC:
      return RelationshipStage.NONE;
    case DisclosureLevel.AFTER_MATCH:
      return RelationshipStage.MATCHED;
    case DisclosureLevel.AFTER_CHAT:
      return RelationshipStage.CHATTED;
    case DisclosureLevel.AFTER_REFERRAL:
      return RelationshipStage.REFERRED;
    default:
      return RelationshipStage.REFERRED;
  }
}

/**
 * Check if a relationship stage satisfies a disclosure level requirement
 */
export function canDiscloseAtStage(
  requiredLevel: DisclosureLevel,
  currentStage: RelationshipStage
): boolean {
  const requiredStage = getRequiredStage(requiredLevel);
  const stageOrder: Record<RelationshipStage, number> = {
    [RelationshipStage.NONE]: 0,
    [RelationshipStage.MATCHED]: 1,
    [RelationshipStage.CHATTED]: 2,
    [RelationshipStage.REFERRED]: 3,
  };
  return stageOrder[currentStage] >= stageOrder[requiredStage];
}

/**
 * Create default disclosure settings for an agent
 */
export function createDefaultDisclosureSettings(
  agentId: string,
  userId: string
): AgentDisclosureSettings {
  return {
    agentId,
    userId,
    fieldDisclosures: [...DEFAULT_FIELD_DISCLOSURES],
    defaultLevel: DisclosureLevel.AFTER_MATCH,
    strictMode: false,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Common agent fields that can have disclosure settings
 */
export const DISCLOSABLE_FIELDS = [
  'name',
  'avatar',
  'bio',
  'industry',
  'location',
  'contact',
  'email',
  'phone',
  'company',
  'socialLinks',
  'skills',
  'interests',
  'experience',
  'education',
];
