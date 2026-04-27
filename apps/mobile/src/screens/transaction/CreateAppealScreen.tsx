import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { transactionApi } from '../../services/api/transactionApi';
import { theme } from '../../theme';

export const CreateAppealScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { refundId } = route.params as { refundId: string };

  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('提示', '请填写申诉理由');
      return;
    }

    setSubmitting(true);
    try {
      const res = await transactionApi.createAppeal({
        refundId,
        reason: reason.trim(),
      });

      if (res.success) {
        Alert.alert('成功', '申诉已提交，请耐心等待审核', [
          {
            text: '确定',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '提交申诉失败';
      Alert.alert('错误', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>发起申诉</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.description}>
          如果您对退款审核结果不满意，可以提交申诉。请详细说明申诉理由，我们将重新审核。
        </Text>

        <TextInput
          style={styles.textInput}
          placeholder="请详细说明申诉理由..."
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          maxLength={500}
          value={reason}
          onChangeText={setReason}
          textAlignVertical="top"
        />

        <Text style={styles.charCount}>{reason.length}/500</Text>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!reason.trim() || submitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!reason.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <Text style={styles.submitButtonText}>提交申诉</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.base,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    fontSize: 28,
    color: theme.colors.primary,
    width: 32,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    padding: theme.spacing.base,
  },
  description: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },
  textInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    minHeight: 150,
  },
  charCount: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textTertiary,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.base,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
});
