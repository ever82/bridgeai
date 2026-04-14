import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

interface Detection {
  id: string;
  type: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface AIRecommendation {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  action: {
    type: string;
    payload: Record<string, unknown>;
  };
  confidence: number;
}

interface AIRecommendationsProps {
  detections: Detection[];
  onApply: (recommendation: AIRecommendation) => void;
  onDismiss: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#FF4444',
  high: '#FF8800',
  medium: '#FFCC00',
  low: '#888888',
};

const PRIORITY_ICONS: Record<string, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '⚪',
};

export const AIRecommendations: React.FC<AIRecommendationsProps> = ({
  detections,
  onApply,
  onDismiss,
}) => {
  // Generate recommendations based on detections
  const recommendations = generateRecommendations(detections);

  if (recommendations.length === 0) return null;

  // Group by priority
  const criticalRecs = recommendations.filter((r) => r.priority === 'critical');
  const highRecs = recommendations.filter((r) => r.priority === 'high');
  const otherRecs = recommendations.filter((r) => r.priority !== 'critical' && r.priority !== 'high');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🤖 AI Recommendations</Text>
        <TouchableOpacity onPress={onDismiss}>
          <Text style={styles.dismissButton}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* One-Click Apply */}
        {recommendations.length > 0 && (
          <TouchableOpacity
            style={styles.oneClickButton}
            onPress={() => onApply(recommendations[0])}
          >
            <Text style={styles.oneClickIcon}>✨</Text>
            <View style={styles.oneClickText}>
              <Text style={styles.oneClickTitle}>Apply Recommended Settings</Text>
              <Text style={styles.oneClickSubtitle}>
                {recommendations.length} optimizations suggested
              </Text>
            </View>
            <Text style={styles.oneClickArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Critical Recommendations */}
        {criticalRecs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: PRIORITY_COLORS.critical }]}>
              Critical ({criticalRecs.length})
            </Text>
            {criticalRecs.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onApply={onApply}
              />
            ))}
          </View>
        )}

        {/* High Priority Recommendations */}
        {highRecs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: PRIORITY_COLORS.high }]}>
              High Priority ({highRecs.length})
            </Text>
            {highRecs.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onApply={onApply}
              />
            ))}
          </View>
        )}

        {/* Other Recommendations */}
        {otherRecs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: PRIORITY_COLORS.medium }]}>
              Suggestions ({otherRecs.length})
            </Text>
            {otherRecs.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onApply={onApply}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

interface RecommendationCardProps {
  recommendation: AIRecommendation;
  onApply: (recommendation: AIRecommendation) => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onApply,
}) => {
  const color = PRIORITY_COLORS[recommendation.priority];
  const icon = PRIORITY_ICONS[recommendation.priority];

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: color }]}
      onPress={() => onApply(recommendation)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{icon}</Text>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {recommendation.title}
        </Text>
        <Text style={[styles.cardConfidence, { color }]}>
          {Math.round(recommendation.confidence * 100)}%
        </Text>
      </View>
      <Text style={styles.cardDescription} numberOfLines={2}>
        {recommendation.description}
      </Text>
      <View style={styles.cardAction}>
        <Text style={[styles.cardActionText, { color }]}>
          {getActionLabel(recommendation.action.type)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const getActionLabel = (actionType: string): string => {
  const labels: Record<string, string> = {
    apply_template: 'Apply Template',
    adjust_intensity: 'Adjust Settings',
    add_rule: 'Add Rule',
    review_manual: 'Review Manually',
    one_click: 'Apply All',
  };
  return labels[actionType] || 'Apply';
};

const generateRecommendations = (detections: Detection[]): AIRecommendation[] => {
  const recommendations: AIRecommendation[] = [];

  // Scene-based recommendation
  recommendations.push({
    id: 'rec-1',
    type: 'scene',
    priority: 'medium',
    title: 'Street Scene Detected',
    description: 'Public area with multiple faces and a license plate. Standard privacy protection recommended.',
    action: {
      type: 'apply_template',
      payload: { templateId: 'template-standard' },
    },
    confidence: 0.85,
  });

  // Face recommendations
  const faces = detections.filter((d) => d.type === 'face');
  if (faces.length > 0) {
    recommendations.push({
      id: 'rec-face',
      type: 'content',
      priority: faces.length > 2 ? 'high' : 'medium',
      title: `${faces.length} Face(s) Detected`,
      description:
        faces.length > 2
          ? 'Multiple faces found. Auto-blur recommended for privacy protection.'
          : 'Individual face detected. 80% blur intensity suggested.',
      action: {
        type: 'adjust_intensity',
        payload: { contentType: 'face', method: 'blur', intensity: 80 },
      },
      confidence: 0.92,
    });
  }

  // License plate recommendation
  const plates = detections.filter((d) => d.type === 'license_plate');
  if (plates.length > 0) {
    recommendations.push({
      id: 'rec-plate',
      type: 'content',
      priority: 'high',
      title: 'License Plate Detected',
      description: 'Vehicle registration visible. Mosaic effect at 90% intensity recommended.',
      action: {
        type: 'adjust_intensity',
        payload: { contentType: 'license_plate', method: 'mosaic', intensity: 90 },
      },
      confidence: 0.94,
    });
  }

  // Text recommendation
  const texts = detections.filter((d) => d.type === 'text');
  if (texts.length > 0) {
    recommendations.push({
      id: 'rec-text',
      type: 'content',
      priority: 'medium',
      title: 'Text Content Detected',
      description: 'Written content found in image. Consider light blur for privacy.',
      action: {
        type: 'adjust_intensity',
        payload: { contentType: 'text', method: 'blur', intensity: 60 },
      },
      confidence: 0.78,
    });
  }

  // Privacy level recommendation
  const riskScore = calculateRiskScore(detections);
  if (riskScore > 70) {
    recommendations.push({
      id: 'rec-level',
      type: 'privacy_level',
      priority: 'high',
      title: 'High Privacy Risk',
      description: `Risk score: ${riskScore}/100. Strict privacy protection recommended.`,
      action: {
        type: 'apply_template',
        payload: { privacyLevel: 'strict', riskScore },
      },
      confidence: 0.88,
    });
  }

  return recommendations;
};

const calculateRiskScore = (detections: Detection[]): number => {
  const weights: Record<string, number> = {
    face: 0.9,
    license_plate: 0.8,
    text: 0.5,
    address: 0.85,
  };

  let totalScore = 0;
  for (const detection of detections) {
    totalScore += (weights[detection.type] || 0.5) * detection.confidence * 100;
  }

  return Math.min(100, Math.round(totalScore / Math.max(1, detections.length)));
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  dismissButton: {
    fontSize: 18,
    color: '#888',
    padding: 4,
  },
  scrollView: {
    maxHeight: 400,
  },
  oneClickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    padding: 16,
    backgroundColor: '#007AFF',
    borderRadius: 10,
  },
  oneClickIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  oneClickText: {
    flex: 1,
  },
  oneClickTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  oneClickSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  oneClickArrow: {
    fontSize: 20,
    color: '#fff',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginHorizontal: 12,
    marginVertical: 8,
  },
  card: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#333',
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  cardConfidence: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardDescription: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 6,
    lineHeight: 18,
  },
  cardAction: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AIRecommendations;
