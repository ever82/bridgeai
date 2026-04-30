import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { AgentCreditInfo } from '@bridgeai/shared';

import { creditApi } from '../../services/api/credit';
import { theme } from '../../theme';
import { CreditBadge, CreditTrendChart, CreditExplanation } from '../../components/Credit';

export const CreditDetailScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [creditInfo, setCreditInfo] = useState<AgentCreditInfo | null>(null);

  useEffect(() => {
    creditApi
      .getCreditScore()
      .then(data => {
        const levelMap: Record<string, number> = {
          excellent: 5,
          good: 4,
          general: 3,
          poor: 2,
        };
        setCreditInfo({
          score: data.score,
          level: (levelMap[data.level] ?? 3) as AgentCreditInfo['level'],
          trend: 'stable',
          history: data.history ?? [],
          description: data.levelDescription ?? '',
        });
      })
      .catch(() => {
        // Silently ignore - screen will render empty state
      });
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>信用详情</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {creditInfo ? (
          <>
            <View style={styles.badgeWrapper}>
              <CreditBadge credit={creditInfo} size="large" showTrend={true} showLevel={true} />
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>信用分变化趋势</Text>
              <CreditTrendChart history={creditInfo.history} />
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>信用提升建议</Text>
              <CreditExplanation />
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无信用信息</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  backIcon: {
    fontSize: 20,
    color: theme.colors.text,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: theme.spacing.base,
  },
  badgeWrapper: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.textSecondary,
  },
});
