/**
 * Extraction Feedback Service
 * 收集用户修正反馈并追踪提炼质量
 */
import { logger } from '../../utils/logger';
/**
 * Save extraction feedback
 */
export async function saveExtractionFeedback(extractionId, agentId, userId, scene, originalText, extractedData, userCorrections, confidenceBefore) {
    const fieldsCorrected = Object.keys(userCorrections);
    const correctionCount = fieldsCorrected.length;
    try {
        // In a real implementation, this would save to a dedicated table
        // For now, we'll log and return the feedback object
        const feedback = {
            id: `feedback-${Date.now()}`,
            extractionId,
            agentId,
            userId,
            scene,
            originalText,
            extractedData,
            userCorrections,
            confidenceBefore,
            fieldsCorrected,
            correctionCount,
            createdAt: new Date(),
        };
        logger.info('Extraction feedback saved', {
            extractionId,
            agentId,
            scene,
            correctionCount,
            fieldsCorrected,
        });
        // Store as few-shot example if corrections were made
        if (correctionCount > 0) {
            await storeFewShotExample(scene, originalText, userCorrections, 'medium');
        }
        return feedback;
    }
    catch (error) {
        logger.error('Failed to save extraction feedback', {
            error,
            extractionId,
            agentId,
        });
        throw error;
    }
}
/**
 * Store few-shot example for learning
 */
export async function storeFewShotExample(scene, text, extractedData, quality) {
    const example = {
        id: `example-${Date.now()}`,
        scene,
        text,
        extractedData,
        userConfirmed: quality === 'high',
        quality,
        usageCount: 0,
        createdAt: new Date(),
    };
    logger.info('Few-shot example stored', {
        scene,
        quality,
        dataKeys: Object.keys(extractedData),
    });
    return example;
}
/**
 * Get few-shot examples for a scene
 */
export async function getFewShotExamples(scene, limit = 5) {
    // In production, this would query from database
    // Return high-quality confirmed examples
    logger.info('Fetching few-shot examples', { scene, limit });
    // Placeholder: return empty array
    return [];
}
/**
 * Calculate extraction quality metrics
 */
export async function calculateQualityMetrics(scene, timeRange) {
    try {
        // In production, this would query from database
        // For now, return placeholder metrics
        const metrics = {
            totalExtractions: 0,
            confirmedExtractions: 0,
            rejectedExtractions: 0,
            averageConfidence: 0,
            averageCorrectionCount: 0,
            fieldAccuracy: {},
            extractionSuccessRate: 0,
        };
        logger.info('Quality metrics calculated', { scene, timeRange, metrics });
        return metrics;
    }
    catch (error) {
        logger.error('Failed to calculate quality metrics', { error, scene });
        throw error;
    }
}
/**
 * Get field accuracy statistics
 */
export async function getFieldAccuracyStats(scene, fieldId) {
    logger.info('Fetching field accuracy stats', { scene, fieldId });
    return {
        total: 0,
        correct: 0,
        accuracy: 0,
        commonErrors: [],
    };
}
/**
 * Update extraction with user confirmation
 */
export async function confirmExtraction(extractionId, userId, confirmedData) {
    logger.info('Extraction confirmed by user', {
        extractionId,
        userId,
        confirmedFields: Object.keys(confirmedData),
    });
    // In production, update extraction record in database
}
/**
 * Reject extraction and request re-extraction
 */
export async function rejectExtraction(extractionId, userId, reason) {
    logger.info('Extraction rejected by user', {
        extractionId,
        userId,
        reason,
    });
    // In production, mark extraction as rejected and log reason
}
/**
 * Get extraction statistics for dashboard
 */
export async function getExtractionStats(period = 'day') {
    logger.info('Fetching extraction stats', { period });
    return {
        extractionsByPeriod: {},
        averageConfidenceByPeriod: {},
        correctionRateByPeriod: {},
    };
}
//# sourceMappingURL=extractionFeedback.js.map