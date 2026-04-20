/**
 * AI Desensitization Advisor Service
 * Provides intelligent recommendations and suggestions for privacy desensitization
 */

import { DesensitizationMethod } from '../image/desensitization';
import { PrivacyLevel, getRecommendedTemplateForScene, DesensitizationTemplate } from '../privacy/desensitizationPolicy';

import { DetectionResult, SensitiveType, getRiskLevel } from './sensitiveContentDetection';

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
  commonDetections: Array<{ type: SensitiveType; frequency: number }>;
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
export function generateRecommendations(
  detections: DetectionResult[],
  scene?: string,
  userPreferences?: {
    preferredLevel?: PrivacyLevel;
    autoApply?: boolean;
  }
): AIRecommendation[] {
  const recommendations: AIRecommendation[] = [];

  // Scene-based recommendation
  if (scene) {
    const sceneRec = generateSceneBasedRecommendation(scene, detections);
    if (sceneRec) {
      recommendations.push(sceneRec);
    }
  }

  // Content-based recommendations
  const contentRecs = generateContentBasedRecommendations(detections);
  recommendations.push(...contentRecs);

  // Privacy level recommendation
  const levelRec = generatePrivacyLevelRecommendation(detections, userPreferences?.preferredLevel);
  if (levelRec) {
    recommendations.push(levelRec);
  }

  // Manual review recommendation for critical cases
  const criticalRec = generateManualReviewRecommendation(detections);
  if (criticalRec) {
    recommendations.push(criticalRec);
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

/**
 * Generate scene-based recommendation
 */
function generateSceneBasedRecommendation(
  scene: string,
  detections: DetectionResult[]
): AIRecommendation | null {
  const template = getRecommendedTemplateForScene(scene);
  if (!template) return null;

  const reasoning: string[] = [];

  // Add scene-specific reasoning
  switch (scene) {
    case 'street':
      reasoning.push('Public street scene detected - multiple unknown individuals may be present');
      reasoning.push('Vehicle license plates are visible and should be protected');
      break;
    case 'office':
      reasoning.push('Workplace environment - consider corporate privacy policies');
      reasoning.push('Documents and screens may contain confidential information');
      break;
    case 'home':
      reasoning.push('Private residence - lower desensitization may be acceptable');
      reasoning.push('Consider family privacy preferences');
      break;
    case 'restaurant':
      reasoning.push('Social dining scene - background people should be protected');
      reasoning.push('Receipts or checks may contain payment information');
      break;
    case 'school':
      reasoning.push('Educational environment - strict child protection policies apply');
      reasoning.push('All minors should have faces protected');
      break;
    case 'hospital':
      reasoning.push('Healthcare setting - HIPAA-level privacy protection required');
      reasoning.push('Medical information is highly sensitive');
      break;
  }

  return {
    id: `rec-scene-${Date.now()}`,
    type: 'scene',
    priority: scene === 'hospital' || scene === 'school' ? 'critical' : 'medium',
    title: `Recommended for ${scene} scene`,
    description: reasoning.join('. ') + `. Using ${template.name}.`,
    action: {
      type: 'apply_template',
      payload: {
        templateId: template.id,
        scene,
        reasoning,
      },
    },
    confidence: 0.85,
  };
}

/**
 * Generate content-based recommendations
 */
function generateContentBasedRecommendations(detections: DetectionResult[]): AIRecommendation[] {
  const recommendations: AIRecommendation[] = [];

  const faces = detections.filter((d) => d.type === 'face');
  const plates = detections.filter((d) => d.type === 'license_plate');
  const addresses = detections.filter((d) => d.type === 'address');
  const codes = detections.filter((d) => d.type === 'qr_code' || d.type === 'barcode');

  // Face recommendation
  if (faces.length > 0) {
    recommendations.push({
      id: `rec-faces-${Date.now()}`,
      type: 'content',
      priority: faces.length > 3 ? 'high' : 'medium',
      title: `${faces.length} face(s) detected`,
      description:
        faces.length > 3
          ? 'Multiple faces detected. Auto-desensitization recommended for all faces.'
          : 'Individual faces detected. Consider manual review for consent verification.',
      action: {
        type: 'adjust_intensity',
        payload: {
          contentType: 'face',
          intensity: faces.length > 3 ? 85 : 75,
          method: 'blur',
        },
      },
      confidence: faces.length > 0 ? 0.9 : 0.7,
    });
  }

  // License plate recommendation
  if (plates.length > 0) {
    recommendations.push({
      id: `rec-plates-${Date.now()}`,
      type: 'content',
      priority: 'high',
      title: `${plates.length} license plate(s) detected`,
      description: 'Vehicle registration information detected. Strong desensitization recommended.',
      action: {
        type: 'adjust_intensity',
        payload: {
          contentType: 'license_plate',
          intensity: 90,
          method: 'mosaic',
        },
      },
      confidence: 0.92,
    });
  }

  // Address recommendation
  if (addresses.length > 0) {
    recommendations.push({
      id: `rec-address-${Date.now()}`,
      type: 'content',
      priority: 'high',
      title: 'Location information detected',
      description: 'Street addresses or location identifiers found. Consider precision reduction.',
      action: {
        type: 'adjust_intensity',
        payload: {
          contentType: 'address',
          intensity: 85,
          method: 'pixelate',
        },
      },
      confidence: 0.88,
    });
  }

  // QR code / barcode recommendation
  if (codes.length > 0) {
    recommendations.push({
      id: `rec-codes-${Date.now()}`,
      type: 'content',
      priority: 'medium',
      title: `${codes.length} code(s) detected`,
      description: 'QR codes or barcodes may contain encoded sensitive data.',
      action: {
        type: 'adjust_intensity',
        payload: {
          contentType: 'qr_code',
          intensity: 80,
          method: 'mosaic',
        },
      },
      confidence: 0.75,
    });
  }

  return recommendations;
}

/**
 * Generate privacy level recommendation
 */
function generatePrivacyLevelRecommendation(
  detections: DetectionResult[],
  currentLevel?: PrivacyLevel
): AIRecommendation | null {
  const riskScore = calculateRiskScore(detections);
  const suggestedLevel = scoreToPrivacyLevel(riskScore);

  if (currentLevel && currentLevel === suggestedLevel) {
    return null;
  }

  const riskFactors: string[] = [];

  if (detections.some((d) => d.type === 'face' && d.confidence > 0.9)) {
    riskFactors.push('High-confidence face detection');
  }
  if (detections.some((d) => d.type === 'license_plate')) {
    riskFactors.push('Vehicle identification present');
  }
  if (detections.some((d) => d.type === 'address')) {
    riskFactors.push('Location data exposed');
  }
  if (detections.length > 5) {
    riskFactors.push('Multiple sensitive elements');
  }

  return {
    id: `rec-level-${Date.now()}`,
    type: 'privacy_level',
    priority: riskScore > 70 ? 'high' : 'medium',
    title: `Privacy level recommendation: ${suggestedLevel}`,
    description: `Based on ${detections.length} detection(s), ${suggestedLevel} privacy protection is recommended.`,
    action: {
      type: 'apply_template',
      payload: {
        privacyLevel: suggestedLevel,
        riskScore,
        riskFactors,
      },
    },
    confidence: Math.min(0.95, 0.6 + riskScore / 200),
  };
}

/**
 * Generate manual review recommendation for critical cases
 */
function generateManualReviewRecommendation(detections: DetectionResult[]): AIRecommendation | null {
  const criticalDetections = detections.filter(
    (d) =>
      (d.type === 'face' && d.confidence > 0.95) ||
      (d.type === 'sensitive_object' && d.confidence > 0.9)
  );

  if (criticalDetections.length === 0) return null;

  return {
    id: `rec-review-${Date.now()}`,
    type: 'manual_review',
    priority: 'critical',
    title: 'Manual review recommended',
    description: `${criticalDetections.length} high-confidence sensitive detection(s) require manual verification.`,
    action: {
      type: 'review_manual',
      payload: {
        detections: criticalDetections.map((d) => ({
          type: d.type,
          confidence: d.confidence,
          boundingBox: d.boundingBox,
        })),
      },
    },
    confidence: 0.98,
  };
}

/**
 * Generate one-click apply recommendation
 */
export function generateOneClickRecommendation(
  detections: DetectionResult[],
  scene?: string
): AIRecommendation | null {
  const recommendations = generateRecommendations(detections, scene);

  if (recommendations.length === 0) return null;

  // Find the highest priority template-based recommendation
  const templateRec = recommendations.find((r) => r.action.type === 'apply_template');
  const contentRecs = recommendations.filter((r) => r.action.type === 'adjust_intensity');

  return {
    id: `rec-oneclick-${Date.now()}`,
    type: 'content',
    priority: 'high',
    title: 'One-click apply recommended settings',
    description: `Apply ${templateRec?.title || 'recommended'} settings with ${contentRecs.length} content-specific adjustments.`,
    action: {
      type: 'one_click',
      payload: {
        templateId: templateRec?.action.payload.templateId,
        adjustments: contentRecs.map((r) => r.action.payload),
      },
    },
    confidence: 0.85,
  };
}

/**
 * Get highlighted regions with suggestions
 */
export function getHighlightedRegions(detections: DetectionResult[]): HighlightedRegion[] {
  return detections.map((detection) => {
    let highlightReason: string;
    let suggestedAction: 'desensitize' | 'review' | 'ignore';
    let highlightColor: string;

    switch (detection.type) {
      case 'face':
        highlightReason =
          detection.confidence > 0.9
            ? 'High-confidence face - auto-desensitize recommended'
            : 'Possible face - review recommended';
        suggestedAction = detection.confidence > 0.9 ? 'desensitize' : 'review';
        highlightColor = detection.confidence > 0.9 ? '#ff4444' : '#ffaa00';
        break;
      case 'license_plate':
        highlightReason = 'Vehicle registration - must be desensitized';
        suggestedAction = 'desensitize';
        highlightColor = '#ff0000';
        break;
      case 'address':
        highlightReason = 'Location information - consider desensitizing';
        suggestedAction = 'desensitize';
        highlightColor = '#ff6600';
        break;
      case 'sensitive_object':
        highlightReason = 'Sensitive object detected';
        suggestedAction = 'review';
        highlightColor = '#aa00ff';
        break;
      default:
        highlightReason = 'Sensitive content detected';
        suggestedAction = 'review';
        highlightColor = '#666666';
    }

    return {
      detection,
      highlightReason,
      suggestedAction,
      highlightColor,
    };
  });
}

/**
 * Generate batch processing suggestion
 */
export function generateBatchSuggestion(
  imageCount: number,
  allDetections: DetectionResult[][]
): BatchProcessingSuggestion {
  // Flatten all detections
  const flatDetections = allDetections.flat();

  // Count frequency of each type
  const typeCounts = new Map<SensitiveType, number>();
  for (const detection of flatDetections) {
    typeCounts.set(detection.type, (typeCounts.get(detection.type) || 0) + 1);
  }

  // Sort by frequency
  const commonDetections = Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => ({
      type,
      frequency: count / imageCount,
    }));

  // Determine if auto-processing is safe
  const canAutoProcess =
    flatDetections.length > 0 &&
    flatDetections.every((d) => d.confidence > 0.7) &&
    !flatDetections.some((d) => d.type === 'sensitive_object' && d.confidence > 0.95);

  // Recommend template based on most common detections
  let recommendedTemplateId = 'template-standard';
  if (commonDetections.some((d) => d.type === 'face' && d.frequency > 0.5)) {
    recommendedTemplateId = 'template-strict';
  } else if (commonDetections.length === 0) {
    recommendedTemplateId = 'template-relaxed';
  }

  // Estimate processing time (rough estimate: 500ms per image)
  const estimatedProcessingTime = imageCount * 500;

  return {
    imagesCount: imageCount,
    recommendedTemplateId,
    estimatedProcessingTime,
    commonDetections,
    canAutoProcess,
  };
}

/**
 * Calculate risk score from detections
 */
function calculateRiskScore(detections: DetectionResult[]): number {
  if (detections.length === 0) return 0;

  const weights: Record<SensitiveType, number> = {
    face: 0.9,
    license_plate: 0.8,
    address: 0.85,
    text: 0.5,
    sensitive_object: 0.75,
    qr_code: 0.6,
    barcode: 0.4,
  };

  let totalScore = 0;
  for (const detection of detections) {
    totalScore += (weights[detection.type] || 0.5) * detection.confidence * 100;
  }

  return Math.min(100, Math.round(totalScore / Math.max(1, detections.length)));
}

/**
 * Convert risk score to privacy level
 */
function scoreToPrivacyLevel(score: number): PrivacyLevel {
  if (score < 30) return 'relaxed';
  if (score < 70) return 'standard';
  return 'strict';
}
