/**
 * Message Status Component
 *
 * Displays message read status, read count, read member list,
 * and read time for group chat messages.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, ViewStyle } from 'react-native';

import { socketClient } from '../../services/socketClient';

export type MessageStatusType = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface ReadReceipt {
  userId: string;
  messageId: string;
  readAt: string;
}

export interface MessageStatusProps {
  messageId: string;
  roomId: string;
  currentUserId: string;
  status: MessageStatusType;
  readBy?: ReadReceipt[];
  totalMembers?: number;
  showReadCount?: boolean;
  showReadList?: boolean;
  style?: ViewStyle;
  onReadReceiptReceived?: (receipt: ReadReceipt) => void;
}

interface ReadUser {
  userId: string;
  readAt: string;
}

/**
 * Format read time
 */
function formatReadTime(readAt: string): string {
  const date = new Date(readAt);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString();
}

/**
 * Get status icon/text
 */
function getStatusIcon(status: MessageStatusType): string {
  switch (status) {
    case 'sending':
      return '⏳';
    case 'sent':
      return '✓';
    case 'delivered':
      return '✓✓';
    case 'read':
      return '✓✓';
    case 'failed':
      return '⚠';
    default:
      return '';
  }
}

/**
 * Get status color
 */
function getStatusColor(status: MessageStatusType): string {
  switch (status) {
    case 'sending':
      return '#999';
    case 'sent':
      return '#999';
    case 'delivered':
      return '#666';
    case 'read':
      return '#4CAF50';
    case 'failed':
      return '#F44336';
    default:
      return '#999';
  }
}

/**
 * Message Status Component
 */
export const MessageStatus: React.FC<MessageStatusProps> = ({
  messageId,
  roomId,
  currentUserId,
  status,
  readBy = [],
  totalMembers,
  showReadCount = true,
  showReadList = true,
  style,
  onReadReceiptReceived,
}) => {
  const [readUsers, setReadUsers] = useState<ReadUser[]>(readBy);
  const [showModal, setShowModal] = useState(false);

  // Listen for read receipts
  useEffect(() => {
    if (!roomId || !messageId) return;

    const handleReadReceipt = (data: {
      userId: string;
      roomId: string;
      messageIds: string[];
      timestamp: string;
    }) => {
      if (data.roomId !== roomId) return;

      if (data.messageIds.includes(messageId)) {
        // Check if already in list
        setReadUsers(prev => {
          if (prev.some(u => u.userId === data.userId)) {
            return prev;
          }

          const newUser: ReadUser = {
            userId: data.userId,
            readAt: data.timestamp,
          };

          onReadReceiptReceived?.({
            userId: data.userId,
            messageId,
            readAt: data.timestamp,
          });

          return [...prev, newUser];
        });
      }
    };

    socketClient.on('chat:read_receipt', handleReadReceipt);

    return () => {
      socketClient.off('chat:read_receipt', handleReadReceipt);
    };
  }, [roomId, messageId, onReadReceiptReceived]);

  // Mark message as read when component mounts (if not sent by current user)
  useEffect(() => {
    if (roomId && messageId && currentUserId && status !== 'read') {
      // In a real app, you'd check if this user hasn't already read it
      socketClient.markAsRead(roomId, [messageId]);
    }
  }, [roomId, messageId, currentUserId, status]);

  const readCount = readUsers.length;
  const isReadByAll = totalMembers ? readCount >= totalMembers - 1 : false;

  const handlePress = () => {
    if (showReadList && readCount > 0) {
      setShowModal(true);
    }
  };

  const renderReadUser = ({ item }: { item: ReadUser }) => (
    <View style={styles.readUserItem}>
      <View style={styles.readUserAvatar}>
        <Text style={styles.readUserInitial}>{item.userId.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.readUserInfo}>
        <Text style={styles.readUserId}>{item.userId}</Text>
        <Text style={styles.readTime}>{formatReadTime(item.readAt)} 已读</Text>
      </View>
    </View>
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.container, style]}
        onPress={handlePress}
        disabled={!showReadList || readCount === 0}
      >
        <Text style={[styles.statusIcon, { color: getStatusColor(status) }]}>
          {getStatusIcon(status)}
        </Text>

        {showReadCount && status === 'read' && (
          <Text style={[styles.readCount, isReadByAll && styles.readCountAll]}>
            {isReadByAll ? '全部已读' : `${readCount}人已读`}
          </Text>
        )}
      </TouchableOpacity>

      {/* Read List Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>已读成员</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={readUsers}
              renderItem={renderReadUser}
              keyExtractor={(item) => item.userId}
              contentContainerStyle={styles.readUsersList}
            />

            {totalMembers && (
              <View style={styles.summary}>
                <Text style={styles.summaryText}>
                  {readCount} / {totalMembers - 1} 已读
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

/**
 * Group Read Status - Summary of read status for all messages
 */
export interface GroupReadStatusProps {
  roomId: string;
  messageIds: string[];
  currentUserId: string;
  totalMembers: number;
  style?: ViewStyle;
}

export const GroupReadStatus: React.FC<GroupReadStatusProps> = ({
  roomId,
  messageIds,
  currentUserId,
  totalMembers,
  style,
}) => {
  const [readCounts, setReadCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!roomId || messageIds.length === 0) return;

    const handleReadReceipt = (data: {
      userId: string;
      roomId: string;
      messageIds: string[];
      timestamp: string;
    }) => {
      if (data.roomId !== roomId) return;

      setReadCounts(prev => {
        const next = new Map(prev);
        for (const msgId of data.messageIds) {
          const current = next.get(msgId) || 0;
          next.set(msgId, current + 1);
        }
        return next;
      });
    };

    socketClient.on('chat:read_receipt', handleReadReceipt);

    return () => {
      socketClient.off('chat:read_receipt', handleReadReceipt);
    };
  }, [roomId, messageIds]);

  // Calculate overall read rate
  const totalReads = Array.from(readCounts.values()).reduce((sum, count) => sum + count, 0);
  const totalPossibleReads = messageIds.length * (totalMembers - 1);
  const readRate = totalPossibleReads > 0 ? (totalReads / totalPossibleReads) * 100 : 0;

  return (
    <View style={[styles.groupContainer, style]}>
      <Text style={styles.groupText}>
        阅读率: {readRate.toFixed(1)}%
      </Text>
    </View>
  );
};

/**
 * Read Receipt Badge - Compact version
 */
export interface ReadReceiptBadgeProps {
  count: number;
  total: number;
  style?: ViewStyle;
}

export const ReadReceiptBadge: React.FC<ReadReceiptBadgeProps> = ({
  count,
  total,
  style,
}) => {
  const allRead = count >= total;

  return (
    <View style={[styles.badge, style]}>
      <Text style={[styles.badgeText, allRead && styles.badgeTextAll]}>
        {allRead ? '✓' : `${count}/${total}`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  readCount: {
    fontSize: 11,
    color: '#4CAF50',
  },
  readCountAll: {
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 20,
    color: '#999',
    padding: 4,
  },
  readUsersList: {
    padding: 16,
  },
  readUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  readUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  readUserInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  readUserInfo: {
    flex: 1,
  },
  readUserId: {
    fontSize: 14,
    fontWeight: '500',
  },
  readTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  summary: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  groupContainer: {
    padding: 8,
  },
  groupText: {
    fontSize: 12,
    color: '#666',
  },
  badge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    color: '#4CAF50',
  },
  badgeTextAll: {
    fontWeight: 'bold',
  },
});

export default MessageStatus;
