import React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';

import { theme } from '../../theme';

export type UserStatus = 'online' | 'offline' | 'busy' | 'away';
export type UserType = 'human' | 'agent';

export interface UserAvatarProps {
  uri?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: UserStatus;
  userType?: UserType;
  showStatus?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
}

const sizeMap = {
  xs: { container: 24, font: 10, status: 6 },
  sm: { container: 32, font: 12, status: 8 },
  md: { container: 40, font: 14, status: 10 },
  lg: { container: 56, font: 18, status: 12 },
  xl: { container: 80, font: 24, status: 16 },
};

const statusColors: Record<UserStatus, string> = {
  online: theme.colors.success,
  offline: theme.colors.textTertiary,
  busy: theme.colors.error,
  away: theme.colors.warning,
};

const statusLabels: Record<UserStatus, string> = {
  online: '在线',
  offline: '离线',
  busy: '忙碌',
  away: '离开',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  uri,
  name,
  size = 'md',
  status = 'offline',
  userType = 'human',
  showStatus = true,
  onPress,
  style,
  testID,
}) => {
  const dimensions = sizeMap[size];
  const borderWidth = userType === 'agent' ? 2 : 0;
  const borderColor = userType === 'agent' ? theme.colors.secondary : 'transparent';

  const getInitials = () => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const renderAvatar = () => {
    if (uri) {
      return (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            {
              width: dimensions.container - borderWidth * 2,
              height: dimensions.container - borderWidth * 2,
              borderRadius: (dimensions.container - borderWidth * 2) / 2,
            },
          ]}
          resizeMode="cover"
          testID={`${testID}-image`}
        />
      );
    }

    return (
      <View
        style={[
          styles.fallback,
          {
            width: dimensions.container - borderWidth * 2,
            height: dimensions.container - borderWidth * 2,
            borderRadius: (dimensions.container - borderWidth * 2) / 2,
          },
        ]}
        testID={`${testID}-fallback`}
      >
        <Text style={[styles.fallbackText, { fontSize: dimensions.font }]}>
          {getInitials()}
        </Text>
      </View>
    );
  };

  const renderStatusIndicator = () => {
    if (!showStatus) return null;

    return (
      <View
        style={[
          styles.statusIndicator,
          {
            width: dimensions.status,
            height: dimensions.status,
            borderRadius: dimensions.status / 2,
            backgroundColor: statusColors[status],
            borderWidth: 2,
            borderColor: theme.colors.background,
          },
        ]}
        accessibilityLabel={statusLabels[status]}
        testID={`${testID}-status`}
      />
    );
  };

  const containerStyle = [
    styles.container,
    {
      width: dimensions.container,
      height: dimensions.container,
      borderRadius: dimensions.container / 2,
      borderWidth,
      borderColor,
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={containerStyle}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${name || '用户'}头像`}
        testID={testID}
      >
        {renderAvatar()}
        {renderStatusIndicator()}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={containerStyle}
      accessibilityLabel={`${name || '用户'}头像`}
      testID={testID}
    >
      {renderAvatar()}
      {renderStatusIndicator()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  image: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  fallback: {
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: theme.colors.textInverse,
    fontWeight: theme.fonts.weights.semibold,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
});

export default UserAvatar;
