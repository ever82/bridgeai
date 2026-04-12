import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

// 同意状态枚举
enum ConsentStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

// 引荐结果枚举
enum ReferralResult {
  PENDING = 'pending',
  MUTUAL_ACCEPT = 'mutual_accept',
  SINGLE_ACCEPT = 'single_accept',
  MUTUAL_REJECT = 'mutual_reject',
  SINGLE_REJECT = 'single_reject',
  EXPIRED = 'expired',
}

// 用户决策接口
interface UserConsent {
  userId: string;
  status: ConsentStatus;
  decidedAt: string | null;
  reason?: string;
  changedCount: number;
}

// 双向同意接口
interface MutualConsent {
  id: string;
  referralId: string;
  userAId: string;
  userBId: string;
  userAConsent: UserConsent;
  userBConsent: UserConsent;
  createdAt: string;
  expiresAt: string;
  result: ReferralResult;
  contextSummary?: string;
  matchScore?: number;
}

// 引荐记录接口
interface ReferralRecord {
  id: string;
  userAId: string;
  userBId: string;
  matchData: {
    matchScore: number;
    compatibilityFactors: string[];
    agentConversationSummary: string;
    recommendedTopics?: string[];
  };
  status: string;
  result: ReferralResult | null;
}

interface ReferralScreenProps {
  route: {
    params: {
      referralId: string;
      consentId: string;
    };
  };
}

const ReferralScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { referralId, consentId } = route.params as { referralId: string; consentId: string };

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [referral, setReferral] = useState<ReferralRecord | null>(null);
  const [consent, setConsent] = useState<MutualConsent | null>(null);
  const [currentUserId] = useState('current_user_id'); // TODO: 从全局状态获取
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [otherUserDecided, setOtherUserDecided] = useState(false);

  // 获取引荐数据
  const fetchReferralData = useCallback(async () => {
    try {
      setLoading(true);
      // TODO: 调用API获取数据
      // const response = await api.getReferral(referralId);
      // setReferral(response.referral);
      // setConsent(response.consent);

      // 模拟数据
      const mockConsent: MutualConsent = {
        id: consentId,
        referralId,
        userAId: 'user_a',
        userBId: 'user_b',
        userAConsent: {
          userId: 'user_a',
          status: ConsentStatus.PENDING,
          decidedAt: null,
          changedCount: 0,
        },
        userBConsent: {
          userId: 'user_b',
          status: ConsentStatus.PENDING,
          decidedAt: null,
          changedCount: 0,
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        result: ReferralResult.PENDING,
        contextSummary: '双方在兴趣爱好、生活方式等方面有较高的匹配度',
        matchScore: 85,
      };

      const mockReferral: ReferralRecord = {
        id: referralId,
        userAId: 'user_a',
        userBId: 'user_b',
        matchData: {
          matchScore: 85,
          compatibilityFactors: ['兴趣爱好', '生活方式', '价值观'],
          agentConversationSummary: '双方在音乐、旅行等方面有很多共同话题',
          recommendedTopics: ['音乐品味', '旅行经历', '未来规划'],
        },
        status: 'pending',
        result: null,
      };

      setConsent(mockConsent);
      setReferral(mockReferral);

      // 检查对方决策状态
      checkOtherUserDecision(mockConsent);
    } catch (error) {
      Alert.alert('错误', '获取引荐信息失败');
    } finally {
      setLoading(false);
    }
  }, [referralId, consentId]);

  // 检查对方决策状态
  const checkOtherUserDecision = useCallback((consentData: MutualConsent) => {
    const isUserA = currentUserId === consentData.userAId;
    const otherConsent = isUserA ? consentData.userBConsent : consentData.userAConsent;
    setOtherUserDecided(otherConsent.status !== ConsentStatus.PENDING);
  }, [currentUserId]);

  // 计算剩余时间
  useEffect(() => {
    if (!consent) return;

    const updateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiry = new Date(consent.expiresAt).getTime();
      const remaining = Math.max(0, expiry - now);
      setTimeRemaining(remaining);
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [consent]);

  // 初始加载
  useEffect(() => {
    fetchReferralData();
  }, [fetchReferralData]);

  // 格式化时间
  const formatTimeRemaining = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}小时 ${minutes}分 ${seconds}秒`;
  };

  // 获取当前用户的决策状态
  const getCurrentUserConsent = (): UserConsent | null => {
    if (!consent) return null;
    return currentUserId === consent.userAId ? consent.userAConsent : consent.userBConsent;
  };

  // 提交决策
  const submitDecision = async (decision: 'accept' | 'reject') => {
    try {
      setSubmitting(true);
      // TODO: 调用API提交决策
      // await api.submitReferralDecision(referralId, decision);

      // 模拟提交成功
      setTimeout(() => {
        const currentConsent = getCurrentUserConsent();
        if (currentConsent && consent) {
          const updatedConsent: MutualConsent = {
            ...consent,
            [currentUserId === consent.userAId ? 'userAConsent' : 'userBConsent']: {
              ...currentConsent,
              status: decision === 'accept' ? ConsentStatus.ACCEPTED : ConsentStatus.REJECTED,
              decidedAt: new Date().toISOString(),
            },
          };
          setConsent(updatedConsent);
        }

        Alert.alert(
          '提交成功',
          `您已选择${decision === 'accept' ? '同意' : '拒绝'}引荐。等待对方决策...`,
          [{ text: '确定', onPress: () => {
            if (decision === 'accept') {
              // 跳转到等待页面
            } else {
              // 跳转到历史页面
              navigation.navigate('ReferralHistory' as never);
            }
          }}]
        );
      }, 1000);
    } catch (error) {
      Alert.alert('错误', '提交决策失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 处理同意
  const handleAccept = () => {
    Alert.alert(
      '确认同意',
      '您确定要同意这次引荐吗？双方同意后将会交换联系方式。',
      [
        { text: '取消', style: 'cancel' },
        { text: '确定', onPress: () => submitDecision('accept') },
      ]
    );
  };

  // 处理拒绝
  const handleReject = () => {
    Alert.alert(
      '确认拒绝',
      '您确定要拒绝这次引荐吗？拒绝后该用户将不会再次推荐给您。',
      [
        { text: '取消', style: 'cancel' },
        { text: '确定', onPress: () => submitDecision('reject') },
      ]
    );
  };

  // 处理变更决策
  const handleChangeDecision = () => {
    const currentConsent = getCurrentUserConsent();
    if (currentConsent && currentConsent.changedCount >= 3) {
      Alert.alert('提示', '您已超出决策变更次数限制');
      return;
    }

    Alert.alert(
      '变更决策',
      `您已变更决策 ${currentConsent?.changedCount || 0} 次，最多可变更 3 次。确定要变更吗？`,
      [
        { text: '取消', style: 'cancel' },
        { text: '确定', onPress: () => {
          // 重置决策状态
          if (consent) {
            const updatedConsent: MutualConsent = {
              ...consent,
              [currentUserId === consent.userAId ? 'userAConsent' : 'userBConsent']: {
                ...getCurrentUserConsent()!,
                status: ConsentStatus.PENDING,
                decidedAt: null,
                changedCount: (getCurrentUserConsent()?.changedCount || 0) + 1,
              },
            };
            setConsent(updatedConsent);
          }
        }},
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!referral || !consent) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>引荐信息不存在</Text>
      </View>
    );
  }

  const currentConsent = getCurrentUserConsent();
  const hasDecided = currentConsent?.status !== ConsentStatus.PENDING;
  const isExpired = timeRemaining <= 0;

  return (
    <ScrollView style={styles.container}>
      {/* 标题区域 */}
      <View style={styles.header}>
        <Text style={styles.title}>引荐详情</Text>
        <View style={styles.matchScoreBadge}>
          <Text style={styles.matchScoreText}>匹配度 {referral.matchData.matchScore}%</Text>
        </View>
      </View>

      {/* 倒计时区域 */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerLabel}>决策剩余时间</Text>
        <Text style={[styles.timerValue, isExpired && styles.timerExpired]}>
          {isExpired ? '已过期' : formatTimeRemaining(timeRemaining)}
        </Text>
      </View>

      {/* 对方状态区域 */}
      {otherUserDecided && !hasDecided && (
        <View style={styles.otherStatusContainer}>
          <Text style={styles.otherStatusText}>
            对方已做出选择，等待您的决策...
          </Text>
        </View>
      )}

      {/* 对话摘要区域 */}
      <View style={styles.summaryContainer}>
        <Text style={styles.sectionTitle}>Agent对话摘要</Text>
        <Text style={styles.summaryText}>
          {referral.matchData.agentConversationSummary}
        </Text>
      </View>

      {/* 匹配因素区域 */}
      <View style={styles.factorsContainer}>
        <Text style={styles.sectionTitle}>匹配亮点</Text>
        <View style={styles.factorsList}>
          {referral.matchData.compatibilityFactors.map((factor, index) => (
            <View key={index} style={styles.factorBadge}>
              <Text style={styles.factorText}>{factor}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 推荐话题区域 */}
      {referral.matchData.recommendedTopics && (
        <View style={styles.topicsContainer}>
          <Text style={styles.sectionTitle}>推荐话题</Text>
          <View style={styles.topicsList}>
            {referral.matchData.recommendedTopics.map((topic, index) => (
              <View key={index} style={styles.topicBadge}>
                <Text style={styles.topicText}>{topic}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 决策按钮区域 */}
      <View style={styles.decisionContainer}>
        {!hasDecided && !isExpired && (
          <>
            <Text style={styles.decisionTitle}>您的选择</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.rejectButton]}
                onPress={handleReject}
                disabled={submitting}
              >
                <Text style={styles.rejectButtonText}>拒绝</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.acceptButton]}
                onPress={handleAccept}
                disabled={submitting}
              >
                <Text style={styles.acceptButtonText}>
                  {submitting ? '提交中...' : '同意'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {hasDecided && (
          <View style={styles.decisionMadeContainer}>
            <Text style={styles.decisionMadeText}>
              您已{currentConsent?.status === ConsentStatus.ACCEPTED ? '同意' : '拒绝'}引荐
              {currentConsent?.changedCount > 0 &&
                `（已变更 ${currentConsent.changedCount} 次）`}
            </Text>
            {!isExpired && currentConsent?.changedCount < 3 && (
              <TouchableOpacity
                style={styles.changeButton}
                onPress={handleChangeDecision}
              >
                <Text style={styles.changeButtonText}>变更决策</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isExpired && (
          <View style={styles.expiredContainer}>
            <Text style={styles.expiredText}>决策时间已过期</Text>
            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => navigation.navigate('ReferralHistory' as never)}
            >
              <Text style={styles.historyButtonText}>查看引荐历史</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  matchScoreBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  matchScoreText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  timerContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  timerValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
  },
  timerExpired: {
    color: '#FF5722',
  },
  otherStatusContainer: {
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  otherStatusText: {
    fontSize: 14,
    color: '#1976D2',
    textAlign: 'center',
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 22,
  },
  factorsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
  },
  factorsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  factorBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  factorText: {
    color: '#2E7D32',
    fontSize: 13,
  },
  topicsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
  },
  topicsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  topicBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  topicText: {
    color: '#E65100',
    fontSize: 13,
  },
  decisionContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
  },
  decisionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF5722',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  rejectButtonText: {
    color: '#FF5722',
    fontSize: 16,
    fontWeight: '600',
  },
  decisionMadeContainer: {
    alignItems: 'center',
  },
  decisionMadeText: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 12,
  },
  changeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  changeButtonText: {
    color: '#666666',
    fontSize: 14,
  },
  expiredContainer: {
    alignItems: 'center',
  },
  expiredText: {
    fontSize: 16,
    color: '#FF5722',
    marginBottom: 12,
  },
  historyButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#2196F3',
  },
  historyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#FF5722',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default ReferralScreen;
