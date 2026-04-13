import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AgentCreditInfo } from '@visionshare/shared';

interface CreditBadgeProps {
  credit: AgentCreditInfo;
  size?: 'small' | 'medium' | 'large';
  showTrend?: boolean;
  showLevel?: boolean;
  onPress?: () => void;
}

/**
 * CreditBadge Component
 * Displays agent credit score, level, and trend
 */
export const CreditBadge: React.FC<CreditBadgeProps> = ({
  credit,
  size = 'medium',
  showTrend = true,
  showLevel = true,
  onPress,
}) => {
  const getLevelColor = (level: number): string => {
    const colors: Record<number, string> = {
      5: '#4CAF50', // Excellent
      4: '#8BC34A', // Good
      3: '#FFC107', // Fair
      2: '#FF9800', // Poor
      1: '#F44336', // Bad
    };
    return colors[level] || '#9E9E9E';
  };

  const getLevelLabel = (level: number): string => {
    const labels: Record<number, string> = {
      5: '极好',
      4: '优秀',
      3: '良好',
      2: '一般',
      1: '待提升',
    };
    return labels[level] || '未知';
  };

  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      default:
        return '→';
    }
  };

  const getTrendColor = (trend: string): string => {
    switch (trend) {
      case 'up':
        return '#4CAF50';
      case 'down':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const sizeStyles = {
    small: {
      container: styles.smallContainer,
      score: styles.smallScore,
      level: styles.smallLevel,
      trend: styles.smallTrend,
    },
    medium: {
      container: styles.mediumContainer,
      score: styles.mediumScore,
      level: styles.mediumLevel,
      trend: styles.mediumTrend,
    },
    large: {
      container: styles.largeContainer,
      score: styles.largeScore,
      level: styles.largeLevel,
      trend: styles.largeTrend,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.container,
        currentSize.container,
        { borderColor: getLevelColor(credit.level) },
      ]}
    >
      <View style={styles.scoreSection}>
        <Text style={[styles.score, currentSize.score]}>{credit.score}</Text>
        <Text style={styles.scoreLabel}>信用分</Text>
      </View>

      {showLevel && (
        <View style={styles.levelSection}>
          <View
            style={[
              styles.levelBadge,
              { backgroundColor: getLevelColor(credit.level) },
            ]}
          >
            <Text style={[styles.levelText, currentSize.level]}>
              LV.{credit.level}
            </Text>
          </View>
          <Text style={styles.levelLabel}>{getLevelLabel(credit.level)}</Text>
        </View>
      )}

      {showTrend && (
        <View style={styles.trendSection}>
          <Text
            style={[
              styles.trendIcon,
              currentSize.trend,
              { color: getTrendColor(credit.trend) },
            ]}
          >
            {getTrendIcon(credit.trend)}
          </Text>
          <Text style={[styles.trendLabel, { color: getTrendColor(credit.trend) }]}>
            {credit.trend === 'up' && '上升'}
            {credit.trend === 'down' && '下降'}
            {credit.trend === 'stable' && '平稳'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

/**
 * CreditTrendChart Component
 * Displays credit score history trend
 */
interface CreditTrendChartProps {
  history: AgentCreditInfo['history'];
  height?: number;
}

export const CreditTrendChart: React.FC<CreditTrendChartProps> = ({
  history,
  height = 60,
}) => {
  if (!history || history.length === 0) {
    return (
      <View style={[styles.chartContainer, { height }]}>
        <Text style={styles.noDataText}>暂无历史数据</Text>
      </View>
    );
  }

  const scores = history.map((h) => h.score);
  const minScore = Math.min(...scores) - 50;
  const maxScore = Math.max(...scores) + 50;
  const scoreRange = maxScore - minScore || 1;

  const points = history.map((item, index) => {
    const x = (index / (history.length - 1)) * 100;
    const y = 100 - ((item.score - minScore) / scoreRange) * 100;
    return { x, y, score: item.score, date: item.date };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <View style={[styles.chartContainer, { height }]}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="#E0E0E0"
            strokeWidth="0.5"
          />
        ))}

        {/* Trend line */}
        <path
          d={pathD}
          fill="none"
          stroke="#1976D2"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="#1976D2"
          />
        ))}
      </svg>

      {/* X-axis labels */}
      <View style={styles.chartLabels}>
        {history.length > 0 && (
          <>
            <Text style={styles.chartLabel}>
              {new Date(history[0].date).toLocaleDateString('zh-CN', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <Text style={styles.chartLabel}>
              {new Date(history[history.length - 1].date).toLocaleDateString('zh-CN', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </>
        )}
      </View>
    </View>
  );
};

/**
 * CreditExplanation Component
 * Displays credit score explanation
 */
export const CreditExplanation: React.FC = () => {
  const levels = [
    { level: 5, range: '900-1000', label: '极好', color: '#4CAF50' },
    { level: 4, range: '750-899', label: '优秀', color: '#8BC34A' },
    { level: 3, range: '600-749', label: '良好', color: '#FFC107' },
    { level: 2, range: '400-599', label: '一般', color: '#FF9800' },
    { level: 1, range: '0-399', label: '待提升', color: '#F44336' },
  ];

  return (
    <View style={styles.explanationContainer}>
      <Text style={styles.explanationTitle}>信用分说明</Text>
      <Text style={styles.explanationDesc}>
        信用分反映了 Agent 在平台上的行为表现，分数越高代表该 Agent 越可信。
      </Text>

      <View style={styles.levelsContainer}>
        {levels.map((item) => (
          <View key={item.level} style={styles.levelRow}>
            <View
              style={[
                styles.levelIndicator,
                { backgroundColor: item.color },
              ]}
            >
              <Text style={styles.levelIndicatorText}>LV.{item.level}</Text>
            </View>
            <Text style={styles.levelRange}>{item.range}</Text>
            <Text style={styles.levelName}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.factorsSection}>
        <Text style={styles.factorsTitle}>影响信用分的因素：</Text>
        <View style={styles.factorItem}>
          <Text style={styles.factorBullet}>•</Text>
          <Text style={styles.factorText}>消息响应及时性</Text>
        </View>
        <View style={styles.factorItem}>
          <Text style={styles.factorBullet}>•</Text>
          <Text style={styles.factorText}>内容合规程度</Text>
        </View>
        <View style={styles.factorItem}>
          <Text style={styles.factorBullet}>•</Text>
          <Text style={styles.factorText}>用户反馈评价</Text>
        </View>
        <View style={styles.factorItem}>
          <Text style={styles.factorBullet}>•</Text>
          <Text style={styles.factorText}>违规记录次数</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    padding: 12,
  },
  scoreSection: {
    alignItems: 'center',
    marginRight: 16,
  },
  score: {
    fontWeight: '700',
    color: '#1a1a1a',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  levelSection: {
    alignItems: 'center',
    marginRight: 16,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    color: '#fff',
    fontWeight: '600',
  },
  levelLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  trendSection: {
    alignItems: 'center',
  },
  trendIcon: {
    fontWeight: '700',
  },
  trendLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  // Size variants
  smallContainer: {
    padding: 8,
  },
  smallScore: {
    fontSize: 20,
  },
  smallLevel: {
    fontSize: 10,
  },
  smallTrend: {
    fontSize: 14,
  },
  mediumContainer: {
    padding: 12,
  },
  mediumScore: {
    fontSize: 28,
  },
  mediumLevel: {
    fontSize: 12,
  },
  mediumTrend: {
    fontSize: 18,
  },
  largeContainer: {
    padding: 16,
  },
  largeScore: {
    fontSize: 36,
  },
  largeLevel: {
    fontSize: 14,
  },
  largeTrend: {
    fontSize: 24,
  },
  // Chart styles
  chartContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  noDataText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    lineHeight: 60,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  chartLabel: {
    fontSize: 10,
    color: '#999',
  },
  // Explanation styles
  explanationContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  explanationDesc: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  levelsContainer: {
    marginBottom: 16,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelIndicator: {
    width: 50,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 12,
  },
  levelIndicatorText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  levelRange: {
    width: 80,
    fontSize: 12,
    color: '#666',
  },
  levelName: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  factorsSection: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  factorsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  factorBullet: {
    fontSize: 14,
    color: '#1976D2',
    marginRight: 6,
  },
  factorText: {
    fontSize: 12,
    color: '#666',
  },
});

export default CreditBadge;
