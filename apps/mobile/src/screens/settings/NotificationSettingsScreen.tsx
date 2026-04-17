/**
 * 通知设置页面 (Notification Settings Screen)
 * 管理推送开关、频率控制、免打扰时段
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useThemeStore } from '../../stores/themeStore';
import { theme as themeColors } from '../../theme';
import { apiClient } from '../../services/api';

// 通知偏好设置接口
interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  matchNotifications: boolean;
  messageNotifications: boolean;
  ratingNotifications: boolean;
  systemNotifications: boolean;
  promotionNotifications: boolean;
  dailyLimit: number;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietHoursEnabled: boolean;
}

// 默认偏好设置
const defaultPreferences: NotificationPreferences = {
  pushEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  inAppEnabled: true,
  matchNotifications: true,
  messageNotifications: true,
  ratingNotifications: true,
  systemNotifications: true,
  promotionNotifications: false,
  dailyLimit: 100,
  quietHoursStart: null,
  quietHoursEnd: null,
  quietHoursEnabled: false,
};

export const NotificationSettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useThemeStore();
  const isDarkMode = theme === 'dark';

  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 获取当前偏好设置
  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/notification-preferences');
      if (response.data) {
        setPreferences({ ...defaultPreferences, ...response.data });
      }
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error);
      Alert.alert('错误', '获取通知设置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 保存偏好设置
  const savePreferences = useCallback(async () => {
    try {
      setSaving(true);
      await apiClient.put('/notification-preferences', preferences);
      setHasChanges(false);
      Alert.alert('成功', '通知设置已保存');
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      Alert.alert('错误', '保存通知设置失败');
    } finally {
      setSaving(false);
    }
  }, [preferences]);

  // 更新单个设置项
  const updatePreference = useCallback(<K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  // 重置为默认设置
  const resetToDefaults = useCallback(async () => {
    Alert.alert(
      '确认重置',
      '确定要将所有通知设置重置为默认值吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '重置',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await apiClient.post('/notification-preferences/reset');
              await fetchPreferences();
              setHasChanges(false);
              Alert.alert('成功', '通知设置已重置为默认值');
            } catch (error) {
              console.error('Failed to reset preferences:', error);
              Alert.alert('错误', '重置通知设置失败');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }, [fetchPreferences]);

  // 验证时间格式
  const validateTime = (time: string): boolean => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  // 处理时间输入
  const handleTimeChange = (field: 'quietHoursStart' | 'quietHoursEnd', value: string) => {
    if (value === '' || validateTime(value)) {
      updatePreference(field, value || null);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={themeColors.colors.primary} />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  // 设置分组
  const settingsGroups = [
    {
      title: '推送渠道',
      items: [
        {
          title: '应用内通知',
          subtitle: '在应用内显示通知',
          type: 'toggle' as const,
          value: preferences.inAppEnabled,
          onChange: (value: boolean) => updatePreference('inAppEnabled', value),
        },
        {
          title: '推送通知',
          subtitle: '接收推送通知到设备',
          type: 'toggle' as const,
          value: preferences.pushEnabled,
          onChange: (value: boolean) => updatePreference('pushEnabled', value),
        },
        {
          title: '邮件通知',
          subtitle: '接收重要通知邮件',
          type: 'toggle' as const,
          value: preferences.emailEnabled,
          onChange: (value: boolean) => updatePreference('emailEnabled', value),
        },
        {
          title: '短信通知',
          subtitle: '接收重要通知短信（可能产生费用）',
          type: 'toggle' as const,
          value: preferences.smsEnabled,
          onChange: (value: boolean) => updatePreference('smsEnabled', value),
        },
      ],
    },
    {
      title: '通知类型',
      items: [
        {
          title: '匹配通知',
          subtitle: '新匹配、匹配状态变更',
          type: 'toggle' as const,
          value: preferences.matchNotifications,
          onChange: (value: boolean) => updatePreference('matchNotifications', value),
          disabled: !preferences.pushEnabled && !preferences.emailEnabled && !preferences.inAppEnabled,
        },
        {
          title: '消息通知',
          subtitle: '新消息提醒',
          type: 'toggle' as const,
          value: preferences.messageNotifications,
          onChange: (value: boolean) => updatePreference('messageNotifications', value),
          disabled: !preferences.pushEnabled && !preferences.emailEnabled && !preferences.inAppEnabled,
        },
        {
          title: '评分通知',
          subtitle: '收到新的评分',
          type: 'toggle' as const,
          value: preferences.ratingNotifications,
          onChange: (value: boolean) => updatePreference('ratingNotifications', value),
          disabled: !preferences.pushEnabled && !preferences.emailEnabled && !preferences.inAppEnabled,
        },
        {
          title: '系统通知',
          subtitle: '系统公告、维护通知',
          type: 'toggle' as const,
          value: preferences.systemNotifications,
          onChange: (value: boolean) => updatePreference('systemNotifications', value),
          disabled: !preferences.pushEnabled && !preferences.emailEnabled && !preferences.inAppEnabled,
        },
        {
          title: '促销通知',
          subtitle: '活动、优惠推广',
          type: 'toggle' as const,
          value: preferences.promotionNotifications,
          onChange: (value: boolean) => updatePreference('promotionNotifications', value),
          disabled: !preferences.pushEnabled && !preferences.emailEnabled && !preferences.inAppEnabled,
        },
      ],
    },
    {
      title: '免打扰时段',
      items: [
        {
          title: '启用免打扰',
          subtitle: '在指定时段内不接收非紧急通知',
          type: 'toggle' as const,
          value: preferences.quietHoursEnabled,
          onChange: (value: boolean) => updatePreference('quietHoursEnabled', value),
        },
        {
          title: '开始时间',
          type: 'input' as const,
          value: preferences.quietHoursStart || '',
          placeholder: '22:00',
          onChange: (value: string) => handleTimeChange('quietHoursStart', value),
          disabled: !preferences.quietHoursEnabled,
        },
        {
          title: '结束时间',
          type: 'input' as const,
          value: preferences.quietHoursEnd || '',
          placeholder: '08:00',
          onChange: (value: string) => handleTimeChange('quietHoursEnd', value),
          disabled: !preferences.quietHoursEnabled,
        },
      ],
    },
    {
      title: '频率限制',
      items: [
        {
          title: '每日上限',
          subtitle: '每天最多接收的通知数量',
          type: 'number' as const,
          value: String(preferences.dailyLimit),
          onChange: (value: string) => {
            const num = parseInt(value, 10);
            if (!isNaN(num) && num >= 0) {
              updatePreference('dailyLimit', num);
            }
          },
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>通知设置</Text>
        <TouchableOpacity
          onPress={savePreferences}
          disabled={!hasChanges || saving}
          style={[styles.saveButton, (!hasChanges || saving) && styles.saveButtonDisabled]}
        >
          <Text style={[styles.saveButtonText, (!hasChanges || saving) && styles.saveButtonTextDisabled]}>
            {saving ? '保存中...' : '保存'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {settingsGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.groupContent}>
              {group.items.map((item, itemIndex) => (
                <View
                  key={itemIndex}
                  style={[
                    styles.settingItem,
                    itemIndex === group.items.length - 1 && styles.settingItemLast,
                    item.disabled && styles.settingItemDisabled,
                  ]}
                >
                  <View style={styles.settingItemLeft}>
                    <Text style={[styles.settingTitle, item.disabled && styles.settingTextDisabled]}>
                      {item.title}
                    </Text>
                    {item.subtitle && (
                      <Text style={[styles.settingSubtitle, item.disabled && styles.settingTextDisabled]}>
                        {item.subtitle}
                      </Text>
                    )}
                  </View>
                  {item.type === 'toggle' && (
                    <Switch
                      value={item.value}
                      onValueChange={item.onChange}
                      disabled={item.disabled}
                      trackColor={{ false: '#767577', true: themeColors.colors.primary }}
                      thumbColor={item.value ? '#fff' : '#f4f3f4'}
                    />
                  )}
                  {item.type === 'input' && (
                    <TextInput
                      style={styles.textInput}
                      value={item.value}
                      onChangeText={item.onChange}
                      placeholder={item.placeholder}
                      placeholderTextColor={themeColors.colors.textSecondary}
                      editable={!item.disabled}
                      keyboardType="default"
                      maxLength={5}
                    />
                  )}
                  {item.type === 'number' && (
                    <TextInput
                      style={styles.textInput}
                      value={item.value}
                      onChangeText={item.onChange}
                      placeholder="100"
                      placeholderTextColor={themeColors.colors.textSecondary}
                      editable={!item.disabled}
                      keyboardType="number-pad"
                      maxLength={4}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Reset Button */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetToDefaults}
          disabled={saving}
        >
          <Text style={styles.resetButtonText}>重置为默认设置</Text>
        </TouchableOpacity>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            提示：紧急通知（如安全问题）不受免打扰时段和频率限制影响。
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: themeColors.spacing.base,
    fontSize: themeColors.fonts.sizes.base,
    color: themeColors.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: themeColors.spacing.base,
    paddingVertical: themeColors.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.colors.border,
  },
  backButton: {
    padding: themeColors.spacing.sm,
  },
  backIcon: {
    fontSize: 20,
    color: themeColors.colors.text,
  },
  headerTitle: {
    fontSize: themeColors.fonts.sizes.md,
    fontWeight: themeColors.fonts.weights.semibold,
    color: themeColors.colors.text,
  },
  saveButton: {
    paddingHorizontal: themeColors.spacing.base,
    paddingVertical: themeColors.spacing.sm,
    backgroundColor: themeColors.colors.primary,
    borderRadius: 6,
  },
  saveButtonDisabled: {
    backgroundColor: themeColors.colors.border,
  },
  saveButtonText: {
    fontSize: themeColors.fonts.sizes.sm,
    fontWeight: themeColors.fonts.weights.medium,
    color: '#fff',
  },
  saveButtonTextDisabled: {
    color: themeColors.colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  group: {
    marginBottom: themeColors.spacing.lg,
  },
  groupTitle: {
    fontSize: themeColors.fonts.sizes.sm,
    color: themeColors.colors.textSecondary,
    paddingHorizontal: themeColors.spacing.lg,
    paddingVertical: themeColors.spacing.base,
    textTransform: 'uppercase',
  },
  groupContent: {
    backgroundColor: themeColors.colors.background,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: themeColors.spacing.lg,
    paddingVertical: themeColors.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.colors.border,
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingItemDisabled: {
    opacity: 0.6,
  },
  settingItemLeft: {
    flex: 1,
    paddingRight: themeColors.spacing.base,
  },
  settingTitle: {
    fontSize: themeColors.fonts.sizes.base,
    color: themeColors.colors.text,
  },
  settingSubtitle: {
    fontSize: themeColors.fonts.sizes.sm,
    color: themeColors.colors.textSecondary,
    marginTop: themeColors.spacing.xs,
  },
  settingTextDisabled: {
    color: themeColors.colors.textSecondary,
  },
  textInput: {
    width: 80,
    height: 36,
    borderWidth: 1,
    borderColor: themeColors.colors.border,
    borderRadius: 6,
    paddingHorizontal: themeColors.spacing.sm,
    fontSize: themeColors.fonts.sizes.base,
    color: themeColors.colors.text,
    textAlign: 'center',
  },
  resetButton: {
    marginHorizontal: themeColors.spacing.lg,
    marginVertical: themeColors.spacing.lg,
    paddingVertical: themeColors.spacing.lg,
    borderWidth: 1,
    borderColor: themeColors.colors.error,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: themeColors.fonts.sizes.base,
    color: themeColors.colors.error,
    fontWeight: themeColors.fonts.weights.medium,
  },
  infoSection: {
    paddingHorizontal: themeColors.spacing.lg,
    paddingVertical: themeColors.spacing.base,
  },
  infoText: {
    fontSize: themeColors.fonts.sizes.sm,
    color: themeColors.colors.textSecondary,
    textAlign: 'center',
  },
});

export default NotificationSettingsScreen;
