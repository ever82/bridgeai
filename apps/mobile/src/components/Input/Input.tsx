import React, { useState, useCallback } from 'react';
import {
  TextInput,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { theme } from '../../theme';

export type InputType = 'text' | 'password' | 'number' | 'email' | 'phone';
export type InputState = 'default' | 'error' | 'disabled' | 'readonly';

export interface InputProps extends Omit<TextInputProps, 'editable' | 'secureTextEntry'> {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  type?: InputType;
  state?: InputState;
  errorMessage?: string;
  helperText?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  clearable?: boolean;
  maxLength?: number;
  showCharacterCount?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  testID?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  type = 'text',
  state = 'default',
  errorMessage,
  helperText,
  prefix,
  suffix,
  clearable = false,
  maxLength,
  showCharacterCount = false,
  containerStyle,
  inputStyle,
  labelStyle,
  testID,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isDisabled = state === 'disabled';
  const isReadOnly = state === 'readonly';
  const isError = state === 'error';

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const handleClear = useCallback(() => {
    onChangeText('');
  }, [onChangeText]);

  const getKeyboardType = (): TextInputProps['keyboardType'] => {
    switch (type) {
      case 'email':
        return 'email-address';
      case 'number':
        return 'numeric';
      case 'phone':
        return 'phone-pad';
      default:
        return 'default';
    }
  };

  const getTextContentType = (): TextInputProps['textContentType'] => {
    switch (type) {
      case 'email':
        return 'emailAddress';
      case 'password':
        return 'password';
      case 'phone':
        return 'telephoneNumber';
      default:
        return 'none';
    }
  };

  const inputStyles = [
    styles.input,
    isError && styles.inputError,
    isFocused && !isError && styles.inputFocused,
    (isDisabled || isReadOnly) && styles.inputDisabled,
    prefix && styles.inputWithPrefix,
    suffix && styles.inputWithSuffix,
    inputStyle,
  ];

  return (
    <View style={[styles.container, containerStyle]} testID={testID}>
      {label && (
        <Text style={[styles.label, labelStyle]}>
          {label}
        </Text>
      )}

      <View style={[
        styles.inputContainer,
        isError && styles.containerError,
        isFocused && !isError && styles.containerFocused,
        (isDisabled || isReadOnly) && styles.containerDisabled,
      ]}>
        {prefix && (
          <View style={styles.prefixContainer}>
            {prefix}
          </View>
        )}

        <TextInput
          style={inputStyles}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          keyboardType={getKeyboardType()}
          textContentType={getTextContentType()}
          secureTextEntry={type === 'password' && !showPassword}
          editable={!isDisabled && !isReadOnly}
          maxLength={maxLength}
          {...textInputProps}
        />

        {clearable && value.length > 0 && !isDisabled && !isReadOnly && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Text style={styles.clearIcon}>×</Text>
          </TouchableOpacity>
        )}

        {type === 'password' && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.passwordToggle}
          >
            <Text style={styles.passwordToggleText}>
              {showPassword ? '👁' : '👁‍🗨'}
            </Text>
          </TouchableOpacity>
        )}

        {suffix && (
          <View style={styles.suffixContainer}>
            {suffix}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {(isError && errorMessage) ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : helperText ? (
          <Text style={styles.helperText}>{helperText}</Text>
        ) : (
          <View />
        )}

        {showCharacterCount && maxLength && (
          <Text style={styles.characterCount}>
            {value.length}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    minHeight: 44,
  },
  containerError: {
    borderColor: theme.colors.error,
  },
  containerFocused: {
    borderColor: theme.colors.primary,
  },
  containerDisabled: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderColor: theme.colors.borderLight,
  },
  input: {
    flex: 1,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
  },
  inputError: {
    color: theme.colors.error,
  },
  inputFocused: {
    // Additional focused styles if needed
  },
  inputDisabled: {
    color: theme.colors.textTertiary,
  },
  inputWithPrefix: {
    paddingLeft: theme.spacing.sm,
  },
  inputWithSuffix: {
    paddingRight: theme.spacing.sm,
  },
  prefixContainer: {
    paddingLeft: theme.spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
  },
  suffixContainer: {
    paddingRight: theme.spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    paddingHorizontal: theme.spacing.sm,
  },
  clearIcon: {
    fontSize: 20,
    color: theme.colors.textTertiary,
    fontWeight: 'bold',
  },
  passwordToggle: {
    paddingHorizontal: theme.spacing.base,
  },
  passwordToggleText: {
    fontSize: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: theme.spacing.xs,
    minHeight: 18,
  },
  errorText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.error,
    flex: 1,
  },
  helperText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  characterCount: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textTertiary,
  },
});

export default Input;
