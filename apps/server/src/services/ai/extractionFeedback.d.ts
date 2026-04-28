/**
 * Extraction Feedback Service
 * 收集用户修正反馈并追踪提炼质量
 */
import { L2Data } from '@bridgeai/shared';
export interface ExtractionFeedback {
    id: string;
    extractionId: string;
    agentId: string;
    userId: string;
    scene: string;
    originalText: string;
    extractedData: L2Data;
    userCorrections: L2Data;
    confidenceBefore: number;
    confidenceAfter?: number;
    fieldsCorrected: string[];
    correctionCount: number;
    createdAt: Date;
}
export interface ExtractionQualityMetrics {
    totalExtractions: number;
    confirmedExtractions: number;
    rejectedExtractions: number;
    averageConfidence: number;
    averageCorrectionCount: number;
    fieldAccuracy: Record<string, number>;
    extractionSuccessRate: number;
}
export interface FewShotExample {
    id: string;
    scene: string;
    text: string;
    extractedData: L2Data;
    userConfirmed: boolean;
    quality: 'high' | 'medium' | 'low';
    usageCount: number;
    createdAt: Date;
}
/**
 * Save extraction feedback
 */
export declare function saveExtractionFeedback(extractionId: string, agentId: string, userId: string, scene: string, originalText: string, extractedData: L2Data, userCorrections: L2Data, confidenceBefore: number): Promise<ExtractionFeedback>;
/**
 * Store few-shot example for learning
 */
export declare function storeFewShotExample(scene: string, text: string, extractedData: L2Data, quality: 'high' | 'medium' | 'low'): Promise<FewShotExample>;
/**
 * Get few-shot examples for a scene
 */
export declare function getFewShotExamples(scene: string, limit?: number): Promise<FewShotExample[]>;
/**
 * Calculate extraction quality metrics
 */
export declare function calculateQualityMetrics(scene?: string, timeRange?: {
    start: Date;
    end: Date;
}): Promise<ExtractionQualityMetrics>;
/**
 * Get field accuracy statistics
 */
export declare function getFieldAccuracyStats(scene: string, fieldId: string): Promise<{
    total: number;
    correct: number;
    accuracy: number;
    commonErrors: string[];
}>;
/**
 * Update extraction with user confirmation
 */
export declare function confirmExtraction(extractionId: string, userId: string, confirmedData: L2Data): Promise<void>;
/**
 * Reject extraction and request re-extraction
 */
export declare function rejectExtraction(extractionId: string, userId: string, reason?: string): Promise<void>;
/**
 * Get extraction statistics for dashboard
 */
export declare function getExtractionStats(period?: 'day' | 'week' | 'month'): Promise<{
    extractionsByPeriod: Record<string, number>;
    averageConfidenceByPeriod: Record<string, number>;
    correctionRateByPeriod: Record<string, number>;
}>;
//# sourceMappingURL=extractionFeedback.d.ts.map