import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { theme } from '../../theme';
import { getBlockedUsers, unblockUser, handleUserApiError } from '../../api/user';
import type { BlockedUser } from '../../api/user';

export const BlockedUsersScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    try {
      setIsLoading(true);
      const data = await getBlockedUsers();
      setBlockedUsers(data);
    } catch (error) {
      const apiError = handleUserApiError(error);
      Alert.alert('错误', apiError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = useCallback((userId: string, displayName?: string) => {
    Alert.alert('解除阻止', `确定要解除对 "${displayName || '该用户'}" 的阻止吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '解除',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsRemoving(userId);
            await unblockUser(userId);
            setBlockedUsers(prev => prev.filter(u => u.id !== userId));
            Alert.alert('成功', '已解除阻止');
          } catch (error) {
            const apiError = handleUserApiError(error);
            Alert.alert('错误', apiError.message);
          } finally {
            setIsRemoving(null);
          }
        },
      },
    ]);
  }, []);

  const renderItem = ({ item }: { item: BlockedUser }) => (
    <View style={styles.userItem}>
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{item.displayName?.[0]?.toUpperCase() || '?'}</Text>
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.displayName || item.username || '未知用户'}</Text>
        {item.reason && <Text style={styles.reasonText}>原因：{item.reason}</Text>}
      </View>
      <TouchableOpacity
        style={styles.unblockButton}
        onPress={() => handleUnblock(item.id, item.displayName)}
        disabled={isRemoving === item.id}
      >
        {isRemoving === item.id ? (
          <ActivityIndicator size="small" color={theme.colors.error} />
        ) : (
          <Text style={styles.unblockText}>解除</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>暂无阻止的用户</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>阻止列表</Text>
        <View style={styles.placeholder} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={blockedUsers.length === 0 && styles.emptyListContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.base,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: theme.spacing.base,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.base,
  },
  avatarText: {
    color: theme.colors.textInverse,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    fontWeight: theme.fonts.weights.medium,
  },
  reasonText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  unblockButton: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
  },
  unblockText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.error,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: theme.spacing['2xl'],
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
  },
});
