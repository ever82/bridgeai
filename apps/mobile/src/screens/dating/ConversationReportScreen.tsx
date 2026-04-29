/**
 * Conversation Report Screen
 * 对话报告屏幕
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import apiClient from '../../services/api/client';

interface ConversationReport {
  id: string;
  roomId: string;
  summary: string;
  compatibilityScore: number;
  sharedInterests: string[];
  highlights: { topic: string; content: string; type: string }[];
  suggestions: string[];
  totalRounds: number;
  duration: number;
  qualityMetrics: { fluency: number; engagement: number; depth: number };
}

const ConversationReportScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { reportId } = (route.params as { reportId: string }) || {};

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ConversationReport | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/dating/conversation-reports/${reportId}`);
      setReport(response.data as ConversationReport);
    } catch (error) {
      Alert.alert('错误', '获取对话报告失败');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleAccept = () => {
    navigation.navigate('MatchSuccess' as never, { reportId } as never);
  };

  const handleDecline = () => {
    Alert.alert('确认', '确定要拒绝这次匹配吗？', [
      { text: '取消', style: 'cancel' },
      { text: '确定', onPress: () => navigation.goBack() },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>正在加载对话报告...</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>暂无对话报告</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreLabel}>匹配度</Text>
        <Text style={styles.scoreValue}>{Math.round(report.compatibilityScore * 100)}%</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>对话摘要</Text>
        <Text style={styles.summaryText}>{report.summary}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>共同兴趣</Text>
        <View style={styles.tagsContainer}>
          {report.sharedInterests.map((interest, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{interest}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>对话亮点</Text>
        {report.highlights.map((highlight, index) => (
          <View key={index} style={styles.highlightItem}>
            <Text style={styles.highlightTopic}>{highlight.topic}</Text>
            <Text style={styles.highlightContent}>{highlight.content}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>质量评估</Text>
        <View style={styles.metricsRow}>
          <MetricItem label="流畅度" value={report.qualityMetrics.fluency} />
          <MetricItem label="参与度" value={report.qualityMetrics.engagement} />
          <MetricItem label="深度" value={report.qualityMetrics.depth} />
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={handleAccept}>
          <Text style={styles.acceptButtonText}>接受匹配</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.declineButton]} onPress={handleDecline}>
          <Text style={styles.declineButtonText}>暂时不感兴趣</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const MetricItem: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <View style={styles.metricItem}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{Math.round(value * 100)}%</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  emptyText: { fontSize: 16, color: '#999' },
  scoreContainer: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#FFF5F5' },
  scoreLabel: { fontSize: 14, color: '#666', marginBottom: 4 },
  scoreValue: { fontSize: 48, fontWeight: 'bold', color: '#FF6B6B' },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#333' },
  summaryText: { fontSize: 14, lineHeight: 22, color: '#555' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#FFF0F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  tagText: { fontSize: 13, color: '#FF6B6B' },
  highlightItem: {
    marginBottom: 12,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B6B',
  },
  highlightTopic: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 2 },
  highlightContent: { fontSize: 13, color: '#666' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  metricItem: { alignItems: 'center' },
  metricLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
  metricValue: { fontSize: 18, fontWeight: '600', color: '#FF6B6B' },
  actionsContainer: { padding: 16, gap: 12 },
  button: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  acceptButton: { backgroundColor: '#FF6B6B' },
  acceptButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  declineButton: { backgroundColor: '#F5F5F5' },
  declineButtonText: { color: '#666', fontSize: 16 },
});

export default ConversationReportScreen;
