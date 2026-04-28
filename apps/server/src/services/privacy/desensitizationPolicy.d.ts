/**
 * Desensitization Policy Service
 * Manages privacy policies, templates, rules, and configurations
 */
import { DesensitizationMethod } from '../image/desensitization';
import { SensitiveType } from '../ai/sensitiveContentDetection';
export type PrivacyLevel = 'strict' | 'standard' | 'relaxed';
export interface DesensitizationRule {
    id: string;
    name: string;
    enabled: boolean;
    contentTypes: SensitiveType[];
    method: DesensitizationMethod;
    minIntensity: number;
    maxIntensity: number;
    autoApply: boolean;
    conditions?: RuleCondition[];
}
export interface RuleCondition {
    type: 'confidence' | 'scene' | 'time' | 'location';
    operator: 'gt' | 'lt' | 'eq' | 'contains';
    value: unknown;
}
export interface DesensitizationTemplate {
    id: string;
    name: string;
    description: string;
    privacyLevel: PrivacyLevel;
    rules: DesensitizationRule[];
    autoDesensitize: boolean;
    defaultIntensity: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface PolicyConfiguration {
    userId: string;
    activeTemplateId: string | null;
    customRules: DesensitizationRule[];
    whitelist: WhitelistEntry[];
    autoDesensitize: boolean;
    defaultMethod: DesensitizationMethod;
}
export interface WhitelistEntry {
    id: string;
    type: 'face' | 'location' | 'object' | 'pattern';
    value: string;
    description?: string;
    expiresAt?: Date;
}
export interface SceneRecommendation {
    scene: string;
    templateId: string;
    reason: string;
}
export declare const PREDEFINED_TEMPLATES: DesensitizationTemplate[];
export declare const SCENE_RECOMMENDATIONS: SceneRecommendation[];
/**
 * Get all predefined templates
 */
export declare function getPredefinedTemplates(): DesensitizationTemplate[];
/**
 * Get a template by ID
 */
export declare function getTemplateById(templateId: string): DesensitizationTemplate | undefined;
/**
 * Get template by privacy level
 */
export declare function getTemplateByLevel(level: PrivacyLevel): DesensitizationTemplate | undefined;
/**
 * Create a custom template
 */
export declare function createCustomTemplate(name: string, description: string, privacyLevel: PrivacyLevel, baseTemplateId?: string): DesensitizationTemplate;
/**
 * Get recommended template for a scene
 */
export declare function getRecommendedTemplateForScene(scene: string): DesensitizationTemplate | undefined;
/**
 * Get scene recommendation details
 */
export declare function getSceneRecommendation(scene: string): SceneRecommendation | undefined;
/**
 * Apply rules from a template to detections
 */
export declare function applyTemplateRules(template: DesensitizationTemplate, contentTypes: SensitiveType[]): Array<{
    contentType: SensitiveType;
    method: DesensitizationMethod;
    intensity: number;
}>;
/**
 * Validate a custom rule
 */
export declare function validateRule(rule: DesensitizationRule): {
    valid: boolean;
    errors: string[];
};
/**
 * Add entry to whitelist
 */
export declare function addToWhitelist(policy: PolicyConfiguration, entry: Omit<WhitelistEntry, 'id'>): PolicyConfiguration;
/**
 * Remove entry from whitelist
 */
export declare function removeFromWhitelist(policy: PolicyConfiguration, entryId: string): PolicyConfiguration;
/**
 * Check if content is whitelisted
 */
export declare function isWhitelisted(policy: PolicyConfiguration, contentType: SensitiveType, contentValue: string): boolean;
/**
 * Create default policy configuration
 */
export declare function createDefaultPolicy(userId: string): PolicyConfiguration;
/**
 * Update policy configuration
 */
export declare function updatePolicy(policy: PolicyConfiguration, updates: Partial<PolicyConfiguration>): PolicyConfiguration;
/**
 * Get effective rules for a policy (template rules + custom rules)
 */
export declare function getEffectiveRules(policy: PolicyConfiguration): DesensitizationRule[];
//# sourceMappingURL=desensitizationPolicy.d.ts.map