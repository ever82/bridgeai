/**
 * Online Status Component
 *
 * Displays user online status with indicator dot,
 * last seen time, and multi-device support.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

import { socketClient } from '../../services/socketClient';

export type OnlineStatusType = 'online' | 'offline' | 'away' | 'busy';

export interface OnlineStatusProps {
  userId: string;
  showLabel?: boolean;
  showLastSeen?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  onStatusChange?: (status: OnlineStatusType) => void;
}

interface UserPresence {
  userId: string;
  status: OnlineStatusType;
  lastSeenAt?: string;
  devices?: number;
}

/**
 * Format last seen time
 */
function formatLastSeen(lastSeenAt?: string): string {
  if (!lastSeenAt) return '';

  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return lastSeen.toLocaleDateString();
}

/**
 * Get status color
 */
function getStatusColor(status: OnlineStatusType): string {
  switch (status) {
    case 'online':
      return '#4CAF50'; // Green
    case 'away':
      return '#FFC107'; // Yellow
    case 'busy':
      return '#F44336'; // Red
    case 'offline':
    default:
      return '#9E9E9E'; // Gray
  }
}

/**
 * Get status label
 */
function getStatusLabel(status: OnlineStatusType): string {
  switch (status) {
    case 'online':
      return '在线';
    case 'away':
      return '离开';
    case 'busy':
      return '忙碌';
    case 'offline':
    default:
      return '离线';
  }
}

/**
 * Get indicator size
 */
function getIndicatorSize(size: 'small' | 'medium' | 'large'): number {
  switch (size) {
    case 'small':
      return 8;
    case 'large':
      return 16;
    case 'medium':
    default:
      return 12;
  }
}

/**
 * Online Status Component
 */
export const OnlineStatus: React.FC<OnlineStatusProps> = ({
  userId,
  showLabel = true,
  showLastSeen = true,
  size = 'medium',
  style,
  onStatusChange,
}) => {
  const [presence, setPresence] = useState<UserPresence | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const indicatorSize = getIndicatorSize(size);
  const statusColor = getStatusColor(presence?.status || 'offline');

  // Subscribe to user status updates
  useEffect(() => {
    if (!userId) return;

    // Subscribe to user events
    socketClient.subscribeToUser(userId);
    setIsSubscribed(true);

    // Fetch initial presence
    const fetchPresence = async () => {
      try {
        const presenceData = await socketClient.getPresence([userId]);
        if (presenceData && presenceData.length > 0) {
          const userPresence: UserPresence = {
            userId,
            status: presenceData[0].online ? 'online' : 'offline',
            lastSeenAt: presenceData[0].lastSeenAt,
            devices: presenceData[0].devices,
          };
          setPresence(userPresence);
          onStatusChange?.(userPresence.status);
        }
      } catch (error) {
        console.error('[OnlineStatus] Failed to fetch presence:', error);
      }
    };

    fetchPresence();

    // Listen for status updates
    const handleStatusUpdate = (data: { userId: string; status: OnlineStatusType; timestamp: string }) => {
      if (data.userId === userId) {
        setPresence(prev => ({
          ...prev,
          userId,
          status: data.status,
          lastSeenAt: data.status === 'offline' ? data.timestamp : prev?.lastSeenAt,
        }));
        onStatusChange?.(data.status);
      }
    };

    socketClient.on('user:status_update', handleStatusUpdate);

    return () => {
      socketClient.off('user:status_update', handleStatusUpdate);
      if (isSubscribed) {
        socketClient.unsubscribeFromUser(userId);
      }
    };
  }, [userId, onStatusChange]);

  return (
    <View style={[styles.container, style]}>
      {/* Status Indicator */}
      <View
        style={[
          styles.indicator,
          {
            width: indicatorSize,
            height: indicatorSize,
            backgroundColor: statusColor,
            borderRadius: indicatorSize / 2,
          },
        ]}
      >
        {/* Multi-device indicator */}
        {presence?.devices && presence.devices > 1 && (
          <View style={styles.multiDeviceIndicator}>
            <Text style={styles.multiDeviceText}>{presence.devices}</Text>
          </View>
        )}
      </View>

      {/* Status Label */}
      {showLabel && (
        <Text style={styles.statusLabel}>
          {getStatusLabel(presence?.status || 'offline')}
        </Text>
      )}

      {/* Last Seen */}
      {showLastSeen && presence?.status === 'offline' && presence?.lastSeenAt && (
        <Text style={styles.lastSeenText}>
          {formatLastSeen(presence.lastSeenAt)}
        </Text>
      )}
    </View>
  );
};

/**
 * Online Status Badge - Compact version for avatars
 */
export interface OnlineStatusBadgeProps {
  userId: string;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const OnlineStatusBadge: React.FC<OnlineStatusBadgeProps> = ({
  userId,
  size = 'medium',
  style,
}) => {
  const [status, setStatus] = useState<OnlineStatusType>('offline');

  useEffect(() => {
    if (!userId) return;

    socketClient.subscribeToUser(userId);

    const handleStatusUpdate = (data: { userId: string; status: OnlineStatusType }) => {
      if (data.userId === userId) {
        setStatus(data.status);
      }
    };

    socketClient.on('user:status_update', handleStatusUpdate);

    return () => {
      socketClient.off('user:status_update', handleStatusUpdate);
      socketClient.unsubscribeFromUser(userId);
    };
  }, [userId]);

  const indicatorSize = getIndicatorSize(size);
  const statusColor = getStatusColor(status);

  return (
    <View
      style={[
        styles.badge,
        {
          width: indicatorSize,
          height: indicatorSize,
          backgroundColor: statusColor,
          borderRadius: indicatorSize / 2,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    marginRight: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
  lastSeenText: {
    fontSize: 11,
    color: '#999',
  },
  multiDeviceIndicator: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  multiDeviceText: {
    fontSize: 8,
    color: '#fff',
    fontWeight: 'bold',
  },
  badge: {
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default OnlineStatus;
