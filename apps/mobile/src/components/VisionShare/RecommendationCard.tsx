import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  TaskRecommendation,
  GeoCoordinates,
  TASK_TYPE_LABELS,
  calculateDistance,
} from '@bridgeai/shared';

interface RecommendationCardProps {
  recommendation: TaskRecommendation;
  userLocation: GeoCoordinates;
  onDismiss?: () => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  userLocation,
  onDismiss,
}) => {
  const navigation = useNavigation();
  const { task, matchScore, matchReasons, distanceKm } = recommendation;

  const handlePress = useCallback(() => {
    navigation.navigate('TaskDetail', { taskId: task.id });
  }, [navigation, task.id]);

  const handleAccept = useCallback(() => {
    navigation.navigate('AcceptTask', { taskId: task.id });
  }, [navigation, task.id]);

  const typeLabel = TASK_TYPE_LABELS[task.type]?.zh || task.type;

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#52C41A';
    if (score >= 60) return '#1890FF';
    if (score >= 40) return '#FAAD14';
    return '#FF4D4F';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return '非常匹配';
    if (score >= 60) return '很匹配';
    if (score >= 40) return '较匹配';
    return '一般匹配';
  };

  const formatDistance = (km: number): string => {
    if (km < 1) {
      return `${(km * 1000).toFixed(0)}m`;
    }
    return `${km.toFixed(1)}km`;
  };

  const scoreColor = getScoreColor(matchScore);
  const scoreLabel = getScoreLabel(matchScore);

  return (
    <View style={styles.container}>
      {/* Match Score Badge */}
      <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '15' }]}>
        <Text style={[styles.scoreValue, { color: scoreColor }]}>
          {matchScore}%
        </Text>
        <Text style={[styles.scoreLabel, { color: scoreColor }]}>
          {scoreLabel}
        </Text>
      </View>

      {/* Task Content */}
      <TouchableOpacity style={styles.content} onPress={handlePress} activeOpacity={0.8}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{typeLabel}</Text>
          </View>
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceText}>{formatDistance(distanceKm)}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {task.title}
        </Text>

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>
          {task.description}
        </Text>

        {/* Budget */}
        <Text style={styles.budget}>
          ¥{task.budgetMin} - ¥{task.budgetMax}
        </Text>

        {/* Publisher */}
        <View style={styles.publisherRow}>
          <Text style={styles.publisherName}>{task.publisherName}</Text>
          <View style={styles.creditBadge}>
            <Text style={styles.creditText}>信用 {task.publisherCreditScore}</Text>
          </View>
        </View>

        {/* Match Reasons */}
        <View style={styles.reasonsContainer}>
          {matchReasons.slice(0, 3).map((reason, index) => (
            <View key={index} style={styles.reasonItem}>
              <Text style={styles.reasonDot}>•</Text>
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
          <Text style={styles.dismissButtonText}>忽略</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
          <Text style={styles.acceptButtonText}>立即查看</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 6,
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  typeBadge: {
    backgroundColor: '#E6F7FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 12,
    color: '#1890FF',
    fontWeight: '500',
  },
  distanceBadge: {
    backgroundColor: '#F6FFED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#52C41A',
    fontWeight: '500',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 6,
    lineHeight: 22,
  },
  description: {
    fontSize: 13,
    color: '#595959',
    marginBottom: 10,
    lineHeight: 18,
  },
  budget: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF7A45',
    marginBottom: 10,
  },
  publisherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  publisherName: {
    fontSize: 14,
    color: '#262626',
    marginRight: 8,
  },
  creditBadge: {
    backgroundColor: '#FFF7E6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  creditText: {
    fontSize: 11,
    color: '#FA8C16',
  },
  reasonsContainer: {
    backgroundColor: '#F6FFED',
    padding: 10,
    borderRadius: 8,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  reasonDot: {
    fontSize: 12,
    color: '#52C41A',
    marginRight: 6,
  },
  reasonText: {
    fontSize: 12,
    color: '#52C41A',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    padding: 12,
    gap: 12,
  },
  dismissButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 14,
    color: '#8C8C8C',
    fontWeight: '500',
  },
  acceptButton: {
    flex: 2,
    paddingVertical: 10,
    backgroundColor: '#1890FF',
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
