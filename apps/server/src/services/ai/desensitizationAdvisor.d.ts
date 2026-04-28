/**
 * AI Desensitization Advisor Service
 * Provides intelligent recommendations and suggestions for privacy desensitization
 */
import { PrivacyLevel, DesensitizationTemplate } from '../privacy/desensitizationPolicy';
import { DetectionResult, SensitiveType } from './sensitiveContentDetection';
export interface AIRecommendation {
    id: string;
    type: 'scene' | 'content' | 'privacy_level' | 'batch' | 'manual_review';
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    action: {
        type: 'apply_template' | 'adjust_intensity' | 'add_rule' | 'review_manual' | 'one_click';
        payload: Record<string, unknown>;
    };
    confidence: number;
}
export interface SceneBasedSuggestion {
    scene: string;
    confidence: number;
    recommendedTemplate: DesensitizationTemplate;
    reasoning: string[];
    suggestedIntensityAdjustments: Array<{
        contentType: SensitiveType;
        adjustment: number;
        reason: string;
    }>;
}
export interface PrivacyLevelSuggestion {
    currentLevel: PrivacyLevel;
    suggestedLevel: PrivacyLevel;
    reason: string;
    riskFactors: string[];
}
export interface BatchProcessingSuggestion {
    imagesCount: number;
    recommendedTemplateId: string;
    estimatedProcessingTime: number;
    commonDetections: Array<{
        type: SensitiveType;
        frequency: number;
    }>;
    canAutoProcess: boolean;
}
export interface HighlightedRegion {
    detection: DetectionResult;
    highlightReason: string;
    suggestedAction: 'desensitize' | 'review' | 'ignore';
    highlightColor: string;
}
/**
 * Generate comprehensive AI recommendations based on image analysis
 */
export declare function generateRecommendations(detections: DetectionResult[], scene?: string, userPreferences?: {
    preferredLevel?: PrivacyLevel;
    autoApply?: boolean;
}): AIRecommendation[];
/**
 * Generate one-click apply recommendation
 */
export declare function generateOneClickRecommendation(detections: DetectionResult[], scene?: string): AIRecommendation | null;
/**
 * Get highlighted regions with suggestions
 */
export declare function getHighlightedRegions(detections: DetectionResult[]): HighlightedRegion[];
/**
 * Generate batch processing suggestion
 */
export declare function generateBatchSuggestion(imageCount: number, allDetections: DetectionResult[][]): BatchProcessingSuggestion;
//# sourceMappingURL=desensitizationAdvisor.d.ts.map