import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

import { theme } from '../../theme';
import { useDebounce } from '../../hooks/useDebounce';

export interface ChatSearchProps {
  messages: Array<{ id: string; content: string }>;
  onScrollToMessage: (messageId: string) => void;
  onClose: () => void;
  testID?: string;
}

export const ChatSearch: React.FC<ChatSearchProps> = ({
  messages,
  onScrollToMessage,
  onClose,
  testID,
}) => {
  const [query, setQuery] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<TextInput>(null);

  const debouncedQuery = useDebounce(query, 300);

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const lower = debouncedQuery.toLowerCase();
    return messages.filter(m => m.content.toLowerCase().includes(lower));
  }, [debouncedQuery, messages]);

  const handlePrevious = useCallback(() => {
    if (results.length === 0) return;
    const newIndex = currentIndex > 0 ? currentIndex - 1 : results.length - 1;
    setCurrentIndex(newIndex);
    onScrollToMessage(results[newIndex].id);
  }, [results, currentIndex, onScrollToMessage]);

  const handleNext = useCallback(() => {
    if (results.length === 0) return;
    const newIndex = currentIndex < results.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    onScrollToMessage(results[newIndex].id);
  }, [results, currentIndex, onScrollToMessage]);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    setCurrentIndex(0);
  }, []);

  const matchCountText = useMemo(() => {
    if (!debouncedQuery.trim() || results.length === 0) return '';
    return `${currentIndex + 1}/${results.length}`;
  }, [debouncedQuery, results.length, currentIndex]);

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.searchBar}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={query}
          onChangeText={handleQueryChange}
          placeholder="Search messages..."
          placeholderTextColor={theme.colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          autoFocus
          testID={testID ? `${testID}-input` : undefined}
        />
        {results.length > 0 && (
          <Text style={styles.matchCount} testID={testID ? `${testID}-count` : undefined}>
            {matchCountText}
          </Text>
        )}
        <TouchableOpacity
          onPress={handlePrevious}
          style={styles.navButton}
          disabled={results.length === 0}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          testID={testID ? `${testID}-prev` : undefined}
        >
          <Text style={[styles.navIcon, results.length === 0 && styles.navIconDisabled]}>
            {'\u25B2'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleNext}
          style={styles.navButton}
          disabled={results.length === 0}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          testID={testID ? `${testID}-next` : undefined}
        >
          <Text style={[styles.navIcon, results.length === 0 && styles.navIconDisabled]}>
            {'\u25BC'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
          testID={testID ? `${testID}-close` : undefined}
        >
          <Text style={styles.closeIcon}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    height: 40,
    paddingLeft: theme.spacing.md,
  },
  input: {
    flex: 1,
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.text,
    height: 40,
  },
  matchCount: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.sm,
    fontWeight: theme.fonts.weights.medium,
    minWidth: 36,
    textAlign: 'center',
  },
  navButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 28,
    height: 28,
  },
  navIcon: {
    fontSize: 12,
    color: theme.colors.primary,
  },
  navIconDisabled: {
    color: theme.colors.textTertiary,
  },
  closeButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    height: 32,
    marginRight: theme.spacing.xs,
  },
  closeIcon: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
});
