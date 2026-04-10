import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { theme } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'text';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  testID,
}) => {
  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[size],
    (disabled || loading) && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.baseText,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    (disabled || loading) && styles.disabledText,
    textStyle,
  ];

  const getLoadingColor = () => {
    if (variant === 'primary') {
      return theme.colors.textInverse;
    }
    if (variant === 'secondary' || variant === 'text') {
      return theme.colors.text;
    }
    return theme.colors.primary;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={buttonStyles}
      activeOpacity={0.8}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getLoadingColor()} />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <Text style={textStyles}>{title}</Text>
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  baseText: {
    fontWeight: theme.fonts.weights.semibold,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: theme.spacing.sm,
  },
  rightIcon: {
    marginLeft: theme.spacing.sm,
  },

  // Variants
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  text: {
    backgroundColor: 'transparent',
  },

  // Sizes
  sm: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
    minHeight: 32,
  },
  md: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
  },
  lg: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.base,
    minHeight: 52,
  },

  // Text styles
  primaryText: {
    color: theme.colors.textInverse,
  },
  secondaryText: {
    color: theme.colors.text,
  },
  outlineText: {
    color: theme.colors.primary,
  },
  ghostText: {
    color: theme.colors.text,
  },
  textText: {
    color: theme.colors.primary,
  },

  smText: {
    fontSize: theme.fonts.sizes.sm,
  },
  mdText: {
    fontSize: theme.fonts.sizes.base,
  },
  lgText: {
    fontSize: theme.fonts.sizes.md,
  },

  // States
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.5,
  },
});

export default Button;
