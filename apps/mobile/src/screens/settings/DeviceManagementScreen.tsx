import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { theme } from '../../theme';
import { getDevices, removeDevice, handleUserApiError } from '../../api/user';
import type { Device } from '../../api/user';

export const DeviceManagementScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setIsLoading(true);
      const data = await getDevices();
      setDevices(data);
    } catch (error) {
      const apiError = handleUserApiError(error);
      Alert.alert('错误', apiError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveDevice = useCallback((deviceId: string, deviceName?: string) => {
    Alert.alert('移除设备', `确定要移除 "${deviceName || '该设备'}" 吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '移除',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsRemoving(deviceId);
            await removeDevice(deviceId);
            setDevices(prev => prev.filter(d => d.id !== deviceId));
            Alert.alert('成功', '设备已移除');
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '未知';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('zh-CN');
    } catch {
      return dateStr;
    }
  };

  const getDeviceIcon = (deviceType?: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'ios':
      case 'android':
        return '📱';
      case 'web':
        return '💻';
      default:
        return '📱';
    }
  };

  const renderItem = ({ item }: { item: Device }) => (
    <View style={styles.deviceItem}>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceIcon}>{getDeviceIcon(item.deviceType)}</Text>
        <View style={styles.deviceDetails}>
          <Text style={styles.deviceName}>
            {item.deviceName || item.deviceType || '未知设备'}
            {item.isCurrent && <Text style={styles.currentBadge}> (当前设备)</Text>}
          </Text>
          {item.osVersion && <Text style={styles.deviceMeta}>系统: {item.osVersion}</Text>}
          {item.appVersion && <Text style={styles.deviceMeta}>版本: {item.appVersion}</Text>}
          <Text style={styles.deviceMeta}>最后活跃: {formatDate(item.lastActiveAt)}</Text>
        </View>
      </View>
      {!item.isCurrent && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveDevice(item.id, item.deviceName)}
          disabled={isRemoving === item.id}
        >
          {isRemoving === item.id ? (
            <ActivityIndicator size="small" color={theme.colors.error} />
          ) : (
            <Text style={styles.removeText}>移除</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>暂无设备信息</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>登录设备</Text>
        <View style={styles.placeholder} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={devices.length === 0 && styles.emptyListContainer}
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
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceIcon: {
    fontSize: 24,
    marginRight: theme.spacing.base,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceName: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    fontWeight: theme.fonts.weights.medium,
  },
  currentBadge: {
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.semibold,
  },
  deviceMeta: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  removeButton: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
  },
  removeText: {
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
