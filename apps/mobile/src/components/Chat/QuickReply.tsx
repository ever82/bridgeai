import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ViewStyle } from 'react-native';

import { theme } from '../../theme';

export interface QuickReplyItem {
  id: string;
  text: string;
}

export interface QuickReplyProps {
  replies: QuickReplyItem[];
  onSelect: (reply: QuickReplyItem) => void;
  style?: ViewStyle;
  testID?: string;
}

export const QuickReply: React.FC<QuickReplyProps> = ({ replies, onSelect, style, testID }) => {
  if (replies.length === 0) return null;

  return (
    <View style={[styles.container, style]} testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {replies.map(reply => (
          <TouchableOpacity
            key={reply.id}
            style={styles.replyButton}
            onPress={() => onSelect(reply)}
            activeOpacity={0.7}
          >
            <Text style={styles.replyText} numberOfLines={1}>
              {reply.text}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  replyButton: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  replyText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.medium,
  },
});

export default QuickReply;
