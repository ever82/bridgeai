import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScreenContainer } from '../../components/ScreenContainer';
import { Header } from '../../components/Header';
import { EmptyState } from '../../components/EmptyState';
import { UserAvatar } from '../../components/UserAvatar';
import { useMessageStore } from '../../stores/messageStore';
import { MessagesStackParamList } from '../../types/navigation';
import { theme } from '../../theme';

type NavigationProp = NativeStackNavigationProp<MessagesStackParamList, 'NewChat'>;

interface ContactItem {
  id: string;
  name: string;
  avatarUri?: string;
  sceneTag: string;
  lastActive: string;
}

const mockContacts: ContactItem[] = [
  { id: '1', name: '小红', sceneTag: 'AgentDate', lastActive: '1分钟前' },
  { id: '2', name: 'Nike旗舰店', sceneTag: 'AgentAd', lastActive: '5分钟前' },
  { id: '3', name: '某互联网公司', sceneTag: 'AgentJob', lastActive: '1小时前' },
  { id: '4', name: '张三', sceneTag: 'VisionShare', lastActive: '昨天' },
  { id: '5', name: '李四', sceneTag: 'AgentDate', lastActive: '2天前' },
];

export const NewChatScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { conversations } = useMessageStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Recent contacts from existing conversations
  const recentContacts = useMemo(
    () =>
      conversations
        .filter(c => c.status !== 'ended')
        .slice(0, 5)
        .map(c => ({
          id: c.id,
          name: c.name,
          avatarUri: c.avatarUri,
          sceneTag: c.sceneTag,
          lastActive: c.lastMessageTime,
        })),
    [conversations]
  );

  const allContacts = useMemo(() => {
    const filtered = searchQuery.trim()
      ? mockContacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : mockContacts;
    return filtered;
  }, [searchQuery]);

  const handleSelectContact = useCallback(
    (contact: ContactItem) => {
      navigation.replace('Chat', {
        conversationId: contact.id,
        userName: contact.name,
      });
    },
    [navigation]
  );

  const renderRecentContact = useCallback(
    ({ item }: { item: (typeof recentContacts)[0] }) => (
      <TouchableOpacity
        style={styles.recentChip}
        onPress={() =>
          handleSelectContact({
            id: item.id,
            name: item.name,
            avatarUri: item.avatarUri,
            sceneTag: item.sceneTag,
            lastActive: item.lastActive,
          })
        }
        activeOpacity={0.7}
      >
        <UserAvatar uri={item.avatarUri} name={item.name} size="sm" />
        <Text style={styles.recentChipName} numberOfLines={1}>
          {item.name}
        </Text>
      </TouchableOpacity>
    ),
    [handleSelectContact]
  );

  const renderContact = useCallback(
    ({ item }: { item: ContactItem }) => (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => handleSelectContact(item)}
        activeOpacity={0.7}
      >
        <UserAvatar uri={item.avatarUri} name={item.name} size="md" />
        <View style={styles.contactContent}>
          <Text style={styles.contactName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.contactMeta}>
            {item.sceneTag} · {item.lastActive}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [handleSelectContact]
  );

  return (
    <ScreenContainer safeAreaTop safeAreaBottom={false}>
      <Header title="新建会话" showBackButton />

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索用户..."
          placeholderTextColor={theme.colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          autoFocus
          clearButtonMode="while-editing"
        />
      </View>

      {recentContacts.length > 0 && !searchQuery.trim() && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>最近联系人</Text>
          <FlatList
            data={recentContacts}
            renderItem={renderRecentContact}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentList}
          />
        </View>
      )}

      <FlatList
        data={allContacts}
        renderItem={renderContact}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          !searchQuery.trim() ? (
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>联系人</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="👤"
            title="未找到用户"
            description={`未找到与 "${searchQuery}" 相关的用户`}
          />
        }
        contentContainerStyle={allContacts.length === 0 ? styles.emptyContent : undefined}
      />
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
  section: {
    paddingHorizontal: theme.spacing.base,
    marginTop: theme.spacing.base,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  recentList: {
    gap: theme.spacing.base,
  },
  recentChip: {
    alignItems: 'center',
    width: 64,
  },
  recentChipName: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.text,
    marginTop: theme.spacing.xs / 2,
    textAlign: 'center',
  },
  listHeader: {
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.base,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  contactContent: {
    flex: 1,
    marginLeft: theme.spacing.base,
  },
  contactName: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs / 2,
  },
  contactMeta: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  emptyContent: {
    flexGrow: 1,
  },
});

export default NewChatScreen;
