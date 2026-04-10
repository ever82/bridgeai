import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useThemeStore } from '../../stores/themeStore';
import { theme as themeColors } from '../../theme';

export const SettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isDarkMode, toggleDarkMode, useSystemTheme, setUseSystemTheme } = useThemeStore();

  const settingsGroups = [
    {
      title: '账号',
      items: [
        {
          title: '账号安全',
          type: 'link',
          onPress: () => navigation.navigate('SecuritySettings'),
        },
        {
          title: '隐私设置',
          type: 'link',
          onPress: () => navigation.navigate('PrivacySettings'),
        },
      ],
    },
    {
      title: '外观',
      items: [
        {
          title: '深色模式',
          type: 'toggle',
          value: isDarkMode,
          onChange: toggleDarkMode,
        },
        {
          title: '跟随系统',
          type: 'toggle',
          value: useSystemTheme,
          onChange: setUseSystemTheme,
        },
      ],
    },
    {
      title: '通知',
      items: [
        { title: '推送通知', type: 'toggle', value: true, onChange: () => {} },
        { title: '邮件通知', type: 'toggle', value: false, onChange: () => {} },
      ],
    },
    {
      title: '关于',
      items: [
        { title: '版本', type: 'value', value: '1.0.0' },
        { title: '用户协议', type: 'link', onPress: () => {} },
        { title: '隐私政策', type: 'link', onPress: () => {} },
      ],
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>设置</Text>
        <View style={styles.placeholder} />
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
                  ]}
                >
                  <Text style={styles.settingTitle}>{item.title}</Text>
                  {item.type === 'toggle' && (
                    <Switch
                      value={item.value}
                      onValueChange={item.onChange}
                    />
                  )}
                  {item.type === 'value' && (
                    <Text style={styles.settingValue}>{item.value}</Text>
                  )}
                  {item.type === 'link' && (
                    <Text style={styles.settingArrow}>›</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
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
  settingTitle: {
    fontSize: themeColors.fonts.sizes.base,
    color: themeColors.colors.text,
  },
  settingValue: {
    fontSize: themeColors.fonts.sizes.base,
    color: themeColors.colors.textSecondary,
  },
  settingArrow: {
    fontSize: themeColors.fonts.sizes.lg,
    color: themeColors.colors.textSecondary,
  },
});
