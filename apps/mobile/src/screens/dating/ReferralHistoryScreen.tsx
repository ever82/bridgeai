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
import { useNavigation, useFocusEffect } from '@react-navigation/native';

// 枚举定义
enum ReferralStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

enum ReferralResult {
  PENDING = 'pending',
  MUTUAL_ACCEPT = 'mutual_accept',
  SINGLE_ACCEPT = 'single_accept',
  MUTUAL_REJECT = 'mutual_reject',
  SINGLE_REJECT = 'single_reject',
  EXPIRED = 'expired',
}

// 引荐记录接口
interface ReferralRecord {
  id: string;
  userAId: string;
  userBId: string;
  status: ReferralStatus;
  result: ReferralResult | null;
  matchData: {
    matchScore: number;
    compatibilityFactors: string[];
    agentConversationSummary: string;
  };
  userADecision?: {
    decision: 'accept' | 'reject';
    decidedAt: string;
  } | null;
  userBDecision?: {
    decision: 'accept' | 'reject';
    decidedAt: string;
  } | null;
  chatRoomId: string | null;
  createdAt: string;
  completedAt: string | null;
  viewCount: number;
}

// 统计信息接口
interface ReferralStats {
  totalReferrals: number;
  successfulReferrals: number;
  failedReferrals: number;
  pendingReferrals: number;
  successRate: number;
}

// 筛选类型
type FilterType = 'all' | 'pending' | 'success' | 'failed';

const ReferralHistoryScreen: React.FC = () => {
  const navigation = useNavigation();

  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [selectedReferral, setSelectedReferral] = useState<ReferralRecord | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentUserId] = useState('current_user_id'); // TODO: 从全局状态获取

  // 获取引荐历史
  const fetchReferralHistory = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // TODO: 调用API获取数据
      // const response = await api.getReferralHistory({ status: filter !== 'all' ? filter : undefined });
      // setReferrals(response.referrals);
      // setStats(response.stats);

      // 模拟数据
      const mockReferrals: ReferralRecord[] = [
        {
          id: 'ref_1',
          userAId: 'current_user_id',
          userBId: 'user_b_1',
          status: ReferralStatus.SUCCESS,
          result: ReferralResult.MUTUAL_ACCEPT,
          matchData: {
            matchScore: 88,
            compatibilityFactors: ['兴趣爱好', '生活方式'],
            agentConversationSummary: '双方有很多共同话题',
          },
          chatRoomId: 'room_1',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          viewCount: 5,
        },
        {
          id: 'ref_2',
          userAId: 'user_a_2',
          userBId: 'current_user_id',
          status: ReferralStatus.FAILED,
          result: ReferralResult.SINGLE_REJECT,
          matchData: {
            matchScore: 72,
            compatibilityFactors: ['价值观'],
            agentConversationSummary: '价值观有一些差异',
          },
          userADecision: { decision: 'reject', decidedAt: new Date().toISOString() },
          userBDecision: { decision: 'accept', decidedAt: new Date().toISOString() },
          chatRoomId: null,
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
          viewCount: 3,
        },
        {
          id: 'ref_3',
          userAId: 'current_user_id',
          userBId: 'user_b_3',
          status: ReferralStatus.PENDING,
          result: null,
          matchData: {
            matchScore: 85,
            compatibilityFactors: ['兴趣爱好', '价值观', '生活方式'],
            agentConversationSummary: '非常匹配的两个人',
          },
          chatRoomId: null,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          completedAt: null,
          viewCount: 2,
        },
      ];

      const mockStats: ReferralStats = {
        totalReferrals: 15,
        successfulReferrals: 8,
        failedReferrals: 6,
        pendingReferrals: 1,
        successRate: 53.3,
      };

      // 根据筛选条件过滤
      let filteredReferrals = mockReferrals;
      if (filter !== 'all') {
        filteredReferrals = mockReferrals.filter(r => r.status === filter);
      }

      setReferrals(filteredReferrals);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch referral history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  // 初始加载
  useEffect(() => {
    fetchReferralHistory();
  }, [fetchReferralHistory]);

  // 刷新
  const onRefresh = () => {
    fetchReferralHistory(true);
  };

  // 查看详情
  const viewDetail = (referral: ReferralRecord) => {
    setSelectedReferral(referral);
    setDetailModalVisible(true);
  };

  // 进入聊天房间
  const enterChatRoom = (chatRoomId: string) => {
    setDetailModalVisible(false);
    navigation.navigate('ChatRoom' as never, { roomId: chatRoomId } as never);
  };

  // 重新匹配
  const requestNewMatch = () => {
    setDetailModalVisible(false);
    // TODO: 调用API请求新的匹配
    console.log('Requesting new match...');
  };

  // 获取状态显示文本
  const getStatusText = (status: ReferralStatus, result: ReferralResult | null): string => {
    switch (status) {
      case ReferralStatus.PENDING:
        return '待处理';
      case ReferralStatus.SUCCESS:
        return '匹配成功';
      case ReferralStatus.FAILED:
        if (result === ReferralResult.SINGLE_ACCEPT) return '单方同意';
        if (result === ReferralResult.SINGLE_REJECT) return '单方拒绝';
        if (result === ReferralResult.MUTUAL_REJECT) return '双方拒绝';
        if (result === ReferralResult.EXPIRED) return '已过期';
        return '匹配失败';
      case ReferralStatus.CANCELLED:
        return '已取消';
      default:
        return '未知';
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: ReferralStatus): string => {
    switch (status) {
      case ReferralStatus.PENDING:
        return '#FF9800';
      case ReferralStatus.SUCCESS:
        return '#4CAF50';
      case ReferralStatus.FAILED:
      case ReferralStatus.CANCELLED:
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  // 格式化日期
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // 渲染筛选按钮
  const renderFilterButton = (type: FilterType, label: string) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === type && styles.filterButtonActive]}
      onPress={() => setFilter(type)}
    >
      <Text style={[styles.filterButtonText, filter === type && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // 渲染统计卡片
  const renderStatsCard = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalReferrals}</Text>
            <Text style={styles.statLabel}>总引荐</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.successText]}>{stats.successfulReferrals}</Text>
            <Text style={styles.statLabel}>成功</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.failedReferrals}</Text>
            <Text style={styles.statLabel}>失败</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.successRate.toFixed(1)}%</Text>
            <Text style={styles.statLabel}>成功率</Text>
          </View>
        </View>
      </View>
    );
  };

  // 渲染引荐项
  const renderReferralItem = ({ item }: { item: ReferralRecord }) => (
    <TouchableOpacity
      style={styles.referralItem}
      onPress={() => viewDetail(item)}
    >
      <View style={styles.referralHeader}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status, item.result)}</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
      </View>

      <View style={styles.referralContent}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>匹配度</Text>
          <Text style={styles.scoreValue}>{item.matchData.matchScore}%</Text>
        </View>

        <View style={styles.factorsContainer}>
          {item.matchData.compatibilityFactors.slice(0, 3).map((factor, index) => (
            <View key={index} style={styles.factorBadge}>
              <Text style={styles.factorText}>{factor}</Text>
            </View>
          ))}
        </View>
      </View>

      {item.status === ReferralStatus.SUCCESS && item.chatRoomId && (
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => enterChatRoom(item.chatRoomId!)}
        >
          <Text style={styles.chatButtonText}>进入聊天</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  // 渲染详情弹窗
  const renderDetailModal = () => {
    if (!selectedReferral) return null;

    const isCurrentUserA = currentUserId === selectedReferral.userAId;
    const myDecision = isCurrentUserA
      ? selectedReferral.userADecision
      : selectedReferral.userBDecision;
    const otherDecision = isCurrentUserA
      ? selectedReferral.userBDecision
      : selectedReferral.userADecision;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>引荐详情</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* 状态 */}
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>状态</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedReferral.status) }]}>
                  <Text style={styles.statusText}>
                    {getStatusText(selectedReferral.status, selectedReferral.result)}
                  </Text>
                </View>
              </View>

              {/* 匹配信息 */}
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>匹配度</Text>
                <Text style={styles.detailScore}>{selectedReferral.matchData.matchScore}%</Text>
              </View>

              {/* 对话摘要 */}
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>对话摘要</Text>
                <Text style={styles.detailText}>
                  {selectedReferral.matchData.agentConversationSummary}
                </Text>
              </View>

              {/* 决策时间线 */}
              {(myDecision || otherDecision) && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>决策时间线</Text>
                  {myDecision && (
                    <View style={styles.timelineItem}>
                      <Text style={styles.timelineLabel}>您的决策：</Text>
                      <Text style={styles.timelineValue}>
                        {myDecision.decision === 'accept' ? '✓ 同意' : '✗ 拒绝'}
                      </Text>
                      <Text style={styles.timelineDate}>
                        {formatDate(myDecision.decidedAt)}
                      </Text>
                    </View>
                  )}
                  {otherDecision && (
                    <View style={styles.timelineItem}>
                      <Text style={styles.timelineLabel}>对方决策：</Text>
                      <Text style={styles.timelineValue}>
                        已决策
                      </Text>
                      <Text style={styles.timelineDate}>
                        {formatDate(otherDecision.decidedAt)}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* 操作按钮 */}
              <View style={styles.detailActions}>
                {selectedReferral.status === ReferralStatus.SUCCESS && selectedReferral.chatRoomId && (
                  <TouchableOpacity
                    style={styles.modalActionButton}
                    onPress={() => enterChatRoom(selectedReferral.chatRoomId!)}
                  >
                    <Text style={styles.modalActionButtonText}>进入聊天房间</Text>
                  </TouchableOpacity>
                )}

                {(selectedReferral.status === ReferralStatus.FAILED ||
                  selectedReferral.status === ReferralStatus.EXPIRED) && (
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.secondaryActionButton]}
                    onPress={requestNewMatch}
                  >
                    <Text style={[styles.modalActionButtonText, styles.secondaryActionButtonText]}>
                      重新匹配
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderStatsCard()}

      {/* 筛选器 */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {renderFilterButton('all', '全部')}
          {renderFilterButton('pending', '待处理')}
          {renderFilterButton('success', '成功')}
          {renderFilterButton('failed', '失败')}
        </ScrollView>
      </View>

      {/* 列表 */}
      <FlatList
        data={referrals}
        keyExtractor={(item) => item.id}
        renderItem={renderReferralItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无引荐记录</Text>
          </View>
        }
      />

      {renderDetailModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loader: {
    marginTop: 100,
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  successText: {
    color: '#4CAF50',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#2196F3',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666666',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  referralItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  referralHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: '#999999',
  },
  referralContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  factorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
    marginLeft: 16,
    justifyContent: 'flex-end',
  },
  factorBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 4,
    marginBottom: 4,
  },
  factorText: {
    fontSize: 11,
    color: '#2E7D32',
  },
  chatButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  closeButton: {
    fontSize: 20,
    color: '#666666',
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  detailScore: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  detailText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 22,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineLabel: {
    fontSize: 14,
    color: '#666666',
    width: 80,
  },
  timelineValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
    flex: 1,
  },
  timelineDate: {
    fontSize: 12,
    color: '#999999',
  },
  detailActions: {
    marginTop: 20,
  },
  modalActionButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalActionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryActionButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  secondaryActionButtonText: {
    color: '#2196F3',
  },
});

export default ReferralHistoryScreen;
