/**
 * MatchScore Component
 * 匹配度分数展示组件
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

export interface MatchDimensionData {
  name: string;
  score: number;
  weight: number;
}

export interface MatchScoreProps {
  score: number;
  level: 'poor' | 'fair' | 'good' | 'excellent';
  l1Score: number;
  l2Score: number;
  l3Score: number;
  dimensions: MatchDimensionData[];
  explanation: string;
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

const getLevelColor = (level: string): string => {
  switch (level) {
    case 'excellent':
      return '#10B981'; // green-500
    case 'good':
      return '#3B82F6'; // blue-500
    case 'fair':
      return '#F59E0B'; // amber-500
    case 'poor':
      return '#EF4444'; // red-500
    default:
      return '#6B7280'; // gray-500
  }
};

const getLevelText = (level: string): string => {
  switch (level) {
    case 'excellent':
      return '极佳匹配';
    case 'good':
      return '良好匹配';
    case 'fair':
      return '一般匹配';
    case 'poor':
      return '匹配度低';
    default:
      return '未知';
  }
};

export const MatchScore: React.FC<MatchScoreProps> = ({
  score,
  level,
  l1Score,
  l2Score,
  l3Score,
  dimensions,
  explanation,
  showDetails = true,
  size = 'medium',
  style,
}) => {
  const color = getLevelColor(level);
  const percentage = Math.round(score * 100);

  const sizeStyles = {
    small: { fontSize: 24, circleSize: 60, strokeWidth: 4 },
    medium: { fontSize: 36, circleSize: 100, strokeWidth: 6 },
    large: { fontSize: 48, circleSize: 140, strokeWidth: 8 },
  }[size];

  // 计算圆环进度
  const circumference = 2 * Math.PI * (sizeStyles.circleSize / 2 - sizeStyles.strokeWidth);
  const strokeDashoffset = circumference - (score * circumference);

  return (
    <View style={[styles.container, style]}>
      {/* 主分数展示 */}
      <View style={styles.scoreContainer}>
        <View
          style={[
            styles.scoreCircle,
            {
              width: sizeStyles.circleSize,
              height: sizeStyles.circleSize,
              borderColor: color,
              borderWidth: sizeStyles.strokeWidth,
            },
          ]}
        >
          <Text style={[styles.scoreText, { fontSize: sizeStyles.fontSize, color }]}>
            {percentage}%
          </Text>
        </View>
        <Text style={[styles.levelText, { color }]}>{getLevelText(level)}</Text>
      </View>

      {/* 分层分数 */}
      {showDetails && (
        <View style={styles.detailsContainer}>
          <View style={styles.layerScores}>
            <View style={styles.layerItem}>
              <Text style={styles.layerLabel}>L1</Text>
              <Text style={styles.layerValue}>{Math.round(l1Score * 100)}%</Text>
              <Text style={styles.layerDesc}>基础属性</Text>
            </View>
            <View style={styles.layerItem}>
              <Text style={styles.layerLabel}>L2</Text>
              <Text style={styles.layerValue}>{Math.round(l2Score * 100)}%</Text>
              <Text style={styles.layerDesc}>结构化</Text>
            </View>
            <View style={styles.layerItem}>
              <Text style={styles.layerLabel}>L3</Text>
              <Text style={styles.layerValue}>{Math.round(l3Score * 100)}%</Text>
              <Text style={styles.layerDesc}>语义</Text>
            </View>
          </View>

          {/* 维度雷达图区域 */}
          <View style={styles.dimensionsContainer}>
            <Text style={styles.dimensionsTitle}>匹配维度</Text>
            {dimensions.map((dim, index) => (
              <View key={index} style={styles.dimensionRow}>
                <Text style={styles.dimensionName}>{dim.name}</Text>
                <View style={styles.dimensionBar}>
                  <View
                    style={[
                      styles.dimensionFill,
                      {
                        width: `${dim.score * 100}%`,
                        backgroundColor: dim.score > 0.7 ? '#10B981' : dim.score > 0.4 ? '#F59E0B' : '#EF4444',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.dimensionScore}>{Math.round(dim.score * 100)}%</Text>
              </View>
            ))}
          </View>

          {/* 匹配解释 */}
          <View style={styles.explanationContainer}>
            <Text style={styles.explanationTitle}>匹配分析</Text>
            <Text style={styles.explanationText}>{explanation}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
  scoreText: {
    fontWeight: 'bold',
  },
  levelText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  layerScores: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  layerItem: {
    alignItems: 'center',
  },
  layerLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  layerValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  layerDesc: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  dimensionsContainer: {
    marginBottom: 16,
  },
  dimensionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  dimensionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dimensionName: {
    width: 80,
    fontSize: 12,
    color: '#6B7280',
  },
  dimensionBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  dimensionFill: {
    height: '100%',
    borderRadius: 4,
  },
  dimensionScore: {
    width: 40,
    fontSize: 12,
    color: '#374151',
    textAlign: 'right',
  },
  explanationContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});

export default MatchScore;
