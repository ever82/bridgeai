import React, { useState, useRef, useCallback, useMemo } from 'react';
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
  ScrollView,
  LayoutAnimation,
} from 'react-native';

import { theme } from '../../theme';

/** Minimal user shape for mention suggestions. */
export interface MentionUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

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
  onVoiceInput?: () => void;
  /** List of users available for @mention suggestions. */
  mentionUsers?: MentionUser[];
  placeholder?: string;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onAttachmentPress,
  onVoiceInput,
  mentionUsers = [],
  placeholder = '输入消息...',
  disabled = false,
  style,
  testID,
}) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
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

  // ── @mention logic ──────────────────────────────────────────────

  /**
   * Called on every text change. Detects whether the cursor is inside an
   * active @mention trigger (i.e. the user just typed "@" or is typing a
   * name after it) and updates `mentionQuery` accordingly.
   */
  const handleTextChanged = useCallback(
    (next: string) => {
      setText(next);

      if (mentionUsers.length === 0) {
        setMentionQuery(null);
        return;
      }

      // Find the last "@" in the text
      const lastAtIndex = next.lastIndexOf('@');
      if (lastAtIndex === -1) {
        setMentionQuery(null);
        return;
      }

      // The text after the "@" up to the end is the potential query
      const afterAt = next.slice(lastAtIndex + 1);
      // If there is a space after "@", it's not a mention trigger
      if (afterAt.includes(' ')) {
        setMentionQuery(null);
        return;
      }

      setMentionQuery(afterAt);
    },
    [mentionUsers.length]
  );

  /** Filtered user list shown in the suggestion popup. */
  const filteredUsers = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return mentionUsers.filter(u => u.displayName.toLowerCase().includes(q));
  }, [mentionQuery, mentionUsers]);

  /**
   * Inserts the selected user's @mention into the text, replacing the
   * current "@query" portion.
   */
  const handleMentionSelect = useCallback(
    (user: MentionUser) => {
      const lastAtIndex = text.lastIndexOf('@');
      if (lastAtIndex === -1) return;

      const before = text.slice(0, lastAtIndex);
      const after = text.slice(lastAtIndex).replace(/@\S*/, '');
      const mention = `@${user.displayName} `;
      const next = `${before}${mention}${after}`;

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setText(next);
      setMentionQuery(null);
      inputRef.current?.focus();
    },
    [text]
  );

  const hideMentionPopup = useCallback(() => {
    if (mentionQuery !== null) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setMentionQuery(null);
    }
  }, [mentionQuery]);

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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTabs}>
            {EMOJI_CATEGORIES.map((category, index) => (
              <TouchableOpacity
                key={category.name}
                style={[styles.categoryTab, selectedCategory === index && styles.categoryTabActive]}
                onPress={() => setSelectedCategory(index)}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    selectedCategory === index && styles.categoryTabTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <FlatList
            data={EMOJI_CATEGORIES[selectedCategory].emojis}
            renderItem={renderEmojiItem}
            keyExtractor={(item, index) => `${item}-${index}`}
            numColumns={8}
            contentContainerStyle={styles.emojiGrid}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      {/* @mention suggestion popup */}
      {filteredUsers.length > 0 && (
        <View style={styles.mentionPopup} testID="mention-popup">
          <FlatList
            data={filteredUsers}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.mentionItem}
                onPress={() => handleMentionSelect(item)}
                testID={`mention-item-${item.id}`}
              >
                <View style={styles.mentionAvatar}>
                  <Text style={styles.mentionAvatarText}>
                    {item.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.mentionName}>{item.displayName}</Text>
              </TouchableOpacity>
            )}
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

        {onVoiceInput && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onVoiceInput}
            testID="voice-input-button"
          >
            <Text style={styles.actionIcon}>🎤</Text>
          </TouchableOpacity>
        )}

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
          onChangeText={handleTextChanged}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          maxLength={2000}
          editable={!disabled}
          onBlur={hideMentionPopup}
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
  categoryTabs: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  categoryTab: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  categoryTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  categoryTabText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  categoryTabTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
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
  // ── Mention popup styles ──────────────────────────────────────────
  mentionPopup: {
    maxHeight: 180,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  mentionAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mentionAvatarText: {
    color: theme.colors.textInverse,
    fontSize: theme.fonts.sizes.sm,
    fontWeight: '600',
  },
  mentionName: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
  },
});

export default ChatInput;
