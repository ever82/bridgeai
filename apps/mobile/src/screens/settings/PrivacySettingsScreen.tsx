import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { theme } from '../../theme';

interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  onlineStatusVisible: boolean;
  phoneVisible: boolean;
  emailVisible: boolean;
  allowSearchByPhone: boolean;
  allowSearchByEmail: boolean;
  // Desensitization settings
  autoDesensitize: boolean;
  desensitizationTemplate: 'strict' | 'standard' | 'relaxed' | 'custom';
  defaultDesensitizationMethod: 'blur' | 'mosaic' | 'pixelate';
  saveOriginalImage: boolean;
}

export const PrivacySettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuthStore();

  const [settings, setSettings] = useState<PrivacySettings>({
    profileVisibility: 'public',
    onlineStatusVisible: true,
    phoneVisible: false,
    emailVisible: false,
    allowSearchByPhone: true,
    allowSearchByEmail: true,
    // Desensitization settings
    autoDesensitize: true,
    desensitizationTemplate: 'standard',
    defaultDesensitizationMethod: 'blur',
    saveOriginalImage: true,
  });

  const updateSetting = useCallback(<K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    // TODO: Implement API call to save privacy settings
    Alert.alert('成功', '隐私设置已保存');
    navigation.goBack();
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
        {visibilityOptions.map((option) => (
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
    key: keyof PrivacySettings,
    value: boolean
  ) => (
    <View style={styles.switchItem}>
      <View style={styles.switchContent}>
        <Text style={styles.switchTitle}>{title}</Text>
        <Text style={styles.switchDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(newValue) => updateSetting(key, newValue)}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={theme.colors.background}
      />
    </View>
  );

  const renderOnlineStatusSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>在线状态</Text>
      {renderSwitchItem(
        '显示在线状态',
        '允许其他人看到您的在线状态',
        'onlineStatusVisible',
        settings.onlineStatusVisible
      )}
    </View>
  );

  const renderContactInfoSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>联系方式可见性</Text>
      {renderSwitchItem(
        '显示手机号',
        '允许其他人看到您的手机号',
        'phoneVisible',
        settings.phoneVisible
      )}
      {renderSwitchItem(
        '显示邮箱',
        '允许其他人看到您的邮箱地址',
        'emailVisible',
        settings.emailVisible
      )}
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

  const desensitizationTemplates = [
    {
      value: 'strict',
      label: '严格模式',
      description: '最高级别的隐私保护，自动脱敏所有敏感内容',
    },
    {
      value: 'standard',
      label: '标准模式',
      label: '标准模式',
      description: '平衡的隐私保护和图像质量',
    },
    {
      value: 'relaxed',
      label: '宽松模式',
      description: '最小限度的脱敏，适用于非敏感场合',
    },
    {
      value: 'custom',
      label: '自定义',
      description: '根据您的偏好自定义脱敏规则',
    },
  ] as const;

  const renderDesensitizationTemplateSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>脱敏策略模板</Text>
      <View style={styles.optionsContainer}>
        {desensitizationTemplates.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionItem,
              settings.desensitizationTemplate === option.value && styles.optionItemActive,
            ]}
            onPress={() => updateSetting('desensitizationTemplate', option.value)}
          >
            <View style={styles.optionContent}>
              <Text
                style={[
                  styles.optionLabel,
                  settings.desensitizationTemplate === option.value && styles.optionLabelActive,
                ]}
              >
                {option.label}
              </Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            {settings.desensitizationTemplate === option.value && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderAutoDesensitizationSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>自动脱敏</Text>
      {renderSwitchItem(
        '自动脱敏上传的图片',
        '上传时自动检测并脱敏敏感内容',
        'autoDesensitize',
        settings.autoDesensitize
      )}
      {renderSwitchItem(
        '保存原始图片',
        '同时保存脱敏前后的版本',
        'saveOriginalImage',
        settings.saveOriginalImage
      )}
    </View>
  );

  const renderDesensitizationSettingsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>脱敏设置</Text>
      <TouchableOpacity
        style={styles.blockedButton}
        onPress={() => Alert.alert('提示', '自定义规则功能即将推出')}
      >
        <Text style={styles.blockedButtonText}>自定义脱敏规则</Text>
        <Text style={styles.blockedArrow}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.blockedButton}
        onPress={() => Alert.alert('提示', '白名单管理功能即将推出')}
      >
        <Text style={styles.blockedButtonText}>管理白名单</Text>
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
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveButton}>保存</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {renderVisibilitySection()}
        {renderOnlineStatusSection()}
        {renderContactInfoSection()}
        {renderSearchSection()}
        {renderDesensitizationTemplateSection()}
        {renderAutoDesensitizationSection()}
        {renderDesensitizationSettingsSection()}
        {renderBlockedSection()}
      </ScrollView>
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
