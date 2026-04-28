/**
 * MatchCard Component
 * 匹配推荐卡片组件 - 展示单个匹配对象的匹配度和亮点
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

// 匹配数据接口
export interface MatchCardData {
  profileId: string;
  agentId: string;
  totalScore: number;
  highlights: string[];
  warnings: string[];
  dimensions?: {
    dimension: string;
    score: number;
  }[];
}

interface MatchCardProps {
  match: MatchCardData;
  onPress?: (match: MatchCardData) => void;
  onLike?: (match: MatchCardData) => void;
  onSkip?: (match: MatchCardData) => void;
  compact?: boolean;
}

const MatchCard: React.FC<MatchCardProps> = ({
  match,
  onPress,
  onLike,
  onSkip,
  compact = false,
}) => {
  const scoreColor =
    match.totalScore >= 80 ? '#4CAF50' : match.totalScore >= 60 ? '#FF9800' : '#9E9E9E';

  const scoreLabel =
    match.totalScore >= 80
      ? '极佳匹配'
      : match.totalScore >= 60
        ? '不错匹配'
        : match.totalScore >= 40
          ? '一般匹配'
          : '低匹配';

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.compactCard]}
      onPress={() => onPress?.(match)}
      activeOpacity={0.8}
    >
      {/* 头部：匹配度分数 */}
      <View style={styles.header}>
        <View style={styles.scoreContainer}>
          <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreText, { color: scoreColor }]}>{match.totalScore}</Text>
          </View>
          <Text style={styles.scoreLabel}>{scoreLabel}</Text>
        </View>
        {!compact && match.highlights.length > 0 && (
          <View style={styles.highlightTags}>
            {match.highlights.slice(0, 3).map((h, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{h}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 维度条 */}
      {!compact && match.dimensions && match.dimensions.length > 0 && (
        <View style={styles.dimensionsContainer}>
          {match.dimensions.slice(0, 4).map((dim, i) => (
            <View key={i} style={styles.dimensionRow}>
              <Text style={styles.dimensionLabel}>{getDimensionLabel(dim.dimension)}</Text>
              <View style={styles.dimensionBar}>
                <View
                  style={[
                    styles.dimensionFill,
                    {
                      width: `${dim.score}%`,
                      backgroundColor:
                        dim.score >= 70 ? '#4CAF50' : dim.score >= 50 ? '#FF9800' : '#F44336',
                    },
                  ]}
                />
              </View>
              <Text style={styles.dimensionScore}>{dim.score}%</Text>
            </View>
          ))}
        </View>
      )}

      {/* 操作按钮 */}
      {!compact && (onLike || onSkip) && (
        <View style={styles.actions}>
          {onSkip && (
            <TouchableOpacity
              style={[styles.actionButton, styles.skipButton]}
              onPress={() => onSkip(match)}
            >
              <Text style={styles.skipButtonText}>跳过</Text>
            </TouchableOpacity>
          )}
          {onLike && (
            <TouchableOpacity
              style={[styles.actionButton, styles.likeButton]}
              onPress={() => onLike(match)}
            >
              <Text style={styles.likeButtonText}>感兴趣</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

function getDimensionLabel(dimension: string): string {
  const labels: Record<string, string> = {
    basicConditions: '基础条件',
    personality: '性格',
    interests: '兴趣',
    lifestyle: '生活方式',
    expectations: '关系期望',
    complementary: '互补性',
    geoProximity: '地理位置',
  };
  return labels[dimension] ?? dimension;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  compactCard: {
    padding: 12,
    marginHorizontal: 0,
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  highlightTags: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 4,
  },
  tag: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 4,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#1976D2',
  },
  dimensionsContainer: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  dimensionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dimensionLabel: {
    width: 70,
    fontSize: 12,
    color: '#666',
  },
  dimensionBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    marginHorizontal: 8,
  },
  dimensionFill: {
    height: 6,
    borderRadius: 3,
  },
  dimensionScore: {
    width: 36,
    fontSize: 12,
    color: '#333',
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  skipButton: {
    backgroundColor: '#f5f5f5',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 14,
  },
  likeButton: {
    backgroundColor: '#007AFF',
  },
  likeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MatchCard;
