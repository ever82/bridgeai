import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { theme } from '../../theme';

export interface LastSeenProps {
  timestamp: Date | number | string;
  isOnline?: boolean;
  showExactOnHover?: boolean;
  updateInterval?: number;
  format?: 'relative' | 'exact' | 'both';
  style?: ViewStyle;
  textStyle?: ViewStyle;
  testID?: string;
}

interface TimeFormatOptions {
  justNow: string;
  minutesAgo: (n: number) => string;
  hoursAgo: (n: number) => string;
  daysAgo: (n: number) => string;
  weeksAgo: (n: number) => string;
  monthsAgo: (n: number) => string;
  yearsAgo: (n: number) => string;
  online: string;
}

const defaultFormatOptions: TimeFormatOptions = {
  justNow: '刚刚',
  minutesAgo: (n: number) => `${n}分钟前`,
  hoursAgo: (n: number) => `${n}小时前`,
  daysAgo: (n: number) => `${n}天前`,
  weeksAgo: (n: number) => `${n}周前`,
  monthsAgo: (n: number) => `${n}个月前`,
  yearsAgo: (n: number) => `${n}年前`,
  online: '在线',
};

export const formatRelativeTime = (
  timestamp: Date | number | string,
  options: Partial<TimeFormatOptions> = {}
): string => {
  const opts = { ...defaultFormatOptions, ...options };
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return opts.justNow;
  if (diffMins < 60) return opts.minutesAgo(diffMins);
  if (diffHours < 24) return opts.hoursAgo(diffHours);
  if (diffDays < 7) return opts.daysAgo(diffDays);
  if (diffWeeks < 4) return opts.weeksAgo(diffWeeks);
  if (diffMonths < 12) return opts.monthsAgo(diffMonths);
  return opts.yearsAgo(diffYears);
};

export const formatExactTime = (timestamp: Date | number | string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (isToday) return `今天 ${timeStr}`;
  if (isYesterday) return `昨天 ${timeStr}`;

  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日 ${timeStr}`;
};

export const LastSeen: React.FC<LastSeenProps> = ({
  timestamp,
  isOnline = false,
  updateInterval = 60000,
  format = 'relative',
  style,
  textStyle,
  testID,
}) => {
  const [, setTick] = useState(0);

  const triggerUpdate = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (isOnline || format === 'exact') return;

    const interval = setInterval(() => {
      triggerUpdate();
    }, updateInterval);

    return () => clearInterval(interval);
  }, [isOnline, updateInterval, format, triggerUpdate]);

  const getDisplayText = (): string => {
    if (isOnline) return defaultFormatOptions.online;

    switch (format) {
      case 'relative':
        return formatRelativeTime(timestamp);
      case 'exact':
        return formatExactTime(timestamp);
      case 'both':
        return `${formatRelativeTime(timestamp)} (${formatExactTime(timestamp)})`;
      default:
        return formatRelativeTime(timestamp);
    }
  };

  const getAccessibilityLabel = (): string => {
    if (isOnline) return '当前在线';
    return `最后在线: ${formatExactTime(timestamp)}`;
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      {isOnline && <View style={styles.onlineIndicator} testID={`${testID}-indicator`} />}
      <Text
        style={[
          styles.text,
          isOnline && styles.onlineText,
          textStyle,
        ]}
        accessibilityLabel={getAccessibilityLabel()}
      >
        {getDisplayText()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
    marginRight: theme.spacing.xs,
  },
  text: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  onlineText: {
    color: theme.colors.success,
  },
});

export default LastSeen;
