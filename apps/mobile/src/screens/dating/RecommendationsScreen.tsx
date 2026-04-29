/**
 * Recommendations Screen
 * 每日推荐列表 - 展示匹配推荐、详情查看、快速操作、匹配历史
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import apiClient from '../../services/api/client';
import MatchCard, { type MatchCardData } from '../../components/dating/MatchCard';

// 推荐数据接口
interface Recommendation {
  profile: {
    id: string;
    agentId: string;
    userId: string;
    description?: string;
    basicConditions?: {
      ageRange?: string;
      heightRange?: string;
      education?: string;
      location?: {
        city?: string;
        province?: string;
      };
    };
    expectations?: {
      purpose?: string;
    };
  };
  matchScore: {
    profileId: string;
    agentId: string;
    totalScore: number;
    highlights: string[];
    warnings: string[];
    dimensions: Array<{
      dimension: string;
      score: number;
    }>;
  };
}

interface RecommendationResponse {
  recommendations: Recommendation[];
  generatedAt: string;
  poolSize: number;
}

const RecommendationsScreen: React.FC = () => {
  const navigation = useNavigation();

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Recommendation | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');

  // 加载推荐数据
  const loadRecommendations = useCallback(async () => {
    try {
      setError(null);
      const response = await apiClient.get<RecommendationResponse>('/dating/recommendations');
      setRecommendations(response.data?.recommendations ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '加载推荐失败';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  // 下拉刷新
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadRecommendations();
  }, [loadRecommendations]);

  // 喜欢操作
  const handleLike = useCallback(async (match: MatchCardData) => {
    try {
      await apiClient.post('/dating/recommendations/feedback', {
        targetProfileId: match.profileId,
        action: 'like',
      });
      // 从列表移除
      setRecommendations(prev => prev.filter(r => r.matchScore.profileId !== match.profileId));
    } catch {
      // 静默失败
    }
  }, []);

  // 跳过操作
  const handleSkip = useCallback(async (match: MatchCardData) => {
    try {
      await apiClient.post('/dating/recommendations/feedback', {
        targetProfileId: match.profileId,
        action: 'skip',
      });
      setRecommendations(prev => prev.filter(r => r.matchScore.profileId !== match.profileId));
    } catch {
      // 静默失败
    }
  }, []);

  // 查看详情
  const handlePress = useCallback(
    (match: MatchCardData) => {
      const rec = recommendations.find(r => r.matchScore.profileId === match.profileId);
      if (rec) {
        setSelectedMatch(rec);
        setDetailVisible(true);
      }
    },
    [recommendations]
  );

  // 渲染推荐卡片
  const renderRecommendation = useCallback(
    ({ item }: { item: Recommendation }) => {
      const cardData: MatchCardData = {
        profileId: item.matchScore.profileId,
        agentId: item.matchScore.agentId,
        totalScore: item.matchScore.totalScore,
        highlights: item.matchScore.highlights,
        warnings: item.matchScore.warnings,
        dimensions: item.matchScore.dimensions,
      };

      return (
        <MatchCard match={cardData} onPress={handlePress} onLike={handleLike} onSkip={handleSkip} />
      );
    },
    [handlePress, handleLike, handleSkip]
  );

  // 渲染详情弹窗
  const renderDetailModal = () => {
    if (!selectedMatch) return null;

    const profile = selectedMatch.profile;
    const score = selectedMatch.matchScore;

    return (
      <Modal
        visible={detailVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>匹配详情</Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* 匹配度 */}
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>匹配度</Text>
                <Text style={styles.detailScore}>{score.totalScore}%</Text>
              </View>

              {/* 匹配亮点 */}
              {score.highlights.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>匹配亮点</Text>
                  {score.highlights.map((h, i) => (
                    <View key={i} style={styles.highlightItem}>
                      <Text style={styles.highlightText}>{h}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* 维度评分 */}
              {score.dimensions && score.dimensions.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>维度评分</Text>
                  {score.dimensions.map((dim, i) => (
                    <View key={i} style={styles.dimRow}>
                      <Text style={styles.dimLabel}>{getDimensionLabel(dim.dimension)}</Text>
                      <View style={styles.dimBar}>
                        <View
                          style={[
                            styles.dimFill,
                            {
                              width: `${dim.score}%`,
                              backgroundColor:
                                dim.score >= 70
                                  ? '#4CAF50'
                                  : dim.score >= 50
                                    ? '#FF9800'
                                    : '#F44336',
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.dimScore}>{dim.score}%</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* 基本信息（脱敏） */}
              {profile.basicConditions && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>基本信息</Text>
                  {profile.basicConditions.ageRange && (
                    <Text style={styles.infoText}>
                      年龄范围: {profile.basicConditions.ageRange}
                    </Text>
                  )}
                  {profile.basicConditions.location?.city && (
                    <Text style={styles.infoText}>
                      城市: {profile.basicConditions.location.city}
                    </Text>
                  )}
                </View>
              )}

              {/* 期望 */}
              {profile.expectations?.purpose && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>交往目的</Text>
                  <Text style={styles.infoText}>{profile.expectations.purpose}</Text>
                </View>
              )}

              {/* 个人简介 */}
              {profile.description && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>个人简介</Text>
                  <Text style={styles.infoText}>{profile.description}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // 渲染空状态
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>
        {activeTab === 'today' ? '今日暂无推荐' : '暂无匹配历史'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'today'
          ? '我们正在为你寻找合适的对象，请稍后再来看看'
          : '你的匹配记录会在这里显示'}
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
        <Text style={styles.refreshButtonText}>刷新推荐</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.title}>每日推荐</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* 标签页切换 */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'today' && styles.activeTab]}
          onPress={() => setActiveTab('today')}
        >
          <Text style={[styles.tabText, activeTab === 'today' && styles.activeTabText]}>
            今日推荐
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            匹配历史
          </Text>
        </TouchableOpacity>
      </View>

      {/* 错误提示 */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* 推荐列表 */}
      <FlatList
        data={recommendations}
        renderItem={renderRecommendation}
        keyExtractor={item => item.matchScore.profileId}
        contentContainerStyle={recommendations.length === 0 ? styles.emptyList : undefined}
        ListEmptyComponent={renderEmpty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      />

      {/* 详情弹窗 */}
      {renderDetailModal()}
    </View>
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
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#E65100',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // 详情弹窗样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 20,
    color: '#999',
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  detailScore: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  highlightItem: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
  },
  highlightText: {
    fontSize: 14,
    color: '#1976D2',
  },
  dimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dimLabel: {
    width: 70,
    fontSize: 13,
    color: '#666',
  },
  dimBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    marginHorizontal: 8,
  },
  dimFill: {
    height: 6,
    borderRadius: 3,
  },
  dimScore: {
    width: 36,
    fontSize: 13,
    color: '#333',
    textAlign: 'right',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});

export default RecommendationsScreen;
