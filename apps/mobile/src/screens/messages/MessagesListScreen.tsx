import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenContainer } from '../../components/ScreenContainer/ScreenContainer';
import { Header } from '../../components/Header/Header';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { UserAvatar } from '../../components/UserAvatar/UserAvatar';
import {
  useMessageStore,
  type Conversation,
  type ConversationStatus,
} from '../../stores/messageStore';
import { MessagesStackParamList } from '../../types/navigation';
import { theme } from '../../theme';

import { DeleteConfirmDialog } from './DeleteConfirmDialog';

type NavigationProp = NativeStackNavigationProp<MessagesStackParamList, 'MessagesList'>;

const SWIPE_THRESHOLD = -80;

const statusConfig: Record<
  ConversationStatus,
  { label: string; emoji: string; color: string; bgColor: string }
> = {
  human_chatting: {
    label: '对方亲自聊中',
    emoji: '👤',
    color: theme.colors.success,
    bgColor: 'rgba(52, 199, 89, 0.1)',
  },
  agent_negotiating: {
    label: 'Agent协商中',
    emoji: '🤖',
    color: theme.colors.primary,
    bgColor: 'rgba(0, 122, 255, 0.1)',
  },
  waiting_reply: {
    label: '等待回复中',
    emoji: '⏳',
    color: theme.colors.textSecondary,
    bgColor: 'rgba(142, 142, 147, 0.1)',
  },
  ended: {
    label: '已结束',
    emoji: '✓',
    color: theme.colors.textSecondary,
    bgColor: 'rgba(142, 142, 147, 0.1)',
  },
};

const SceneTag: React.FC<{ tag: string }> = ({ tag }) => (
  <View style={styles.sceneTag}>
    <Text style={styles.sceneTagText}>{tag}</Text>
  </View>
);

const StatusBadge: React.FC<{ status: ConversationStatus }> = ({ status }) => {
  const config = statusConfig[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
      <Text style={[styles.statusText, { color: config.color }]}>
        {config.emoji} {config.label}
      </Text>
    </View>
  );
};

type ListItemData =
  | { type: 'section'; title: string }
  | { type: 'notification'; data: import('../../services/notificationApi').Notification }
  | { type: 'conversation'; data: Conversation };

interface ConversationListItemProps {
  conversation: Conversation;
  isSelected: boolean;
  isSelectionMode: boolean;
  onPress: (conversation: Conversation) => void;
  onLongPress: (conversation: Conversation) => void;
  onMarkRead: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onDelete: (conversation: Conversation) => void;
  onArchive: (id: string) => void;
  onMute: (id: string, muted: boolean) => void;
  onClearHistory: (id: string) => void;
}

const ConversationListItem: React.FC<ConversationListItemProps> = ({
  conversation,
  isSelected,
  isSelectionMode,
  onPress,
  onLongPress,
  onMarkRead,
  onPin,
  onDelete,
  onArchive,
  onMute,
  onClearHistory,
}) => {
  const panX = useRef(new Animated.Value(0)).current;
  const [isSwiped, setIsSwiped] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isSelectionMode) return false;
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          panX.setValue(Math.max(gestureState.dx, SWIPE_THRESHOLD));
        } else if (gestureState.dx > 0 && isSwiped) {
          panX.setValue(Math.min(gestureState.dx + SWIPE_THRESHOLD, 0));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < SWIPE_THRESHOLD / 2) {
          Animated.spring(panX, {
            toValue: SWIPE_THRESHOLD,
            useNativeDriver: true,
            friction: 8,
          }).start(() => setIsSwiped(true));
        } else {
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
          }).start(() => setIsSwiped(false));
        }
      },
    })
  ).current;

  const handlePress = () => {
    if (isSwiped) {
      Animated.spring(panX, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }).start(() => setIsSwiped(false));
      return;
    }
    onPress(conversation);
  };

  const handleLongPress = () => {
    onLongPress(conversation);
  };

  const closeSwipe = () => {
    Animated.spring(panX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start(() => setIsSwiped(false));
  };

  const hasUnread = conversation.unreadCount > 0;

  return (
    <View style={styles.itemWrapper}>
      {/* Swipe actions background */}
      <View style={styles.swipeActions}>
        <TouchableOpacity
          style={[styles.swipeAction, styles.markReadAction]}
          onPress={() => {
            onMarkRead(conversation.id);
            closeSwipe();
          }}
        >
          <Text style={styles.swipeActionText}>标为已读</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.swipeAction, styles.pinAction]}
          onPress={() => {
            onPin(conversation.id, !conversation.isPinned);
            closeSwipe();
          }}
        >
          <Text style={styles.swipeActionText}>{conversation.isPinned ? '取消置顶' : '置顶'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.swipeAction, styles.deleteAction]}
          onPress={() => {
            onDelete(conversation);
            closeSwipe();
          }}
        >
          <Text style={styles.swipeActionText}>删除</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[
          styles.itemContainer,
          conversation.isPinned && styles.pinnedItem,
          { transform: [{ translateX: panX }] },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.itemTouchable}
          onPress={handlePress}
          onLongPress={handleLongPress}
          activeOpacity={0.7}
          delayLongPress={300}
        >
          {isSelectionMode && (
            <View style={styles.checkbox}>
              <Text style={styles.checkboxText}>{isSelected ? '☑️' : '⬜'}</Text>
            </View>
          )}

          <View style={styles.avatarContainer}>
            <UserAvatar
              uri={conversation.avatarUri}
              name={conversation.name}
              size="md"
              showStatus={conversation.isOnline}
              status={conversation.isOnline ? 'online' : 'offline'}
            />
            {hasUnread && !isSelectionMode && <View style={styles.unreadDot} />}
            {conversation.isMuted && !hasUnread && !isSelectionMode && (
              <View style={styles.mutedBadge}>
                <Text style={styles.mutedText}>🔕</Text>
              </View>
            )}
          </View>

          <View style={styles.contentContainer}>
            <View style={styles.headerRow}>
              <Text style={[styles.name, hasUnread && styles.unreadName]} numberOfLines={1}>
                {conversation.isPinned && '📌 '}
                {conversation.isMuted && '🔇 '}
                {conversation.name}
              </Text>
              <SceneTag tag={conversation.sceneTag} />
            </View>

            <StatusBadge status={conversation.status} />

            <View style={styles.messageRow}>
              <Text
                style={[styles.lastMessage, hasUnread && styles.unreadMessage]}
                numberOfLines={1}
              >
                {conversation.lastMessage}
              </Text>
              <Text style={[styles.time, hasUnread && styles.unreadTime]}>
                {formatTime(conversation.lastMessageTime)}
              </Text>
            </View>
          </View>

          {!isSelectionMode && (
            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => {
                showConversationActions(conversation, {
                  onArchive,
                  onMute,
                  onClearHistory,
                  onDelete,
                });
              }}
            >
              <Text style={styles.moreText}>⋯</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

function showConversationActions(
  conversation: Conversation,
  actions: {
    onArchive: (id: string) => void;
    onMute: (id: string, muted: boolean) => void;
    onClearHistory: (id: string) => void;
    onDelete: (conversation: Conversation) => void;
  }
) {
  const options = [
    {
      text: conversation.isMuted ? '取消静音' : '静音',
      action: () => actions.onMute(conversation.id, !conversation.isMuted),
    },
    {
      text: conversation.isArchived ? '取消归档' : '归档',
      action: () => actions.onArchive(conversation.id),
    },
    {
      text: '清空聊天记录',
      action: () => {
        Alert.alert('清空聊天记录', '确定清空所有聊天记录吗？此操作不可恢复。', [
          { text: '取消', style: 'cancel' },
          {
            text: '清空',
            style: 'destructive',
            onPress: () => actions.onClearHistory(conversation.id),
          },
        ]);
      },
    },
    { text: '删除会话', action: () => actions.onDelete(conversation), destructive: true },
  ];

  Alert.alert(
    conversation.name,
    '选择操作',
    [
      ...options.map(o => ({
        text: o.text,
        style: 'default' as const,
        onPress: o.action,
      })),
      { text: '取消', style: 'cancel' as const },
    ],
    { cancelable: true }
  );
}

function formatTime(timeStr: string): string {
  const date = new Date(timeStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

interface NotificationItemProps {
  title: string;
  content: string;
  time: string;
  icon: string;
  onPress: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  title,
  content,
  time,
  icon,
  onPress,
}) => (
  <TouchableOpacity style={styles.notificationItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.notificationIcon}>
      <Text style={styles.notificationIconText}>{icon}</Text>
    </View>
    <View style={styles.notificationContent}>
      <View style={styles.notificationHeader}>
        <Text style={styles.notificationTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.notificationTime}>{time}</Text>
      </View>
      <Text style={styles.notificationBody} numberOfLines={2}>
        {content}
      </Text>
    </View>
    <Text style={styles.arrow}>→</Text>
  </TouchableOpacity>
);

export const MessagesListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {
    conversations,
    notifications,
    refreshing,
    isSelectionMode,
    selectedIds,
    unreadCount,
    refreshConversations,
    loadMoreConversations,
    fetchNotifications,
    markConversationRead,
    markMultipleRead,
    deleteConversation,
    deleteMultiple,
    pinConversation,
    archiveConversation,
    muteConversation,
    clearChatHistory,
    markAllNotificationsRead,
    toggleSelectionMode,
    toggleSelection,
    selectAll,
    clearSelection,
  } = useMessageStore();

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);

  useEffect(() => {
    refreshConversations();
    fetchNotifications();
  }, [refreshConversations, fetchNotifications]);

  const handleConversationPress = useCallback(
    (conversation: Conversation) => {
      if (isSelectionMode) {
        toggleSelection(conversation.id);
        return;
      }
      if (conversation.unreadCount > 0) {
        markConversationRead(conversation.id);
      }
      navigation.navigate('Chat', {
        conversationId: conversation.id,
        userName: conversation.name,
      });
    },
    [isSelectionMode, toggleSelection, markConversationRead, navigation]
  );

  const handleLongPress = useCallback(
    (conversation: Conversation) => {
      if (!isSelectionMode) {
        toggleSelectionMode(true);
        toggleSelection(conversation.id);
      }
    },
    [isSelectionMode, toggleSelectionMode, toggleSelection]
  );

  const handleDelete = useCallback((conversation: Conversation) => {
    setDeleteTarget(conversation);
    setDeleteDialogVisible(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteTarget) {
      deleteConversation(deleteTarget.id);
    }
    setDeleteDialogVisible(false);
    setDeleteTarget(null);
  }, [deleteTarget, deleteConversation]);

  const handleBatchDelete = useCallback(() => {
    if (selectedIds.length === 0) return;
    Alert.alert('批量删除', `确定删除选中的 ${selectedIds.length} 个会话吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => deleteMultiple(selectedIds),
      },
    ]);
  }, [selectedIds, deleteMultiple]);

  const handleBatchMarkRead = useCallback(() => {
    markMultipleRead(selectedIds);
    clearSelection();
  }, [selectedIds, markMultipleRead, clearSelection]);

  const handleMarkAllRead = useCallback(() => {
    markAllNotificationsRead();
  }, [markAllNotificationsRead]);

  const activeConversations = conversations.filter(c => c.status !== 'ended' && !c.isArchived);
  const historyConversations = conversations.filter(c => c.status === 'ended' && !c.isArchived);
  const archivedConversations = conversations.filter(c => c.isArchived);

  const data: ListItemData[] = [
    ...(notifications.length > 0
      ? [
          { type: 'section' as const, title: '系统通知' },
          ...notifications.map(n => ({ type: 'notification' as const, data: n })),
        ]
      : []),
    ...(activeConversations.length > 0
      ? [
          { type: 'section' as const, title: '群聊会话' },
          ...activeConversations.map(c => ({ type: 'conversation' as const, data: c })),
        ]
      : []),
    ...(historyConversations.length > 0
      ? [
          { type: 'section' as const, title: '历史会话' },
          ...historyConversations.map(c => ({ type: 'conversation' as const, data: c })),
        ]
      : []),
    ...(archivedConversations.length > 0
      ? [
          { type: 'section' as const, title: '已归档' },
          ...archivedConversations.map(c => ({ type: 'conversation' as const, data: c })),
        ]
      : []),
  ];

  const renderSectionHeader = useCallback(
    (title: string) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{title}</Text>
        {title === '系统通知' && notifications.length > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllReadText}>全部已读</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    [notifications, handleMarkAllRead]
  );

  const renderConversation = useCallback(
    ({ item }: { item: Conversation }) => (
      <ConversationListItem
        conversation={item}
        isSelected={selectedIds.includes(item.id)}
        isSelectionMode={isSelectionMode}
        onPress={handleConversationPress}
        onLongPress={handleLongPress}
        onMarkRead={markConversationRead}
        onPin={pinConversation}
        onDelete={handleDelete}
        onArchive={archiveConversation}
        onMute={muteConversation}
        onClearHistory={clearChatHistory}
      />
    ),
    [
      selectedIds,
      isSelectionMode,
      handleConversationPress,
      handleLongPress,
      markConversationRead,
      pinConversation,
      handleDelete,
      archiveConversation,
      muteConversation,
      clearChatHistory,
    ]
  );

  const renderNotification = useCallback(
    ({ item }: { item: (typeof notifications)[0] }) => (
      <NotificationItem
        title={item.title}
        content={item.content}
        time={formatTime(item.createdAt)}
        icon={item.type === 'MATCH_NEW' || item.type === 'MATCH_ACCEPTED' ? '🔔' : '💎'}
        onPress={() => navigation.navigate('NotificationDetail', { notificationId: item.id })}
      />
    ),
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: ListItemData }) => {
      if (item.type === 'section') {
        return renderSectionHeader(item.title);
      }
      if (item.type === 'notification') {
        return renderNotification({ item: item.data as (typeof notifications)[0] });
      }
      return renderConversation({ item: item.data as Conversation });
    },
    [renderSectionHeader, renderNotification, renderConversation]
  );

  const keyExtractor = useCallback(
    (item: ListItemData, index: number) => `${item.type}-${index}`,
    []
  );

  const hasContent = data.length > 0;

  return (
    <ScreenContainer safeAreaTop safeAreaBottom={false}>
      <Header
        title={isSelectionMode ? `已选 ${selectedIds.length}` : '消息中心'}
        rightElement={
          isSelectionMode ? (
            <TouchableOpacity onPress={clearSelection}>
              <Text style={styles.headerAction}>取消</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.headerIcon}
                onPress={() => navigation.navigate('MessageSettings')}
              >
                <Text>⚙️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIcon}
                onPress={() => navigation.navigate('NewChat')}
              >
                <Text>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIcon}
                onPress={() => navigation.navigate('MessageSearch')}
              >
                <Text>🔍</Text>
              </TouchableOpacity>
              {unreadCount > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          )
        }
      />

      {isSelectionMode && (
        <View style={styles.batchBar}>
          <TouchableOpacity
            style={styles.batchButton}
            onPress={handleBatchMarkRead}
            disabled={selectedIds.length === 0}
          >
            <Text
              style={[
                styles.batchButtonText,
                selectedIds.length === 0 && styles.batchButtonDisabled,
              ]}
            >
              标为已读
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.batchButton}
            onPress={handleBatchDelete}
            disabled={selectedIds.length === 0}
          >
            <Text
              style={[
                styles.batchButtonText,
                styles.batchDeleteText,
                selectedIds.length === 0 && styles.batchButtonDisabled,
              ]}
            >
              删除
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.batchButton}
            onPress={() => selectAll(conversations.map(c => c.id))}
          >
            <Text style={styles.batchButtonText}>全选</Text>
          </TouchableOpacity>
        </View>
      )}

      {hasContent ? (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          refreshing={refreshing}
          onRefresh={refreshConversations}
          onEndReached={loadMoreConversations}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <EmptyState
          icon="💬"
          title="还没有聊天消息"
          description="去场景页面发布需求或供给，开始与他人的 Agent 交流吧！"
          actionLabel="去发布需求"
          onAction={() => navigation.navigate('NewChat')}
        />
      )}

      <DeleteConfirmDialog
        visible={deleteDialogVisible}
        conversationName={deleteTarget?.name || ''}
        onCancel={() => {
          setDeleteDialogVisible(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    padding: theme.spacing.sm,
  },
  headerBadge: {
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginLeft: -theme.spacing.sm,
    marginTop: -theme.spacing.md,
  },
  headerBadgeText: {
    color: theme.colors.textInverse,
    fontSize: 10,
    fontWeight: '700',
  },
  headerAction: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.medium,
  },
  batchBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  batchButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  batchButtonText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.semibold,
  },
  batchDeleteText: {
    color: theme.colors.error,
  },
  batchButtonDisabled: {
    color: theme.colors.textTertiary,
  },
  listContent: {
    paddingBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  sectionHeaderText: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textSecondary,
  },
  markAllReadText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.primary,
  },
  itemWrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  swipeActions: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    height: '100%',
  },
  markReadAction: {
    backgroundColor: theme.colors.info,
  },
  pinAction: {
    backgroundColor: theme.colors.primary,
  },
  deleteAction: {
    backgroundColor: theme.colors.error,
  },
  swipeActionText: {
    color: theme.colors.textInverse,
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
  },
  itemContainer: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pinnedItem: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  itemTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
  },
  checkbox: {
    marginRight: theme.spacing.sm,
  },
  checkboxText: {
    fontSize: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: theme.spacing.base,
  },
  unreadDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.error,
    borderWidth: 1.5,
    borderColor: theme.colors.background,
  },
  mutedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  mutedText: {
    fontSize: 10,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs / 2,
  },
  name: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  unreadName: {
    fontWeight: theme.fonts.weights.bold,
  },
  sceneTag: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  sceneTagText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs / 2,
  },
  statusText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.medium,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  unreadMessage: {
    color: theme.colors.text,
    fontWeight: theme.fonts.weights.semibold,
  },
  time: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
  },
  unreadTime: {
    color: theme.colors.error,
    fontWeight: theme.fonts.weights.medium,
  },
  moreButton: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
  moreText: {
    fontSize: 20,
    color: theme.colors.textTertiary,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.base,
  },
  notificationIconText: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs / 2,
  },
  notificationTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  notificationTime: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
  },
  notificationBody: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  arrow: {
    fontSize: 16,
    color: theme.colors.textTertiary,
    marginLeft: theme.spacing.sm,
  },
});

export default MessagesListScreen;
