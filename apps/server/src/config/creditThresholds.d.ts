/**
 * Credit Threshold Configuration
 * 信用门槛配置
 */
import { CreditLevel } from '@bridgeai/shared';
export interface SceneCreditThreshold {
    sceneId: string;
    sceneName: string;
    minCreditScore: number;
    minCreditLevel: CreditLevel;
    description?: string;
    isActive: boolean;
    exemptions: ExemptionRule[];
    notifications: NotificationConfig;
}
export interface ExemptionRule {
    id: string;
    name: string;
    type: 'user' | 'agent' | 'promotion' | 'manual';
    targetIds?: string[];
    creditScoreOverride?: number;
    validUntil?: Date;
    reason?: string;
    grantedBy?: string;
}
export interface NotificationConfig {
    enabled: boolean;
    notifyOnThresholdChange: boolean;
    notifyOnExemption: boolean;
    notifyOnInsufficient: boolean;
    channels: ('in_app' | 'email' | 'sms')[];
}
/**
 * Default credit thresholds by scene
 */
export declare const DEFAULT_SCENE_THRESHOLDS: Record<string, SceneCreditThreshold>;
/**
 * Reset scene thresholds to defaults (for testing)
 */
export declare function resetSceneThresholds(): void;
/**
 * Get credit threshold for a scene
 */
export declare function getSceneThreshold(sceneId: string): SceneCreditThreshold | undefined;
/**
 * Get all scene thresholds
 */
export declare function getAllSceneThresholds(): SceneCreditThreshold[];
/**
 * Update scene threshold
 */
export declare function updateSceneThreshold(sceneId: string, updates: Partial<Omit<SceneCreditThreshold, 'sceneId' | 'sceneName'>>): SceneCreditThreshold | undefined;
/**
 * Add exemption rule
 */
export declare function addExemptionRule(sceneId: string, rule: Omit<ExemptionRule, 'id'>): ExemptionRule | null;
/**
 * Remove exemption rule
 */
export declare function removeExemptionRule(sceneId: string, ruleId: string): boolean;
/**
 * Check if user is exempted
 */
export declare function isUserExempted(sceneId: string, userId: string, agentId?: string): {
    exempted: boolean;
    rule?: ExemptionRule;
};
/**
 * Check if credit score meets scene threshold
 */
export declare function checkSceneCreditThreshold(sceneId: string, creditScore: number | null | undefined, userId: string, agentId?: string): {
    meetsThreshold: boolean;
    requiredScore: number;
    requiredLevel: CreditLevel;
    exempted: boolean;
    exemptionRule?: ExemptionRule;
};
/**
 * Get threshold change notification message
 */
export declare function getThresholdChangeNotification(sceneId: string, oldThreshold: number, newThreshold: number): {
    title: string;
    message: string;
};
/**
 * Get insufficient credit notification
 */
export declare function getInsufficientCreditNotification(sceneId: string, currentScore: number | null, requiredScore: number): {
    title: string;
    message: string;
};
//# sourceMappingURL=creditThresholds.d.ts.map