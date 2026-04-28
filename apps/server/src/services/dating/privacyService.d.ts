import type { DatingProfile, PrivacySettings } from '@bridgeai/shared';
import { VisibilityLevel } from '@bridgeai/shared';
/**
 * Field definitions with sensitivity levels
 */
export declare const FIELD_DEFINITIONS: Record<string, {
    category: string;
    sensitivity: 'high' | 'medium' | 'low';
    defaultVisibility: VisibilityLevel;
}>;
/**
 * Sensitive fields that require special protection
 */
export declare const SENSITIVE_FIELDS: string[];
/**
 * Get visible fields based on relationship stage
 */
export declare function getVisibleFieldsAtStage(profile: DatingProfile, stage: 'initial' | 'matched' | 'chatting' | 'meeting' | 'committed', isOwner: boolean, isMatched: boolean): string[];
/**
 * Filter profile data based on visibility settings
 */
export declare function filterProfileForViewer(profile: DatingProfile, viewerUserId: string, relationshipStage?: 'initial' | 'matched' | 'chatting' | 'meeting' | 'committed', isMatched?: boolean): Partial<DatingProfile>;
/**
 * Check if user can access specific field
 */
export declare function canAccessField(profile: DatingProfile, field: string, viewerUserId: string, relationshipStage: 'initial' | 'matched' | 'chatting' | 'meeting' | 'committed', isMatched: boolean, isVerified?: boolean): boolean;
/**
 * Validate privacy settings
 */
export declare function validatePrivacySettings(settings: Partial<PrivacySettings>): {
    valid: boolean;
    errors: string[];
};
/**
 * Get default privacy settings
 */
export declare function getDefaultPrivacySettings(): PrivacySettings;
/**
 * Get recommended privacy settings for different privacy levels
 */
export declare function getRecommendedPrivacySettings(level: 'low' | 'medium' | 'high'): PrivacySettings;
/**
 * Check if field contains sensitive information
 */
export declare function isSensitiveField(field: string): boolean;
/**
 * Mask sensitive field value
 */
export declare function maskFieldValue(field: string, value: string): string;
/**
 * Get disclosure recommendations
 */
export declare function getDisclosureRecommendations(profile: DatingProfile): Array<{
    field: string;
    currentVisibility: VisibilityLevel;
    recommendedVisibility: VisibilityLevel;
    reason: string;
}>;
//# sourceMappingURL=privacyService.d.ts.map