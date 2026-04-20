/**
 * Extraction Feedback Service
 * 收集用户修正反馈并追踪提炼质量
 */

import { L2Data } from '@bridgeai/shared';

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';

// Feedback record
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

// Quality metrics
export interface ExtractionQualityMetrics {
  totalExtractions: number;
  confirmedExtractions: number;
  rejectedExtractions: number;
  averageConfidence: number;
  averageCorrectionCount: number;
  fieldAccuracy: Record<string, number>; // field -> accuracy percentage
  extractionSuccessRate: number;
}

// Few-shot example
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
export async function saveExtractionFeedback(
  extractionId: string,
  agentId: string,
  userId: string,
  scene: string,
  originalText: string,
  extractedData: L2Data,
  userCorrections: L2Data,
  confidenceBefore: number
): Promise<ExtractionFeedback> {
  const fieldsCorrected = Object.keys(userCorrections);
  const correctionCount = fieldsCorrected.length;

  try {
    // In a real implementation, this would save to a dedicated table
    // For now, we'll log and return the feedback object
    const feedback: ExtractionFeedback = {
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
  } catch (error) {
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
export async function storeFewShotExample(
  scene: string,
  text: string,
  extractedData: L2Data,
  quality: 'high' | 'medium' | 'low'
): Promise<FewShotExample> {
  const example: FewShotExample = {
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
export async function getFewShotExamples(
  scene: string,
  limit: number = 5
): Promise<FewShotExample[]> {
  // In production, this would query from database
  // Return high-quality confirmed examples
  logger.info('Fetching few-shot examples', { scene, limit });

  // Placeholder: return empty array
  return [];
}

/**
 * Calculate extraction quality metrics
 */
export async function calculateQualityMetrics(
  scene?: string,
  timeRange?: { start: Date; end: Date }
): Promise<ExtractionQualityMetrics> {
  try {
    // In production, this would query from database
    // For now, return placeholder metrics

    const metrics: ExtractionQualityMetrics = {
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
  } catch (error) {
    logger.error('Failed to calculate quality metrics', { error, scene });
    throw error;
  }
}

/**
 * Get field accuracy statistics
 */
export async function getFieldAccuracyStats(
  scene: string,
  fieldId: string
): Promise<{
  total: number;
  correct: number;
  accuracy: number;
  commonErrors: string[];
}> {
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
export async function confirmExtraction(
  extractionId: string,
  userId: string,
  confirmedData: L2Data
): Promise<void> {
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
export async function rejectExtraction(
  extractionId: string,
  userId: string,
  reason?: string
): Promise<void> {
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
export async function getExtractionStats(
  period: 'day' | 'week' | 'month' = 'day'
): Promise<{
  extractionsByPeriod: Record<string, number>;
  averageConfidenceByPeriod: Record<string, number>;
  correctionRateByPeriod: Record<string, number>;
}> {
  logger.info('Fetching extraction stats', { period });

  return {
    extractionsByPeriod: {},
    averageConfidenceByPeriod: {},
    correctionRateByPeriod: {},
  };
}
