import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AgentStatus } from '@bridgeai/shared';

import { ScreenContainer } from '../../components/ScreenContainer';
import { Header } from '../../components/Header';
import { EmptyState } from '../../components/EmptyState';
import { UserAvatar } from '../../components/UserAvatar';
import { useMessageStore } from '../../stores/messageStore';
import { MessagesStackParamList } from '../../types/navigation';
import { theme } from '../../theme';
import { agentsApi } from '../../services/api/agents';
import { formatRelativeDate } from '../../utils/format';

type NavigationProp = NativeStackNavigationProp<MessagesStackParamList, 'NewChat'>;

interface ContactItem {
  id: string;
  name: string;
  avatarUri?: string;
  sceneTag: string;
  lastActive: string;
}

export const NewChatScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { conversations } = useMessageStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);

  // Group chat creation state
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await agentsApi.getAgents({ status: AgentStatus.ACTIVE, limit: 100 });
        const agents = response.data.data?.agents || [];
        setContacts(
          agents.map(agent => ({
            id: agent.id,
            name: agent.name,
            avatarUri: undefined,
            sceneTag: agent.type,
            lastActive: formatRelativeDate(agent.updatedAt),
          }))
        );
      } catch {
        // Fall back to empty list on error
        setContacts([]);
      } finally {
        setIsLoadingContacts(false);
      }
    };
    fetchContacts();
  }, []);

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
      ? contacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : contacts;
    return filtered;
  }, [searchQuery, contacts]);

  const handleSelectContact = useCallback(
    (contact: ContactItem) => {
      navigation.replace('Chat', {
        conversationId: contact.id,
        userName: contact.name,
      });
    },
    [navigation]
  );

  const toggleContactSelection = useCallback((contactId: string) => {
    setSelectedContactIds(prev =>
      prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]
    );
  }, []);

  const handleCreateGroup = useCallback(async () => {
    if (selectedContactIds.length < 2 || !groupName.trim()) return;

    setIsCreatingGroup(true);
    try {
      // TODO: Replace with actual API call once backend supports group chat creation
      // const newRoom = await createRoom({
      //   type: 'GROUP',
      //   participantIds: selectedContactIds,
      //   metadata: { name: groupName.trim() },
      // });
      // console.log('Group chat created:', newRoom);
      console.log('Create group:', { name: groupName.trim(), participants: selectedContactIds });
      // Reset state and go back
      setIsGroupMode(false);
      setSelectedContactIds([]);
      setGroupName('');
      navigation.goBack();
    } catch (error) {
      console.error('Failed to create group chat:', error);
    } finally {
      setIsCreatingGroup(false);
    }
  }, [selectedContactIds, groupName, navigation]);

  const handleCancelGroupMode = useCallback(() => {
    setIsGroupMode(false);
    setSelectedContactIds([]);
    setGroupName('');
  }, []);

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
    ({ item }: { item: ContactItem }) => {
      const isSelected = selectedContactIds.includes(item.id);
      return (
        <TouchableOpacity
          style={[styles.contactItem, isSelected && styles.contactItemSelected]}
          onPress={() =>
            isGroupMode ? toggleContactSelection(item.id) : handleSelectContact(item)
          }
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
          {isGroupMode && (
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [isGroupMode, selectedContactIds, handleSelectContact, toggleContactSelection]
  );

  return (
    <ScreenContainer safeAreaTop safeAreaBottom={false}>
      <Header
        title={isGroupMode ? '创建群聊' : '新建会话'}
        showBackButton
        onBackPress={isGroupMode ? handleCancelGroupMode : undefined}
      />

      {isGroupMode ? (
        <View style={styles.groupModeContainer}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.groupNameInput}
              placeholder="输入群聊名称..."
              placeholderTextColor={theme.colors.textTertiary}
              value={groupName}
              onChangeText={setGroupName}
              autoFocus
            />
          </View>
          <Text style={styles.selectionHint}>
            已选择 {selectedContactIds.length} 位联系人（至少选择2位）
          </Text>
          <TouchableOpacity
            style={[
              styles.createGroupButton,
              (selectedContactIds.length < 2 || !groupName.trim() || isCreatingGroup) &&
                styles.createGroupButtonDisabled,
            ]}
            onPress={handleCreateGroup}
            disabled={selectedContactIds.length < 2 || !groupName.trim() || isCreatingGroup}
            activeOpacity={0.7}
          >
            {isCreatingGroup ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.createGroupButtonText}>创建群聊</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
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
          <TouchableOpacity
            style={styles.createGroupEntrance}
            onPress={() => setIsGroupMode(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.createGroupEntranceText}>+ 群聊</Text>
          </TouchableOpacity>
        </View>
      )}

      {recentContacts.length > 0 && !searchQuery.trim() && !isGroupMode && (
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
          isLoadingContacts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <EmptyState
              icon="👤"
              title="未找到用户"
              description={`未找到与 "${searchQuery}" 相关的用户`}
            />
          )
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
  createGroupEntrance: {
    paddingHorizontal: theme.spacing.sm,
  },
  createGroupEntranceText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.semibold,
  },
  groupModeContainer: {
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.base,
    backgroundColor: theme.colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  groupNameInput: {
    flex: 1,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    height: 44,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.base,
  },
  selectionHint: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.base,
    textAlign: 'center',
  },
  createGroupButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createGroupButtonDisabled: {
    opacity: 0.5,
  },
  createGroupButtonText: {
    color: '#fff',
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.sm,
  },
  checkboxSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: theme.fonts.weights.bold,
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
  contactItemSelected: {
    backgroundColor: theme.colors.backgroundSecondary,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.base * 3,
  },
});

export default NewChatScreen;
