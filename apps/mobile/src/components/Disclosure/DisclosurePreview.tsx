import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useThemeStore } from '../../stores/themeStore';
import { theme as themeColors } from '../../theme';
import {
  DisclosureLevel,
  DISCLOSURE_LEVEL_INFO,
  RelationshipStage,
  DisclosurePreview as DisclosurePreviewType,
  DISCLOSABLE_FIELDS,
} from '@bridgeai/shared/types/disclosure';

interface DisclosurePreviewProps {
  agentId?: string;
  fields?: { fieldName: string; currentLevel: DisclosureLevel }[];
}

// Sample agent data for preview
const sampleAgentData: Record<string, unknown> = {
  name: '张三',
  avatar: 'https://example.com/avatar.jpg',
  bio: '资深产品经理，专注于用户体验设计',
  industry: '互联网/科技',
  location: '北京市朝阳区',
  contact: 'wechat: zhangsan',
  email: 'zhangsan@example.com',
  phone: '138****8888',
  company: '某知名互联网公司',
  socialLinks: 'LinkedIn: linkedin.com/in/zhangsan',
  skills: '产品设计, 用户研究, 数据分析',
  interests: '阅读, 旅行, 摄影',
  experience: '5年产品经理经验',
  education: '清华大学计算机系',
};

// Mask sensitive data
const maskValue = (value: string, type: string): string => {
  if (!value || value.length <= 4) return '***';

  switch (type) {
    case 'phone':
      return value.slice(0, 3) + '****' + value.slice(-4);
    case 'email':
      const [local, domain] = value.split('@');
      return local.slice(0, 2) + '***@' + domain;
    case 'socialLinks':
      return value.split('/').slice(0, -1).join('/') + '/***';
    default:
      return value.slice(0, 4) + '...';
  }
};

export const DisclosurePreview: React.FC<DisclosurePreviewProps> = ({
  agentId,
  fields: propFields,
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isDarkMode } = useThemeStore();

  const [selectedStage, setSelectedStage] = useState<RelationshipStage>(RelationshipStage.NONE);

  // Use provided fields or defaults
  const fields = useMemo(() => {
    if (propFields) {
      return propFields;
    }
    return DISCLOSABLE_FIELDS.map(fieldName => ({
      fieldName,
      currentLevel: DisclosureLevel.PUBLIC,
    }));
  }, [propFields]);

  const stages: { stage: RelationshipStage; label: string; description: string }[] = [
    { stage: RelationshipStage.NONE, label: '陌生人', description: '未建立任何关系' },
    { stage: RelationshipStage.MATCHED, label: '已匹配', description: '双方已匹配成功' },
    { stage: RelationshipStage.CHATTED, label: '已私聊', description: '有过私聊交流' },
    { stage: RelationshipStage.REFERRED, label: '已引荐', description: '经人引荐认识' },
  ];

  const stageOrder: Record<RelationshipStage, number> = {
    [RelationshipStage.NONE]: 0,
    [RelationshipStage.MATCHED]: 1,
    [RelationshipStage.CHATTED]: 2,
    [RelationshipStage.REFERRED]: 3,
  };

  const levelOrder: Record<DisclosureLevel, number> = {
    [DisclosureLevel.PUBLIC]: 0,
    [DisclosureLevel.AFTER_MATCH]: 1,
    [DisclosureLevel.AFTER_CHAT]: 2,
    [DisclosureLevel.AFTER_REFERRAL]: 3,
  };

  const getVisibleFields = (stage: RelationshipStage): string[] => {
    const currentStageLevel = stageOrder[stage];
    return fields
      .filter(field => {
        const fieldLevel = levelOrder[field.currentLevel];
        return fieldLevel <= currentStageLevel;
      })
      .map(field => field.fieldName);
  };

  const getHiddenFields = (stage: RelationshipStage): string[] => {
    const currentStageLevel = stageOrder[stage];
    return fields
      .filter(field => {
        const fieldLevel = levelOrder[field.currentLevel];
        return fieldLevel > currentStageLevel;
      })
      .map(field => field.fieldName);
  };

  const visibleFields = getVisibleFields(selectedStage);
  const hiddenFields = getHiddenFields(selectedStage);

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

  const fieldIcons: Record<string, string> = {
    name: '👤',
    avatar: '🖼️',
    bio: '📝',
    industry: '🏢',
    location: '📍',
    contact: '💬',
    email: '✉️',
    phone: '📞',
    company: '🏭',
    socialLinks: '🔗',
    skills: '⭐',
    interests: '❤️',
    experience: '💼',
    education: '🎓',
  };

  const renderField = (fieldName: string, isVisible: boolean) => {
    const value = sampleAgentData[fieldName] as string;
    const label = fieldLabels[fieldName] || fieldName;
    const icon = fieldIcons[fieldName] || '📄';

    if (!isVisible) {
      return (
        <View key={fieldName} style={styles.hiddenField}>
          <Text style={styles.hiddenIcon}>{icon}</Text>
          <Text style={styles.hiddenLabel}>{label}</Text>
          <View style={styles.hiddenBadge}>
            <Text style={styles.hiddenBadgeText}>隐藏</Text>
          </View>
        </View>
      );
    }

    // Determine if this is sensitive data that should be masked
    const isSensitive = ['phone', 'email', 'contact', 'socialLinks'].includes(fieldName);
    const displayValue = isSensitive ? maskValue(value, fieldName) : value;

    return (
      <View key={fieldName} style={styles.visibleField}>
        <View style={styles.fieldHeader}>
          <Text style={styles.fieldIcon}>{icon}</Text>
          <Text style={styles.fieldLabel}>{label}</Text>
        </View>
        <Text style={styles.fieldValue}>{displayValue || '-'}</Text>
      </View>
    );
  };

  const currentStageInfo = stages.find(s => s.stage === selectedStage);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>信息披露预览</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Stage Selector */}
        <View style={styles.stageSection}>
          <Text style={styles.sectionTitle}>选择查看者身份</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stageList}
          >
            {stages.map(({ stage, label, description }) => {
              const isActive = selectedStage === stage;
              return (
                <TouchableOpacity
                  key={stage}
                  style={[styles.stageButton, isActive && styles.stageButtonActive]}
                  onPress={() => setSelectedStage(stage)}
                >
                  <Text
                    style={[styles.stageButtonText, isActive && styles.stageButtonTextActive]}
                  >
                    {label}
                  </Text>
                  <Text
                    style={[styles.stageButtonDesc, isActive && styles.stageButtonDescActive]}
                  >
                    {description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Current Viewer Info */}
        <View style={styles.viewerCard}>
          <Text style={styles.viewerLabel}>当前视角</Text>
          <Text style={styles.viewerName}>{currentStageInfo?.label}</Text>
          <Text style={styles.viewerDesc}>{currentStageInfo?.description}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{visibleFields.length}</Text>
              <Text style={styles.statLabel}>可见字段</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{hiddenFields.length}</Text>
              <Text style={styles.statLabel}>隐藏字段</Text>
            </View>
          </View>
        </View>

        {/* Disclosure Level Legend */}
        <View style={styles.legendSection}>
          <Text style={styles.sectionTitle}>披露级别说明</Text>
          <View style={styles.legendList}>
            {Object.values(DISCLOSURE_LEVEL_INFO).map(level => (
              <View key={level.level} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: level.color }]} />
                <View style={styles.legendInfo}>
                  <Text style={styles.legendName}>{level.name}</Text>
                  <Text style={styles.legendDesc}>{level.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Visible Fields */}
        {visibleFields.length > 0 && (
          <View style={styles.fieldsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>可见信息</Text>
              <View style={styles.visibleBadge}>
                <Text style={styles.visibleBadgeText}>{visibleFields.length}</Text>
              </View>
            </View>
            <View style={styles.fieldsGrid}>
              {visibleFields.map(fieldName => renderField(fieldName, true))}
            </View>
          </View>
        )}

        {/* Hidden Fields */}
        {hiddenFields.length > 0 && (
          <View style={styles.fieldsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>隐藏信息</Text>
              <View style={styles.hiddenCountBadge}>
                <Text style={styles.hiddenCountText}>{hiddenFields.length}</Text>
              </View>
            </View>
            <View style={styles.hiddenGrid}>
              {hiddenFields.map(fieldName => renderField(fieldName, false))}
            </View>
          </View>
        )}

        {/* Upgrade Path */}
        {hiddenFields.length > 0 && selectedStage !== RelationshipStage.REFERRED && (
          <View style={styles.upgradeCard}>
            <Text style={styles.upgradeTitle}>如何查看更多？</Text>
            <Text style={styles.upgradeText}>
              {selectedStage === RelationshipStage.NONE &&
                '匹配成功后，您将能看到更多信息'}
              {selectedStage === RelationshipStage.MATCHED &&
                '开始私聊交流后，您将能看到联系方式等更多信息'}
              {selectedStage === RelationshipStage.CHATTED &&
                '获得引荐后，您将能看到所有信息'}
            </Text>
          </View>
        )}

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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  stageSection: {
    marginTop: themeColors.spacing.base,
  },
  sectionTitle: {
    fontSize: themeColors.fonts.sizes.sm,
    color: themeColors.colors.textSecondary,
    paddingHorizontal: themeColors.spacing.lg,
    paddingVertical: themeColors.spacing.base,
    textTransform: 'uppercase',
  },
  stageList: {
    paddingHorizontal: themeColors.spacing.lg,
    gap: themeColors.spacing.base,
  },
  stageButton: {
    paddingHorizontal: themeColors.spacing.lg,
    paddingVertical: themeColors.spacing.base,
    borderRadius: 12,
    backgroundColor: `${themeColors.colors.border}50`,
    minWidth: 100,
    alignItems: 'center',
  },
  stageButtonActive: {
    backgroundColor: themeColors.colors.primary,
  },
  stageButtonText: {
    fontSize: themeColors.fonts.sizes.base,
    fontWeight: themeColors.fonts.weights.medium,
    color: themeColors.colors.text,
  },
  stageButtonTextActive: {
    color: '#fff',
  },
  stageButtonDesc: {
    fontSize: themeColors.fonts.sizes.xs,
    color: themeColors.colors.textSecondary,
    marginTop: 2,
  },
  stageButtonDescActive: {
    color: '#fff',
    opacity: 0.8,
  },
  viewerCard: {
    margin: themeColors.spacing.lg,
    padding: themeColors.spacing.lg,
    backgroundColor: `${themeColors.colors.primary}10`,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewerLabel: {
    fontSize: themeColors.fonts.sizes.sm,
    color: themeColors.colors.textSecondary,
    marginBottom: themeColors.spacing.sm,
  },
  viewerName: {
    fontSize: themeColors.fonts.sizes.xl,
    fontWeight: themeColors.fonts.weights.bold,
    color: themeColors.colors.primary,
  },
  viewerDesc: {
    fontSize: themeColors.fonts.sizes.sm,
    color: themeColors.colors.textSecondary,
    marginTop: themeColors.spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: themeColors.spacing.lg,
  },
  stat: {
    alignItems: 'center',
    paddingHorizontal: themeColors.spacing.lg,
  },
  statNumber: {
    fontSize: themeColors.fonts.sizes.xl,
    fontWeight: themeColors.fonts.weights.bold,
    color: themeColors.colors.text,
  },
  statLabel: {
    fontSize: themeColors.fonts.sizes.sm,
    color: themeColors.colors.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: themeColors.colors.border,
  },
  legendSection: {
    marginTop: themeColors.spacing.base,
  },
  legendList: {
    paddingHorizontal: themeColors.spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: themeColors.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: `${themeColors.colors.border}50`,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: themeColors.spacing.base,
  },
  legendInfo: {
    flex: 1,
  },
  legendName: {
    fontSize: themeColors.fonts.sizes.base,
    fontWeight: themeColors.fonts.weights.medium,
    color: themeColors.colors.text,
  },
  legendDesc: {
    fontSize: themeColors.fonts.sizes.sm,
    color: themeColors.colors.textSecondary,
    marginTop: 2,
  },
  fieldsSection: {
    marginTop: themeColors.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: themeColors.spacing.lg,
    paddingVertical: themeColors.spacing.base,
  },
  visibleBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: themeColors.spacing.sm,
  },
  visibleBadgeText: {
    color: '#fff',
    fontSize: themeColors.fonts.sizes.xs,
    fontWeight: themeColors.fonts.weights.bold,
  },
  hiddenCountBadge: {
    backgroundColor: '#757575',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: themeColors.spacing.sm,
  },
  hiddenCountText: {
    color: '#fff',
    fontSize: themeColors.fonts.sizes.xs,
    fontWeight: themeColors.fonts.weights.bold,
  },
  fieldsGrid: {
    paddingHorizontal: themeColors.spacing.lg,
    gap: themeColors.spacing.base,
  },
  visibleField: {
    backgroundColor: themeColors.colors.background,
    padding: themeColors.spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${themeColors.colors.border}50`,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: themeColors.spacing.sm,
  },
  fieldIcon: {
    fontSize: 16,
    marginRight: themeColors.spacing.sm,
  },
  fieldLabel: {
    fontSize: themeColors.fonts.sizes.sm,
    color: themeColors.colors.textSecondary,
  },
  fieldValue: {
    fontSize: themeColors.fonts.sizes.base,
    color: themeColors.colors.text,
    fontWeight: themeColors.fonts.weights.medium,
  },
  hiddenGrid: {
    paddingHorizontal: themeColors.spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: themeColors.spacing.base,
  },
  hiddenField: {
    backgroundColor: `${themeColors.colors.border}30`,
    padding: themeColors.spacing.base,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.7,
  },
  hiddenIcon: {
    fontSize: 14,
    marginRight: themeColors.spacing.sm,
    opacity: 0.5,
  },
  hiddenLabel: {
    fontSize: themeColors.fonts.sizes.sm,
    color: themeColors.colors.textSecondary,
  },
  hiddenBadge: {
    backgroundColor: '#757575',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: themeColors.spacing.sm,
  },
  hiddenBadgeText: {
    fontSize: themeColors.fonts.sizes.xs,
    color: '#fff',
  },
  upgradeCard: {
    margin: themeColors.spacing.lg,
    padding: themeColors.spacing.lg,
    backgroundColor: `${themeColors.colors.primary}08`,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: themeColors.colors.primary,
  },
  upgradeTitle: {
    fontSize: themeColors.fonts.sizes.base,
    fontWeight: themeColors.fonts.weights.semibold,
    color: themeColors.colors.text,
    marginBottom: themeColors.spacing.sm,
  },
  upgradeText: {
    fontSize: themeColors.fonts.sizes.sm,
    color: themeColors.colors.textSecondary,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default DisclosurePreview;
