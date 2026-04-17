import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';

import { theme } from '../../theme';

export interface CardProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  pressable?: boolean;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  testID?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  header,
  footer,
  title,
  subtitle,
  onPress,
  pressable = false,
  variant = 'default',
  padding = 'md',
  style,
  testID,
}) => {
  const cardStyles = [
    styles.base,
    styles[variant],
    padding !== 'none' && styles[`padding${padding.charAt(0).toUpperCase() + padding.slice(1)}`],
    style,
  ];

  const renderHeader = () => {
    if (header) {
      return <View style={styles.header}>{header}</View>;
    }

    if (title || subtitle) {
      return (
        <View style={styles.header}>
          {title && <Text style={styles.title}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      );
    }

    return null;
  };

  const CardWrapper = pressable || onPress ? TouchableOpacity : View;
  const wrapperProps = pressable || onPress
    ? { onPress, activeOpacity: 0.8, accessibilityRole: 'button' }
    : {};

  return (
    <CardWrapper
      style={cardStyles}
      testID={testID}
      {...wrapperProps}
    >
      {renderHeader()}
      <View style={styles.content}>{children}</View>
      {footer && <View style={styles.footer}>{footer}</View>}
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },

  // Variants
  default: {
    backgroundColor: theme.colors.background,
    ...theme.shadows.sm,
  },
  elevated: {
    backgroundColor: theme.colors.background,
    ...theme.shadows.md,
  },
  outlined: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.none,
  },

  // Padding
  paddingSm: {
    padding: theme.spacing.base,
  },
  paddingMd: {
    padding: theme.spacing.lg,
  },
  paddingLg: {
    padding: theme.spacing.xl,
  },

  header: {
    marginBottom: theme.spacing.base,
  },
  title: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  content: {
    flex: 1,
  },
  footer: {
    marginTop: theme.spacing.base,
    paddingTop: theme.spacing.base,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
});

export default Card;
