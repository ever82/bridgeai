import React, { useState, useCallback } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  DisclosureLevel,
  DISCLOSURE_LEVEL_INFO,
  DISCLOSABLE_FIELDS,
  DEFAULT_FIELD_DISCLOSURES,
} from '@bridgeai/shared/types/disclosure';

import { theme as themeColors } from '../../theme';
import { apiClient } from '../../services/api/client';

type DisclosureSettingsRouteParams = {
  DisclosureSettings: { agentId?: string };
};

interface DisclosureSettingsProps {
  agentId?: string;
}

interface FieldSetting {
  fieldName: string;
  currentLevel: DisclosureLevel;
  defaultLevel: DisclosureLevel;
  isDisclosable: boolean;
}

export const DisclosureSettings: React.FC<DisclosureSettingsProps> = ({ agentId: propAgentId }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<DisclosureSettingsRouteParams, 'DisclosureSettings'>>();
  const routeAgentId = route.params?.agentId;
  const effectiveAgentId = propAgentId || routeAgentId || '';

  // Mock state - in real implementation, this would come from API
  const [fields, setFields] = useState<FieldSetting[]>(
    DISCLOSABLE_FIELDS.map(fieldName => {
      const defaultConfig = DEFAULT_FIELD_DISCLOSURES.find(f => f.fieldName === fieldName);
      return {
        fieldName,
        currentLevel: defaultConfig?.level || DisclosureLevel.AFTER_MATCH,
        defaultLevel: defaultConfig?.level || DisclosureLevel.AFTER_MATCH,
        isDisclosable: true,
      };
    })
  );

  const [strictMode, setStrictMode] = useState(false);
  const [defaultLevel, setDefaultLevel] = useState<DisclosureLevel>(DisclosureLevel.AFTER_MATCH);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fieldLabels: Record<string, string> = {
    name: '姓名',
    avatar: '头像',
    bio: '个人简介',
    industry: '行业',
    location: '位置',
    contact: '联系方式',
    email: '邮箱',
    phone: '电话',
    company: '公司',
    socialLinks: '社交链接',
    skills: '技能',
    interests: '兴趣爱好',
    experience: '工作经历',
    education: '教育背景',
  };

  const handleFieldLevelChange = useCallback((fieldName: string, level: DisclosureLevel) => {
    setFields(prev =>
      prev.map(f => (f.fieldName === fieldName ? { ...f, currentLevel: level } : f))
    );
    setHasChanges(true);
  }, []);

  const handleBulkSet = useCallback((level: DisclosureLevel) => {
    Alert.alert('批量设置', `将所有字段设置为"${DISCLOSURE_LEVEL_INFO[level].name}"？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        onPress: () => {
          setFields(prev => prev.map(f => ({ ...f, currentLevel: level })));
          setHasChanges(true);
        },
      },
    ]);
  }, []);

  const handleResetToDefaults = useCallback(() => {
    Alert.alert('重置为默认', '确定要重置所有披露设置为默认值吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '重置',
        style: 'destructive',
        onPress: () => {
          setFields(
            DISCLOSABLE_FIELDS.map(fieldName => {
              const defaultConfig = DEFAULT_FIELD_DISCLOSURES.find(f => f.fieldName === fieldName);
              return {
                fieldName,
                currentLevel: defaultConfig?.level || DisclosureLevel.AFTER_MATCH,
                defaultLevel: defaultConfig?.level || DisclosureLevel.AFTER_MATCH,
                isDisclosable: true,
              };
            })
          );
          setStrictMode(false);
          setDefaultLevel(DisclosureLevel.AFTER_MATCH);
          setHasChanges(true);
        },
      },
    ]);
  }, []);

  const handleSave = useCallback(async () => {
    if (!effectiveAgentId) {
      Alert.alert('错误', '缺少 Agent ID，请从设置页面重新进入');
      return;
    }
    setIsSaving(true);
    try {
      const fieldDisclosures = fields.map(f => ({
        fieldName: f.fieldName,
        level: f.currentLevel,
        isDisclosable: f.isDisclosable,
      }));
      await apiClient.put(`/api/v1/disclosure/${effectiveAgentId}/settings`, {
        fieldDisclosures,
        defaultLevel,
        strictMode,
      });
      Alert.alert('保存成功', '披露设置已更新');
      setHasChanges(false);
    } catch {
      Alert.alert('错误', '保存失败，请稍后重试');
    } finally {
      setIsSaving(false);
    }
  }, [effectiveAgentId, fields, defaultLevel, strictMode]);

  const handlePreview = useCallback(() => {
    const previewFields = fields.map(f => ({
      fieldName: f.fieldName,
      currentLevel: f.currentLevel,
    }));
    navigation.navigate('DisclosurePreview', { agentId: effectiveAgentId, fields: previewFields });
  }, [navigation, effectiveAgentId, fields]);

  const disclosureLevels = Object.values(DisclosureLevel);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>信息披露设置</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, (!hasChanges || isSaving) && styles.saveButtonDisabled]}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={themeColors.colors.primary} />
          ) : (
            <Text style={[styles.saveText, !hasChanges && styles.saveTextDisabled]}>保存</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Description */}
        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionTitle}>什么是信息披露控制？</Text>
          <Text style={styles.descriptionText}>
            控制您的个人信息在不同关系阶段对其他用户的可见性。您可以选择哪些信息公开、仅在匹配后可见、私聊后可见或引荐后可见。
          </Text>
        </View>

        {/* Bulk Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>批量设置</Text>
          <View style={styles.bulkButtons}>
            {disclosureLevels.map(level => (
              <TouchableOpacity
                key={level}
                style={[styles.bulkButton, { backgroundColor: DISCLOSURE_LEVEL_INFO[level].color }]}
                onPress={() => handleBulkSet(level)}
              >
                <Text style={styles.bulkButtonText}>{DISCLOSURE_LEVEL_INFO[level].name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Strict Mode */}
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>严格模式</Text>
            <Text style={styles.settingDescription}>未配置的字段默认隐藏</Text>
          </View>
          <Switch
            value={strictMode}
            onValueChange={setStrictMode}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
          />
        </View>

        {/* Default Level */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>默认披露级别</Text>
          <View style={styles.levelButtons}>
            {disclosureLevels.map(level => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.levelButton,
                  defaultLevel === level && styles.levelButtonActive,
                  { borderColor: DISCLOSURE_LEVEL_INFO[level].color },
                ]}
                onPress={() => {
                  setDefaultLevel(level);
                  setHasChanges(true);
                }}
              >
                <View
                  style={[
                    styles.levelIndicator,
                    { backgroundColor: DISCLOSURE_LEVEL_INFO[level].color },
                  ]}
                />
                <Text
                  style={[
                    styles.levelButtonText,
                    defaultLevel === level && styles.levelButtonTextActive,
                  ]}
                >
                  {DISCLOSURE_LEVEL_INFO[level].name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Field Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>字段级设置</Text>
          {fields.map(field => (
            <View key={field.fieldName} style={styles.fieldCard}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldName}>
                  {fieldLabels[field.fieldName] || field.fieldName}
                </Text>
                {field.currentLevel !== field.defaultLevel && (
                  <View style={styles.modifiedBadge}>
                    <Text style={styles.modifiedText}>已修改</Text>
                  </View>
                )}
              </View>

              <View style={styles.levelSelector}>
                {disclosureLevels.map(level => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.levelOption,
                      field.currentLevel === level && [
                        styles.levelOptionActive,
                        { backgroundColor: `${DISCLOSURE_LEVEL_INFO[level].color}20` },
                      ],
                    ]}
                    onPress={() => handleFieldLevelChange(field.fieldName, level)}
                  >
                    <View
                      style={[
                        styles.levelDot,
                        { backgroundColor: DISCLOSURE_LEVEL_INFO[level].color },
                        field.currentLevel === level && styles.levelDotActive,
                      ]}
                    />
                    <Text
                      style={[
                        styles.levelOptionText,
                        field.currentLevel === level && styles.levelOptionTextActive,
                      ]}
                    >
                      {DISCLOSURE_LEVEL_INFO[level].name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.levelDescription}>
                {DISCLOSURE_LEVEL_INFO[field.currentLevel].description}
              </Text>
            </View>
          ))}
        </View>

        {/* Preview Button */}
        <TouchableOpacity style={styles.previewButton} onPress={handlePreview}>
          <Text style={styles.previewButtonText}>预览可见效果</Text>
        </TouchableOpacity>

        {/* Reset Button */}
        <TouchableOpacity style={styles.resetButton} onPress={handleResetToDefaults}>
          <Text style={styles.resetButtonText}>重置为默认设置</Text>
        </TouchableOpacity>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.colors.background,
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
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontSize: themeColors.fonts.sizes.base,
    color: themeColors.colors.primary,
    fontWeight: themeColors.fonts.weights.medium,
  },
  saveTextDisabled: {
    color: themeColors.colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  descriptionCard: {
    backgroundColor: `${themeColors.colors.primary}10`,
    margin: themeColors.spacing.lg,
    padding: themeColors.spacing.lg,
    borderRadius: 12,
  },
  descriptionTitle: {
    fontSize: themeColors.fonts.sizes.base,
    fontWeight: themeColors.fonts.weights.semibold,
    color: themeColors.colors.text,
    marginBottom: themeColors.spacing.sm,
  },
  descriptionText: {
    fontSize: themeColors.fonts.sizes.sm,
    color: themeColors.colors.textSecondary,
    lineHeight: 20,
  },
  section: {
    marginBottom: themeColors.spacing.lg,
  },
  sectionTitle: {
    fontSize: themeColors.fonts.sizes.sm,
    color: themeColors.colors.textSecondary,
    paddingHorizontal: themeColors.spacing.lg,
    paddingVertical: themeColors.spacing.base,
    textTransform: 'uppercase',
  },
  bulkButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: themeColors.spacing.lg,
    gap: themeColors.spacing.sm,
  },
  bulkButton: {
    paddingHorizontal: themeColors.spacing.base,
    paddingVertical: themeColors.spacing.sm,
    borderRadius: 8,
  },
  bulkButtonText: {
    color: '#fff',
    fontSize: themeColors.fonts.sizes.sm,
    fontWeight: themeColors.fonts.weights.medium,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: themeColors.spacing.lg,
    paddingVertical: themeColors.spacing.lg,
    backgroundColor: themeColors.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.colors.border,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: themeColors.fonts.sizes.base,
    color: themeColors.colors.text,
  },
  settingDescription: {
    fontSize: themeColors.fonts.sizes.sm,
    color: themeColors.colors.textSecondary,
    marginTop: 2,
  },
  levelButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: themeColors.spacing.lg,
    gap: themeColors.spacing.base,
  },
  levelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: themeColors.spacing.base,
    paddingVertical: themeColors.spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: themeColors.colors.background,
  },
  levelButtonActive: {
    backgroundColor: `${themeColors.colors.primary}10`,
  },
  levelIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: themeColors.spacing.sm,
  },
  levelButtonText: {
    fontSize: themeColors.fonts.sizes.sm,
    color: themeColors.colors.textSecondary,
  },
  levelButtonTextActive: {
    color: themeColors.colors.text,
    fontWeight: themeColors.fonts.weights.medium,
  },
  fieldCard: {
    backgroundColor: themeColors.colors.background,
    padding: themeColors.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.colors.border,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: themeColors.spacing.base,
  },
  fieldName: {
    fontSize: themeColors.fonts.sizes.base,
    fontWeight: themeColors.fonts.weights.medium,
    color: themeColors.colors.text,
  },
  modifiedBadge: {
    backgroundColor: `${themeColors.colors.primary}20`,
    paddingHorizontal: themeColors.spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modifiedText: {
    fontSize: themeColors.fonts.sizes.xs,
    color: themeColors.colors.primary,
  },
  levelSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: themeColors.spacing.sm,
    marginBottom: themeColors.spacing.sm,
  },
  levelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: themeColors.spacing.base,
    paddingVertical: themeColors.spacing.sm,
    borderRadius: 16,
    backgroundColor: `${themeColors.colors.border}50`,
  },
  levelOptionActive: {
    borderWidth: 1,
  },
  levelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  levelDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  levelOptionText: {
    fontSize: themeColors.fonts.sizes.sm,
    color: themeColors.colors.textSecondary,
  },
  levelOptionTextActive: {
    color: themeColors.colors.text,
    fontWeight: themeColors.fonts.weights.medium,
  },
  levelDescription: {
    fontSize: themeColors.fonts.sizes.sm,
    color: themeColors.colors.textSecondary,
  },
  previewButton: {
    backgroundColor: themeColors.colors.primary,
    marginHorizontal: themeColors.spacing.lg,
    paddingVertical: themeColors.spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: themeColors.spacing.lg,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: themeColors.fonts.sizes.base,
    fontWeight: themeColors.fonts.weights.semibold,
  },
  resetButton: {
    marginHorizontal: themeColors.spacing.lg,
    paddingVertical: themeColors.spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: themeColors.spacing.base,
  },
  resetButtonText: {
    color: themeColors.colors.error,
    fontSize: themeColors.fonts.sizes.base,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default DisclosureSettings;
