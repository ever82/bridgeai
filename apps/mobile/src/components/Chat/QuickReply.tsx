import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ViewStyle,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const CUSTOM_REPLIES_STORAGE_KEY = '@bridgeai/custom_quick_replies';

export const QuickReply: React.FC<QuickReplyProps> = ({ replies, onSelect, style, testID }) => {
  const [customReplies, setCustomReplies] = useState<QuickReplyItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(CUSTOM_REPLIES_STORAGE_KEY)
      .then(raw => {
        if (!mounted || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setCustomReplies(
              parsed.filter(r => r && typeof r.id === 'string' && typeof r.text === 'string')
            );
          }
        } catch {
          // ignore corrupt data
        }
      })
      .catch(() => {
        // ignore read errors
      });
    return () => {
      mounted = false;
    };
  }, []);

  const persistCustomReplies = useCallback((list: QuickReplyItem[]) => {
    AsyncStorage.setItem(CUSTOM_REPLIES_STORAGE_KEY, JSON.stringify(list)).catch(() => {
      // ignore write errors
    });
  }, []);

  const handleAddCustomReply = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    const newReply: QuickReplyItem = {
      id: `custom-${Date.now()}`,
      text,
    };
    setCustomReplies(prev => {
      const next = [...prev, newReply];
      persistCustomReplies(next);
      return next;
    });
    setInputText('');
    setModalVisible(false);
  }, [inputText, persistCustomReplies]);

  const handleDeleteCustomReply = useCallback(
    (reply: QuickReplyItem) => {
      Alert.alert('删除自定义回复', `确定删除 "${reply.text}" 吗？`, [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            setCustomReplies(prev => {
              const next = prev.filter(r => r.id !== reply.id);
              persistCustomReplies(next);
              return next;
            });
          },
        },
      ]);
    },
    [persistCustomReplies]
  );

  // Merge server replies with custom replies (dedupe by text)
  const seenTexts = new Set(replies.map(r => r.text));
  const mergedCustomReplies = customReplies.filter(r => !seenTexts.has(r.text));
  const allReplies = [...replies, ...mergedCustomReplies];

  return (
    <View style={[styles.container, style]} testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {allReplies.map(reply => {
          const isCustom = reply.id.startsWith('custom-');
          return (
            <TouchableOpacity
              key={reply.id}
              style={styles.replyButton}
              onPress={() => onSelect(reply)}
              onLongPress={isCustom ? () => handleDeleteCustomReply(reply) : undefined}
              activeOpacity={0.7}
              testID={isCustom ? `custom-reply-${reply.id}` : undefined}
            >
              <Text style={styles.replyText} numberOfLines={1}>
                {reply.text}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[styles.replyButton, styles.addButton]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
          testID="quick-reply-add-button"
          accessibilityLabel="添加自定义快捷回复"
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} testID="quick-reply-add-modal">
            <Text style={styles.modalTitle}>添加自定义快捷回复</Text>
            <TextInput
              style={styles.modalInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="输入快捷回复内容"
              placeholderTextColor={theme.colors.textSecondary}
              autoFocus
              maxLength={100}
              testID="quick-reply-add-input"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setInputText('');
                  setModalVisible(false);
                }}
                testID="quick-reply-add-cancel"
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddCustomReply}
                disabled={!inputText.trim()}
                testID="quick-reply-add-confirm"
              >
                <Text style={styles.confirmButtonText}>添加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  addButton: {
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: theme.fonts.sizes.lg,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.bold,
    lineHeight: theme.fonts.sizes.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  modalButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    minWidth: 72,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
  },
  confirmButton: {
    backgroundColor: theme.colors.primary,
  },
  confirmButtonText: {
    color: theme.colors.background,
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.bold,
  },
});

export default QuickReply;
