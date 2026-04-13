import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useAuthStore } from '../../stores/authStore';

interface MenuItem {
  id: string;
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

export const DrawerMenu: React.FC<DrawerContentComponentProps> = ({
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();

  const menuItems: MenuItem[] = [
    {
      id: 'settings',
      icon: '⚙️',
      label: '设置',
      onPress: () => {
        navigation.closeDrawer();
        navigation.navigate('Settings');
      },
    },
    {
      id: 'help',
      icon: '❓',
      label: '帮助中心',
      onPress: () => {
        navigation.closeDrawer();
        // Navigate to help screen
      },
    },
    {
      id: 'feedback',
      icon: '💬',
      label: '意见反馈',
      onPress: () => {
        navigation.closeDrawer();
        // Navigate to feedback screen
      },
    },
    {
      id: 'about',
      icon: 'ℹ️',
      label: '关于我们',
      onPress: () => {
        navigation.closeDrawer();
        // Navigate to about screen
      },
    },
  ];

  const bottomMenuItems: MenuItem[] = [
    {
      id: 'logout',
      icon: '🚪',
      label: '退出登录',
      onPress: async () => {
        navigation.closeDrawer();
        await logout();
      },
      danger: true,
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* User Profile Section */}
      <View style={styles.profileSection}>
        <TouchableOpacity
          style={styles.profileContainer}
          onPress={() => {
            navigation.closeDrawer();
            navigation.navigate('Profile');
          }}
        >
          <View style={styles.avatarContainer}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>👤</Text>
              </View>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user?.name || user?.nickname || '用户'}
            </Text>
            <Text style={styles.userEmail}>
              {user?.email || '点击查看个人资料'}
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Menu Items */}
      <ScrollView style={styles.menuContainer}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text
              style={[
                styles.menuLabel,
                item.danger && styles.dangerText,
              ]}
            >
              {item.label}
            </Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bottom Menu Items */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
        {bottomMenuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text
              style={[
                styles.menuLabel,
                item.danger && styles.dangerText,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}

        {/* App Version */}
        <Text style={styles.versionText}>版本 1.0.0</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  profileSection: {
    padding: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  avatarContainer: {
    marginRight: theme.spacing.base,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 28,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  arrow: {
    fontSize: 24,
    color: theme.colors.textTertiary,
  },
  menuContainer: {
    flex: 1,
    paddingTop: theme.spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: theme.spacing.base,
    width: 28,
    textAlign: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
  },
  menuArrow: {
    fontSize: 20,
    color: theme.colors.textTertiary,
  },
  dangerText: {
    color: theme.colors.error,
  },
  bottomSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
  versionText: {
    textAlign: 'center',
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.lg,
  },
});
