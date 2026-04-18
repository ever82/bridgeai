import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useAuthStore } from '../../stores/authStore';
import { theme } from '../../theme';

export const LoginScreen = () => {
  const navigation = useNavigation();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('错误', '请输入邮箱和密码');
      return;
    }

    clearError();
    try {
      await login({ email, password });
    } catch {
      Alert.alert('登录失败', error || '请检查您的邮箱和密码');
    }
  };

  const handleOAuthLogin = (provider: 'wechat' | 'google') => {
    // TODO: Implement OAuth login flow
    Alert.alert('提示', `${provider === 'wechat' ? '微信' : 'Google'}登录功能开发中`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>BridgeAI</Text>
        <Text style={styles.subtitle}>AI驱动的供需匹配平台</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="邮箱"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isLoading}
        />
        <TextInput
          style={styles.input}
          placeholder="密码"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!isLoading}
        />

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <Text style={styles.buttonText}>登录</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('ForgotPassword')}
          disabled={isLoading}
        >
          <Text style={styles.linkText}>忘记密码？</Text>
        </TouchableOpacity>
      </View>

      {/* 第三方登录 */}
      <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>或使用以下方式登录</Text>
        <View style={styles.divider} />
      </View>

      <View style={styles.oauthContainer}>
        <TouchableOpacity
          style={[styles.oauthButton, styles.wechatButton]}
          onPress={() => handleOAuthLogin('wechat')}
          disabled={isLoading}
        >
          <Text style={styles.wechatButtonText}>微信登录</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.oauthButton, styles.googleButton]}
          onPress={() => handleOAuthLogin('google')}
          disabled={isLoading}
        >
          <Text style={styles.googleButtonText}>Google 登录</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>还没有账号？</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Register')} disabled={isLoading}>
          <Text style={styles.linkText}>立即注册</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  header: {
    marginTop: 80,
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: theme.fonts.sizes['3xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.textSecondary,
  },
  form: {
    gap: theme.spacing.base,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.base,
    fontSize: theme.fonts.sizes.base,
    backgroundColor: theme.colors.background,
  },
  button: {
    height: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.base,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: theme.colors.textInverse,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
  linkButton: {
    alignSelf: 'center',
    marginTop: theme.spacing.md,
  },
  linkText: {
    color: theme.colors.primary,
    fontSize: theme.fonts.sizes.base,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    marginHorizontal: theme.spacing.base,
    color: theme.colors.textSecondary,
    fontSize: theme.fonts.sizes.sm,
  },
  oauthContainer: {
    gap: theme.spacing.base,
  },
  oauthButton: {
    height: 48,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  wechatButton: {
    backgroundColor: '#07C160',
    borderColor: '#07C160',
  },
  wechatButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
  googleButton: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
  },
  googleButtonText: {
    color: theme.colors.text,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    gap: theme.spacing.xs,
  },
  footerText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fonts.sizes.base,
  },
});
