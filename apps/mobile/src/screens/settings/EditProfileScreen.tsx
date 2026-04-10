import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { theme } from '../../theme';
import { api } from '../../services/api';

export const EditProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    name: user?.name || '',
    bio: user?.bio || '',
    website: user?.website || '',
    location: user?.location || '',
  });

  const updateField = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await api.put('/api/v1/users/me', form);
      if (response.data?.data) {
        setUser(response.data.data);
        Alert.alert('成功', '个人资料已更新');
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert('错误', error.response?.data?.message || '更新失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async () => {
    // TODO: Implement image picker and upload
    Alert.alert('提示', '头像上传功能需要集成图片选择器');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButton}>取消</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>编辑资料</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={styles.saveButton}>保存</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form}>
        <View style={styles.avatarSection}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.displayName?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.changeAvatarButton}
            onPress={handleAvatarUpload}
            disabled={isLoading}
          >
            <Text style={styles.changeAvatarText}>更换头像</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>显示名称</Text>
          <TextInput
            style={styles.input}
            value={form.displayName}
            onChangeText={(text) => updateField('displayName', text)}
            placeholder="输入显示名称"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>姓名</Text>
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={(text) => updateField('name', text)}
            placeholder="输入真实姓名"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>简介</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={form.bio}
            onChangeText={(text) => updateField('bio', text)}
            placeholder="输入个人简介"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>网站</Text>
          <TextInput
            style={styles.input}
            value={form.website}
            onChangeText={(text) => updateField('website', text)}
            placeholder="输入个人网站"
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>位置</Text>
          <TextInput
            style={styles.input}
            value={form.location}
            onChangeText={(text) => updateField('location', text)}
            placeholder="输入所在城市"
          />
        </View>
      </ScrollView>
    </View>
  );
};

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButton}>取消</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>编辑资料</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveButton}>保存</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.displayName?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <TouchableOpacity style={styles.changeAvatarButton}>
            <Text style={styles.changeAvatarText}>更换头像</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>显示名称</Text>
          <TextInput
            style={styles.input}
            value={form.displayName}
            onChangeText={(text) => updateField('displayName', text)}
            placeholder="输入显示名称"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>用户名</Text>
          <TextInput
            style={styles.input}
            value={form.username}
            onChangeText={(text) => updateField('username', text)}
            placeholder="输入用户名"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>简介</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={form.bio}
            onChangeText={(text) => updateField('bio', text)}
            placeholder="输入个人简介"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>网站</Text>
          <TextInput
            style={styles.input}
            value={form.website}
            onChangeText={(text) => updateField('website', text)}
            placeholder="输入个人网站"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>位置</Text>
          <TextInput
            style={styles.input}
            value={form.location}
            onChangeText={(text) => updateField('location', text)}
            placeholder="输入所在城市"
          />
        </View>
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
  cancelButton: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  saveButton: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.semibold,
  },
  form: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.base,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: theme.spacing.base,
  },
  avatarText: {
    color: theme.colors.textInverse,
    fontSize: theme.fonts.sizes['3xl'],
    fontWeight: theme.fonts.weights.bold,
  },
  changeAvatarButton: {
    paddingVertical: theme.spacing.xs,
  },
  changeAvatarText: {
    color: theme.colors.primary,
    fontSize: theme.fonts.sizes.base,
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
  bioInput: {
    height: 100,
    paddingTop: theme.spacing.base,
  },
});
