import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Pressable,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '../../stores/authStore';
import { useHomeStore } from '../../stores/homeStore';
import { theme } from '../../theme';
import { UserAvatar } from '../../components/UserAvatar/UserAvatar';
import { CreditScore } from '../../components/CreditScore/CreditScore';
import { LoadingSkeleton } from '../../components/LoadingSkeleton/LoadingSkeleton';

/** Quick-access scene definitions matching the design spec. */
const SCENES = [
  { key: 'visionshare', icon: '📷', label: 'Vision\nShare' },
  { key: 'agentdate', icon: '💕', label: 'Date' },
  { key: 'agentjob', icon: '💼', label: 'Job' },
  { key: 'agentad', icon: '🛒', label: 'Ad' },
] as const;

/** Mock card width for carousel snap calculations */
const CARD_WIDTH = 280;

/** Returns a time-based greeting based on the current hour. */
const getTimeBasedGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return '早上好';
  if (hour >= 12 && hour < 18) return '下午好';
  return '晚上好';
};

/** Mock notification data */
interface Notification {
  id: string;
  avatar: string;
  senderName: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    avatar: '👤',
    senderName: 'Agent 助手',
    message: '您的好友请求已通过验证',
    timestamp: '刚刚',
    isRead: false,
  },
  {
    id: '2',
    avatar: '🤖',
    senderName: '系统通知',
    message: '您的积分已更新，当前余额 850',
    timestamp: '10分钟前',
    isRead: false,
  },
  {
    id: '3',
    avatar: '💕',
    senderName: 'Date Agent',
    message: '新的匹配对象已找到，点击查看',
    timestamp: '1小时前',
    isRead: true,
  },
];

export const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const user = useAuthStore(s => s.user);
  const {
    agentStatus,
    recentMatches,
    featuredContent,
    scenePreference,
    points,
    isLoading,
    isRefreshing,
    error,
    fetchHomeData,
    refresh,
  } = useHomeStore();

  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  // Agent selector state
  const [selectedAgentId, setSelectedAgentId] = useState('1');

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleDismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClearAll = () => {
    setNotifications([]);
    setShowNotificationPanel(false);
  };

  const handleToggleNotification = () => {
    setShowNotificationPanel(prev => !prev);
  };

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  // ─── Notification Badge ─────────────────────────────────
  const NotificationBadge = ({ count }: { count: number }) => {
    if (count === 0) return null;
    return (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
      </View>
    );
  };

  // ─── Swipeable Notification Item ─────────────────────────
  const SwipeableNotificationItem = ({
    notification,
    onDismiss,
  }: {
    notification: Notification;
    onDismiss: (id: string) => void;
  }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > 10;
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dx < 0) {
            translateX.setValue(gestureState.dx);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -80) {
            Animated.parallel([
              Animated.timing(translateX, {
                toValue: -300,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(opacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start(() => onDismiss(notification.id));
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        },
      })
    ).current;

    return (
      <Animated.View style={[styles.notificationItem, { transform: [{ translateX }], opacity }]}>
        <Pressable {...panResponder.panHandlers} style={styles.notificationContent}>
          <View style={styles.notificationAvatar}>
            <Text style={styles.notificationAvatarText}>{notification.avatar}</Text>
          </View>
          <View style={styles.notificationInfo}>
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationSender}>{notification.senderName}</Text>
              {!notification.isRead && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {notification.message}
            </Text>
            <Text style={styles.notificationTimestamp}>{notification.timestamp}</Text>
          </View>
        </Pressable>
        <View style={styles.swipeHint}>
          <Text style={styles.swipeHintText}>← 滑走</Text>
        </View>
      </Animated.View>
    );
  };

  // ─── Notification Panel ──────────────────────────────────
  const renderNotificationPanel = () => {
    if (!showNotificationPanel) return null;

    return (
      <View style={styles.notificationPanelContainer}>
        <Pressable style={styles.notificationPanelBackdrop} onPress={handleToggleNotification} />
        <View style={styles.notificationPanel}>
          <View style={styles.notificationPanelHeader}>
            <Text style={styles.notificationPanelTitle}>通知</Text>
            {notifications.length > 0 && (
              <TouchableOpacity onPress={handleClearAll}>
                <Text style={styles.clearAllText}>清除全部</Text>
              </TouchableOpacity>
            )}
          </View>
          {notifications.length === 0 ? (
            <View style={styles.emptyNotifications}>
              <Text style={styles.emptyNotificationsIcon}>🔕</Text>
              <Text style={styles.emptyNotificationsText}>暂无通知</Text>
            </View>
          ) : (
            <ScrollView style={styles.notificationList} showsVerticalScrollIndicator={false}>
              {notifications.map(notification => (
                <SwipeableNotificationItem
                  key={notification.id}
                  notification={notification}
                  onDismiss={handleDismissNotification}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    );
  };

  // ─── Header ─────────────────────────────────────────────
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>BridgeAI</Text>
      <View style={styles.headerRight}>
        <Pressable style={styles.headerIconBtn} onPress={handleToggleNotification}>
          <Text style={styles.headerIcon}>🔔</Text>
          <NotificationBadge count={unreadCount} />
        </Pressable>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsIcon}>💎</Text>
          <Text style={styles.pointsText}>{points}</Text>
        </View>
      </View>
    </View>
  );

  // ─── Personal info card ─────────────────────────────────
  const greeting = getTimeBasedGreeting();

  const renderProfileCard = () => (
    <View style={styles.card}>
      <Text style={styles.greetingText}>
        {greeting}，{user?.displayName || '用户'}
      </Text>
      <View style={styles.profileRow}>
        <UserAvatar uri={user?.avatar} name={user?.displayName || '用户'} size="lg" />
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.displayName || '用户'}</Text>
          {user?.bio ? (
            <Text style={styles.profileBio} numberOfLines={1}>
              {user.bio}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.profileStats}>
        <CreditScore score={85} size="sm" showStars={false} />
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>💎</Text>
          <Text style={styles.statLabel}>积分</Text>
          <Text style={styles.statValue}>{points}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.agentConfigBtn}>
        <Text style={styles.agentConfigText}>配置我的 Agent</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Agent status card ──────────────────────────────────
  const renderAgentStatus = () => {
    if (!agentStatus) return null;

    // Mock agent list with status enum (online/busy/offline)
    const agents = [
      { id: '1', name: '小红', status: 'online' as const },
      { id: '2', name: '小明', status: 'busy' as const },
      { id: '3', name: '小强', status: 'offline' as const },
    ];
    const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

    const statusColorMap = {
      online: '#22C55E', // green
      busy: '#EAB308', // yellow
      offline: '#9CA3AF', // gray
    };
    const statusTextMap = {
      online: '在线',
      busy: '忙碌',
      offline: '离线',
    };

    // Mock daily stats
    const todayMatches = 12;
    const todayConversations = 5;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>我的 Agent 状态</Text>
        <View style={styles.card}>
          <View style={styles.agentHeader}>
            <View style={styles.agentAvatarCircle}>
              <Text style={styles.agentIcon}>🤖</Text>
            </View>
            <View style={styles.agentInfo}>
              <Text style={styles.agentName}>{agentStatus.name} (Agent)</Text>
              <View style={styles.agentStatusRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: statusColorMap[selectedAgent.status] },
                  ]}
                />
                <Text style={styles.agentStatusText}>{statusTextMap[selectedAgent.status]}</Text>
              </View>
            </View>
          </View>

          {/* Agent selector */}
          <View style={styles.agentSelectorRow}>
            {agents.map(agent => (
              <TouchableOpacity
                key={agent.id}
                style={[
                  styles.agentSelectorItem,
                  selectedAgentId === agent.id && styles.agentSelectorItemActive,
                ]}
                onPress={() => setSelectedAgentId(agent.id)}
              >
                <View
                  style={[
                    styles.agentSelectorDot,
                    { backgroundColor: statusColorMap[agent.status] },
                  ]}
                />
                <Text
                  style={[
                    styles.agentSelectorText,
                    selectedAgentId === agent.id && styles.agentSelectorTextActive,
                  ]}
                >
                  {agent.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Daily stats */}
          <View style={styles.dailyStatsRow}>
            <View style={styles.dailyStatItem}>
              <Text style={styles.dailyStatLabel}>今日匹配</Text>
              <Text style={styles.dailyStatValue}>{todayMatches}</Text>
            </View>
            <View style={styles.dailyStatDivider} />
            <View style={styles.dailyStatItem}>
              <Text style={styles.dailyStatLabel}>对话</Text>
              <Text style={styles.dailyStatValue}>{todayConversations}</Text>
            </View>
          </View>

          {agentStatus.scenes
            .filter(s => s.activeCount > 0)
            .map(s => (
              <View key={s.scene} style={styles.sceneRow}>
                <Text style={styles.sceneBullet}>●</Text>
                <Text style={styles.sceneText}>
                  {s.label}：{s.activeCount}个进行中的任务
                </Text>
              </View>
            ))}
          <TouchableOpacity style={styles.viewDetailBtn}>
            <Text style={styles.viewDetailText}>查看详情</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── Recent Matches ────────────────────────────────────
  const renderRecentMatches = () => {
    if (recentMatches.length === 0) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>最近匹配</Text>
          <View style={styles.emptyRecommendations}>
            <Text style={styles.emptyRecIcon}>🔍</Text>
            <Text style={styles.emptyRecTitle}>暂无新的匹配</Text>
            <Text style={styles.emptyRecText}>去场景页面发布需求或调整偏好设置</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>最近匹配</Text>
        {recentMatches.map(match => (
          <View key={match.id} style={styles.matchCard}>
            <View style={styles.matchRow}>
              <UserAvatar uri={match.userAvatar} name={match.userName} size="md" />
              <View style={styles.matchInfo}>
                <View style={styles.matchNameRow}>
                  <Text style={styles.matchName}>{match.userName}</Text>
                  <View style={styles.matchScoreBadge}>
                    <Text style={styles.matchScoreText}>{match.matchScore}%</Text>
                  </View>
                </View>
                <Text style={styles.matchInterest}>{match.matchedInterest}</Text>
              </View>
            </View>
            <View style={styles.matchMeta}>
              <View style={styles.sceneTag}>
                <Text style={styles.sceneTagIcon}>{match.sceneIcon}</Text>
                <Text style={styles.sceneTagText}>{match.timestamp}</Text>
              </View>
              <TouchableOpacity style={styles.matchActionBtn}>
                <Text style={styles.matchActionText}>发起聊天</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // ─── Recommendation Carousel ────────────────────────────
  const renderCarousel = () => {
    if (featuredContent.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>精选内容</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + theme.spacing.sm}
          decelerationRate="fast"
          contentContainerStyle={styles.carouselContent}
        >
          {featuredContent.map(item => (
            <View key={item.id} style={styles.carouselCard}>
              <View style={styles.carouselCardHeader}>
                <Text style={styles.carouselIcon}>{item.sceneIcon}</Text>
                <View style={styles.carouselTags}>
                  {item.tags.slice(0, 2).map((tag, idx) => (
                    <View key={idx} style={styles.carouselTag}>
                      <Text style={styles.carouselTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Text style={styles.carouselTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.carouselSubtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
              <TouchableOpacity style={styles.carouselAction}>
                <Text style={styles.carouselActionText}>{item.actionLabel}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  // ─── Scene switching hint ─────────────────────────────────
  const renderSceneHint = () => {
    if (!scenePreference) return null;

    const sceneLabels: Record<string, string> = {
      visionshare: 'VisionShare',
      agentdate: 'AgentDate',
      agentjob: 'AgentJob',
      agentad: 'AgentAd',
    };

    return (
      <View style={styles.sceneHintBanner}>
        <Text style={styles.sceneHintIcon}>💡</Text>
        <Text style={styles.sceneHintText}>
          您的偏好场景已切换到 {sceneLabels[scenePreference] || scenePreference}
        </Text>
        <TouchableOpacity style={styles.sceneHintClose}>
          <Text style={styles.sceneHintCloseText}>×</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ─── Quick entry grid ───────────────────────────────────
  const renderQuickEntry = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>快速入口</Text>
      <View style={styles.quickGrid}>
        {SCENES.map(scene => (
          <TouchableOpacity key={scene.key} style={styles.quickItem}>
            <View style={styles.quickIconWrap}>
              <Text style={styles.quickIcon}>{scene.icon}</Text>
            </View>
            <Text style={styles.quickLabel}>{scene.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ─── Loading state ──────────────────────────────────────
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <LoadingSkeleton type="avatar" count={1} />
      <View style={styles.loadingSpacing} />
      <LoadingSkeleton type="card" count={2} />
    </View>
  );

  // ─── Error state ────────────────────────────────────────
  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={() => fetchHomeData(true)}>
        <Text style={styles.retryText}>重试</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {renderHeader()}
      {renderNotificationPanel()}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {isLoading && !agentStatus ? (
          renderLoading()
        ) : error && !agentStatus ? (
          renderError()
        ) : (
          <>
            {renderSceneHint()}
            {renderProfileCard()}
            {renderAgentStatus()}
            {renderCarousel()}
            {renderRecentMatches()}
            {renderQuickEntry()}
          </>
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
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    padding: theme.spacing.xs,
  },
  headerIcon: {
    fontSize: 22,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    marginLeft: theme.spacing.sm,
  },
  pointsIcon: {
    fontSize: 14,
    marginRight: 2,
  },
  pointsText: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing['2xl'],
  },
  // Card base
  card: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    marginBottom: theme.spacing.base,
    ...theme.shadows.sm,
  },
  // Profile card
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.base,
  },
  profileInfo: {
    marginLeft: theme.spacing.base,
    flex: 1,
  },
  profileName: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  profileBio: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.base,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.base,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 14,
    marginRight: 2,
  },
  statLabel: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
    marginRight: 4,
  },
  statValue: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  agentConfigBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  agentConfigText: {
    color: theme.colors.textInverse,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.medium,
  },
  // Section
  section: {
    marginBottom: theme.spacing.base,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  // Agent status
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  agentAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentIcon: {
    fontSize: 22,
  },
  agentInfo: {
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  agentName: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  agentStatusText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  agentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.xs,
  },
  agentSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  agentSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  agentSelectorItemActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight + '15',
  },
  agentSelectorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  agentSelectorText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  agentSelectorTextActive: {
    color: theme.colors.text,
    fontWeight: theme.fonts.weights.semibold,
  },
  dailyStatsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: theme.spacing.xs,
  },
  dailyStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dailyStatLabel: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginRight: 4,
  },
  dailyStatValue: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  dailyStatDivider: {
    width: 1,
    height: 16,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
  sceneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingLeft: theme.spacing.xs,
  },
  sceneBullet: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.primary,
    marginRight: theme.spacing.xs,
  },
  sceneText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  viewDetailBtn: {
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-end',
  },
  viewDetailText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.medium,
  },
  // Recommendations
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  recIcon: {
    fontSize: 18,
    marginRight: theme.spacing.xs,
  },
  recTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  recSubtitle: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.text,
    marginBottom: 2,
  },
  recExtra: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  recAction: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
  },
  recActionText: {
    color: theme.colors.textInverse,
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
  },
  emptyRecommendations: {
    alignItems: 'center',
    paddingVertical: theme.spacing['3xl'],
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
  },
  emptyRecIcon: {
    fontSize: 40,
    marginBottom: theme.spacing.base,
  },
  emptyRecTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptyRecText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  // Match card
  matchCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    marginBottom: theme.spacing.base,
    ...theme.shadows.sm,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  matchInfo: {
    marginLeft: theme.spacing.base,
    flex: 1,
  },
  matchNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  matchName: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginRight: theme.spacing.xs,
  },
  matchScoreBadge: {
    backgroundColor: theme.colors.primaryLight + '30',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 1,
  },
  matchScoreText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.primary,
  },
  matchInterest: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  matchMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  sceneTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sceneTagIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  sceneTagText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
  },
  matchActionBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
  },
  matchActionText: {
    color: theme.colors.textInverse,
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
  },
  // Quick entry
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickIconWrap: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    ...theme.shadows.sm,
  },
  quickIcon: {
    fontSize: 26,
  },
  quickLabel: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  // Loading
  loadingContainer: {
    paddingVertical: theme.spacing.xl,
  },
  loadingSpacing: {
    height: theme.spacing.base,
  },
  // Error
  errorContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing['3xl'],
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: theme.spacing.base,
  },
  errorText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.base,
  },
  retryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
  },
  retryText: {
    color: theme.colors.textInverse,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.medium,
  },
  // Notification Badge
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: theme.colors.error || '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: theme.fonts.weights.bold,
  },
  // Notification Panel
  notificationPanelContainer: {
    position: 'absolute',
    top: insets.top + 50,
    right: theme.spacing.lg,
    left: theme.spacing.lg,
    zIndex: 1000,
  },
  notificationPanelBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  notificationPanel: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    maxHeight: 400,
    ...theme.shadows.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  notificationPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  notificationPanelTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
  },
  clearAllText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.primary,
  },
  notificationList: {
    maxHeight: 320,
  },
  emptyNotifications: {
    alignItems: 'center',
    paddingVertical: theme.spacing['2xl'],
    paddingHorizontal: theme.spacing.base,
  },
  emptyNotificationsIcon: {
    fontSize: 36,
    marginBottom: theme.spacing.sm,
  },
  emptyNotificationsText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  // Swipeable Notification Item
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing.base,
  },
  notificationAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  notificationAvatarText: {
    fontSize: 20,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  notificationSender: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginRight: theme.spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  notificationMessage: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.text,
    marginBottom: 2,
    lineHeight: 18,
  },
  notificationTimestamp: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
  },
  swipeHint: {
    paddingRight: theme.spacing.base,
  },
  swipeHintText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
  },
  // Carousel
  carouselContent: {
    paddingRight: theme.spacing.base,
  },
  carouselCard: {
    width: CARD_WIDTH,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    marginRight: theme.spacing.sm,
    ...theme.shadows.md,
  },
  carouselCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  carouselIcon: {
    fontSize: 24,
  },
  carouselTags: {
    flexDirection: 'row',
    gap: 4,
  },
  carouselTag: {
    backgroundColor: theme.colors.primary + '20',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  carouselTagText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.primary,
  },
  carouselTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  carouselSubtitle: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  carouselAction: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
  },
  carouselActionText: {
    color: theme.colors.textInverse,
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
  },
  // Scene hint banner
  sceneHintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight + '20',
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.base,
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
  },
  sceneHintIcon: {
    fontSize: 18,
    marginRight: theme.spacing.sm,
  },
  sceneHintText: {
    flex: 1,
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.text,
  },
  sceneHintClose: {
    paddingHorizontal: theme.spacing.xs,
  },
  sceneHintCloseText: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    fontWeight: theme.fonts.weights.bold,
  },
  // Greeting text
  greetingText: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.base,
  },
});
