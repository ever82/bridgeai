/**
 * Match Detail Screen
 * 匹配详情页面 - 展示匹配度可视化详情
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';

interface MatchDetail {
  matchId: string;
  type: 'job' | 'candidate';
  title: string;
  totalScore: number;
  dimensions: {
    skills: { score: number; details: Record<string, unknown> };
    experience: { score: number; details: Record<string, unknown> };
    salary: { score: number; details: Record<string, unknown> };
    location: { score: number; details: Record<string, unknown> };
    culture: { score: number; details: Record<string, unknown> };
  };
  summary: string;
}

export const MatchDetailScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const matchId = route?.params?.matchId;
  const matchType = route?.params?.type || 'job';
  const matchTitle = route?.params?.title || '匹配详情';

  // In production, fetch from API based on matchId
  const matchDetail: MatchDetail = {
    matchId,
    type: matchType,
    title: matchTitle,
    totalScore: 85,
    dimensions: {
      skills: { score: 90, details: { matched: 'React, TypeScript', missing: 'GraphQL' } },
      experience: { score: 82, details: { levelMatch: true } },
      salary: { score: 78, details: { hasOverlap: true } },
      location: { score: 95, details: { match: 'same-city' } },
      culture: { score: 75, details: { overlapRate: '3/4' } },
    },
    summary: '技能高度匹配；经验符合要求；薪资期望相符；地域/工作方式匹配',
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.primary;
    if (score >= 40) return theme.colors.warning;
    return theme.colors.error;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '优秀';
    if (score >= 60) return '良好';
    if (score >= 40) return '一般';
    return '偏低';
  };

  const renderDimension = (
    label: string,
    icon: string,
    score: number,
    details: Record<string, unknown>
  ) => (
    <View style={styles.dimensionCard}>
      <View style={styles.dimensionHeader}>
        <Text style={styles.dimensionIcon}>{icon}</Text>
        <Text style={styles.dimensionLabel}>{label}</Text>
        <View style={[styles.dimensionBadge, { backgroundColor: getScoreColor(score) }]}>
          <Text style={styles.dimensionBadgeText}>{getScoreLabel(score)}</Text>
        </View>
      </View>

      <View style={styles.scoreBarContainer}>
        <View style={styles.scoreBarTrack}>
          <View
            style={[
              styles.scoreBarFill,
              {
                width: `${score}%`,
                backgroundColor: getScoreColor(score),
              },
            ]}
          />
        </View>
        <Text style={[styles.scoreValue, { color: getScoreColor(score) }]}>{score}</Text>
      </View>

      {Object.entries(details).length > 0 && (
        <View style={styles.detailsContainer}>
          {Object.entries(details).map(([key, value]) => (
            <View key={key} style={styles.detailRow}>
              <Text style={styles.detailKey}>{key}</Text>
              <Text style={styles.detailValue}>{String(value)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>匹配详情</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Total Score */}
        <View style={styles.totalScoreSection}>
          <View style={[styles.totalScoreCircle, { borderColor: getScoreColor(matchDetail.totalScore) }]}>
            <Text style={[styles.totalScoreNumber, { color: getScoreColor(matchDetail.totalScore) }]}>
              {matchDetail.totalScore}
            </Text>
            <Text style={styles.totalScoreUnit}>分</Text>
          </View>
          <Text style={styles.matchTitle}>{matchDetail.title}</Text>
          <Text style={styles.matchSummary}>{matchDetail.summary}</Text>
        </View>

        {/* Dimension Scores */}
        <Text style={styles.sectionTitle}>匹配维度分析</Text>

        {renderDimension('技能匹配', '🎯', matchDetail.dimensions.skills.score, matchDetail.dimensions.skills.details)}
        {renderDimension('经验评估', '📊', matchDetail.dimensions.experience.score, matchDetail.dimensions.experience.details)}
        {renderDimension('薪资匹配', '💰', matchDetail.dimensions.salary.score, matchDetail.dimensions.salary.details)}
        {renderDimension('地域/工作方式', '📍', matchDetail.dimensions.location.score, matchDetail.dimensions.location.details)}
        {renderDimension('文化匹配', '🏢', matchDetail.dimensions.culture.score, matchDetail.dimensions.culture.details)}

        {/* Actions */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.primaryAction}>
            <Text style={styles.primaryActionText}>
              {matchType === 'job' ? '我感兴趣' : '邀请面试'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>跳过</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderBottomWidth: theme.borders.thin,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  backButtonText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.primary,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  headerSpacer: {
    width: 60,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing['4xl'],
  },
  totalScoreSection: {
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  totalScoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  totalScoreNumber: {
    fontSize: theme.fonts.sizes['3xl'],
    fontWeight: theme.fonts.weights.bold,
  },
  totalScoreUnit: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  matchTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  matchSummary: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  dimensionCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  dimensionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  dimensionIcon: {
    fontSize: theme.fonts.sizes.md,
    marginRight: theme.spacing.sm,
  },
  dimensionLabel: {
    flex: 1,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.text,
  },
  dimensionBadge: {
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  dimensionBadgeText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textInverse,
  },
  scoreBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  scoreBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.backgroundTertiary,
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreValue: {
    width: 32,
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.bold,
    textAlign: 'right',
  },
  detailsContainer: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: theme.borders.thin,
    borderTopColor: theme.colors.borderLight,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  detailKey: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textTertiary,
  },
  detailValue: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
  },
  actionSection: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  primaryAction: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  primaryActionText: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textInverse,
  },
  secondaryAction: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  secondaryActionText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
  },
});

export default MatchDetailScreen;
