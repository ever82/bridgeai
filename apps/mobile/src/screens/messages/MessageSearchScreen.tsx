import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  type TextStyle,
  type TextProps,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenContainer } from '../../components/ScreenContainer/ScreenContainer';
import { Header } from '../../components/Header/Header';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { UserAvatar } from '../../components/UserAvatar/UserAvatar';
import { useMessageStore } from '../../stores/messageStore';
import { MessagesStackParamList } from '../../types/navigation';
import { theme } from '../../theme';

type NavigationProp = NativeStackNavigationProp<MessagesStackParamList, 'MessageSearch'>;

interface HighlightTextProps extends TextProps {
  text: string;
  query: string;
  highlightStyle?: TextStyle;
}

const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  query,
  style,
  highlightStyle,
  numberOfLines,
}) => {
  if (!query.trim()) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <Text key={i} style={[style as TextStyle, highlightStyle]}>
            {part}
          </Text>
        ) : (
          part
        )
      )}
    </Text>
  );
};

export const MessageSearchScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [query, setQuery] = useState('');

  const {
    searchResults,
    recentSearches,
    isSearching,
    performSearch,
    clearSearch,
    addRecentSearch,
    removeRecentSearch,
  } = useMessageStore();

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      } else {
        clearSearch();
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, performSearch, clearSearch]);

  const handleSubmit = useCallback(() => {
    if (query.trim()) {
      addRecentSearch(query.trim());
      performSearch(query.trim());
    }
  }, [query, addRecentSearch, performSearch]);

  const handleRecentPress = useCallback(
    (search: string) => {
      setQuery(search);
      performSearch(search);
    },
    [performSearch]
  );

  const handleContactPress = useCallback(
    (contactId: string, name: string) => {
      addRecentSearch(query.trim() || name);
      navigation.navigate('Chat', { conversationId: contactId, userName: name });
    },
    [navigation, addRecentSearch, query]
  );

  const handleMessagePress = useCallback(
    (roomId: string, senderName: string) => {
      addRecentSearch(query.trim() || senderName);
      navigation.navigate('Chat', { conversationId: roomId, userName: senderName });
    },
    [navigation, addRecentSearch, query]
  );

  const renderRecentSearchItem = useCallback(
    ({ item }: { item: string }) => (
      <View style={styles.recentItem}>
        <TouchableOpacity
          style={styles.recentChip}
          onPress={() => handleRecentPress(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.recentChipText}>{item}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.recentRemove}
          onPress={() => removeRecentSearch(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.recentRemoveText}>✕</Text>
        </TouchableOpacity>
      </View>
    ),
    [handleRecentPress, removeRecentSearch]
  );

  const renderContactItem = useCallback(
    ({ item }: { item: (typeof searchResults.contacts)[0] }) => (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => handleContactPress(item.id, item.name)}
        activeOpacity={0.7}
      >
        <UserAvatar uri={item.avatarUri} name={item.name} size="md" />
        <View style={styles.resultContent}>
          <HighlightText
            text={item.name}
            query={query}
            style={styles.resultName}
            highlightStyle={styles.highlightText}
          />
          <Text style={styles.resultMeta}>
            {item.sceneTag} · {item.conversationCount}个会话
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [handleContactPress, searchResults, query]
  );

  const renderMessageItem = useCallback(
    ({ item }: { item: (typeof searchResults.messages)[0] }) => (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => handleMessagePress(item.roomId, item.senderName)}
        activeOpacity={0.7}
      >
        <View style={styles.messageIcon}>
          <Text style={styles.messageIconText}>💬</Text>
        </View>
        <View style={styles.resultContent}>
          <HighlightText
            text={`\u201C${item.content}\u201D`}
            query={query}
            style={styles.resultMessage}
            highlightStyle={styles.highlightText}
            numberOfLines={2}
          />
          <Text style={styles.resultMeta}>
            {item.senderName} · {item.createdAt}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [handleMessagePress, searchResults, query]
  );

  const hasResults = searchResults.contacts.length > 0 || searchResults.messages.length > 0;
  const hasQuery = query.trim().length > 0;

  return (
    <ScreenContainer safeAreaTop safeAreaBottom={false}>
      <Header title="搜索消息" showBackButton />

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索联系人、消息内容..."
          placeholderTextColor={theme.colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          autoFocus
          clearButtonMode="while-editing"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {isSearching && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      )}

      {!hasQuery && recentSearches.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>最近搜索</Text>
          <FlatList
            data={recentSearches}
            renderItem={renderRecentSearchItem}
            keyExtractor={(item, index) => `recent-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentList}
          />
        </View>
      )}

      {hasQuery && !isSearching && (
        <FlatList
          data={[
            ...searchResults.contacts.map(c => ({ ...c, type: 'contact' as const })),
            ...searchResults.messages.map(m => ({ ...m, type: 'message' as const })),
          ]}
          renderItem={({ item }) =>
            item.type === 'contact'
              ? renderContactItem({ item: item as (typeof searchResults.contacts)[0] })
              : renderMessageItem({ item: item as (typeof searchResults.messages)[0] })
          }
          keyExtractor={(item, index) => `${item.type}-${index}`}
          ListEmptyComponent={
            <EmptyState
              icon="🔍"
              title="未找到结果"
              description={`未找到与 "${query}" 相关的内容`}
            />
          }
          contentContainerStyle={styles.resultsContent}
        />
      )}

      {hasQuery && !isSearching && hasResults && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>搜索结果</Text>
        </View>
      )}

      {!hasQuery && recentSearches.length === 0 && (
        <EmptyState icon="🔍" title="搜索消息" description="输入关键词搜索联系人或消息内容" />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.base,
    marginVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    height: 44,
  },
  clearButton: {
    padding: theme.spacing.xs,
  },
  clearText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  loadingContainer: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: theme.spacing.base,
    marginTop: theme.spacing.base,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  recentList: {
    paddingRight: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentChip: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  recentChipText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.text,
  },
  recentRemove: {
    marginLeft: theme.spacing.xs,
    padding: theme.spacing.xs,
  },
  recentRemoveText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  resultContent: {
    flex: 1,
    marginLeft: theme.spacing.base,
  },
  resultName: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs / 2,
  },
  resultMessage: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs / 2,
  },
  resultMeta: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  messageIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageIconText: {
    fontSize: 20,
  },
  resultsContent: {
    flexGrow: 1,
  },
  highlightText: {
    backgroundColor: 'rgba(255, 213, 79, 0.4)',
    fontWeight: theme.fonts.weights.bold,
  },
});

export default MessageSearchScreen;
