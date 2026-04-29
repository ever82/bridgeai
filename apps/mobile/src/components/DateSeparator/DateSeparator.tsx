import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { theme } from '../../theme';

export interface DateSeparatorProps {
  date: Date;
  testID?: string;
}

const WEEKDAY_LABELS = [
  '星期日',
  '星期一',
  '星期二',
  '星期三',
  '星期四',
  '星期五',
  '星期六',
] as const;

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isYesterday(date: Date, now: Date): boolean {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
}

function isThisWeek(date: Date, now: Date): boolean {
  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return date >= startOfWeek && date <= endOfWeek;
}

export function formatDateSeparator(date: Date): string {
  const now = new Date();

  if (isSameDay(date, now)) {
    return '今天';
  }

  if (isYesterday(date, now)) {
    return '昨天';
  }

  if (isThisWeek(date, now)) {
    return WEEKDAY_LABELS[date.getDay()];
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (date.getFullYear() === now.getFullYear()) {
    return `${month}月${day}日`;
  }

  return `${date.getFullYear()}年${month}月${day}日`;
}

export const DateSeparator: React.FC<DateSeparatorProps> = ({ date, testID }) => {
  const label = formatDateSeparator(date);

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  label: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
    marginHorizontal: theme.spacing.sm,
  },
});

export default DateSeparator;
