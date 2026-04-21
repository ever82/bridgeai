import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useAuthStore } from '../../stores/authStore';
import { theme } from '../../theme';
import {
  getPrivacySettings,
  updatePrivacySettings as updatePrivacySettingsApi,
  handleUserApiError,
} from '../../api/user';
import type { PrivacySettings, PrivacySettingsUpdate } from '../../api/user';

export const PrivacySettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  useAuthStore(); // Keep store subscription for reactivity

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<PrivacySettings>({
    profileVisibility: 'public',
    onlineStatusVisibility: 'everyone',
    phoneVisibility: 'hidden',
    emailVisibility: 'hidden',
    allowSearchByPhone: false,
    allowSearchByEmail: false,
    showLastSeen: true,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await getPrivacySettings();
        setSettings(data);
      } catch {
        Alert.alert('提示', '无法加载隐私设置，使用默认值');
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const updateSetting = useCallback(
    <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => {
      setSettings(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePrivacySettingsApi(settings as PrivacySettingsUpdate);
      Alert.alert('成功', '隐私设置已保存');
      navigation.goBack();
    } catch (error) {
      const apiError = handleUserApiError(error);
      Alert.alert('错误', apiError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const visibilityOptions = [
    { value: 'public', label: '公开', description: '所有人可以看到您的资料' },
    { value: 'friends', label: '好友可见', description: '仅好友可以看到您的资料' },
    { value: 'private', label: '私密', description: '仅自己可见' },
  ] as const;

  const renderVisibilitySection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>资料可见性</Text>
      <View style={styles.optionsContainer}>
        {visibilityOptions.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionItem,
              settings.profileVisibility === option.value && styles.optionItemActive,
            ]}
            onPress={() => updateSetting('profileVisibility', option.value)}
          >
            <View style={styles.optionContent}>
              <Text
                style={[
                  styles.optionLabel,
                  settings.profileVisibility === option.value && styles.optionLabelActive,
                ]}
              >
                {option.label}
              </Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            {settings.profileVisibility === option.value && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSwitchItem = (
    title: string,
    description: string,
    key: 'onlineStatusVisibility' | 'allowSearchByPhone' | 'allowSearchByEmail',
    value: boolean
  ) => (
    <View style={styles.switchItem}>
      <View style={styles.switchContent}>
        <Text style={styles.switchTitle}>{title}</Text>
        <Text style={styles.switchDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={newValue => {
          if (key === 'onlineStatusVisibility') {
            updateSetting('onlineStatusVisibility', newValue ? 'everyone' : 'nobody');
          } else {
            updateSetting(key, newValue);
          }
        }}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={theme.colors.background}
      />
    </View>
  );

  const renderOnlineStatusSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>在线状态</Text>
      <View style={styles.switchItem}>
        <View style={styles.switchContent}>
          <Text style={styles.switchTitle}>显示在线状态</Text>
          <Text style={styles.switchDescription}>允许其他人看到您的在线状态</Text>
        </View>
        <Switch
          value={settings.onlineStatusVisibility === 'everyone'}
          onValueChange={newValue =>
            updateSetting('onlineStatusVisibility', newValue ? 'everyone' : 'nobody')
          }
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor={theme.colors.background}
        />
      </View>
      <View style={styles.switchItem}>
        <View style={styles.switchContent}>
          <Text style={styles.switchTitle}>显示最后在线时间</Text>
          <Text style={styles.switchDescription}>允许其他人看到您的最后在线时间</Text>
        </View>
        <Switch
          value={settings.showLastSeen}
          onValueChange={newValue => updateSetting('showLastSeen', newValue)}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor={theme.colors.background}
        />
      </View>
    </View>
  );

  const renderContactInfoSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>联系方式可见性</Text>
      <View style={styles.switchItem}>
        <View style={styles.switchContent}>
          <Text style={styles.switchTitle}>显示手机号</Text>
          <Text style={styles.switchDescription}>允许其他人看到您的手机号</Text>
        </View>
        <Switch
          value={settings.phoneVisibility !== 'hidden'}
          onValueChange={newValue =>
            updateSetting('phoneVisibility', newValue ? 'friends' : 'hidden')
          }
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor={theme.colors.background}
        />
      </View>
      <View style={styles.switchItem}>
        <View style={styles.switchContent}>
          <Text style={styles.switchTitle}>显示邮箱</Text>
          <Text style={styles.switchDescription}>允许其他人看到您的邮箱地址</Text>
        </View>
        <Switch
          value={settings.emailVisibility !== 'hidden'}
          onValueChange={newValue =>
            updateSetting('emailVisibility', newValue ? 'friends' : 'hidden')
          }
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor={theme.colors.background}
        />
      </View>
    </View>
  );

  const renderSearchSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>搜索设置</Text>
      {renderSwitchItem(
        '允许通过手机号搜索',
        '其他人可以通过手机号找到您',
        'allowSearchByPhone',
        settings.allowSearchByPhone
      )}
      {renderSwitchItem(
        '允许通过邮箱搜索',
        '其他人可以通过邮箱找到您',
        'allowSearchByEmail',
        settings.allowSearchByEmail
      )}
    </View>
  );

  const renderBlockedSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>阻止列表</Text>
      <TouchableOpacity
        style={styles.blockedButton}
        onPress={() => navigation.navigate('BlockedUsers')}
      >
        <Text style={styles.blockedButtonText}>管理阻止的用户</Text>
        <Text style={styles.blockedArrow}>›</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>隐私设置</Text>
        <TouchableOpacity onPress={handleSave} disabled={isLoading || isSaving}>
          <Text style={[styles.saveButton, (isLoading || isSaving) && styles.saveButtonDisabled]}>
            {isSaving ? '保存中...' : '保存'}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {renderVisibilitySection()}
          {renderOnlineStatusSection()}
          {renderContactInfoSection()}
          {renderSearchSection()}
          {renderBlockedSection()}
        </ScrollView>
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
  saveButton: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.semibold,
  },
  saveButtonDisabled: {
    color: theme.colors.textSecondary,
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
  content: {
    flex: 1,
  },
  section: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  optionsContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  optionItemActive: {
    backgroundColor: theme.colors.primary + '10',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  optionLabelActive: {
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.semibold,
  },
  optionDescription: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: theme.colors.textInverse,
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.bold,
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  switchContent: {
    flex: 1,
    paddingRight: theme.spacing.base,
  },
  switchTitle: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  switchDescription: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  blockedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  blockedButtonText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
  },
  blockedArrow: {
    fontSize: theme.fonts.sizes.lg,
    color: theme.colors.textSecondary,
  },
});
