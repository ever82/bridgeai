import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { Header } from '../../components/Header';
import { useMessageStore, type NotificationSettings } from '../../stores/messageStore';
import { theme } from '../../theme';

interface SettingRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

const SettingRow: React.FC<SettingRowProps> = ({ label, description, value, onValueChange }) => (
  <View style={styles.settingRow}>
    <View style={styles.settingLabelContainer}>
      <Text style={styles.settingLabel}>{label}</Text>
      {description && <Text style={styles.settingDescription}>{description}</Text>}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
      thumbColor={theme.colors.background}
    />
  </View>
);

const typeLabels: Record<
  keyof NotificationSettings['perTypeSettings'],
  { label: string; icon: string }
> = {
  system: { label: '系统通知', icon: '🔔' },
  activity: { label: '活动通知', icon: '🎉' },
  match: { label: '匹配通知', icon: '💕' },
  security: { label: '安全通知', icon: '🔒' },
};

export const MessageSettingsScreen: React.FC = () => {
  const { notificationSettings, updateNotificationSettings, updatePerTypeNotificationSetting } =
    useMessageStore();

  return (
    <ScreenContainer safeAreaTop safeAreaBottom={false}>
      <Header title="消息设置" showBackButton />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>通知设置</Text>

        <View style={styles.card}>
          <SettingRow
            label="接收消息通知"
            description="关闭后将不会收到任何消息通知"
            value={notificationSettings.enabled}
            onValueChange={v => updateNotificationSettings({ enabled: v })}
          />
          <View style={styles.divider} />
          <SettingRow
            label="通知声音"
            value={notificationSettings.sound}
            onValueChange={v => updateNotificationSettings({ sound: v })}
          />
          <View style={styles.divider} />
          <SettingRow
            label="振动"
            value={notificationSettings.vibration}
            onValueChange={v => updateNotificationSettings({ vibration: v })}
          />
          <View style={styles.divider} />
          <SettingRow
            label="免打扰模式"
            description="开启后不会收到推送通知"
            value={notificationSettings.dndMode}
            onValueChange={v => updateNotificationSettings({ dndMode: v })}
          />
          <View style={styles.divider} />
          <SettingRow
            label="通知预览"
            description="在通知中显示消息内容预览"
            value={notificationSettings.previewEnabled}
            onValueChange={v => updateNotificationSettings({ previewEnabled: v })}
          />
        </View>

        <Text style={styles.sectionTitle}>按类型设置</Text>
        <View style={styles.card}>
          {(
            Object.entries(typeLabels) as [
              keyof typeof typeLabels,
              { label: string; icon: string },
            ][]
          ).map(([key, { label, icon }], index) => (
            <React.Fragment key={key}>
              {index > 0 && <View style={styles.divider} />}
              <View style={styles.typeRow}>
                <View style={styles.typeLabelContainer}>
                  <Text style={styles.typeIcon}>{icon}</Text>
                  <Text style={styles.settingLabel}>{label}</Text>
                </View>
                <Switch
                  value={notificationSettings.perTypeSettings[key]}
                  onValueChange={v => updatePerTypeNotificationSetting(key, v)}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={theme.colors.background}
                />
              </View>
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing.base,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.base,
  },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
  },
  settingLabelContainer: {
    flex: 1,
    marginRight: theme.spacing.base,
  },
  settingLabel: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
  },
  settingDescription: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs / 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: theme.spacing.base,
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
  },
  typeLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIcon: {
    fontSize: 18,
    marginRight: theme.spacing.sm,
  },
});

export default MessageSettingsScreen;
