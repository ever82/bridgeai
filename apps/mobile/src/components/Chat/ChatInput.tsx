import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  FlatList,
  StyleSheet,
  ViewStyle,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { theme } from '../../theme';

const EMOJI_CATEGORIES = [
  {
    name: '常用',
    emojis: [
      '😊',
      '😂',
      '🤣',
      '❤️',
      '😍',
      '🤔',
      '😎',
      '👍',
      '👋',
      '🙏',
      '🎉',
      '💪',
      '😘',
      '🥰',
      '😊',
      '😄',
      '🔥',
      '⭐',
      '💯',
      '✨',
      '😢',
      '😭',
      '😤',
      '🙈',
      '🙌',
      '🤝',
      '💬',
      '🎯',
      '💡',
      '🌟',
    ],
  },
  {
    name: '表情',
    emojis: [
      '😀',
      '😁',
      '😃',
      '😄',
      '😅',
      '😆',
      '😉',
      '😊',
      '😋',
      '😎',
      '😍',
      '😘',
      '😗',
      '😙',
      '😚',
      '🙂',
      '🤗',
      '🤩',
      '🤔',
      '🤨',
      '😐',
      '😑',
      '😶',
      '🙄',
      '😏',
      '😣',
      '😥',
      '😮',
      '🤐',
      '😯',
      '😪',
      '😫',
      '😴',
      '😌',
      '😛',
      '😜',
      '😝',
      '🤤',
      '😒',
      '😓',
    ],
  },
];

export interface ChatInputProps {
  onSend: (text: string) => void;
  onAttachmentPress?: () => void;
  placeholder?: string;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onAttachmentPress,
  placeholder = '输入消息...',
  disabled = false,
  style,
  testID,
}) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  }, [text, disabled, onSend]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setText(prev => prev + emoji);
    inputRef.current?.focus();
  }, []);

  const toggleEmojiPicker = useCallback(() => {
    setShowEmojiPicker(prev => !prev);
    if (showEmojiPicker) {
      inputRef.current?.focus();
    }
  }, [showEmojiPicker]);

  const renderEmojiItem = ({ item }: { item: string }) => (
    <TouchableOpacity style={styles.emojiItem} onPress={() => handleEmojiSelect(item)}>
      <Text style={styles.emojiText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, style]}
      testID={testID}
    >
      {showEmojiPicker && (
        <View style={styles.emojiPicker}>
          <FlatList
            data={EMOJI_CATEGORIES[0].emojis}
            renderItem={renderEmojiItem}
            keyExtractor={(item, index) => `${item}-${index}`}
            numColumns={8}
            contentContainerStyle={styles.emojiGrid}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={toggleEmojiPicker}
          testID="emoji-button"
        >
          <Text style={styles.actionIcon}>{showEmojiPicker ? '⌨️' : '😊'}</Text>
        </TouchableOpacity>

        {onAttachmentPress && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onAttachmentPress}
            testID="attachment-button"
          >
            <Text style={styles.actionIcon}>📎</Text>
          </TouchableOpacity>
        )}

        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          maxLength={2000}
          editable={!disabled}
          onFocus={() => setShowEmojiPicker(false)}
        />

        <TouchableOpacity
          style={[styles.sendButton, (!text.trim() || disabled) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || disabled}
          testID="send-button"
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  emojiPicker: {
    height: 180,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  emojiGrid: {
    padding: theme.spacing.sm,
  },
  emojiItem: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionIcon: {
    fontSize: 22,
  },
  input: {
    flex: 1,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    maxHeight: 100,
    lineHeight: 22,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
  sendIcon: {
    fontSize: 18,
    color: theme.colors.textInverse,
  },
});

export default ChatInput;
