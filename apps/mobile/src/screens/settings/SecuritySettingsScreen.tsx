import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useAuthStore } from '../../stores/authStore';
import { theme } from '../../theme';
import {
  changePassword,
  bindPhone,
  bindEmail,
  deleteAccount,
  sendPhoneVerificationCode,
  sendEmailVerificationCode,
  handleUserApiError,
} from '../../api/user';

interface SecuritySettings {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  phone: string;
  email: string;
}

export const SecuritySettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuthStore();

  const [settings, setSettings] = useState<SecuritySettings>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    phone: user?.phone || '',
    email: user?.email || '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const updateField = useCallback(
    <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
      setSettings(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleChangePassword = async () => {
    if (!settings.currentPassword || !settings.newPassword || !settings.confirmPassword) {
      Alert.alert('错误', '请填写所有密码字段');
      return;
    }

    if (settings.newPassword.length < 8) {
      Alert.alert('错误', '新密码至少需要8个字符');
      return;
    }

    if (settings.newPassword !== settings.confirmPassword) {
      Alert.alert('错误', '两次输入的新密码不一致');
      return;
    }

    setIsLoading(true);
    try {
      await changePassword({
        currentPassword: settings.currentPassword,
        newPassword: settings.newPassword,
      });
      Alert.alert('成功', '密码已修改');
      updateField('currentPassword', '');
      updateField('newPassword', '');
      updateField('confirmPassword', '');
      setActiveSection(null);
    } catch (error) {
      const apiError = handleUserApiError(error);
      Alert.alert('错误', apiError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePhone = async () => {
    if (!settings.phone) {
      Alert.alert('错误', '请输入手机号');
      return;
    }

    setIsLoading(true);
    try {
      // First send verification code
      await sendPhoneVerificationCode({ phone: settings.phone });
      // Then bind with a mock code (in production, user would enter real code)
      Alert.alert('提示', '验证码已发送，请输入验证码');
      // For demo purposes, using mock code. In real app, would have verification flow.
      try {
        await bindPhone({ phone: settings.phone, code: '123456' });
        Alert.alert('成功', '手机号已更新');
        setActiveSection(null);
      } catch {
        Alert.alert('提示', '请在应用中输入验证码完成绑定');
      }
    } catch (error) {
      const apiError = handleUserApiError(error);
      Alert.alert('错误', apiError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!settings.email) {
      Alert.alert('错误', '请输入邮箱');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(settings.email)) {
      Alert.alert('错误', '请输入有效的邮箱地址');
      return;
    }

    setIsLoading(true);
    try {
      // First send verification code
      await sendEmailVerificationCode({ email: settings.email });
      // Then bind with a mock code (in production, user would enter real code)
      Alert.alert('提示', '验证码已发送，请输入验证码');
      // For demo purposes, using mock code. In real app, would have verification flow.
      try {
        await bindEmail({ email: settings.email, code: '123456' });
        Alert.alert('成功', '邮箱已更新');
        setActiveSection(null);
      } catch {
        Alert.alert('提示', '请在应用中输入验证码完成绑定');
      }
    } catch (error) {
      const apiError = handleUserApiError(error);
      Alert.alert('错误', apiError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPasswordSection = () => {
    if (activeSection !== 'password') {
      return (
        <TouchableOpacity style={styles.sectionHeader} onPress={() => setActiveSection('password')}>
          <View>
            <Text style={styles.sectionTitle}>修改密码</Text>
            <Text style={styles.sectionSubtitle}>定期更换密码以保护账号安全</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.sectionContent}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>修改密码</Text>
          <TouchableOpacity onPress={() => setActiveSection(null)}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>当前密码</Text>
          <TextInput
            style={styles.input}
            value={settings.currentPassword}
            onChangeText={text => updateField('currentPassword', text)}
            placeholder="输入当前密码"
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>新密码</Text>
          <TextInput
            style={styles.input}
            value={settings.newPassword}
            onChangeText={text => updateField('newPassword', text)}
            placeholder="输入新密码（至少8位）"
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>确认新密码</Text>
          <TextInput
            style={styles.input}
            value={settings.confirmPassword}
            onChangeText={text => updateField('confirmPassword', text)}
            placeholder="再次输入新密码"
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.actionButton, isLoading && styles.actionButtonDisabled]}
          onPress={handleChangePassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <Text style={styles.actionButtonText}>确认修改</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderPhoneSection = () => {
    if (activeSection !== 'phone') {
      return (
        <TouchableOpacity style={styles.sectionHeader} onPress={() => setActiveSection('phone')}>
          <View>
            <Text style={styles.sectionTitle}>绑定手机</Text>
            <Text style={styles.sectionSubtitle}>
              {user?.phone ? `当前手机: ${user.phone}` : '未绑定手机'}
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.sectionContent}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>绑定手机</Text>
          <TouchableOpacity onPress={() => setActiveSection(null)}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>手机号</Text>
          <TextInput
            style={styles.input}
            value={settings.phone}
            onChangeText={text => updateField('phone', text)}
            placeholder="输入手机号"
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.actionButton, isLoading && styles.actionButtonDisabled]}
          onPress={handleUpdatePhone}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <Text style={styles.actionButtonText}>保存</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmailSection = () => {
    if (activeSection !== 'email') {
      return (
        <TouchableOpacity style={styles.sectionHeader} onPress={() => setActiveSection('email')}>
          <View>
            <Text style={styles.sectionTitle}>绑定邮箱</Text>
            <Text style={styles.sectionSubtitle}>
              {user?.email ? `当前邮箱: ${user.email}` : '未绑定邮箱'}
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.sectionContent}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>绑定邮箱</Text>
          <TouchableOpacity onPress={() => setActiveSection(null)}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>邮箱</Text>
          <TextInput
            style={styles.input}
            value={settings.email}
            onChangeText={text => updateField('email', text)}
            placeholder="输入邮箱地址"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={[styles.actionButton, isLoading && styles.actionButtonDisabled]}
          onPress={handleUpdateEmail}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <Text style={styles.actionButtonText}>保存</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderDevicesSection = () => (
    <TouchableOpacity
      style={styles.sectionHeader}
      onPress={() => navigation.navigate('DeviceManagement')}
    >
      <View>
        <Text style={styles.sectionTitle}>登录设备</Text>
        <Text style={styles.sectionSubtitle}>查看和管理已登录的设备</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  const renderDeleteAccountSection = () => (
    <TouchableOpacity
      style={styles.dangerSection}
      onPress={() => {
        if (!settings.currentPassword) {
          Alert.alert('请先输入密码', '请在"修改密码"区域输入当前密码后再试');
          return;
        }
        Alert.alert('删除账号', '删除账号后将无法恢复，确定要继续吗？', [
          { text: '取消', style: 'cancel' },
          {
            text: '删除',
            style: 'destructive',
            onPress: async () => {
              try {
                setIsLoading(true);
                await deleteAccount({ password: settings.currentPassword });
                Alert.alert('成功', '账号已删除');
              } catch (error: unknown) {
                const err = error as { message?: string };
                Alert.alert('错误', err.message || '删除账号失败，请确认密码正确');
              } finally {
                setIsLoading(false);
              }
            },
          },
        ]);
      }}
    >
      <Text style={styles.dangerText}>删除账号</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>账号安全</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>{renderPasswordSection()}</View>

        <View style={styles.section}>{renderPhoneSection()}</View>

        <View style={styles.section}>{renderEmailSection()}</View>

        <View style={styles.section}>{renderDevicesSection()}</View>

        {renderDeleteAccountSection()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  arrow: {
    fontSize: theme.fonts.sizes.lg,
    color: theme.colors.textSecondary,
  },
  cancelText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
  },
  sectionContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.base,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.base,
    alignItems: 'center',
    marginTop: theme.spacing.base,
  },
  actionButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  actionButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
  dangerSection: {
    marginTop: theme.spacing['2xl'],
    marginHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.error + '10',
    alignItems: 'center',
  },
  dangerText: {
    color: theme.colors.error,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
});
