import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeStackNavigator } from './HomeStackNavigator';
import { MessagesStackNavigator } from './MessagesStackNavigator';
import { DiscoverStackNavigator } from './DiscoverStackNavigator';
import { ProfileStackNavigator } from './ProfileStackNavigator';
import { MainTabParamList } from '../types/navigation';
import { theme } from '../theme';
import { useMessageStore } from '../stores/messageStore';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Tab icon component with focused state
interface TabIconProps {
  icon: string;
  focused: boolean;
  badgeCount?: number;
}

const TabIcon = ({ icon, focused, badgeCount }: TabIconProps) => (
  <View style={styles.iconContainer}>
    <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      {icon}
    </Text>
    {badgeCount !== undefined && badgeCount > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {badgeCount > 99 ? '99+' : badgeCount}
        </Text>
      </View>
    )}
  </View>
);

// Tab label component with focused state
interface TabLabelProps {
  label: string;
  focused: boolean;
}

const TabLabel = ({ label, focused }: TabLabelProps) => (
  <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
    {label}
  </Text>
);

export const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const unreadCount = useMessageStore((state) => state.unreadCount);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: [
          styles.tabBar,
          { paddingBottom: Math.max(insets.bottom, 8) },
        ],
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelPosition: 'below-icon',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: ({ focused }: { focused: boolean }) => (
            <TabLabel label="首页" focused={focused} />
          ),
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon icon="🏠" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesStackNavigator}
        options={{
          tabBarLabel: ({ focused }: { focused: boolean }) => (
            <TabLabel label="消息" focused={focused} />
          ),
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon icon="💬" focused={focused} badgeCount={unreadCount} />
          ),
        }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverStackNavigator}
        options={{
          tabBarLabel: ({ focused }: { focused: boolean }) => (
            <TabLabel label="发现" focused={focused} />
          ),
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon icon="🔍" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: ({ focused }: { focused: boolean }) => (
            <TabLabel label="我的" focused={focused} />
          ),
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon icon="👤" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 8,
    height: 70,
    ...theme.shadows.sm,
  },
  tabBarItem: {
    paddingVertical: 4,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 24,
    opacity: 0.5,
  },
  tabIconFocused: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  tabLabelFocused: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.background,
  },
  badgeText: {
    color: theme.colors.textInverse,
    fontSize: 10,
    fontWeight: '700',
  },
});
