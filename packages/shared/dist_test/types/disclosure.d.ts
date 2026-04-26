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
export declare enum DisclosureLevel {
    /** Information visible to anyone */
    PUBLIC = "PUBLIC",
    /** Information visible after matching */
    AFTER_MATCH = "AFTER_MATCH",
    /** Information visible after private chat */
    AFTER_CHAT = "AFTER_CHAT",
    /** Information visible after referral */
    AFTER_REFERRAL = "AFTER_REFERRAL"
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
export declare enum RelationshipStage {
    /** No relationship - public visibility only */
    NONE = "NONE",
    /** Users have matched */
    MATCHED = "MATCHED",
    /** Users have engaged in private chat */
    CHATTED = "CHATTED",
    /** One user has referred the other */
    REFERRED = "REFERRED"
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
export declare const DISCLOSURE_LEVEL_INFO: Record<DisclosureLevel, DisclosureLevelInfo>;
/**
 * Default field disclosure configurations
 * Sensible defaults for common agent fields
 */
export declare const DEFAULT_FIELD_DISCLOSURES: FieldDisclosure[];
/**
 * Get the minimum relationship stage required to view a disclosure level
 */
export declare function getRequiredStage(level: DisclosureLevel): RelationshipStage;
/**
 * Check if a relationship stage satisfies a disclosure level requirement
 */
export declare function canDiscloseAtStage(requiredLevel: DisclosureLevel, currentStage: RelationshipStage): boolean;
/**
 * Create default disclosure settings for an agent
 */
export declare function createDefaultDisclosureSettings(agentId: string, userId: string): AgentDisclosureSettings;
/**
 * Common agent fields that can have disclosure settings
 */
export declare const DISCLOSABLE_FIELDS: string[];
//# sourceMappingURL=disclosure.d.ts.map