import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { theme } from '../../theme';

export const CreateMomentScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('错误', '请输入标题');
      return;
    }

    setIsLoading(true);
    // TODO: Implement actual creation
    setTimeout(() => {
      setIsLoading(false);
      navigation.goBack();
    }, 1000);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          disabled={isLoading}
        >
          <Text style={styles.cancelButton}>取消</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>创建动态</Text>
        <TouchableOpacity
          onPress={handleCreate}
          disabled={isLoading || !title.trim()}
        >
          <Text
            style={[
              styles.postButton,
              (!title.trim() || isLoading) && styles.postButtonDisabled,
            ]}
          >
            发布
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form}>
        <TextInput
          style={styles.titleInput}
          placeholder="添加标题..."
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />
        <TextInput
          style={styles.descriptionInput}
          placeholder="分享你的时刻..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={500}
        />

        <View style={styles.mediaSection}>
          <Text style={styles.sectionTitle}>添加媒体</Text>
          <TouchableOpacity style={styles.addMediaButton}>
            <Text style={styles.addMediaIcon}>📷</Text>
            <Text style={styles.addMediaText}>添加照片或视频</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.optionsSection}>
          <TouchableOpacity style={styles.optionRow}>
            <Text style={styles.optionText}>📍 添加位置</Text>
            <Text style={styles.optionArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionRow}>
            <Text style={styles.optionText}>🏷️ 添加标签</Text>
            <Text style={styles.optionArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionRow}>
            <Text style={styles.optionText}>👥 可见范围</Text>
            <Text style={styles.optionValue}>公开 ›</Text>
          </TouchableOpacity>
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
  postButton: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.semibold,
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  form: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  titleInput: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: theme.spacing.base,
  },
  descriptionInput: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    minHeight: 120,
    paddingVertical: theme.spacing.base,
  },
  mediaSection: {
    marginTop: theme.spacing['2xl'],
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.base,
  },
  addMediaButton: {
    height: 100,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMediaIcon: {
    fontSize: 24,
    marginBottom: theme.spacing.xs,
  },
  addMediaText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  optionsSection: {
    marginTop: theme.spacing['2xl'],
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  optionText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
  },
  optionArrow: {
    fontSize: theme.fonts.sizes.lg,
    color: theme.colors.textSecondary,
  },
  optionValue: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
  },
});
