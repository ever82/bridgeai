import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';

import { theme } from '../../theme';

export type BadgeType = 'agent' | 'verified' | 'scene-vision' | 'scene-date' | 'scene-job' | 'scene-ad';
export type BadgePosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'beside-name';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface IdentityBadgeProps {
  type: BadgeType;
  size?: BadgeSize;
  position?: BadgePosition;
  showLabel?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const badgeConfig: Record<BadgeType, { icon: string; label: string; color: string; bgColor: string }> = {
  agent: {
    icon: '🤖',
    label: 'Agent',
    color: theme.colors.secondary,
    bgColor: `${theme.colors.secondary}20`,
  },
  verified: {
    icon: '✓',
    label: '已认证',
    color: theme.colors.success,
    bgColor: `${theme.colors.success}20`,
  },
  'scene-vision': {
    icon: '👁',
    label: 'VisionShare',
    color: theme.colors.primary,
    bgColor: `${theme.colors.primary}20`,
  },
  'scene-date': {
    icon: '❤',
    label: '约会',
    color: '#FF2D55',
    bgColor: '#FF2D5520',
  },
  'scene-job': {
    icon: '💼',
    label: '求职',
    color: '#5856D6',
    bgColor: '#5856D620',
  },
  'scene-ad': {
    icon: '📢',
    label: '广告',
    color: '#FF9500',
    bgColor: '#FF950020',
  },
};

const sizeMap = {
  sm: { container: 16, font: 10, icon: 8, padding: 2 },
  md: { container: 20, font: 11, icon: 10, padding: 3 },
  lg: { container: 24, font: 12, icon: 12, padding: 4 },
};

export const IdentityBadge: React.FC<IdentityBadgeProps> = ({
  type,
  size = 'md',
  position = 'bottom-right',
  showLabel = false,
  style,
  testID,
}) => {
  const config = badgeConfig[type];
  const dimensions = sizeMap[size];

  const getPositionStyle = (): ViewStyle => {
    switch (position) {
      case 'bottom-right':
        return { bottom: 0, right: 0 };
      case 'bottom-left':
        return { bottom: 0, left: 0 };
      case 'top-right':
        return { top: 0, right: 0 };
      case 'top-left':
        return { top: 0, left: 0 };
      case 'beside-name':
        return { position: 'relative' };
      default:
        return { bottom: 0, right: 0 };
    }
  };

  const containerStyle = [
    styles.container,
    {
      backgroundColor: config.bgColor,
      borderRadius: dimensions.container / 2,
      paddingHorizontal: showLabel ? dimensions.padding * 2 : 0,
      height: dimensions.container,
      minWidth: dimensions.container,
    },
    position !== 'beside-name' && styles.absolute,
    position !== 'beside-name' && getPositionStyle(),
    style,
  ];

  const isSceneBadge = type.startsWith('scene-');
  const borderStyle = isSceneBadge ? { borderWidth: 1, borderColor: config.color } : {};

  return (
    <View
      style={[containerStyle, borderStyle]}
      accessibilityLabel={`${config.label}徽章`}
      testID={testID}
    >
      <Text style={[styles.icon, { fontSize: dimensions.icon }]}>{config.icon}</Text>
      {showLabel && (
        <Text style={[styles.label, { fontSize: dimensions.font, color: config.color }]}>
          {config.label}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  absolute: {
    position: 'absolute',
  },
  icon: {
    textAlign: 'center',
  },
  label: {
    marginLeft: theme.spacing.xs / 2,
    fontWeight: theme.fonts.weights.medium,
  },
});

export default IdentityBadge;
